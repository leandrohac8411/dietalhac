-- Suporte ao modo de execução ao vivo do treino: cada série concluída na tela
-- é gravada em workout_session_sets em tempo real, numa sessão criada assim
-- que a primeira série do dia é registrada. Ao "Finalizar treino", em vez de
-- criar uma sessão sintética nova (como fazia antes), a função agora reaproveita
-- e fecha essa sessão já aberta — preservando as séries reais registradas.

-- Evita ambiguidade de overload: substitui a assinatura de 2 parâmetros pela
-- de 3 (o novo é opcional, então chamadas antigas continuam funcionando).
DROP FUNCTION IF EXISTS public.complete_workout_cycle(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.complete_workout_cycle(
  p_workout_id UUID,
  p_duration_min INTEGER DEFAULT NULL,
  p_session_id UUID DEFAULT NULL
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
  reused_session_id UUID;
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

    -- Reaproveita a sessão aberta pelo modo de execução ao vivo (se houver e for
    -- realmente do usuário/treino certo), em vez de criar uma sessão sintética.
    IF p_session_id IS NOT NULL THEN
      UPDATE public.workout_sessions
      SET finished_at = finished_time,
          duration_min = duration_value,
          workout_plan_id = COALESCE(workout_plan_id, selected_plan.id),
          cycle_position = COALESCE(cycle_position, expected_position)
      WHERE id = p_session_id
        AND user_id = uid
        AND workout_id = selected_workout.id
        AND finished_at IS NULL
      RETURNING id INTO reused_session_id;
    END IF;

    IF reused_session_id IS NOT NULL THEN
      session_id := reused_session_id;
    ELSE
      INSERT INTO public.workout_sessions (
        user_id, workout_id, workout_plan_id, workout_name, cycle_position,
        started_at, finished_at, duration_min
      ) VALUES (
        uid, selected_workout.id, selected_plan.id, selected_workout.name, expected_position,
        finished_time - make_interval(mins => duration_value), finished_time, duration_value
      ) RETURNING id INTO session_id;
    END IF;

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

REVOKE ALL ON FUNCTION public.complete_workout_cycle(UUID, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_workout_cycle(UUID, INTEGER, UUID) TO authenticated;
