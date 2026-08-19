-- Painel administrativo de engajamento.
-- Mantém os dados individuais protegidos por RLS e expõe somente um resumo
-- para contas que possuem o papel admin.

CREATE OR REPLACE FUNCTION public.admin_engagement_dashboard(p_days_back INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSONB;
  safe_days INTEGER := LEAST(GREATEST(COALESCE(p_days_back, 30), 7), 90);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores' USING ERRCODE = '42501';
  END IF;

  WITH
  profile_days AS (
    SELECT
      p.id AS user_id,
      p.full_name,
      p.avatar_url,
      p.onboarding_completed,
      p.created_at,
      d::date AS activity_date
    FROM public.profiles p
    CROSS JOIN LATERAL generate_series(
      GREATEST(current_date - (safe_days - 1), p.created_at::date),
      current_date,
      interval '1 day'
    ) d
  ),
  planned_meals AS (
    SELECT mp.user_id, COUNT(m.id)::INTEGER AS total
    FROM public.meal_plans mp
    JOIN public.meals m ON m.meal_plan_id = mp.id
    WHERE mp.is_active
    GROUP BY mp.user_id
  ),
  goals AS (
    SELECT DISTINCT ON (user_id)
      user_id,
      COALESCE(NULLIF(water_ml, 0), 2500)::INTEGER AS water_target
    FROM public.user_goals
    WHERE is_active
    ORDER BY user_id, created_at DESC
  ),
  meal_activity AS (
    SELECT
      user_id,
      log_date,
      COUNT(DISTINCT meal_id) FILTER (WHERE completed AND meal_id IS NOT NULL)::INTEGER AS completed,
      COUNT(*) FILTER (WHERE completed)::INTEGER AS registrations,
      MAX(created_at) AS last_at
    FROM public.daily_food_logs
    WHERE log_date >= current_date - (safe_days - 1)
    GROUP BY user_id, log_date
  ),
  workout_activity AS (
    SELECT
      user_id,
      (started_at AT TIME ZONE 'America/Sao_Paulo')::date AS activity_date,
      COUNT(*) FILTER (WHERE finished_at IS NOT NULL)::INTEGER AS completed,
      MAX(COALESCE(finished_at, started_at)) AS last_at
    FROM public.workout_sessions
    WHERE started_at >= (current_date - (safe_days - 1))::timestamptz
    GROUP BY user_id, (started_at AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  water_activity AS (
    SELECT user_id, log_date, SUM(amount_ml)::INTEGER AS amount_ml, MAX(created_at) AS last_at
    FROM public.water_logs
    WHERE log_date >= current_date - (safe_days - 1)
    GROUP BY user_id, log_date
  ),
  scored AS (
    SELECT
      pd.*,
      COALESCE(pm.total, 0) AS meals_planned,
      LEAST(COALESCE(ma.completed, 0), COALESCE(pm.total, 0)) AS meals_completed,
      COALESCE(ma.registrations, 0) AS meal_registrations,
      EXISTS (
        SELECT 1
        FROM public.workouts w
        JOIN public.workout_plans wp ON wp.id = w.workout_plan_id AND wp.is_active
        WHERE w.user_id = pd.user_id
          AND w.weekday = EXTRACT(DOW FROM pd.activity_date)::INTEGER
      ) AS workout_expected,
      COALESCE(wa.completed, 0) > 0 AS workout_completed,
      COALESCE(wt.amount_ml, 0) AS water_ml,
      COALESCE(g.water_target, 2500) AS water_target,
      GREATEST(ma.last_at, wa.last_at, wt.last_at) AS day_last_activity
    FROM profile_days pd
    LEFT JOIN planned_meals pm ON pm.user_id = pd.user_id
    LEFT JOIN goals g ON g.user_id = pd.user_id
    LEFT JOIN meal_activity ma ON ma.user_id = pd.user_id AND ma.log_date = pd.activity_date
    LEFT JOIN workout_activity wa ON wa.user_id = pd.user_id AND wa.activity_date = pd.activity_date
    LEFT JOIN water_activity wt ON wt.user_id = pd.user_id AND wt.log_date = pd.activity_date
  ),
  daily AS (
    SELECT
      s.*,
      ROUND(
        10 * (
          CASE WHEN meals_planned > 0
            THEN 7 * LEAST(meals_completed::numeric / meals_planned, 1)
            ELSE 0 END
          + CASE WHEN workout_expected AND workout_completed THEN 2 ELSE 0 END
          + LEAST(water_ml::numeric / NULLIF(water_target, 0), 1)
        ) / NULLIF(
          CASE WHEN meals_planned > 0 THEN 7 ELSE 0 END
          + CASE WHEN workout_expected THEN 2 ELSE 0 END
          + CASE WHEN water_target > 0 THEN 1 ELSE 0 END,
          0
        ),
        1
      ) AS points
    FROM scored s
  ),
  last_activity AS (
    SELECT user_id, MAX(activity_at) AS activity_at
    FROM (
      SELECT user_id, created_at AS activity_at FROM public.daily_food_logs
      UNION ALL
      SELECT user_id, COALESCE(finished_at, started_at) FROM public.workout_sessions
      UNION ALL
      SELECT user_id, created_at FROM public.water_logs
      UNION ALL
      SELECT user_id, created_at FROM public.weekly_checkins
    ) events
    GROUP BY user_id
  ),
  user_summary AS (
    SELECT
      d.user_id,
      MAX(d.full_name) AS full_name,
      MAX(d.avatar_url) AS avatar_url,
      BOOL_OR(d.onboarding_completed) AS onboarding_completed,
      MAX(d.created_at) AS created_at,
      ROUND(COALESCE(SUM(d.points), 0), 1) AS period_points,
      ROUND(COALESCE(AVG(d.points) * 10, 0), 0)::INTEGER AS adherence_percent,
      COALESCE(MAX(d.points) FILTER (WHERE d.activity_date = current_date), 0) AS today_points,
      MAX(la.activity_at) AS last_activity_at,
      COUNT(*) FILTER (
        WHERE d.activity_date > COALESCE((
          SELECT MAX(f.activity_date)
          FROM daily f
          WHERE f.user_id = d.user_id AND COALESCE(f.points, 0) < 8
        ), current_date - safe_days)
        AND COALESCE(d.points, 0) >= 8
      )::INTEGER AS streak_days,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'date', d.activity_date,
            'points', COALESCE(d.points, 0),
            'meals_completed', d.meals_completed,
            'meals_planned', d.meals_planned,
            'meal_registrations', d.meal_registrations,
            'workout_expected', d.workout_expected,
            'workout_completed', d.workout_completed,
            'water_ml', d.water_ml,
            'water_target', d.water_target
          ) ORDER BY d.activity_date DESC
        ) FILTER (WHERE d.activity_date >= current_date - 6),
        '[]'::jsonb
      ) AS last_7_days
    FROM daily d
    LEFT JOIN last_activity la ON la.user_id = d.user_id
    GROUP BY d.user_id
  ),
  recent_events AS (
    SELECT user_id, JSONB_AGG(event ORDER BY event_time DESC) AS events
    FROM (
      SELECT DISTINCT ON (user_id, event_time, event_type)
        user_id,
        event_time,
        event_type,
        JSONB_BUILD_OBJECT(
          'type', event_type,
          'at', event_time,
          'title', title,
          'detail', detail
        ) AS event
      FROM (
        SELECT
          l.user_id,
          l.created_at AS event_time,
          'meal'::text AS event_type,
          COALESCE(l.meal_name, 'Refeição registrada') AS title,
          CONCAT(ROUND(COALESCE(l.calories, 0)), ' kcal',
            CASE WHEN l.notes IS NOT NULL THEN CONCAT(' · ', l.notes) ELSE '' END) AS detail
        FROM public.daily_food_logs l
        WHERE l.created_at >= now() - make_interval(days => safe_days)

        UNION ALL

        SELECT
          s.user_id,
          COALESCE(s.finished_at, s.started_at),
          'workout',
          COALESCE(s.workout_name, 'Treino concluído'),
          CONCAT(COALESCE(s.duration_min, 0), ' min',
            CASE WHEN s.had_pain THEN ' · relatou dor' ELSE '' END)
        FROM public.workout_sessions s
        WHERE s.started_at >= now() - make_interval(days => safe_days)

        UNION ALL

        SELECT
          w.user_id,
          w.created_at,
          'water',
          'Água registrada',
          CONCAT(w.amount_ml, ' ml')
        FROM public.water_logs w
        WHERE w.created_at >= now() - make_interval(days => safe_days)

        UNION ALL

        SELECT
          c.user_id,
          c.created_at,
          'checkin',
          'Check-in semanal',
          CONCAT('Adesão à dieta: ', COALESCE(c.diet_adherence, 0), '%')
        FROM public.weekly_checkins c
        WHERE c.created_at >= now() - make_interval(days => safe_days)
      ) all_events
      ORDER BY user_id, event_time DESC, event_type
    ) deduped
    WHERE event_time IN (
      SELECT ranked.event_time
      FROM (
        SELECT e2.event_time, ROW_NUMBER() OVER (PARTITION BY e2.user_id ORDER BY e2.event_time DESC) AS rn
        FROM (
          SELECT user_id, created_at AS event_time FROM public.daily_food_logs
          UNION ALL SELECT user_id, COALESCE(finished_at, started_at) FROM public.workout_sessions
          UNION ALL SELECT user_id, created_at FROM public.water_logs
          UNION ALL SELECT user_id, created_at FROM public.weekly_checkins
        ) e2
        WHERE e2.user_id = deduped.user_id
      ) ranked
      WHERE ranked.rn <= 20
    )
    GROUP BY user_id
  )
  SELECT JSONB_BUILD_OBJECT(
    'generated_at', now(),
    'days', safe_days,
    'users', COALESCE(
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'user_id', us.user_id,
          'full_name', us.full_name,
          'avatar_url', us.avatar_url,
          'onboarding_completed', us.onboarding_completed,
          'created_at', us.created_at,
          'period_points', us.period_points,
          'adherence_percent', us.adherence_percent,
          'today_points', us.today_points,
          'streak_days', us.streak_days,
          'last_activity_at', us.last_activity_at,
          'last_7_days', us.last_7_days,
          'recent_events', COALESCE(re.events, '[]'::jsonb)
        ) ORDER BY us.period_points DESC, us.full_name
      ),
      '[]'::jsonb
    )
  ) INTO result
  FROM user_summary us
  LEFT JOIN recent_events re ON re.user_id = us.user_id;

  RETURN COALESCE(result, JSONB_BUILD_OBJECT('generated_at', now(), 'days', safe_days, 'users', '[]'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_engagement_dashboard(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_engagement_dashboard(INTEGER) TO authenticated;
