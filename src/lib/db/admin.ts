import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { requireUserId } from "./shared";
import type { AdminEngagementDashboard, AdminProfile } from "./types";

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
