import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { databaseError } from "@/lib/errors";
import { requireUserId } from "./shared";
import type {
  OnboardingPayload,
  Profile,
  StrategyValues,
  UserActivity,
  UserGoal,
  UserPreferences,
} from "./types";

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

/** Salva as metas calculadas no objetivo ativo. */
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
