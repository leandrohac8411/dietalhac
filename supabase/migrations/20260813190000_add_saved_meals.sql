-- Refeições/receitas pessoais reutilizáveis.
-- Os ingredientes ficam armazenados como um snapshot JSON para preservar
-- exatamente os valores usados pelo usuário no momento em que salvou.

CREATE TABLE public.saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 100),
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  calories NUMERIC NOT NULL DEFAULT 0 CHECK (calories >= 0),
  protein_g NUMERIC NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g NUMERIC NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g NUMERIC NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX saved_meals_user_updated_idx
  ON public.saved_meals (user_id, updated_at DESC);

CREATE TRIGGER trg_saved_meals_updated
  BEFORE UPDATE ON public.saved_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_meals TO authenticated;
GRANT ALL ON public.saved_meals TO service_role;

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own saved meals" ON public.saved_meals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
