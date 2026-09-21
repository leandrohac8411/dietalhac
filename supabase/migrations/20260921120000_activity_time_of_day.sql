-- Horário de cada atividade física avulsa (jiu-jitsu, corrida...), além dos
-- dias/duração/intensidade já existentes. Sem isso a dieta só conseguia
-- montar refeição pré/pós-treino em volta do treino principal da academia;
-- atividades com horário bem diferente ficavam de fora dessa lógica.
-- TEXT (não TIME) pra guardar "HH:MM" no mesmo formato de user_preferences.training_time.
ALTER TABLE public.user_activities
  ADD COLUMN IF NOT EXISTS time_of_day TEXT;
