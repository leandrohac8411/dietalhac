import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { generateMealPlan } from "@/lib/plan-generator";
import type { FoodRow, PlanMeal } from "@/lib/plan-generator";

export type Profile = Tables<"profiles">;
export type UserGoal = Tables<"user_goals">;
export type UserPreferences = Tables<"user_preferences">;
export type FoodItem = Tables<"food_items">;
export type MealRow = Tables<"meals">;
export type MealItemRow = Tables<"meal_items">;
export type WorkoutRow = Tables<"workouts">;
export type WorkoutExerciseRow = Tables<"workout_exercises">;
export type WeightLog = Tables<"weight_logs">;
export type WaterLog = Tables<"water_logs">;
export type Checkin = Tables<"weekly_checkins">;
export type Assessment = Tables<"body_assessments">;
export type Measurement = Tables<"body_measurements">;

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada");
  return data.user.id;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: async (): Promise<UserPreferences | null> => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useActiveGoal() {
  return useQuery({
    queryKey: ["goal"],
    queryFn: async (): Promise<UserGoal | null> => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useScreening() {
  return useQuery({
    queryKey: ["screening"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("health_screening")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

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

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("is_active", true)
        .order("name");
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

export function useWorkoutPlan() {
  return useQuery({
    queryKey: ["workoutPlan"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data: plan, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!plan) return null;
      const { data: workouts, error: wErr } = await supabase
        .from("workouts")
        .select("*, workout_exercises(*)")
        .eq("workout_plan_id", plan.id)
        .order("sort_order");
      if (wErr) throw wErr;
      return { plan, workouts: workouts ?? [] };
    },
  });
}

export function useWeightLogs() {
  return useQuery({
    queryKey: ["weightLogs"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .eq("user_id", uid)
        .order("log_date");
      if (error) throw error;
      return data;
    },
  });
}

export function useWaterToday() {
  return useQuery({
    queryKey: ["waterToday"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", uid)
        .eq("log_date", today());
      if (error) throw error;
      return data ?? [];
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

export function useCheckins() {
  return useQuery({
    queryKey: ["checkins"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("weekly_checkins")
        .select("*")
        .eq("user_id", uid)
        .order("checkin_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAssessments() {
  return useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("body_assessments")
        .select("*")
        .eq("user_id", uid)
        .order("assessed_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMeasurements() {
  return useQuery({
    queryKey: ["measurements"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", uid)
        .order("measured_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["workoutSessions"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*, workout_session_sets(*)")
        .eq("user_id", uid)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });
}

/** Registro rápido de água. */
export function useLogWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amountMl: number) => {
      const uid = await requireUserId();
      const { error } = await supabase
        .from("water_logs")
        .insert({ user_id: uid, amount_ml: amountMl, log_date: today() });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["waterToday"] }),
  });
}

/** Registro de peso — atualiza também o peso do perfil. */
export function useLogWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weightKg: number) => {
      const uid = await requireUserId();
      const { error } = await supabase
        .from("weight_logs")
        .insert({ user_id: uid, weight_kg: weightKg, log_date: today() });
      if (error) throw error;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ current_weight_kg: weightKg })
        .eq("id", uid);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["weightLogs"] });
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Persiste o questionário inicial completo: perfil, objetivo, preferências e
 * triagem de saúde. Chamado ao final do onboarding (e também ao reeditar).
 */
export type OnboardingPayload = {
  profile: TablesUpdate<"profiles">;
  goal: Omit<TablesInsert<"user_goals">, "user_id" | "is_active">;
  preferences: Omit<TablesInsert<"user_preferences">, "user_id">;
  screening: Omit<TablesInsert<"health_screening">, "user_id">;
};

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OnboardingPayload) => {
      const uid = await requireUserId();

      // Objetivo: mantém histórico desativando os anteriores e criando um novo ativo.
      const { error: deErr } = await supabase
        .from("user_goals")
        .update({ is_active: false })
        .eq("user_id", uid)
        .eq("is_active", true);
      if (deErr) throw deErr;

      const { error: gErr } = await supabase
        .from("user_goals")
        .insert({ ...payload.goal, user_id: uid, is_active: true });
      if (gErr) throw gErr;

      // Preferências e triagem: um registro por usuário (upsert por user_id).
      const { error: prErr } = await supabase
        .from("user_preferences")
        .upsert({ ...payload.preferences, user_id: uid }, { onConflict: "user_id" });
      if (prErr) throw prErr;

      const { error: scErr } = await supabase
        .from("health_screening")
        .upsert({ ...payload.screening, user_id: uid }, { onConflict: "user_id" });
      if (scErr) throw scErr;

      // Perfil: dados básicos + marca o onboarding como concluído.
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ ...payload.profile, onboarding_completed: true })
        .eq("id", uid);
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["goal"] });
      void qc.invalidateQueries({ queryKey: ["preferences"] });
      void qc.invalidateQueries({ queryKey: ["screening"] });
    },
  });
}

/**
 * Salva o cenário nutricional escolhido no objetivo ativo: metas de calorias,
 * macros, água e ritmo semanal. Alimenta a dashboard, a dieta e o check-in.
 */
export type StrategyValues = {
  goalId: string;
  maintenance_calories: number;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
  weekly_rate_kg: number;
  active_scenario: string;
};

export function useSaveStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ goalId, ...values }: StrategyValues) => {
      const uid = await requireUserId();
      const { error } = await supabase
        .from("user_goals")
        .update(values)
        .eq("id", goalId)
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["goal"] }),
  });
}

/** Escala um alimento do catálogo para uma quantidade em gramas. */
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

      const plan: PlanMeal[] = generateMealPlan({
        foods: foods as FoodRow[],
        mealsPerDay: prefs?.meals_per_day ?? 5,
        mealTimes: prefs?.meal_times ?? null,
        targets: {
          calories: goal.target_calories,
          protein: goal.protein_g ?? 0,
          carbs: goal.carbs_g ?? 0,
          fat: goal.fat_g ?? 0,
          fiber: goal.fiber_g ?? 0,
        },
        restrictions: prefs?.dietary_restrictions ?? [],
        dislikes: prefs?.disliked_foods ?? null,
        allergies: prefs?.allergies ?? null,
      });

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

export { requireUserId };
