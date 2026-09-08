-- Limita o consumo da análise de foto de refeição por IA por usuário autenticado.
-- Mesmo padrão de diet_generation_rate_limits: chamadas de visão custam mais
-- tokens, então o limite é mais apertado.
CREATE TABLE public.meal_photo_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

ALTER TABLE public.meal_photo_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meal_photo_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meal_photo_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_meal_photo_quota()
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  updated_count INTEGER;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.meal_photo_rate_limits AS limits (
    user_id,
    window_started_at,
    request_count
  )
  VALUES (current_user_id, now(), 1)
  ON CONFLICT (user_id) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at <= now() - interval '1 hour' THEN now()
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at <= now() - interval '1 hour' THEN 1
      ELSE limits.request_count + 1
    END
  RETURNING request_count INTO updated_count;

  RETURN updated_count <= 8;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_meal_photo_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_meal_photo_quota() TO authenticated;
