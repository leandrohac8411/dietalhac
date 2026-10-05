-- Fecha sessões de treino ao vivo esquecidas abertas há mais de 3 horas.
-- Com séries registradas: finaliza no horário da última série (duração real).
-- Sem nenhuma série: era só um "Iniciar treino" esquecido, então é removida.
-- Não avança o ciclo de fichas (quem decide isso é complete_workout_cycle).
CREATE OR REPLACE FUNCTION public.close_stale_workout_sessions(p_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID := COALESCE(auth.uid(), p_user_id);
  closed_count INTEGER := 0;
BEGIN
  -- Usuário logado só mexe nas próprias sessões; sem login (cron/service role),
  -- p_user_id NULL significa todos.
  IF auth.uid() IS NOT NULL THEN
    target_user := auth.uid();
  END IF;

  DELETE FROM public.workout_sessions ws
  WHERE ws.finished_at IS NULL
    AND ws.started_at < now() - INTERVAL '3 hours'
    AND (target_user IS NULL OR ws.user_id = target_user)
    AND NOT EXISTS (
      SELECT 1 FROM public.workout_session_sets s WHERE s.session_id = ws.id
    );

  WITH last_set AS (
    SELECT s.session_id, MAX(s.created_at) AS last_at
    FROM public.workout_session_sets s
    GROUP BY s.session_id
  ), closed AS (
    UPDATE public.workout_sessions ws
    SET finished_at = GREATEST(ws.started_at, LEAST(ls.last_at, ws.started_at + INTERVAL '3 hours')),
        duration_min = GREATEST(
          1,
          ROUND(EXTRACT(EPOCH FROM (
            GREATEST(ws.started_at, LEAST(ls.last_at, ws.started_at + INTERVAL '3 hours')) - ws.started_at
          )) / 60)::INTEGER
        )
    FROM last_set ls
    WHERE ls.session_id = ws.id
      AND ws.finished_at IS NULL
      AND ws.started_at < now() - INTERVAL '3 hours'
      AND (target_user IS NULL OR ws.user_id = target_user)
    RETURNING ws.id
  )
  SELECT COUNT(*) INTO closed_count FROM closed;

  RETURN closed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.close_stale_workout_sessions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_stale_workout_sessions(UUID) TO authenticated, service_role;
