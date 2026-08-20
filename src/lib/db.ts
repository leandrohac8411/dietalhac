import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  buildMealPlanFromChoices,
  buildWorkoutExercises,
  eligibleDietFoods,
  generateMealPlan,
  generateWorkoutPlan,
  mealPlanDeviation,
  mealPlanWithinTolerance,
} from "@/lib/plan-generator";
import type { FoodRow, PlanMeal } from "@/lib/plan-generator";
import { generateNaturalDiet } from "@/lib/diet-ai.functions";
import { databaseError } from "@/lib/errors";

export type Profile = Tables<"profiles">;
export type AdminProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "biological_sex"
  | "current_weight_kg"
  | "created_at"
  | "onboarding_completed"
>;
export type UserGoal = Tables<"user_goals">;
export type UserPreferences = Tables<"user_preferences">;
export type FoodItem = Tables<"food_items">;
export type MealRow = Tables<"meals">;
export type MealItemRow = Tables<"meal_items">;
export type WorkoutRow = Tables<"workouts">;
export type WorkoutExerciseRow = Tables<"workout_exercises">;
export type Exercise = Tables<"exercises">;
export type WeightLog = Tables<"weight_logs">;
export type WaterLog = Tables<"water_logs">;
export type Checkin = Tables<"weekly_checkins">;
export type Assessment = Tables<"body_assessments">;
export type Measurement = Tables<"body_measurements">;
export type FoodLogRow = Tables<"daily_food_logs">;
export type SavedMeal = Tables<"saved_meals">;
export type SavedMealComponent = {
  name: string;
  quantity: number;
  unit: "g" | "ml" | "g/ml" | "porção";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

async function requireUserId() {
  // Estes hooks rodam no cliente e usam o ID somente como filtro. Chamar
  // getUser() aqui faria uma validação remota para cada consulta da tela
  // (dashboard, menu, água, peso, dieta etc.). A autorização real continua
  // sendo feita pelo JWT e pelas policies RLS no Supabase.
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) throw new Error("Sessão expirada");
  return data.session.user.id;
}

export const today = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

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

/** Registra o check-in semanal (peso, aderência, sensações, dificuldades). */
export function useSaveCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<TablesInsert<"weekly_checkins">, "user_id">) => {
      const uid = await requireUserId();
      const { error } = await supabase.from("weekly_checkins").insert({ ...entry, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["checkins"] }),
  });
}

export function useDeleteCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_checkins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["checkins"] }),
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

/** Todos os exercícios (inclusive inativos) — só para o painel Admin. */
export function useAdminExercises(enabled = true) {
  return useQuery({
    queryKey: ["adminExercises"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("exercises").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: TablesInsert<"exercises">) => {
      const { error } = await supabase.from("exercises").insert(entry);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["adminExercises"] });
      void qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"exercises"> }) => {
      const { error } = await supabase.from("exercises").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["adminExercises"] });
      void qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

/** Todos os alimentos (inclusive inativos) — só para o painel Admin. */
export function useAdminFoods(enabled = true) {
  return useQuery({
    queryKey: ["adminFoods"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("food_items").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Lista de usuários cadastrados — só para o painel Admin (requer policy de leitura). */
export function useAdminUsers(enabled = true) {
  return useQuery({
    queryKey: ["adminUsers"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,biological_sex,current_weight_kg,created_at,onboarding_completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdminProfile[];
    },
  });
}

export type AdminEngagementDay = {
  date: string;
  points: number;
  meals_completed: number;
  meals_planned: number;
  meal_registrations: number;
  workout_expected: boolean;
  workout_completed: boolean;
  water_ml: number;
  water_target: number;
};

export type AdminEngagementEvent = {
  type: "meal" | "workout" | "water" | "checkin";
  at: string;
  title: string;
  detail: string;
};

export type AdminEngagementUser = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  period_points: number;
  adherence_percent: number;
  today_points: number;
  streak_days: number;
  last_activity_at: string | null;
  last_7_days: AdminEngagementDay[];
  recent_events: AdminEngagementEvent[];
};

export type AdminEngagementDashboard = {
  generated_at: string;
  days: number;
  users: AdminEngagementUser[];
};

/** Resumo agregado de uso. A função no banco valida o papel admin. */
export function useAdminEngagement(enabled = true, days = 30) {
  return useQuery({
    queryKey: ["adminEngagement", days],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_engagement_dashboard", {
        p_days_back: days,
      });
      if (error) throw error;
      return data as unknown as AdminEngagementDashboard;
    },
  });
}

