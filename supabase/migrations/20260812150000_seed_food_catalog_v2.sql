-- Amplia o catálogo de alimentos (NEXO) para reduzir repetição nas dietas geradas.
-- Idempotente: pode ser reaplicado com segurança. Valores nutricionais aproximados
-- por 100 g (referência TACO), unit em g/ml.

INSERT INTO public.food_items
  (name, category, portion, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, estimated_cost, tags)
VALUES
  -- Proteínas (carnes e aves)
  ('Filé mignon grelhado','proteina',100,'g',225,26,0,13,0,60,7.50,ARRAY['animal','carne_vermelha']),
  ('Peito de frango desfiado','proteina',100,'g',165,31,0,3.6,0,70,3.20,ARRAY['animal','carne_branca']),
  ('Coxa de frango sem pele assada','proteina',100,'g',177,24,0,8.5,0,88,2.30,ARRAY['animal','carne_branca']),
  ('Fígado bovino grelhado','proteina',100,'g',175,26,4,4.6,0,70,2.80,ARRAY['animal','carne_vermelha']),
  ('Carne de panela (músculo)','proteina',100,'g',220,26,0,12,0,62,4.20,ARRAY['animal','carne_vermelha']),
  -- Peixes e frutos do mar
  ('Merluza grelhada','peixe',100,'g',110,21,0,2.3,0,80,3.60,ARRAY['animal','peixe']),
  ('Pescada assada','peixe',100,'g',105,20,0,2,0,75,3.80,ARRAY['animal','peixe']),
  ('Lula grelhada','peixe',100,'g',92,16,3,1.4,0,44,6.50,ARRAY['animal','peixe']),
  -- Ovos
  ('Ovo cozido','ovo',100,'g',155,13,1.1,11,0,124,1.20,ARRAY['animal','ovo']),
  ('Omelete simples','ovo',100,'g',154,11,1.6,11,0,200,1.30,ARRAY['animal','ovo']),
  -- Leguminosas
  ('Feijão branco cozido','leguminosa',100,'g',139,9.7,25,0.5,6.3,2,1.00,ARRAY[]::text[]),
  ('Feijão fradinho cozido','leguminosa',100,'g',116,7.9,21,0.6,6.5,2,0.90,ARRAY[]::text[]),
  ('Soja cozida','leguminosa',100,'g',173,18,9,9,6,2,1.40,ARRAY[]::text[]),
  -- Proteínas vegetais
  ('Seitan','proteina',100,'g',370,75,14,2,1,20,5.50,ARRAY['gluten']),
  ('Grão-de-bico assado (snack)','leguminosa',100,'g',269,14,45,4,10,7,2.20,ARRAY[]::text[]),
  -- Carboidratos
  ('Arroz parboilizado cozido','carboidrato',100,'g',123,2.6,26,0.3,1.8,1,0.50,ARRAY[]::text[]),
  ('Quinoa cozida','carboidrato',100,'g',120,4.4,21,1.9,2.8,5,2.60,ARRAY[]::text[]),
  ('Inhame cozido','carboidrato',100,'g',97,1.5,23,0.2,4,9,0.90,ARRAY[]::text[]),
  ('Cará cozido','carboidrato',100,'g',98,1.6,23,0.1,3.9,10,0.90,ARRAY[]::text[]),
  ('Batata baroa cozida','carboidrato',100,'g',80,1.1,18,0.3,1.6,7,0.80,ARRAY[]::text[]),
  ('Milho cozido','carboidrato',100,'g',98,3.4,21,1.2,2.4,15,0.70,ARRAY[]::text[]),
  ('Pão de forma integral','carboidrato',100,'g',246,10,43,3.5,7,480,1.20,ARRAY['gluten']),
  ('Pão sírio integral','carboidrato',100,'g',275,10,52,2,8,520,1.30,ARRAY['gluten']),
  ('Granola sem açúcar','carboidrato',100,'g',471,10,64,20,8,10,2.10,ARRAY['gluten']),
  ('Batata doce roxa cozida','carboidrato',100,'g',90,1.7,21,0.1,3.2,10,0.80,ARRAY[]::text[]),
  -- Vegetais
  ('Couve-flor cozida','vegetal',100,'g',23,1.9,4.4,0.3,2.3,10,1.20,ARRAY[]::text[]),
  ('Repolho refogado','vegetal',100,'g',24,1.3,5,0.2,2.1,15,0.70,ARRAY[]::text[]),
  ('Vagem refogada','vegetal',100,'g',31,1.9,7,0.2,2.5,4,1.10,ARRAY[]::text[]),
  ('Abóbora cozida','vegetal',100,'g',26,1,6.5,0.1,1.5,1,0.70,ARRAY[]::text[]),
  ('Chuchu cozido','vegetal',100,'g',19,0.6,4.5,0.1,1.3,2,0.70,ARRAY[]::text[]),
  ('Berinjela grelhada','vegetal',100,'g',25,1,6,0.2,3,2,1.00,ARRAY[]::text[]),
  ('Rúcula','vegetal',100,'g',25,2.6,3.7,0.7,1.6,27,1.30,ARRAY[]::text[]),
  ('Pimentão','vegetal',100,'g',20,0.9,4.6,0.2,1.7,2,0.90,ARRAY[]::text[]),
  ('Cogumelo paris','vegetal',100,'g',22,3.1,3.3,0.3,1,5,3.50,ARRAY[]::text[]),
  ('Aspargos cozidos','vegetal',100,'g',20,2.2,3.7,0.1,2.1,2,4.50,ARRAY[]::text[]),
  -- Frutas
  ('Uva','fruta',100,'g',69,0.7,18,0.2,0.9,2,1.30,ARRAY[]::text[]),
  ('Melancia','fruta',100,'g',30,0.6,8,0.2,0.4,1,0.50,ARRAY[]::text[]),
  ('Melão','fruta',100,'g',29,0.7,7.5,0.1,0.9,10,0.70,ARRAY[]::text[]),
  ('Kiwi','fruta',100,'g',61,1.1,15,0.5,3,3,1.90,ARRAY[]::text[]),
  ('Pera','fruta',100,'g',57,0.4,15,0.1,3.1,1,1.00,ARRAY[]::text[]),
  ('Manga','fruta',100,'g',60,0.8,15,0.4,1.6,1,1.10,ARRAY[]::text[]),
  ('Maracujá','fruta',100,'g',68,2,12,2,10,3,1.60,ARRAY[]::text[]),
  ('Frutas vermelhas (mix congelado)','fruta',100,'g',43,0.8,10,0.4,3.5,2,3.80,ARRAY[]::text[]),
  ('Tangerina','fruta',100,'g',53,0.8,13,0.2,1.8,1,0.60,ARRAY[]::text[]),
  -- Laticínios
  ('Iogurte grego natural','laticinio',100,'g',97,9,4,5,0,36,2.40,ARRAY['animal','laticinio','lactose']),
  ('Skyr natural','laticinio',100,'g',63,11,4,0.2,0,45,2.90,ARRAY['animal','laticinio','lactose']),
  ('Queijo mussarela light','laticinio',100,'g',254,24,3,16,0,600,4.20,ARRAY['animal','laticinio','lactose']),
  ('Ricota','laticinio',100,'g',140,11,3,9,0,84,3.10,ARRAY['animal','laticinio','lactose']),
  ('Leite desnatado sem lactose','laticinio',100,'ml',35,3.4,5,0.1,0,50,0.60,ARRAY['animal','laticinio']),
  ('Bebida vegetal de amêndoas','laticinio',100,'ml',24,0.6,3,1.5,0.3,40,1.80,ARRAY[]::text[]),
  ('Bebida vegetal de aveia','laticinio',100,'ml',45,1,7,1.5,0.8,30,1.60,ARRAY['gluten']),
  -- Gorduras e oleaginosas
  ('Óleo de coco','gordura',100,'ml',862,0,0,99,0,1,5.50,ARRAY[]::text[]),
  ('Castanha de caju','gordura',100,'g',553,18,30,44,3.3,12,6.80,ARRAY[]::text[]),
  ('Nozes','gordura',100,'g',654,15,14,65,6.7,2,8.20,ARRAY[]::text[]),
  ('Semente de girassol','gordura',100,'g',584,21,20,51,8.6,9,3.00,ARRAY[]::text[]),
  ('Linhaça','gordura',100,'g',534,18,29,42,27,30,3.20,ARRAY[]::text[]),
  ('Gergelim','gordura',100,'g',573,18,23,50,12,11,3.60,ARRAY[]::text[]),
  -- Suplementos
  ('Whey protein isolado','proteina',100,'g',370,85,3,1,0,250,9.50,ARRAY['animal','laticinio','lactose']),
  ('Proteína vegana (ervilha/arroz)','proteina',100,'g',380,75,10,4,3,300,10.00,ARRAY[]::text[]),
  ('Creatina monohidratada','suplemento',5,'g',0,0,0,0,0,0,1.00,ARRAY[]::text[]),
  ('Barra de proteína','proteina',100,'g',360,30,35,10,5,180,2.20,ARRAY['gluten'])
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

