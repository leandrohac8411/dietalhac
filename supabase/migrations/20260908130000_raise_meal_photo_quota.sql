-- Sobe o limite de análises de foto de 8 para 25 por hora — 8 estava atrapalhando
-- o próprio teste normal de uso (várias fotos numa sessão de refeições do dia).
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

  RETURN updated_count <= 25;
END;
$$;

-- Reseta a cota atual pra você continuar testando agora.
DELETE FROM public.meal_photo_rate_limits
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'leandrohacarvalho@gmail.com');
