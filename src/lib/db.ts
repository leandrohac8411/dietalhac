import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
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

export { requireUserId };
