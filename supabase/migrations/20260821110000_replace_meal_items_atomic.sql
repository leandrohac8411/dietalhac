-- Substitui todos os itens planejados de uma refeição em uma única transação.
-- O histórico em daily_food_logs não é alterado.
CREATE OR REPLACE FUNCTION public.replace_meal_items(
  p_meal_id UUID,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.meals
    WHERE id = p_meal_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Refeição não encontrada ou sem permissão';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'A alternativa precisa conter pelo menos um alimento';
  END IF;

  DELETE FROM public.meal_items
  WHERE meal_id = p_meal_id AND user_id = v_user_id;

  INSERT INTO public.meal_items (
    user_id, meal_id, food_item_id, food_name, quantity, unit,
    calories, protein_g, carbs_g, fat_g, fiber_g, preparation, notes
  )
  SELECT
    v_user_id,
    p_meal_id,
    x.food_item_id,
    x.food_name,
    GREATEST(1, x.quantity),
    x.unit,
    GREATEST(0, x.calories),
    GREATEST(0, x.protein_g),
    GREATEST(0, x.carbs_g),
    GREATEST(0, x.fat_g),
    GREATEST(0, x.fiber_g),
    x.preparation,
    x.notes
  FROM jsonb_to_recordset(p_items) AS x(
    food_item_id UUID,
    food_name TEXT,
    quantity NUMERIC,
    unit TEXT,
    calories NUMERIC,
    protein_g NUMERIC,
    carbs_g NUMERIC,
    fat_g NUMERIC,
    fiber_g NUMERIC,
    preparation TEXT,
    notes TEXT
  )
  WHERE x.food_name IS NOT NULL
    AND btrim(x.food_name) <> ''
    AND x.quantity > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhum alimento válido foi informado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_meal_items(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_meal_items(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_meal_items(UUID, JSONB) TO service_role;