export function useCreateFoodItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: TablesInsert<"food_items">) => {
      const { error } = await supabase.from("food_items").insert(entry);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["adminFoods"] });
      void qc.invalidateQueries({ queryKey: ["foods"] });
    },
  });
}

export function useUpdateFoodItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"food_items"> }) => {
      const { error } = await supabase.from("food_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["adminFoods"] });
      void qc.invalidateQueries({ queryKey: ["foods"] });
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

/** Remove o registro de agua mais recente do dia (desfazer registro rapido). */
export function useUndoWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("water_logs")
        .select("id")
        .eq("user_id", uid)
        .eq("log_date", today())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return;
      const { error: deleteError } = await supabase.from("water_logs").delete().eq("id", data.id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["waterToday"] }),
  });
}

/** Marca ou desmarca uma refeicao planejada como realizada hoje. */
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
export function useCompleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workout: { id: string; name: string; estimated_min: number | null }) => {
      await requireUserId();
      const { data, error } = await supabase.rpc("complete_workout_cycle", {
        p_workout_id: workout.id,
        p_duration_min: workout.estimated_min ?? 60,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workoutSessions"] });
      void qc.invalidateQueries({ queryKey: ["workoutPlan"] });
    },
  });
}

/** Registro de peso — atualiza também o peso do perfil. */
/** Edita dados básicos do perfil (nome, nascimento, sexo, altura) fora do onboarding. */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"profiles">) => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", uid)
        .select("id")
        .maybeSingle();
      if (error) throw databaseError("Dados pessoais", error);
      if (!data) {
        throw new Error(
          "Dados pessoais: seu perfil não foi encontrado ou não pode ser alterado por esta sessão.",
        );
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

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

export function useDeleteWeightLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weight_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["weightLogs"] }),
  });
}

/** Registra uma avaliação corporal (% gordura, massa magra, água etc.). */
export function useSaveAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<TablesInsert<"body_assessments">, "user_id">) => {
      const uid = await requireUserId();
      const { error } = await supabase.from("body_assessments").insert({ ...entry, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["assessments"] }),
  });
}

export function useDeleteAssessment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("body_assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["assessments"] }),
  });
}

/** Registra medidas corporais (circunferências). */
export function useSaveMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Omit<TablesInsert<"body_measurements">, "user_id">) => {
      const uid = await requireUserId();
      const { error } = await supabase.from("body_measurements").insert({ ...entry, user_id: uid });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["measurements"] }),
  });
}

export function useDeleteMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("body_measurements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["measurements"] }),
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
  activities: Omit<TablesInsert<"user_activities">, "user_id">[];
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
      if (deErr) throw databaseError("Objetivo anterior", deErr);

      const { error: gErr } = await supabase
        .from("user_goals")
        .insert({ ...payload.goal, user_id: uid, is_active: true });
      if (gErr) throw databaseError("Novo objetivo", gErr);

      // Preferências e triagem: um registro por usuário (upsert por user_id).
      const { error: prErr } = await supabase
        .from("user_preferences")
        .upsert({ ...payload.preferences, user_id: uid }, { onConflict: "user_id" });
      if (prErr) throw databaseError("Preferências", prErr);

      const { error: scErr } = await supabase
        .from("health_screening")
        .upsert({ ...payload.screening, user_id: uid }, { onConflict: "user_id" });
      if (scErr) throw databaseError("Triagem de saúde", scErr);

      // Atividades extras: substitui a lista inteira (remove e reinsere).
      const { error: delActErr } = await supabase
        .from("user_activities")
        .delete()
        .eq("user_id", uid);
      if (delActErr) throw databaseError("Atividades físicas", delActErr);
      if (payload.activities.length > 0) {
        const { error: actErr } = await supabase
          .from("user_activities")
          .insert(payload.activities.map((a) => ({ ...a, user_id: uid })));
        if (actErr) throw databaseError("Atividades físicas", actErr);
      }

      // Perfil: dados básicos + marca o onboarding como concluído.
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ ...payload.profile, onboarding_completed: true })
        .eq("id", uid);
      if (pErr) throw databaseError("Conclusão do perfil", pErr);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["goal"] });
      void qc.invalidateQueries({ queryKey: ["preferences"] });
      void qc.invalidateQueries({ queryKey: ["screening"] });
      void qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export type UserActivity = Tables<"user_activities">;

