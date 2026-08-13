-- Preserva os alimentos e quantidades que compõem uma refeição realmente consumida.
ALTER TABLE public.daily_food_logs
  ADD COLUMN IF NOT EXISTS consumed_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.daily_food_logs
  DROP CONSTRAINT IF EXISTS daily_food_logs_consumed_items_array;

ALTER TABLE public.daily_food_logs
  ADD CONSTRAINT daily_food_logs_consumed_items_array
  CHECK (jsonb_typeof(consumed_items) = 'array');