-- Substituições equivalentes (bidirecionais) envolvendo os novos itens
WITH pairs(a_name, b_name) AS (
  VALUES
    -- Carboidratos
    ('Arroz branco cozido','Arroz parboilizado cozido'),
    ('Arroz branco cozido','Quinoa cozida'),
    ('Batata doce cozida','Inhame cozido'),
    ('Batata doce cozida','Cará cozido'),
    ('Batata doce cozida','Batata baroa cozida'),
    ('Batata doce cozida','Batata doce roxa cozida'),
    ('Batata inglesa cozida','Milho cozido'),
    ('Pão integral','Pão de forma integral'),
    ('Pão integral','Pão sírio integral'),
    ('Aveia em flocos','Granola sem açúcar'),
    -- Proteínas
    ('Peito de frango grelhado','Peito de frango desfiado'),
    ('Peito de frango grelhado','Coxa de frango sem pele assada'),
    ('Alcatra grelhada','Filé mignon grelhado'),
    ('Alcatra grelhada','Carne de panela (músculo)'),
    ('Patinho moído cozido','Fígado bovino grelhado'),
    ('Filé de tilápia grelhado','Merluza grelhada'),
    ('Filé de tilápia grelhado','Pescada assada'),
    ('Camarão cozido','Lula grelhada'),
    ('Ovo inteiro','Ovo cozido'),
    ('Ovo inteiro','Omelete simples'),
    ('Feijão preto cozido','Feijão branco cozido'),
    ('Feijão preto cozido','Feijão fradinho cozido'),
    ('Grão-de-bico cozido','Soja cozida'),
    ('Tofu firme','Seitan'),
    ('Whey protein concentrado','Whey protein isolado'),
    ('Whey protein concentrado','Proteína vegana (ervilha/arroz)'),
    -- Frutas
    ('Banana prata','Uva'),
    ('Banana prata','Manga'),
    ('Maçã','Pera'),
    ('Maçã','Kiwi'),
    ('Morango','Frutas vermelhas (mix congelado)'),
    ('Laranja','Tangerina'),
    ('Mamão','Melão'),
    ('Abacaxi','Melancia'),
    ('Abacaxi','Maracujá'),
    -- Laticínios
    ('Iogurte natural desnatado','Iogurte grego natural'),
    ('Iogurte natural desnatado','Skyr natural'),
    ('Queijo cottage','Ricota'),
    ('Queijo minas frescal','Queijo mussarela light'),
    ('Leite desnatado','Bebida vegetal de amêndoas'),
    ('Leite desnatado','Bebida vegetal de aveia'),
    -- Gorduras
    ('Castanha do Pará','Castanha de caju'),
    ('Castanha do Pará','Nozes'),
    ('Amêndoas','Semente de girassol'),
    ('Chia','Linhaça'),
    ('Chia','Gergelim'),
    ('Azeite de oliva','Óleo de coco'),
    -- Vegetais
    ('Brócolis cozido','Couve-flor cozida'),
    ('Brócolis cozido','Aspargos cozidos'),
    ('Abobrinha cozida','Chuchu cozido'),
    ('Abobrinha cozida','Berinjela grelhada'),
    ('Cenoura cozida','Abóbora cozida'),
    ('Couve refogada','Repolho refogado'),
    ('Couve refogada','Vagem refogada'),
    ('Alface','Rúcula'),
    ('Tomate','Pimentão'),
    ('Espinafre cozido','Cogumelo paris')
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
