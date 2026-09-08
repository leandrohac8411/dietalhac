import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildMealPlanFromChoices,
  eligibleDietFoods,
  generateMealPlan,
  mealPlanQualityScore,
  mealPlanWithinTolerance,
} from "@/lib/plan-generator";
import type { FoodRow, PlanFoodItem, PlanMeal } from "@/lib/plan-generator";
import { generateNaturalDiet } from "@/lib/diet-ai.functions";
import { requireUserId, today } from "./shared";
import type { FoodItem, MealItemRow, SavedMeal, SavedMealComponent } from "./types";

export function useFoods() {
  return useQuery({
    queryKey: ["foods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_items")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useSubstitutions() {
  return useQuery({
    queryKey: ["substitutions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_substitutions")
        .select("id, food_item_id, substitute:substitute_id(*), original:food_item_id(name)");
      if (error) throw error;
      return data;
    },
  });
}

export function useMealPlan() {
  return useQuery({
    queryKey: ["mealPlan"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data: plan, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!plan) return null;
      const { data: meals, error: mErr } = await supabase
        .from("meals")
        .select("*, meal_items(*)")
        .eq("meal_plan_id", plan.id)
        .order("sort_order");
      if (mErr) throw mErr;
      return { plan, meals: meals ?? [] };
    },
  });
}

export function useFoodLogsToday() {
  return useQuery({
    queryKey: ["foodLogsToday"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("daily_food_logs")
        .select("*")
        .eq("user_id", uid)
        .eq("log_date", today());
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Registra um alimento fora do plano (ex.: bolo de chocolate) no diário de hoje. */
export function useLogFreeFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      name: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      meal_id?: string | null;
      notes?: string;
      items?: SavedMealComponent[];
    }) => {
      const uid = await requireUserId();
      const payload = {
        user_id: uid,
        log_date: today(),
        meal_id: entry.meal_id ?? null,
        meal_name: entry.name,
        completed: true,
        calories: entry.calories,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fat_g: entry.fat_g,
        notes: entry.notes ?? "Registrado manualmente",
        consumed_items: entry.items ?? [],
      };

      if (entry.meal_id) {
        const { data: existing, error: findError } = await supabase
          .from("daily_food_logs")
          .select("id")
          .eq("user_id", uid)
          .eq("log_date", today())
          .eq("meal_id", entry.meal_id)
          .limit(1)
          .maybeSingle();
        if (findError) throw findError;
        const { error } = existing
          ? await supabase.from("daily_food_logs").update(payload).eq("id", existing.id)
          : await supabase.from("daily_food_logs").insert(payload);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("daily_food_logs").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["foodLogsToday"] }),
  });
}

export function useDeleteFoodLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_food_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["foodLogsToday"] }),
  });
}

export function useSavedMeals() {
  return useQuery({
    queryKey: ["savedMeals"],
    queryFn: async (): Promise<SavedMeal[]> => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("saved_meals")
        .select("*")
        .eq("user_id", uid)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      name: string;
      items: SavedMealComponent[];
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }) => {
      const uid = await requireUserId();
      const { error } = await supabase.from("saved_meals").upsert(
        {
          user_id: uid,
          name: entry.name.trim(),
          items: entry.items,
          calories: entry.calories,
          protein_g: entry.protein_g,
          carbs_g: entry.carbs_g,
          fat_g: entry.fat_g,
        },
        { onConflict: "user_id,name" },
      );
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["savedMeals"] }),
  });
}

export function useDeleteSavedMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const uid = await requireUserId();
      const { error } = await supabase.from("saved_meals").delete().eq("id", id).eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["savedMeals"] }),
  });
}

