-- ============================================================
-- FormaFit / DietaLhac — setup completo do banco (Supabase)
-- Cole TUDO no SQL Editor de um projeto NOVO e execute uma vez.
-- Schema + RLS + triggers, revokes, seed de alimentos e exercícios.
-- ============================================================

-- >>> 1) SCHEMA (tabelas, RLS, funções, triggers)

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TYPE public.app_role AS ENUM ('user','admin','nutritionist','trainer');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  biological_sex TEXT,
  height_cm NUMERIC,
  current_weight_kg NUMERIC,
  avatar_url TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  onboarding_step INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, birth_date, biological_sex, height_cm, current_weight_kg)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NULLIF(NEW.raw_user_meta_data->>'birth_date','')::date,
    NULLIF(NEW.raw_user_meta_data->>'biological_sex',''),
    NULLIF(NEW.raw_user_meta_data->>'height_cm','')::numeric,
    NULLIF(NEW.raw_user_meta_data->>'current_weight_kg','')::numeric
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- goals
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  target_weight_kg NUMERIC,
  target_body_fat NUMERIC,
  deadline_weeks INTEGER,
  priority_areas TEXT[] DEFAULT '{}',
  priority_level TEXT DEFAULT 'balanced',
  active_scenario TEXT DEFAULT 'balanced',
  start_weight_kg NUMERIC,
  maintenance_calories INTEGER,
  target_calories INTEGER,
  protein_g INTEGER, carbs_g INTEGER, fat_g INTEGER, fiber_g INTEGER, water_ml INTEGER,
  weekly_rate_kg NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.user_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON public.user_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  occupation TEXT,
  routine_level TEXT,
  daily_steps INTEGER,
  sleep_hours NUMERIC,
  wake_time TEXT,
  sleep_time TEXT,
  training_days INTEGER,
  training_duration_min INTEGER,
  experience_level TEXT,
  training_place TEXT,
  equipment TEXT[] DEFAULT '{}',
  sports TEXT,
  physical_limitations TEXT,
  injuries TEXT,
  painful_exercises TEXT,
  meals_per_day INTEGER DEFAULT 5,
  meal_times TEXT[] DEFAULT '{}',
  liked_foods TEXT,
  disliked_foods TEXT,
  allergies TEXT,
  intolerances TEXT,
  dietary_restrictions TEXT[] DEFAULT '{}',
  food_budget TEXT,
  cooking_time TEXT,
  uses_meal_prep BOOLEAN DEFAULT false,
  eats_out BOOLEAN DEFAULT false,
  supplements TEXT,
  water_intake_ml INTEGER,
  alcohol_intake TEXT,
  food_difficulties TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.user_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- health screening
