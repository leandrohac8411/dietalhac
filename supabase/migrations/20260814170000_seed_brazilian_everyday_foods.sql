-- Expansão do catálogo de consumo real: carnes, aves, peixes, frituras,
-- comida japonesa e pratos regionais brasileiros. Valores médios por 100 g.
-- Todos ficam em "outros": aparecem na busca, mas não entram no gerador da dieta.

INSERT INTO public.food_items
  (name, category, portion, unit, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, estimated_cost, tags)
VALUES
  -- Carnes bovinas e churrasco
  ('Picanha grelhada com gordura','outros',100,'g',289,26,0,20,0,65,9.00,ARRAY['animal','carne_vermelha','churrasco']),
  ('Picanha grelhada sem gordura','outros',100,'g',238,31,0,12,0,60,9.00,ARRAY['animal','carne_vermelha','churrasco']),
  ('Contrafilé grelhado','outros',100,'g',278,32,0,17,0,70,7.00,ARRAY['animal','carne_vermelha','churrasco']),
  ('Filé mignon grelhado','outros',100,'g',220,32,0,10,0,65,10.00,ARRAY['animal','carne_vermelha']),
  ('Maminha assada','outros',100,'g',230,30,0,12,0,65,7.00,ARRAY['animal','carne_vermelha','churrasco']),
  ('Fraldinha assada','outros',100,'g',255,29,0,15,0,70,7.00,ARRAY['animal','carne_vermelha','churrasco']),
  ('Cupim assado','outros',100,'g',330,28,0,24,0,75,7.50,ARRAY['animal','carne_vermelha','churrasco']),
  ('Costela bovina assada','outros',100,'g',373,29,0,28,0,70,6.50,ARRAY['animal','carne_vermelha','churrasco']),
  ('Acém cozido','outros',100,'g',215,27,0,12,0,65,5.00,ARRAY['animal','carne_vermelha']),
  ('Carne de panela com molho','outros',100,'g',195,24,4,9,0.5,280,5.50,ARRAY['animal','carne_vermelha','caseiro']),
  ('Carne moída refogada','outros',100,'g',212,26,2,11,0,310,5.00,ARRAY['animal','carne_vermelha','caseiro']),
  ('Bife acebolado','outros',100,'g',220,27,4,11,0.6,330,6.00,ARRAY['animal','carne_vermelha','caseiro']),
  ('Bife à milanesa','outros',100,'g',315,22,18,17,1,430,6.50,ARRAY['animal','carne_vermelha','frito','gluten']),
  ('Carne seca cozida','outros',100,'g',313,37,0,17,0,1940,8.00,ARRAY['animal','carne_vermelha','alto_sodio']),
  ('Rabada cozida','outros',100,'g',260,25,2,17,0,340,6.50,ARRAY['animal','carne_vermelha','caseiro']),
  ('Churrasco misto','outros',100,'g',290,26,1,20,0,520,7.00,ARRAY['animal','carne_vermelha','carne_processada','churrasco']),

  -- Frango e outras aves
  ('Peito de frango grelhado','outros',100,'g',165,31,0,3.6,0,75,4.50,ARRAY['animal','frango']),
  ('Frango assado com pele','outros',100,'g',239,27,0,14,0,180,4.00,ARRAY['animal','frango']),
  ('Coxa de frango assada com pele','outros',100,'g',215,24,0,13,0,190,3.50,ARRAY['animal','frango']),
  ('Sobrecoxa de frango assada','outros',100,'g',232,24,0,15,0,200,3.80,ARRAY['animal','frango']),
  ('Asa de frango assada','outros',100,'g',290,27,0,20,0,230,3.50,ARRAY['animal','frango','churrasco']),
  ('Coração de frango no churrasco','outros',100,'g',207,26,1,11,0,220,5.00,ARRAY['animal','frango','churrasco']),
  ('Frango a passarinho','outros',100,'g',270,24,7,16,0.5,420,4.50,ARRAY['animal','frango','frito']),
  ('Filé de frango empanado','outros',100,'g',260,21,17,12,1,460,4.50,ARRAY['animal','frango','frito','gluten']),
  ('Strogonoff de frango','outros',100,'g',175,18,5,9,0.3,360,4.50,ARRAY['animal','frango','laticinio','caseiro']),
  ('Frango com quiabo','outros',100,'g',155,18,5,7,2,300,4.00,ARRAY['animal','frango','mineiro']),
  ('Galinhada','outros',100,'g',175,10,22,5,0.8,300,3.50,ARRAY['animal','frango','brasileiro']),
  ('Medalhão de frango com bacon','outros',100,'g',245,23,1,17,0,620,6.00,ARRAY['animal','frango','carne_processada']),

  -- Porco e embutidos
  ('Bisteca suína grelhada','outros',100,'g',240,28,0,14,0,90,4.50,ARRAY['animal','suino']),
  ('Lombo suíno assado','outros',100,'g',210,30,0,10,0,90,5.00,ARRAY['animal','suino']),
  ('Pernil suíno assado','outros',100,'g',260,28,0,16,0,120,4.50,ARRAY['animal','suino']),
  ('Costelinha suína assada','outros',100,'g',360,24,2,28,0,360,5.00,ARRAY['animal','suino','churrasco']),
  ('Torresmo','outros',100,'g',610,30,0,54,0,760,4.50,ARRAY['animal','suino','frito']),
  ('Bacon frito','outros',100,'g',541,37,1,42,0,1710,5.00,ARRAY['animal','suino','carne_processada']),
  ('Leitão assado','outros',100,'g',305,27,0,22,0,120,7.50,ARRAY['animal','suino','regional']),

  -- Peixes e frutos do mar
  ('Tilápia frita','outros',100,'g',220,25,8,10,0.5,300,6.00,ARRAY['animal','peixe','frito']),
  ('Peixe frito empanado','outros',100,'g',245,20,15,12,0.8,390,6.00,ARRAY['animal','peixe','frito','gluten']),
  ('Sardinha frita','outros',100,'g',250,26,3,15,0,360,4.50,ARRAY['animal','peixe','frito']),
  ('Salmão grelhado','outros',100,'g',208,22,0,13,0,60,10.00,ARRAY['animal','peixe']),
  ('Bacalhau cozido','outros',100,'g',140,29,1,2,0,1200,12.00,ARRAY['animal','peixe','alto_sodio']),
  ('Camarão alho e óleo','outros',100,'g',180,23,3,8,0,500,10.00,ARRAY['animal','frutos_do_mar']),
  ('Camarão empanado frito','outros',100,'g',265,18,20,13,1,560,10.00,ARRAY['animal','frutos_do_mar','frito','gluten']),
  ('Moqueca de peixe baiana','outros',100,'g',145,14,4,8,1,390,7.00,ARRAY['animal','peixe','bahiano','dende','coco']),
  ('Bobó de camarão','outros',100,'g',185,10,14,10,1.5,440,8.00,ARRAY['animal','frutos_do_mar','bahiano','dende','coco']),

  -- Frituras, salgados e acompanhamentos
  ('Batata frita palito','outros',100,'g',312,3.4,41,15,3.8,210,2.50,ARRAY['frito']),
  ('Batata rústica frita','outros',100,'g',285,4,39,13,4,250,2.80,ARRAY['frito']),
  ('Polenta frita','outros',100,'g',240,3,31,12,2,350,2.00,ARRAY['frito','milho']),
  ('Anéis de cebola empanados','outros',100,'g',330,4,40,17,2,520,3.00,ARRAY['frito','gluten']),
  ('Pastel de carne','outros',100,'g',325,11,31,18,2,480,3.50,ARRAY['frito','gluten','carne_vermelha']),
  ('Pastel de queijo','outros',100,'g',340,10,30,20,1.5,520,3.50,ARRAY['frito','gluten','laticinio']),
  ('Coxinha de frango','outros',100,'g',280,10,25,16,1.5,450,3.00,ARRAY['frito','gluten','frango']),
  ('Quibe frito','outros',100,'g',270,12,22,15,3,460,3.00,ARRAY['frito','gluten','carne_vermelha']),
  ('Bolinho de bacalhau','outros',100,'g',265,13,22,14,1.5,620,4.50,ARRAY['frito','peixe']),
  ('Mandioca cozida com manteiga','outros',100,'g',165,1,30,5,1.5,90,2.00,ARRAY['brasileiro','laticinio']),

  -- Comida japonesa
  ('Sushi de salmão','outros',100,'g',165,9,23,4,0.5,380,9.00,ARRAY['japones','peixe','arroz']),
  ('Sashimi de salmão','outros',100,'g',208,22,0,13,0,60,12.00,ARRAY['japones','peixe']),
  ('Sashimi de atum','outros',100,'g',132,29,0,1,0,45,12.00,ARRAY['japones','peixe']),
  ('Uramaki Filadélfia','outros',100,'g',190,8,24,7,0.5,430,9.00,ARRAY['japones','peixe','arroz','laticinio']),
  ('Hot roll de salmão','outros',100,'g',260,10,30,11,1,520,9.00,ARRAY['japones','peixe','arroz','frito','gluten']),
  ('Temaki de salmão completo','outros',100,'g',185,10,22,6,1,420,10.00,ARRAY['japones','peixe','arroz']),
  ('Temaki Filadélfia','outros',100,'g',210,9,23,9,1,450,10.00,ARRAY['japones','peixe','arroz','laticinio']),
  ('Yakisoba de carne e legumes','outros',100,'g',145,7,20,4.5,2,520,5.50,ARRAY['japones','gluten','carne_vermelha']),
  ('Shimeji na manteiga','outros',100,'g',105,3,7,7,2.5,480,7.00,ARRAY['japones','vegetal','laticinio']),
  ('Guioza suíno','outros',100,'g',220,9,27,8,1.5,540,6.00,ARRAY['japones','suino','gluten']),
  ('Sunomono','outros',100,'g',55,1,11,0.3,1,420,4.00,ARRAY['japones','vegetal']),

  -- Minas Gerais e Sudeste
  ('Tutu de feijão','outros',100,'g',185,8,25,6,5,390,2.50,ARRAY['mineiro','brasileiro']),
  ('Angu de milho','outros',100,'g',80,1.5,17,0.5,1,150,1.20,ARRAY['mineiro','milho']),
  ('Vaca atolada','outros',100,'g',190,15,12,9,1,360,5.00,ARRAY['mineiro','carne_vermelha','mandioca']),
  ('Costelinha com ora-pro-nóbis','outros',100,'g',225,18,4,15,2,390,5.00,ARRAY['mineiro','suino','vegetal']),
  ('Fígado acebolado','outros',100,'g',190,27,5,7,0.5,310,3.50,ARRAY['mineiro','animal','carne_vermelha']),
  ('Virado à paulista','outros',100,'g',205,9,25,8,4,430,3.50,ARRAY['paulista','brasileiro']),

  -- Bahia e Nordeste
  ('Acarajé recheado','outros',100,'g',290,9,28,16,5,530,5.00,ARRAY['bahiano','frito','dende','frutos_do_mar']),
  ('Vatapá baiano','outros',100,'g',255,7,18,17,2,480,4.50,ARRAY['bahiano','dende','coco','frutos_do_mar']),
  ('Caruru','outros',100,'g',145,5,13,9,4,390,4.00,ARRAY['bahiano','dende','vegetal','frutos_do_mar']),
  ('Abará','outros',100,'g',210,8,25,9,5,450,4.00,ARRAY['bahiano','dende']),
  ('Baião de dois','outros',100,'g',165,7,25,4.5,4,380,3.00,ARRAY['nordestino','arroz','feijao']),
  ('Baião de dois com queijo coalho','outros',100,'g',205,9,24,8,3.5,480,4.00,ARRAY['nordestino','arroz','feijao','laticinio']),
  ('Rubacão','outros',100,'g',195,8,25,7,4,430,3.50,ARRAY['nordestino','arroz','feijao','laticinio']),
  ('Cuscuz nordestino cozido','outros',100,'g',113,2.2,25,0.7,2,210,1.20,ARRAY['nordestino','milho']),
  ('Cuscuz com ovo','outros',100,'g',165,7,20,6.5,1.5,260,2.00,ARRAY['nordestino','milho','ovo']),
  ('Escondidinho de carne seca','outros',100,'g',215,10,22,10,1.5,590,4.50,ARRAY['nordestino','carne_vermelha','mandioca','laticinio']),
  ('Paçoca de carne seca','outros',100,'g',360,25,24,18,2,980,5.00,ARRAY['nordestino','carne_vermelha','alto_sodio']),
  ('Sarapatel','outros',100,'g',205,19,5,12,1,620,4.00,ARRAY['nordestino','suino']),
  ('Buchada de bode','outros',100,'g',200,22,4,11,0.5,600,5.00,ARRAY['nordestino','animal']),
  ('Carne de bode guisada','outros',100,'g',190,27,3,8,0.5,370,6.00,ARRAY['nordestino','animal']),

  -- Sul e Centro-Oeste
  ('Arroz carreteiro','outros',100,'g',190,8,27,6,1.5,500,3.50,ARRAY['sul','arroz','carne_vermelha']),
  ('Barreado','outros',100,'g',180,20,5,9,0.5,390,5.00,ARRAY['sul','carne_vermelha']),
  ('Entrevero de carnes','outros',100,'g',225,20,6,13,1,520,6.00,ARRAY['sul','carne_vermelha','carne_processada']),
  ('Polenta com ragu de carne','outros',100,'g',150,7,20,5,1.5,340,3.50,ARRAY['sul','milho','carne_vermelha']),
  ('Galeto assado','outros',100,'g',215,27,1,11,0,230,4.50,ARRAY['sul','frango']),
  ('Arroz com pequi','outros',100,'g',175,3,28,6,2,260,3.00,ARRAY['centro_oeste','arroz','regional']),
  ('Empadão goiano','outros',100,'g',260,11,25,13,2,520,5.00,ARRAY['centro_oeste','gluten','frango','suino']),
  ('Pintado na brasa','outros',100,'g',180,27,0,8,0,120,8.00,ARRAY['centro_oeste','peixe']),

  -- Norte
  ('Tacacá','outros',100,'g',70,4,9,2,1,520,4.00,ARRAY['norte','mandioca','frutos_do_mar']),
  ('Pato no tucupi','outros',100,'g',190,20,4,11,1,430,7.00,ARRAY['norte','animal','regional']),
  ('Maniçoba','outros',100,'g',195,12,8,13,4,620,5.00,ARRAY['norte','suino','vegetal']),
  ('Pirarucu assado','outros',100,'g',175,28,0,7,0,180,9.00,ARRAY['norte','peixe']),
  ('Caldeirada de peixe','outros',100,'g',110,14,6,3.5,1,350,6.00,ARRAY['norte','peixe']),
  ('Açaí com xarope de guaraná','outros',100,'g',110,1.5,21,3,2.5,8,4.00,ARRAY['norte','fruta','acucar'])
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
