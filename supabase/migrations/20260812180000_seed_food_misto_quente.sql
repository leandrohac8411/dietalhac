-- Misto quente (pão, presunto, queijo grelhados) — item do dia a dia pedido pelo usuário.
-- Categoria 'outros': não entra no gerador automático, só no registro livre.
INSERT INTO public.food_items
  (name, category, portion, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, estimated_cost, tags)
VALUES
  ('Misto quente','outros',100,'g',290,14,28,13,1.5,650,2.50,ARRAY['gluten','laticinio','carne_processada'])
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