CREATE TABLE public.health_screening (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  pregnant BOOLEAN DEFAULT false,
  breastfeeding BOOLEAN DEFAULT false,
  diabetes BOOLEAN DEFAULT false,
  hypertension BOOLEAN DEFAULT false,
  kidney_disease BOOLEAN DEFAULT false,
  liver_disease BOOLEAN DEFAULT false,
  heart_condition BOOLEAN DEFAULT false,
  eating_disorder BOOLEAN DEFAULT false,
  medications TEXT,
  recent_surgery BOOLEAN DEFAULT false,
  injuries TEXT,
  persistent_pain BOOLEAN DEFAULT false,
  medical_followup BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_screening TO authenticated;
GRANT ALL ON public.health_screening TO service_role;
ALTER TABLE public.health_screening ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own screening" ON public.health_screening FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_screening_updated BEFORE UPDATE ON public.health_screening FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- body assessments
CREATE TABLE public.body_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  assessed_at DATE NOT NULL DEFAULT current_date,
  assessment_type TEXT DEFAULT 'measures',
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  lean_mass_kg NUMERIC,
  fat_mass_kg NUMERIC,
  visceral_fat NUMERIC,
  body_water_pct NUMERIC,
  device_bmr INTEGER,
  weight_kg NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_assessments TO authenticated;
GRANT ALL ON public.body_assessments TO service_role;
ALTER TABLE public.body_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assessments" ON public.body_assessments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  assessment_id UUID REFERENCES public.body_assessments ON DELETE CASCADE,
  measured_at DATE NOT NULL DEFAULT current_date,
  abdomen_cm NUMERIC, waist_cm NUMERIC, hip_cm NUMERIC, chest_cm NUMERIC,
  arm_right_cm NUMERIC, arm_left_cm NUMERIC,
  thigh_right_cm NUMERIC, thigh_left_cm NUMERIC,
  calf_right_cm NUMERIC, calf_left_cm NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_measurements TO authenticated;
GRANT ALL ON public.body_measurements TO service_role;
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own measurements" ON public.body_measurements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  taken_at DATE NOT NULL DEFAULT current_date,
  angle TEXT NOT NULL DEFAULT 'front',
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own photos" ON public.progress_photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- food catalog
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  portion NUMERIC NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT 'g',
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  sodium_mg NUMERIC NOT NULL DEFAULT 0,
  estimated_cost NUMERIC DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.food_items TO authenticated;
GRANT ALL ON public.food_items TO service_role;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read foods" ON public.food_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage foods" ON public.food_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.food_items TO authenticated;

CREATE TABLE public.food_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id UUID NOT NULL REFERENCES public.food_items ON DELETE CASCADE,
  substitute_id UUID NOT NULL REFERENCES public.food_items ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (food_item_id, substitute_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_substitutions TO authenticated;
GRANT ALL ON public.food_substitutions TO service_role;
ALTER TABLE public.food_substitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read subs" ON public.food_substitutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage subs" ON public.food_substitutions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- meal plans
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Minha dieta',
  target_calories INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal plans" ON public.meal_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans ON DELETE CASCADE,
  name TEXT NOT NULL,
  scheduled_time TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meals TO authenticated;
GRANT ALL ON public.meals TO service_role;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meals" ON public.meals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  meal_id UUID NOT NULL REFERENCES public.meals ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT 'g',
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  preparation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_items TO authenticated;
GRANT ALL ON public.meal_items TO service_role;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal items" ON public.meal_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.daily_food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT current_date,
  meal_id UUID REFERENCES public.meals ON DELETE SET NULL,
  meal_name TEXT,
  completed BOOLEAN NOT NULL DEFAULT true,
  calories NUMERIC DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_food_logs TO authenticated;
GRANT ALL ON public.daily_food_logs TO service_role;
ALTER TABLE public.daily_food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food logs" ON public.daily_food_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- exercises
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL DEFAULT 'geral',
  equipment TEXT,
  place TEXT DEFAULT 'gym',
  difficulty TEXT DEFAULT 'iniciante',
  media_url TEXT,
  instructions TEXT,
  alternative_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercises TO authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage exercises" ON public.exercises FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Meu treino',
  split_type TEXT NOT NULL DEFAULT 'full_body',
  days_per_week INTEGER NOT NULL DEFAULT 3,
  duration_min INTEGER NOT NULL DEFAULT 60,
  place TEXT DEFAULT 'gym',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout plans" ON public.workout_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans ON DELETE CASCADE,
  name TEXT NOT NULL,
  muscle_groups TEXT,
  weekday INTEGER,
  estimated_min INTEGER DEFAULT 60,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workouts" ON public.workouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_id UUID NOT NULL REFERENCES public.workouts ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps TEXT NOT NULL DEFAULT '10-12',
  rest_seconds INTEGER NOT NULL DEFAULT 60,
  load_kg NUMERIC,
  notes TEXT,
  difficulty TEXT,
  media_url TEXT,
  alternative_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_exercises TO authenticated;
GRANT ALL ON public.workout_exercises TO service_role;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout exercises" ON public.workout_exercises FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts ON DELETE SET NULL,
  workout_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_min INTEGER,
  total_volume NUMERIC DEFAULT 0,
  avg_difficulty NUMERIC,
  had_pain BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_sessions TO authenticated;
GRANT ALL ON public.workout_sessions TO service_role;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.workout_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.workout_session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.workout_sessions ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL DEFAULT 1,
  reps_done INTEGER,
  load_kg NUMERIC,
  difficulty INTEGER,
  pain BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_session_sets TO authenticated;
GRANT ALL ON public.workout_session_sets TO service_role;
ALTER TABLE public.workout_session_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own session sets" ON public.workout_session_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tracking
CREATE TABLE public.weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT current_date,
  weight_kg NUMERIC,
  avg_weight_kg NUMERIC,
  abdomen_cm NUMERIC,
  diet_adherence INTEGER,
  workouts_done INTEGER,
  hunger INTEGER, energy INTEGER, sleep INTEGER, stress INTEGER, performance INTEGER,
  diet_difficulty TEXT,
  notes TEXT,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_checkins TO authenticated;
GRANT ALL ON public.weekly_checkins TO service_role;
ALTER TABLE public.weekly_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.weekly_checkins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT current_date,
  weight_kg NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT ALL ON public.weight_logs TO service_role;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight logs" ON public.weight_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT current_date,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water logs" ON public.water_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- >>> 2) REVOKES de segurança

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;

-- >>> 3) SEED do catálogo de alimentos + substituições
-- Seed do catálogo de alimentos (FormaFit)
-- Idempotente: pode ser reaplicado com segurança.
-- Valores nutricionais aproximados por 100 g (referência TACO), unit em g/ml.

