-- Atividades físicas extras do usuário (jiu-jitsu, natação, corrida, etc.)
-- Permite múltiplas atividades. Usadas para somar gasto calórico extra ao TDEE.

CREATE TABLE public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekdays INTEGER[] NOT NULL DEFAULT '{}',
  duration_min INTEGER NOT NULL DEFAULT 60,
  intensity TEXT NOT NULL DEFAULT 'moderada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activities TO authenticated;
GRANT ALL ON public.user_activities TO service_role;
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activities" ON public.user_activities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
