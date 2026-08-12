-- Preferência explícita de estilo de treino (AB / ABC / ABCD / automático).
-- 'auto' mantém o comportamento atual (splits específicos por nº de dias e sexo,
-- derivados das fichas). Quando o usuário escolhe um estilo explícito, o gerador
-- cicla esse split (A,B,C,A,B,C...) independente de quantos dias por semana ele
-- treina, em vez de montar um dia extra dedicado.
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS workout_split_preference TEXT NOT NULL DEFAULT 'auto';