-- 1) Coluna de tags para filtro de restrições/alergias
ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- 2) Unicidade por nome (permite upsert idempotente)
DO $$ BEGIN
  ALTER TABLE public.food_items ADD CONSTRAINT food_items_name_key UNIQUE (name);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

-- 3) Catálogo
INSERT INTO public.food_items
  (name, category, portion, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, estimated_cost, tags)
VALUES
  -- Proteínas (carnes e aves)
  ('Peito de frango grelhado','proteina',100,'g',165,31,0,3.6,0,70,3.20,ARRAY['animal','carne_branca']),
  ('Sobrecoxa de frango sem pele','proteina',100,'g',180,25,0,8,0,90,2.40,ARRAY['animal','carne_branca']),
  ('Peito de peru','proteina',100,'g',135,29,1,1.5,0,110,4.50,ARRAY['animal','carne_branca']),
  ('Patinho moído cozido','proteina',100,'g',219,27,0,12,0,60,3.80,ARRAY['animal','carne_vermelha']),
  ('Alcatra grelhada','proteina',100,'g',210,27,0,11,0,58,5.20,ARRAY['animal','carne_vermelha']),
  ('Coxão mole grelhado','proteina',100,'g',200,28,0,9,0,55,4.60,ARRAY['animal','carne_vermelha']),
  ('Lombo suíno assado','proteina',100,'g',210,29,0,10,0,65,3.40,ARRAY['animal','carne_vermelha']),
  -- Peixes e frutos do mar
  ('Filé de tilápia grelhado','peixe',100,'g',128,26,0,2.7,0,56,4.00,ARRAY['animal','peixe']),
  ('Salmão grelhado','peixe',100,'g',208,20,0,13,0,59,9.50,ARRAY['animal','peixe']),
  ('Sardinha assada','peixe',100,'g',208,25,0,11,0,90,2.20,ARRAY['animal','peixe']),
  ('Atum em água','peixe',100,'g',116,26,0,1,0,210,3.10,ARRAY['animal','peixe']),
  ('Camarão cozido','peixe',100,'g',99,24,0.2,0.3,0,120,7.80,ARRAY['animal','peixe']),
  -- Ovos
  ('Ovo inteiro','ovo',100,'g',155,13,1.1,11,0,124,1.20,ARRAY['animal','ovo']),
  ('Clara de ovo','ovo',100,'g',52,11,0.7,0.2,0,166,1.00,ARRAY['animal','ovo']),
  -- Leguminosas (fonte vegetal de proteína)
  ('Feijão carioca cozido','leguminosa',100,'g',76,4.8,13.6,0.5,8.5,2,0.80,ARRAY[]::text[]),
  ('Feijão preto cozido','leguminosa',100,'g',77,4.5,14,0.5,8.4,2,0.80,ARRAY[]::text[]),
  ('Lentilha cozida','leguminosa',100,'g',116,9,20,0.4,7.9,2,1.10,ARRAY[]::text[]),
  ('Grão-de-bico cozido','leguminosa',100,'g',164,8.9,27,2.6,7.6,7,1.60,ARRAY[]::text[]),
  ('Ervilha cozida','leguminosa',100,'g',84,5.4,15,0.4,5.5,3,1.00,ARRAY[]::text[]),
  ('Edamame','leguminosa',100,'g',122,11,10,5,5,6,3.20,ARRAY[]::text[]),
  -- Proteínas vegetais densas (veganas)
  ('Tofu firme','proteina',100,'g',144,15,3,8,1,10,2.90,ARRAY[]::text[]),
  ('Tempeh','proteina',100,'g',190,19,9,11,4,10,4.50,ARRAY[]::text[]),
  ('Proteína texturizada de soja','proteina',100,'g',115,14,8,1.5,3,12,1.20,ARRAY[]::text[]),
  -- Carboidratos
  ('Arroz branco cozido','carboidrato',100,'g',128,2.5,28,0.2,1.6,1,0.40,ARRAY[]::text[]),
  ('Arroz integral cozido','carboidrato',100,'g',124,2.6,26,1,2.7,1,0.60,ARRAY[]::text[]),
  ('Batata doce cozida','carboidrato',100,'g',86,1.6,20,0.1,3,9,0.70,ARRAY[]::text[]),
  ('Batata inglesa cozida','carboidrato',100,'g',86,1.7,20,0.1,1.8,5,0.60,ARRAY[]::text[]),
  ('Mandioca cozida','carboidrato',100,'g',125,0.6,30,0.3,1.6,2,0.50,ARRAY[]::text[]),
  ('Macarrão cozido','carboidrato',100,'g',158,5.8,31,0.9,1.8,1,0.90,ARRAY['gluten']),
  ('Pão francês','carboidrato',100,'g',300,8,58,3.1,2.3,640,0.80,ARRAY['gluten']),
  ('Pão integral','carboidrato',100,'g',253,9,43,4,6,470,1.30,ARRAY['gluten']),
  ('Aveia em flocos','carboidrato',100,'g',389,17,66,7,10,2,1.10,ARRAY['gluten']),
  ('Tapioca (goma hidratada)','carboidrato',100,'g',240,0,60,0,0.4,1,0.90,ARRAY[]::text[]),
  ('Cuscuz de milho cozido','carboidrato',100,'g',113,2.4,25,0.6,1.9,5,0.70,ARRAY[]::text[]),
  -- Vegetais
  ('Brócolis cozido','vegetal',100,'g',25,2.1,4,0.4,3,8,1.40,ARRAY[]::text[]),
  ('Alface','vegetal',100,'g',15,1.4,2.9,0.2,2,3,0.90,ARRAY[]::text[]),
  ('Tomate','vegetal',100,'g',18,0.9,3.9,0.2,1.2,5,0.80,ARRAY[]::text[]),
  ('Cenoura cozida','vegetal',100,'g',35,0.8,8,0.2,2.6,50,0.60,ARRAY[]::text[]),
  ('Abobrinha cozida','vegetal',100,'g',17,1.2,3,0.2,1.4,3,0.90,ARRAY[]::text[]),
  ('Couve refogada','vegetal',100,'g',90,2.9,8,5,3.1,20,1.00,ARRAY[]::text[]),
  ('Espinafre cozido','vegetal',100,'g',23,2.9,3.6,0.4,2.2,70,1.20,ARRAY[]::text[]),
  ('Pepino','vegetal',100,'g',15,0.7,3.6,0.1,0.9,2,0.70,ARRAY[]::text[]),
  ('Beterraba cozida','vegetal',100,'g',44,1.7,10,0.2,2,77,0.70,ARRAY[]::text[]),
  -- Frutas
  ('Banana prata','fruta',100,'g',98,1.3,26,0.1,2,1,0.50,ARRAY[]::text[]),
  ('Maçã','fruta',100,'g',56,0.3,15,0.2,1.3,1,0.90,ARRAY[]::text[]),
  ('Mamão','fruta',100,'g',40,0.5,10,0.1,1.8,3,0.70,ARRAY[]::text[]),
  ('Morango','fruta',100,'g',30,0.9,6.8,0.3,1.7,1,2.50,ARRAY[]::text[]),
  ('Laranja','fruta',100,'g',45,1,11,0.2,4,1,0.60,ARRAY[]::text[]),
  ('Abacaxi','fruta',100,'g',48,0.9,12,0.1,1,1,0.80,ARRAY[]::text[]),
  -- Laticínios
  ('Iogurte natural desnatado','laticinio',100,'g',41,3.8,5.9,0.2,0,52,1.10,ARRAY['animal','laticinio','lactose']),
  ('Queijo cottage','laticinio',100,'g',98,11,3.4,4.3,0,360,2.80,ARRAY['animal','laticinio','lactose']),
  ('Queijo minas frescal','laticinio',100,'g',264,17,3,20,0,340,3.60,ARRAY['animal','laticinio','lactose']),
  ('Leite desnatado','laticinio',100,'ml',35,3.4,5,0.1,0,50,0.40,ARRAY['animal','laticinio','lactose']),
  ('Requeijão light','laticinio',100,'g',180,10,4,14,0,380,2.20,ARRAY['animal','laticinio','lactose']),
  -- Gorduras e oleaginosas
  ('Azeite de oliva','gordura',100,'ml',884,0,0,100,0,2,4.00,ARRAY[]::text[]),
  ('Pasta de amendoim','gordura',100,'g',588,25,20,50,6,17,3.50,ARRAY[]::text[]),
  ('Castanha do Pará','gordura',100,'g',656,14,12,66,7.5,3,6.00,ARRAY[]::text[]),
  ('Amêndoas','gordura',100,'g',579,21,22,49,12,1,7.50,ARRAY[]::text[]),
  ('Abacate','gordura',100,'g',96,1.2,6,8,6.3,2,1.50,ARRAY[]::text[]),
  ('Chia','gordura',100,'g',486,17,42,31,34,16,4.20,ARRAY[]::text[]),
  -- Suplementos
  ('Whey protein concentrado','proteina',100,'g',400,80,8,6,0,300,8.00,ARRAY['animal','laticinio','lactose'])
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  portion = EXCLUDED.portion,
  unit = EXCLUDED.unit,
  calories = EXCLUDED.calories,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  fiber_g = EXCLUDED.fiber_g,
  sodium_mg = EXCLUDED.sodium_mg,
  estimated_cost = EXCLUDED.estimated_cost,
  tags = EXCLUDED.tags,
  is_active = true;

