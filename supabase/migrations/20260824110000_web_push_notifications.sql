-- Web Push do NEXO. O endpoint e as chaves pertencem ao navegador instalado;
-- as chaves VAPID privadas permanecem exclusivamente no servidor.

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_success_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  disabled_at TIMESTAMPTZ
);

CREATE INDEX push_subscriptions_user_active_idx
  ON public.push_subscriptions(user_id)
  WHERE disabled_at IS NULL;

CREATE TRIGGER trg_push_subscriptions_updated
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

CREATE POLICY "own push subscriptions read" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own push subscriptions insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subscriptions update" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own push subscriptions delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  meal_enabled BOOLEAN NOT NULL DEFAULT true,
  meal_lead_minutes INTEGER NOT NULL DEFAULT 15 CHECK (meal_lead_minutes BETWEEN 0 AND 120),
  workout_enabled BOOLEAN NOT NULL DEFAULT true,
  workout_lead_minutes INTEGER NOT NULL DEFAULT 30 CHECK (workout_lead_minutes BETWEEN 0 AND 180),
  water_enabled BOOLEAN NOT NULL DEFAULT true,
  water_times TIME[] NOT NULL DEFAULT ARRAY['10:00'::time, '14:00'::time, '18:00'::time],
  checkin_enabled BOOLEAN NOT NULL DEFAULT true,
  checkin_weekday INTEGER NOT NULL DEFAULT 0 CHECK (checkin_weekday BETWEEN 0 AND 6),
  checkin_time TIME NOT NULL DEFAULT '18:00',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_notification_preferences_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

CREATE POLICY "own notification preferences read" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notification preferences insert" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notification preferences update" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notification preferences delete" ON public.notification_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Deduplicação por aparelho. Sem política para authenticated: somente o
-- serviço confiável pode registrar entregas.
CREATE TABLE public.push_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, event_key)
);

CREATE INDEX push_delivery_log_created_idx ON public.push_delivery_log(created_at);
ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.push_delivery_log TO service_role;

-- Evita crescimento ilimitado do histórico técnico.
CREATE OR REPLACE FUNCTION public.cleanup_push_delivery_log()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE deleted_count INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso restrito' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.push_delivery_log WHERE created_at < now() - interval '45 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_push_delivery_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_push_delivery_log() TO service_role;