export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async (): Promise<UserActivity[]> => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("user_activities")
        .select("*")
        .eq("user_id", uid)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
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
        mealPlanDeviation(candidate, targets) < mealPlanDeviation(best, targets) ? candidate : best,
      );

      const eligibleFoods = eligibleDietFoods({
        foods: catalog,
        restrictions: prefs?.dietary_restrictions ?? [],
        dislikes: prefs?.disliked_foods ?? null,
        allergies: prefs?.allergies ?? null,
        supplements: prefs?.supplements ?? null,
      });
      const aiChoices = await generateNaturalDiet({
        data: {
          meals: localPlan.map(({ name, scheduled_time }) => ({ name, scheduled_time })),
          foods: eligibleFoods.map(({ id, name, category }) => ({ id, name, category })),
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
        mealPlanDeviation(aiPlan, targets) < mealPlanDeviation(localPlan, targets)
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

/**
 * Gera e persiste o treino a partir das preferências (dias, duração, local,
 * experiência) e do objetivo. Desativa o plano anterior.
 */
export function useGenerateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const uid = await requireUserId();

      const { data: goal } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      const { data: profile } = await supabase
        .from("profiles")
        .select("biological_sex")
        .eq("id", uid)
        .maybeSingle();

      const { data: exercises, error: eErr } = await supabase
        .from("exercises")
        .select("id,name,muscle_group,place,difficulty,alternative_name,media_url")
        .eq("is_active", true);
      if (eErr) throw eErr;
      if (!exercises || exercises.length === 0)
        throw new Error("Catálogo de exercícios vazio. Aplique o seed do banco antes de gerar.");

      const { data: activePlan } = await supabase
        .from("workout_plans")
        .select("workouts(workout_exercises(exercise_name))")
        .eq("user_id", uid)
        .eq("is_active", true)
        .maybeSingle();
      const previousExerciseNames =
        activePlan?.workouts.flatMap((workout) =>
          workout.workout_exercises.map((exercise) => exercise.exercise_name),
        ) ?? [];

      const place = prefs?.training_place ?? "gym";
      const days = prefs?.training_days ?? 3;
      const durationMin = prefs?.training_duration_min ?? 60;

      const { split, workouts } = generateWorkoutPlan({
        exercises,
        days,
        durationMin,
        place,
        experience: prefs?.experience_level ?? null,
        goal: goal?.goal_type ?? "condicionamento",
        sex: profile?.biological_sex ?? null,
        priorityAreas: goal?.priority_areas ?? null,
        priorityLevel: goal?.priority_level ?? null,
        splitPreference: prefs?.workout_split_preference ?? "auto",
        previousExerciseNames,
      });

      await supabase
        .from("workout_plans")
        .update({ is_active: false })
        .eq("user_id", uid)
        .eq("is_active", true);

      const { data: wp, error: wpErr } = await supabase
        .from("workout_plans")
        .insert({
          user_id: uid,
          name: "Meu treino",
          split_type: split,
          days_per_week: days,
          duration_min: durationMin,
          place,
          is_active: true,
          current_cycle_position: 0,
          cycle_length: workouts.length,
        })
        .select("id")
        .single();
      if (wpErr) throw wpErr;

      const { data: insertedWorkouts, error: wErr } = await supabase
        .from("workouts")
        .insert(
          workouts.map((w, i) => ({
            user_id: uid,
            workout_plan_id: wp.id,
            name: w.name,
            muscle_groups: w.muscle_groups,
            weekday: w.weekday,
            estimated_min: w.estimated_min,
            sort_order: i,
            cycle_position: i,
          })),
        )
        .select("id, sort_order");
      if (wErr) throw wErr;

      const idBySort = new Map((insertedWorkouts ?? []).map((row) => [row.sort_order, row.id]));
      const exPayload = workouts.flatMap((w, i) =>
        w.exercises.map((ex, j) => ({
          user_id: uid,
          workout_id: idBySort.get(i)!,
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          difficulty: ex.difficulty ?? null,
          alternative_name: ex.alternative_name ?? null,
          notes: ex.notes ?? null,
          sort_order: j,
        })),
      );
      if (exPayload.length > 0) {
        const { error: iErr } = await supabase.from("workout_exercises").insert(exPayload);
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutPlan"] }),
  });
}

/** Ajusta séries, repetições, descanso ou carga de um exercício. */
export function useUpdateWorkoutExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<{ sets: number; reps: string; rest_seconds: number; load_kg: number | null }>;
    }) => {
      const { error } = await supabase.from("workout_exercises").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutPlan"] }),
  });
}

