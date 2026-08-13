-- Ajusta a porção padrão do Monster para uma lata de 473 ml.
-- Os nutrientes abaixo representam a lata inteira; a interface continua
-- recalculando proporcionalmente quando o usuário altera o volume.

UPDATE public.food_items
SET
  portion = 473,
  unit = 'ml',
  calories = 213,
  protein_g = 0,
  carbs_g = 52,
  fat_g = 0,
  fiber_g = 0,
  sodium_mg = 189,
  estimated_cost = 8.00
WHERE name = 'Monster Energy tradicional';

UPDATE public.food_items
SET
  portion = 473,
  unit = 'ml',
  calories = 9,
  protein_g = 0,
  carbs_g = 2.4,
  fat_g = 0,
  fiber_g = 0,
  sodium_mg = 213,
  estimated_cost = 8.00
WHERE name = 'Monster Ultra zero açúcar';