export function useToggleMealCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      meal,
      completed,
    }: {
      meal: { id: string; name: string; meal_items: MealItemRow[] };
      completed: boolean;
    }) => {
      const uid = await requireUserId();
      if (!completed) {
        const { error } = await supabase
          .from("daily_food_logs")
          .delete()
          .eq("user_id", uid)
          .eq("log_date", today())
          .eq("meal_id", meal.id);
        if (error) throw error;
        return;
      }

      const totals = meal.meal_items.reduce(
        (acc, item) => ({
          calories: acc.calories + Number(item.calories ?? 0),
          protein_g: acc.protein_g + Number(item.protein_g ?? 0),
          carbs_g: acc.carbs_g + Number(item.carbs_g ?? 0),
          fat_g: acc.fat_g + Number(item.fat_g ?? 0),
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
      );
      const { data: existing, error: findError } = await supabase
        .from("daily_food_logs")
        .select("id")
        .eq("user_id", uid)
        .eq("log_date", today())
        .eq("meal_id", meal.id)
        .limit(1)
        .maybeSingle();
      if (findError) throw findError;

      const payload = {
        meal_name: meal.name,
        completed: true,
        consumed_items: meal.meal_items.map((item) => ({
          name: item.food_name,
          quantity: Number(item.quantity),
          unit: item.unit as SavedMealComponent["unit"],
          calories: Number(item.calories),
          protein_g: Number(item.protein_g),
          carbs_g: Number(item.carbs_g),
          fat_g: Number(item.fat_g),
        })),
        notes: "Consumido como planejado",
        ...totals,
      };
      const query = existing
        ? supabase.from("daily_food_logs").update(payload).eq("id", existing.id)
        : supabase.from("daily_food_logs").insert({
            user_id: uid,
            log_date: today(),
            meal_id: meal.id,
            ...payload,
          });
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["foodLogsToday"] }),
  });
}

/** Registra um treino planejado como concluido no dia. */

function scaleCatalogFood(food: FoodItem, grams: number) {
  const r = food.portion > 0 ? grams / food.portion : 0;
  return {
    calories: Math.round(food.calories * r),
    protein_g: Math.round(food.protein_g * r * 10) / 10,
    carbs_g: Math.round(food.carbs_g * r * 10) / 10,
    fat_g: Math.round(food.fat_g * r * 10) / 10,
    fiber_g: Math.round(food.fiber_g * r * 10) / 10,
  };
}

/**
 * Gera e persiste a dieta a partir das metas da estratégia e das preferências.
 * Desativa o plano anterior e cria meal_plan + meals + meal_items.
 */
