-- Limita o consumo da integração de dieta por IA por usuário autenticado.
-- A tabela não é exposta diretamente pela API: usuários só podem chamar a
-- função, que usa auth.uid() e atualiza o contador de forma atômica.
CREATE TABLE public.diet_generation_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);

ALTER TABLE public.diet_generation_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.diet_generation_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.diet_generation_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_diet_generation_quota()
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

  INSERT INTO public.diet_generation_rate_limits AS limits (
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

  RETURN updated_count <= 5;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_diet_generation_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_diet_generation_quota() TO authenticated;