/** Remove um exercício do treino. */
export function useDeleteWorkoutExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutPlan"] }),
  });
}

/** Adiciona um exercício do catálogo a um treino. */
export function useAddWorkoutExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workoutId, exercise }: { workoutId: string; exercise: Exercise }) => {
      const uid = await requireUserId();
      const { error } = await supabase.from("workout_exercises").insert({
        user_id: uid,
        workout_id: workoutId,
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        sets: 3,
        reps: "10-12",
        rest_seconds: 60,
        difficulty: exercise.difficulty,
        alternative_name: exercise.alternative_name,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutPlan"] }),
  });
}

/** Troca os exercícios de um único dia por um conjunto escolhido de grupos musculares
 *  (ex.: "só tríceps", ou "costas e ombro"), mantendo o resto do treino intacto. */
export function useRegenerateWorkoutDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workoutId,
      groups,
      groupLabel,
      durationMin,
    }: {
      workoutId: string;
      groups: string[];
      groupLabel: string;
      durationMin: number;
    }) => {
      const uid = await requireUserId();

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("training_place")
        .eq("user_id", uid)
        .maybeSingle();
      const { data: goal } = await supabase
        .from("user_goals")
        .select("goal_type")
        .eq("user_id", uid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: exercises, error: eErr } = await supabase
        .from("exercises")
        .select("id,name,muscle_group,place,difficulty,alternative_name,media_url")
        .eq("is_active", true);
      if (eErr) throw eErr;

      const { data: currentWorkout } = await supabase
        .from("workouts")
        .select("name,workout_exercises(exercise_name)")
        .eq("id", workoutId)
        .maybeSingle();
      const prefix = currentWorkout?.name?.split("—")[0]?.trim() || "Treino";
      const newName = `${prefix} — ${groupLabel}`;

      const newExercises = buildWorkoutExercises({
        exercises: exercises ?? [],
        groups,
        durationMin,
        place: prefs?.training_place ?? "gym",
        goal: goal?.goal_type ?? "condicionamento",
        avoidedNames:
          currentWorkout?.workout_exercises.map((exercise) => exercise.exercise_name) ?? [],
      });
      if (newExercises.length === 0)
        throw new Error("Nenhum exercício encontrado para esse grupo muscular.");

      const { error: delErr } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", workoutId);
      if (delErr) throw delErr;

      const { error: insErr } = await supabase.from("workout_exercises").insert(
        newExercises.map((ex, j) => ({
          user_id: uid,
          workout_id: workoutId,
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          rest_seconds: ex.rest_seconds,
          difficulty: ex.difficulty ?? null,
          alternative_name: ex.alternative_name ?? null,
          sort_order: j,
        })),
      );
      if (insErr) throw insErr;

      const { error: updErr } = await supabase
        .from("workouts")
        .update({ name: newName, muscle_groups: groupLabel })
        .eq("id", workoutId);
      if (updErr) throw updErr;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutPlan"] }),
  });
}

export { requireUserId };