export function useGenerateDiet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const uid = await requireUserId();

      const { data: goal, error: gErr } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (gErr) throw gErr;
      if (!goal?.target_calories) throw new Error("Defina sua estratégia antes de gerar a dieta.");

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      const { data: foods, error: fErr } = await supabase
        .from("food_items")
        .select("id,name,category,portion,unit,calories,protein_g,carbs_g,fat_g,fiber_g,tags")
        .eq("is_active", true);
      if (fErr) throw fErr;
      if (!foods || foods.length === 0)
        throw new Error("Catálogo de alimentos vazio. Aplique o seed do banco antes de gerar.");

      const catalog = foods as FoodRow[];
      const targets = {
        calories: goal.target_calories,
        protein: goal.protein_g ?? 0,
        carbs: goal.carbs_g ?? 0,
        fat: goal.fat_g ?? 0,
        fiber: goal.fiber_g ?? 0,
      };
      const generationInput = {
        foods: catalog,
        mealsPerDay: prefs?.meals_per_day ?? 5,
        mealTimes: prefs?.meal_times ?? null,
        targets,
        restrictions: prefs?.dietary_restrictions ?? [],
        dislikes: prefs?.disliked_foods ?? null,
        allergies: prefs?.allergies ?? null,
        likedFoods: prefs?.liked_foods ?? null,
        supplements: prefs?.supplements ?? null,
        trainingTime: prefs?.training_time ?? null,
        trainingDurationMin: prefs?.training_duration_min ?? null,
      };
      // Uma única seleção aleatória pode ser culinariamente boa, mas inviável
      // dentro das porções reais. Gera alternativas e mantém a de menor desvio.
      const candidates = Array.from({ length: 30 }, () => generateMealPlan(generationInput));
      const viableCandidates = candidates.filter((candidate) =>
        mealPlanWithinTolerance(candidate, targets),
      );
      const candidatePool = viableCandidates.length > 0 ? viableCandidates : candidates;
      const localPlan: PlanMeal[] = candidatePool.reduce((best, candidate) =>
        mealPlanQualityScore(candidate, targets) < mealPlanQualityScore(best, targets)
          ? candidate
          : best,
      );

      const eligibleFoods = eligibleDietFoods({
        foods: catalog,
        restrictions: prefs?.dietary_restrictions ?? [],
        dislikes: prefs?.disliked_foods ?? null,
        allergies: prefs?.allergies ?? null,
        supplements: prefs?.supplements ?? null,
      });

      // O catálogo completo pode ultrapassar o limite aceito pelo contrato da
      // função de IA. Mantemos todos os alimentos no gerador local e enviamos
      // ao Groq uma amostra equilibrada por categoria, priorizando os itens já
      // escolhidos no melhor plano determinístico.
      const aiCatalogById = new Map<string, FoodRow>();
      const eligibleById = new Map(eligibleFoods.map((food) => [food.id, food]));
      for (const meal of localPlan) {
        for (const item of meal.items) {
          const food = eligibleById.get(item.food_item_id);
          if (food) aiCatalogById.set(food.id, food);
        }
      }
      const foodsByCategory = new Map<string, FoodRow[]>();
      for (const food of eligibleFoods) {
        const categoryFoods = foodsByCategory.get(food.category) ?? [];
        categoryFoods.push(food);
        foodsByCategory.set(food.category, categoryFoods);
      }
      let categoryIndex = 0;
      while (aiCatalogById.size < 250) {
        let addedInPass = false;
        for (const categoryFoods of foodsByCategory.values()) {
          const food = categoryFoods[categoryIndex];
          if (food && !aiCatalogById.has(food.id)) {
            aiCatalogById.set(food.id, food);
            addedInPass = true;
            if (aiCatalogById.size === 250) break;
          }
        }
        if (!addedInPass) break;
        categoryIndex += 1;
      }
      const aiCatalog = [...aiCatalogById.values()];
      const aiChoices = await generateNaturalDiet({
        data: {
          meals: localPlan.map(({ name, scheduled_time }) => ({ name, scheduled_time })),
          foods: aiCatalog.map(({ id, name, category }) => ({ id, name, category })),
          restrictions: prefs?.dietary_restrictions ?? [],
          dislikes: prefs?.disliked_foods ?? null,
          allergies: prefs?.allergies ?? null,
          likedFoods: prefs?.liked_foods ?? null,
          supplements: prefs?.supplements ?? null,
          trainingTime: prefs?.training_time ?? null,
        },
      });
      const aiPlan = aiChoices
        ? buildMealPlanFromChoices({ foods: eligibleFoods, choices: aiChoices, targets })
        : null;
      const plan: PlanMeal[] =
        aiPlan &&
        mealPlanWithinTolerance(aiPlan, targets) &&
        mealPlanQualityScore(aiPlan, targets) < mealPlanQualityScore(localPlan, targets)
          ? aiPlan
          : localPlan;
      if (!mealPlanWithinTolerance(plan, targets)) {
        throw new Error(
          "Não encontramos uma combinação com porções naturais dentro das suas metas. Seu plano atual foi preservado; tente regenerar novamente.",
        );
      }

      await supabase
        .from("meal_plans")
        .update({ is_active: false })
        .eq("user_id", uid)
        .eq("is_active", true);

      const { data: mp, error: mpErr } = await supabase
        .from("meal_plans")
        .insert({
          user_id: uid,
          name: "Minha dieta",
          target_calories: goal.target_calories,
          is_active: true,
        })
        .select("id")
        .single();
      if (mpErr) throw mpErr;

      const { data: insertedMeals, error: msErr } = await supabase
        .from("meals")
        .insert(
          plan.map((meal, i) => ({
            user_id: uid,
            meal_plan_id: mp.id,
            name: meal.name,
            scheduled_time: meal.scheduled_time,
            sort_order: i,
          })),
        )
        .select("id, sort_order");
      if (msErr) throw msErr;

      const idBySort = new Map((insertedMeals ?? []).map((row) => [row.sort_order, row.id]));
      const itemsPayload = plan.flatMap((meal, i) =>
        meal.items.map((it) => ({
          user_id: uid,
          meal_id: idBySort.get(i)!,
          food_item_id: it.food_item_id ?? null,
          food_name: it.food_name,
          quantity: it.quantity,
          unit: it.unit,
          calories: it.calories,
          protein_g: it.protein_g,
          carbs_g: it.carbs_g,
          fat_g: it.fat_g,
          fiber_g: it.fiber_g,
          preparation: it.preparation ?? null,
        })),
      );
      if (itemsPayload.length > 0) {
        const { error: iErr } = await supabase.from("meal_items").insert(itemsPayload);
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}