-- 4) Substituições equivalentes (bidirecionais)
WITH pairs(a_name, b_name) AS (
  VALUES
    -- Carboidratos
    ('Arroz branco cozido','Arroz integral cozido'),
    ('Arroz branco cozido','Batata doce cozida'),
    ('Arroz branco cozido','Batata inglesa cozida'),
    ('Arroz branco cozido','Mandioca cozida'),
    ('Arroz branco cozido','Macarrão cozido'),
    ('Batata doce cozida','Batata inglesa cozida'),
    ('Batata doce cozida','Mandioca cozida'),
    ('Pão francês','Pão integral'),
    ('Pão francês','Tapioca (goma hidratada)'),
    ('Aveia em flocos','Cuscuz de milho cozido'),
    -- Proteínas
    ('Peito de frango grelhado','Filé de tilápia grelhado'),
    ('Peito de frango grelhado','Patinho moído cozido'),
    ('Peito de frango grelhado','Peito de peru'),
    ('Peito de frango grelhado','Lombo suíno assado'),
    ('Peito de frango grelhado','Sobrecoxa de frango sem pele'),
    ('Filé de tilápia grelhado','Salmão grelhado'),
    ('Filé de tilápia grelhado','Sardinha assada'),
    ('Filé de tilápia grelhado','Atum em água'),
    ('Patinho moído cozido','Alcatra grelhada'),
    ('Patinho moído cozido','Coxão mole grelhado'),
    -- Leguminosas
    ('Feijão carioca cozido','Feijão preto cozido'),
    ('Feijão carioca cozido','Lentilha cozida'),
    ('Feijão carioca cozido','Grão-de-bico cozido'),
    -- Ovos e proteína vegetal
    ('Ovo inteiro','Clara de ovo'),
    ('Ovo inteiro','Tofu firme'),
    ('Tofu firme','Tempeh'),
    ('Tofu firme','Proteína texturizada de soja'),
    ('Peito de frango grelhado','Tofu firme'),
    -- Frutas
    ('Banana prata','Maçã'),
    ('Banana prata','Mamão'),
    ('Banana prata','Laranja'),
    ('Banana prata','Abacaxi'),
    ('Maçã','Morango'),
    -- Laticínios
    ('Iogurte natural desnatado','Queijo cottage'),
    ('Iogurte natural desnatado','Leite desnatado'),
    -- Gorduras
    ('Azeite de oliva','Pasta de amendoim'),
    ('Azeite de oliva','Abacate'),
    ('Pasta de amendoim','Castanha do Pará'),
    ('Pasta de amendoim','Amêndoas'),
    -- Vegetais
    ('Brócolis cozido','Cenoura cozida'),
    ('Brócolis cozido','Abobrinha cozida'),
    ('Brócolis cozido','Espinafre cozido'),
    ('Alface','Tomate'),
    ('Alface','Pepino')
),
directed(food_item_id, substitute_id) AS (
  SELECT a.id, b.id FROM pairs
    JOIN public.food_items a ON a.name = pairs.a_name
    JOIN public.food_items b ON b.name = pairs.b_name
  UNION
  SELECT b.id, a.id FROM pairs
    JOIN public.food_items a ON a.name = pairs.a_name
    JOIN public.food_items b ON b.name = pairs.b_name
)
INSERT INTO public.food_substitutions (food_item_id, substitute_id)
SELECT food_item_id, substitute_id FROM directed
ON CONFLICT (food_item_id, substitute_id) DO NOTHING;

