-- Itens comuns de almoço brasileiro e churrasco para o registro do consumo real.
-- Categoria "outros": ficam disponíveis na busca, mas não entram automaticamente
-- no gerador de dieta. Valores médios por 100 g; preparações caseiras variam.

INSERT INTO public.food_items
  (name, category, portion, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, estimated_cost, tags)
VALUES
  ('Feijão tropeiro','outros',100,'g',163,8.7,17.9,6.5,5.5,330,2.80,ARRAY['brasileiro','caseiro','carne_processada']),
  ('Farofa de bacon','outros',100,'g',420,6,54,20,3,650,3.20,ARRAY['brasileiro','caseiro','carne_processada']),
  ('Carne de sol assada','outros',100,'g',300,32,0,19,0,1800,8.00,ARRAY['animal','carne_vermelha','alto_sodio']),
  ('Mandioca frita','outros',100,'g',300,1.5,50,11,2,100,2.50,ARRAY['brasileiro','frito']),
  ('Picanha assada no churrasco','outros',100,'g',289,26,0,20,0,65,9.00,ARRAY['animal','carne_vermelha','churrasco']),
  ('Linguiça toscana assada','outros',100,'g',296,18,1,24,0,1100,4.50,ARRAY['animal','carne_processada','churrasco']),
  ('Pão de alho assado','outros',100,'g',350,7,45,16,2,600,3.50,ARRAY['gluten','laticinio','churrasco']),
  ('Queijo coalho grelhado','outros',100,'g',320,23,3,24,0,650,6.00,ARRAY['animal','laticinio','lactose','churrasco']),
  ('Vinagrete de tomate e cebola','outros',100,'g',45,1,7,1.5,1.8,210,1.80,ARRAY['vegetal','brasileiro','churrasco'])
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
