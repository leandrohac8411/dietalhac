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
