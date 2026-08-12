-- Alimentos do dia a dia (frios, pão, condimentos) e itens "fora da dieta" (besteiras)
-- que o usuário realmente come às vezes. Os itens de categoria 'outros' nunca entram no
-- gerador automático de dieta (o picker só usa categorias específicas) — servem apenas
-- para o registro livre "o que comi hoje", para dar uma contagem de kcal realista.
-- Idempotente. Valores aproximados por 100 g (referência TACO/rótulos), unit em g/ml.

INSERT INTO public.food_items
  (name, category, portion, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, estimated_cost, tags)
VALUES
  -- Frios e dia a dia (podem entrar em lanches gerados)
  ('Presunto cozido','proteina',100,'g',105,17,2,3,0,1100,3.20,ARRAY['animal','carne_processada']),
  ('Peito de peru fatiado (frios)','proteina',100,'g',95,18,2,1.5,0,950,4.80,ARRAY['animal','carne_processada']),
  ('Mussarela fatiada','laticinio',100,'g',280,22,2,21,0,560,3.60,ARRAY['animal','laticinio','lactose']),
  ('Manteiga','gordura',100,'g',717,0.9,0.1,81,0,11,3.00,ARRAY['animal','laticinio','lactose']),
  ('Maionese','gordura',100,'g',680,1,2,75,0,470,2.20,ARRAY['animal','ovo']),
  ('Pão de forma branco','carboidrato',100,'g',270,8,50,3.5,2.5,490,1.00,ARRAY['gluten']),
  -- "Besteiras" / fora da dieta — só para registro livre, não entram no gerador
  ('Bolo de chocolate','outros',100,'g',371,5,55,15,2.5,300,2.50,ARRAY['gluten','laticinio']),
  ('Pizza de mussarela','outros',100,'g',266,11,33,10,2,600,3.50,ARRAY['gluten','laticinio']),
  ('Hambúrguer com pão e queijo','outros',100,'g',280,14,25,14,1.5,520,4.00,ARRAY['gluten','laticinio']),
  ('Batata frita','outros',100,'g',312,3.4,41,15,3.8,210,2.00,ARRAY[]::text[]),
  ('Refrigerante','outros',100,'ml',42,0,10.6,0,0,10,0.30,ARRAY[]::text[]),
  ('Chocolate ao leite','outros',100,'g',534,7.6,59,30,3.4,80,3.50,ARRAY['laticinio']),
  ('Sorvete de creme','outros',100,'g',207,3.5,24,11,0.5,80,2.80,ARRAY['laticinio']),
  ('Salgadinho de pacote','outros',100,'g',536,6,58,32,3,900,1.80,ARRAY['gluten']),
  ('Biscoito recheado','outros',100,'g',480,5,68,20,2,300,1.50,ARRAY['gluten']),
  ('Cerveja','outros',100,'ml',43,0.5,3.6,0,0,4,0.60,ARRAY['gluten']),
  ('Coxinha','outros',100,'g',280,10,25,16,1.5,450,2.20,ARRAY['gluten']),
  ('Pão de queijo','outros',100,'g',330,7,32,19,1,420,2.00,ARRAY['laticinio'])
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
