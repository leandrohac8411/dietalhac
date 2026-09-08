import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

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

export type OnboardingPayload = {
  profile: TablesUpdate<"profiles">;
  goal: Omit<TablesInsert<"user_goals">, "user_id" | "is_active">;
  preferences: Omit<TablesInsert<"user_preferences">, "user_id">;
  screening: Omit<TablesInsert<"health_screening">, "user_id">;
  activities: Omit<TablesInsert<"user_activities">, "user_id">[];
};

export type UserActivity = Tables<"user_activities">;

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