/** Ajusta a quantidade de um item, reescalando os macros proporcionalmente. */
export function useUpdateMealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, quantity }: { item: MealItemRow; quantity: number }) => {
      const f = item.quantity > 0 ? quantity / item.quantity : 1;
      const { error } = await supabase
        .from("meal_items")
        .update({
          quantity: Math.max(1, Math.round(quantity)),
          calories: Math.round(item.calories * f),
          protein_g: Math.round(item.protein_g * f * 10) / 10,
          carbs_g: Math.round(item.carbs_g * f * 10) / 10,
          fat_g: Math.round(item.fat_g * f * 10) / 10,
          fiber_g: Math.round(item.fiber_g * f * 10) / 10,
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}

/** Troca um item por um substituto do catálogo, mantendo as calorias. */
export function useSwapMealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, substitute }: { item: MealItemRow; substitute: FoodItem }) => {
      const perGram = substitute.portion > 0 ? substitute.calories / substitute.portion : 0;
      const grams = perGram > 0 && item.calories > 0 ? item.calories / perGram : substitute.portion;
      const { error } = await supabase
        .from("meal_items")
        .update({
          food_item_id: substitute.id,
          food_name: substitute.name,
          quantity: Math.max(1, Math.round(grams)),
          unit: substitute.unit,
          ...scaleCatalogFood(substitute, grams),
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}

/** Troca uma refeição completa de forma atômica, preservando o histórico já consumido. */
export function useReplaceMealItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mealId, items }: { mealId: string; items: PlanFoodItem[] }) => {
      const payload = items.map((item) => ({
        food_item_id: item.food_item_id ?? null,
        food_name: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        fiber_g: item.fiber_g,
        preparation: item.preparation ?? null,
        notes: item.notes ?? null,
      }));
      const { error } = await supabase.rpc("replace_meal_items", {
        p_meal_id: mealId,
        p_items: payload,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}

/** Adiciona um alimento do catálogo a uma refeição. */
export function useAddMealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mealId,
      food,
      quantity,
    }: {
      mealId: string;
      food: FoodItem;
      quantity?: number;
    }) => {
      const uid = await requireUserId();
      const grams = quantity ?? food.portion;
      const { error } = await supabase.from("meal_items").insert({
        user_id: uid,
        meal_id: mealId,
        food_item_id: food.id,
        food_name: food.name,
        quantity: Math.max(1, Math.round(grams)),
        unit: food.unit,
        ...scaleCatalogFood(food, grams),
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}

/** Remove um item da refeição. */
export function useDeleteMealItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("meal_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}

/** Ajusta o horário de uma refeição. */
export function useUpdateMealTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mealId, scheduled_time }: { mealId: string; scheduled_time: string }) => {
      const { error } = await supabase.from("meals").update({ scheduled_time }).eq("id", mealId);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}
