-- Ciclos contínuos de treino: AB/ABC/ABCD avançam quando a sessão é concluída,
-- sem reiniciar na segunda-feira e sem perder a posição em dias de descanso.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS training_weekdays INTEGER[];

UPDATE public.user_preferences
SET training_weekdays = CASE LEAST(GREATEST(COALESCE(training_days, 3), 1), 7)
  WHEN 1 THEN ARRAY[1]
  WHEN 2 THEN ARRAY[2,5]
  WHEN 3 THEN ARRAY[1,3,5]
  WHEN 4 THEN ARRAY[1,2,4,5]
  WHEN 5 THEN ARRAY[1,2,3,4,5]
  WHEN 6 THEN ARRAY[1,2,3,4,5,6]
  ELSE ARRAY[0,1,2,3,4,5,6]
END
WHERE training_weekdays IS NULL OR cardinality(training_weekdays) = 0;

ALTER TABLE public.user_preferences
  ALTER COLUMN training_weekdays SET DEFAULT ARRAY[1,3,5];

ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS current_cycle_position INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_length INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMPTZ;

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS cycle_position INTEGER;

ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cycle_position INTEGER;

-- Planos antigos continuam utilizáveis. Em divisões explícitas, fichas repetidas
-- recebem a mesma posição; nas divisões automáticas, cada ficha existente vira
-- uma posição do ciclo até que o usuário regenere o plano no formato novo.
UPDATE public.workout_plans wp
SET cycle_length = CASE wp.split_type
  WHEN 'ab' THEN 2
  WHEN 'upper_lower' THEN 2
  WHEN 'abc' THEN 3
  WHEN 'abcd' THEN 4
  WHEN 'isolated_5' THEN 5
  ELSE GREATEST(1, (SELECT COUNT(*) FROM public.workouts w WHERE w.workout_plan_id = wp.id))
END;

UPDATE public.workouts w
SET cycle_position = CASE wp.split_type
  WHEN 'ab' THEN MOD(w.sort_order, 2)
  WHEN 'upper_lower' THEN MOD(w.sort_order, 2)
  WHEN 'abc' THEN MOD(w.sort_order, 3)
  WHEN 'abcd' THEN MOD(w.sort_order, 4)
  WHEN 'isolated_5' THEN MOD(w.sort_order, 5)
  ELSE w.sort_order
END
FROM public.workout_plans wp
WHERE wp.id = w.workout_plan_id
  AND w.cycle_position IS NULL;

ALTER TABLE public.workouts
  ALTER COLUMN cycle_position SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_workouts_plan_cycle
  ON public.workouts(workout_plan_id, cycle_position, sort_order);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan_finished
  ON public.workout_sessions(workout_plan_id, finished_at DESC);

-- Conclui a ficha atual e avança o ciclo sob bloqueio do plano. A verificação de
-- propriedade ocorre no banco; o cliente não pode avançar plano de outro usuário.
CREATE OR REPLACE FUNCTION public.complete_workout_cycle(
  p_workout_id UUID,
  p_duration_min INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  selected_workout public.workouts%ROWTYPE;
  selected_plan public.workout_plans%ROWTYPE;
  expected_position INTEGER;
  next_position INTEGER;
  next_workout public.workouts%ROWTYPE;
  session_id UUID;
  finished_time TIMESTAMPTZ := now();
  duration_value INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE = '42501';
  END IF;

  SELECT w.* INTO selected_workout
  FROM public.workouts w
  WHERE w.id = p_workout_id AND w.user_id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treino não encontrado.' USING ERRCODE = '42501';
  END IF;

  SELECT wp.* INTO selected_plan
  FROM public.workout_plans wp
  WHERE wp.id = selected_workout.workout_plan_id
    AND wp.user_id = uid
    AND wp.is_active
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano ativo não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  expected_position := MOD(
    GREATEST(selected_plan.current_cycle_position, 0),
    GREATEST(selected_plan.cycle_length, 1)
  );

  -- Protege contra clique duplicado da mesma ficha no mesmo dia local.
  SELECT ws.id INTO session_id
  FROM public.workout_sessions ws
  WHERE ws.user_id = uid
    AND ws.workout_plan_id = selected_plan.id
    AND ws.workout_id = selected_workout.id
    AND ws.finished_at IS NOT NULL
    AND (ws.finished_at AT TIME ZONE 'America/Sao_Paulo')::date =
        (finished_time AT TIME ZONE 'America/Sao_Paulo')::date
  ORDER BY ws.finished_at DESC
  LIMIT 1;

  IF session_id IS NOT NULL THEN
    next_position := expected_position;
  ELSE
    IF COALESCE(selected_workout.cycle_position, selected_workout.sort_order) <> expected_position THEN
      RAISE EXCEPTION 'Conclua primeiro a ficha atual do ciclo.' USING ERRCODE = '22023';
    END IF;

    duration_value := LEAST(GREATEST(COALESCE(p_duration_min, selected_workout.estimated_min, 60), 1), 360);
    INSERT INTO public.workout_sessions (
      user_id, workout_id, workout_plan_id, workout_name, cycle_position,
      started_at, finished_at, duration_min
    ) VALUES (
      uid, selected_workout.id, selected_plan.id, selected_workout.name, expected_position,
      finished_time - make_interval(mins => duration_value), finished_time, duration_value
    ) RETURNING id INTO session_id;

    next_position := MOD(expected_position + 1, GREATEST(selected_plan.cycle_length, 1));
    UPDATE public.workout_plans
    SET current_cycle_position = next_position,
        last_completed_at = finished_time,
        updated_at = finished_time
    WHERE id = selected_plan.id;
  END IF;

  SELECT w.* INTO next_workout
  FROM public.workouts w
  WHERE w.workout_plan_id = selected_plan.id
    AND COALESCE(w.cycle_position, w.sort_order) = next_position
  ORDER BY w.sort_order
  LIMIT 1;

  RETURN JSONB_BUILD_OBJECT(
    'session_id', session_id,
    'completed_workout_id', selected_workout.id,
    'next_position', next_position,
    'next_workout_id', next_workout.id,
    'next_workout_name', next_workout.name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_workout_cycle(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_workout_cycle(UUID, INTEGER) TO authenticated;
