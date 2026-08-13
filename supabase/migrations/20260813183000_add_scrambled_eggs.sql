-- Cadastra ovos mexidos sem gordura adicionada como alimento pesquisável.
-- Queijo, manteiga, azeite, frango ou carne devem ser registrados como
-- componentes separados para que suas calorias também sejam contabilizadas.

INSERT INTO public.food_items
  (name, category, portion, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, estimated_cost, tags)
VALUES
  ('Ovos mexidos sem óleo','ovo',100,'g',155,13,1.1,11,0,124,1.20,ARRAY['animal','ovo']::text[])
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

WITH pairs(a_name, b_name) AS (
  VALUES
    ('Ovo inteiro', 'Ovos mexidos sem óleo'),
    ('Omelete simples', 'Ovos mexidos sem óleo')
),
directed(food_item_id, substitute_id) AS (
  SELECT a.id, b.id
  FROM pairs
  JOIN public.food_items a ON a.name = pairs.a_name
  JOIN public.food_items b ON b.name = pairs.b_name
  UNION
  SELECT b.id, a.id
  FROM pairs
  JOIN public.food_items a ON a.name = pairs.a_name
  JOIN public.food_items b ON b.name = pairs.b_name
)
INSERT INTO public.food_substitutions (food_item_id, substitute_id)
SELECT food_item_id, substitute_id
FROM directed
ON CONFLICT (food_item_id, substitute_id) DO NOTHING;