-- >>> 4) SEED do catálogo de exercícios
-- Seed do catálogo de exercícios (FormaFit)
-- Idempotente: pode ser reaplicado. place = 'gym' (academia) ou 'home' (casa/peso do corpo).

DO $$ BEGIN
  ALTER TABLE public.exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;

INSERT INTO public.exercises (name, muscle_group, equipment, place, difficulty, alternative_name)
VALUES
  -- Peito
  ('Supino reto com barra','peito','barra','gym','intermediario','Flexão de braço'),
  ('Supino inclinado com halteres','peito','halteres','gym','intermediario','Flexão inclinada'),
  ('Crucifixo na máquina','peito','maquina','gym','iniciante','Crucifixo com halteres'),
  ('Flexão de braço','peito','peso_corporal','home','iniciante','Flexão com joelhos'),
  ('Flexão inclinada','peito','peso_corporal','home','iniciante','Flexão na parede'),
  -- Costas
  ('Puxada frontal','costas','maquina','gym','iniciante','Remada com elástico'),
  ('Remada curvada com barra','costas','barra','gym','intermediario','Remada com halteres'),
  ('Remada unilateral com halter','costas','halteres','gym','iniciante','Remada no banco'),
  ('Barra fixa','costas','barra','gym','avancado','Remada invertida'),
  ('Remada com elástico','costas','elasticos','home','iniciante','Remada na toalha'),
  ('Superman','costas','peso_corporal','home','iniciante','Extensão lombar'),
  -- Pernas
  ('Agachamento livre','pernas','barra','gym','intermediario','Agachamento no peso do corpo'),
  ('Leg press','pernas','maquina','gym','iniciante','Agachamento na parede'),
  ('Cadeira extensora','pernas','maquina','gym','iniciante','Agachamento isométrico'),
  ('Agachamento no peso do corpo','pernas','peso_corporal','home','iniciante','Agachamento na cadeira'),
  ('Afundo','pernas','peso_corporal','home','iniciante','Passada'),
  ('Agachamento búlgaro','pernas','halteres','home','intermediario','Afundo'),
  -- Posterior de coxa
  ('Stiff com barra','posterior','barra','gym','intermediario','Stiff com halteres'),
  ('Mesa flexora','posterior','maquina','gym','iniciante','Flexora deitada'),
  ('Stiff com halteres','posterior','halteres','gym','iniciante','Good morning'),
  ('Good morning','posterior','barra','gym','intermediario','Stiff'),
  ('Flexão nórdica','posterior','peso_corporal','home','avancado','Elevação pélvica'),
  -- Glúteos
  ('Elevação pélvica','gluteos','barra','home','iniciante','Ponte de glúteo'),
  ('Ponte de glúteo unilateral','gluteos','peso_corporal','home','iniciante','Ponte de glúteo'),
  ('Agachamento sumô','gluteos','halteres','home','iniciante','Agachamento sumô livre'),
  ('Coice na máquina','gluteos','maquina','gym','iniciante','Coice com caneleira'),
  ('Abdução na máquina','gluteos','maquina','gym','iniciante','Abdução com elástico'),
  -- Ombros
  ('Desenvolvimento com halteres','ombros','halteres','gym','iniciante','Desenvolvimento sentado'),
  ('Desenvolvimento militar com barra','ombros','barra','gym','intermediario','Desenvolvimento com halteres'),
  ('Elevação lateral','ombros','halteres','gym','iniciante','Elevação lateral com elástico'),
  ('Elevação lateral com elástico','ombros','elasticos','home','iniciante','Elevação lateral com garrafa'),
  ('Pike push-up','ombros','peso_corporal','home','intermediario','Flexão pique'),
  -- Bíceps
  ('Rosca direta com barra','biceps','barra','gym','iniciante','Rosca com halteres'),
  ('Rosca alternada com halteres','biceps','halteres','gym','iniciante','Rosca com elástico'),
  ('Rosca martelo','biceps','halteres','gym','iniciante','Rosca martelo com garrafa'),
  ('Rosca com elástico','biceps','elasticos','home','iniciante','Rosca com mochila'),
  -- Tríceps
  ('Tríceps na polia','triceps','maquina','gym','iniciante','Tríceps com elástico'),
  ('Tríceps testa','triceps','barra','gym','intermediario','Tríceps francês'),
  ('Tríceps francês com halter','triceps','halteres','gym','iniciante','Tríceps testa'),
  ('Mergulho no banco','triceps','peso_corporal','home','iniciante','Tríceps no banco'),
  ('Flexão diamante','triceps','peso_corporal','home','intermediario','Flexão fechada'),
  -- Abdômen
  ('Abdominal supra','abdomen','peso_corporal','home','iniciante','Abdominal curto'),
  ('Prancha','abdomen','peso_corporal','home','iniciante','Prancha nos joelhos'),
  ('Elevação de pernas','abdomen','peso_corporal','home','iniciante','Elevação de joelhos'),
  ('Prancha lateral','abdomen','peso_corporal','home','iniciante','Prancha lateral nos joelhos'),
  ('Abdominal na máquina','abdomen','maquina','gym','iniciante','Abdominal supra'),
  -- Panturrilha
  ('Panturrilha em pé','panturrilha','maquina','gym','iniciante','Panturrilha no degrau'),
  ('Panturrilha sentado','panturrilha','maquina','gym','iniciante','Panturrilha unilateral'),
  ('Panturrilha no degrau','panturrilha','peso_corporal','home','iniciante','Panturrilha no chão'),
  -- Cardio
  ('Corrida','cardio','peso_corporal','home','iniciante','Caminhada rápida'),
  ('Pular corda','cardio','peso_corporal','home','iniciante','Corrida no lugar'),
  ('Polichinelo','cardio','peso_corporal','home','iniciante','Marcha no lugar'),
  ('Burpee','cardio','peso_corporal','home','intermediario','Agachamento com salto'),
  ('Bike ergométrica','cardio','maquina','gym','iniciante','Corrida')
ON CONFLICT (name) DO UPDATE SET
  muscle_group = EXCLUDED.muscle_group,
  equipment = EXCLUDED.equipment,
  place = EXCLUDED.place,
  difficulty = EXCLUDED.difficulty,
  alternative_name = EXCLUDED.alternative_name,
  is_active = true;
