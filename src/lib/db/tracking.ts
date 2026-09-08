import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { requireUserId, today } from "./shared";

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
