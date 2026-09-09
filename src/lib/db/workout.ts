import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildWorkoutExercises, generateWorkoutPlan } from "@/lib/plan-generator";
import { initialCyclePosition } from "@/lib/workout-cycle";
import { requireUserId } from "./shared";
import type { Exercise } from "./types";

function ensureWorkoutSafetyClearance(
  screening: {
    heart_condition?: boolean | null;
    recent_surgery?: boolean | null;
    persistent_pain?: boolean | null;
    pregnant?: boolean | null;
  } | null,
) {
  if (
    screening?.heart_condition ||
    screening?.recent_surgery ||
    screening?.persistent_pain ||
    screening?.pregnant
  ) {
    throw new Error(
      "Sua triagem indica uma condição que exige liberação profissional antes de gerar ou alterar o treino.",
    );
  }
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

export function useCompleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workout: {
      id: string;
      name: string;
      estimated_min: number | null;
      sessionId?: string | null;
    }) => {
      await requireUserId();
      const { data, error } = await supabase.rpc("complete_workout_cycle", {
        p_workout_id: workout.id,
        p_duration_min: workout.estimated_min ?? 60,
        p_session_id: workout.sessionId ?? null,
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

/** Ajusta manualmente qual ficha do ciclo (A/B/C...) é a "atual" — útil quando
 *  o alinhamento automático por dia da semana não bate com o que a pessoa quer. */
export function useSetCyclePosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { planId: string; position: number }) => {
      const uid = await requireUserId();
      const { error } = await supabase
        .from("workout_plans")
        .update({ current_cycle_position: params.position })
        .eq("id", params.planId)
        .eq("user_id", uid);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutPlan"] }),
  });
}

/** Cria a sessão que o modo de execução ao vivo usa para gravar cada série
 *  assim que ela é concluída (antes de "Finalizar treino" fechar a sessão). */
export function useStartLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workoutId: string;
      workoutPlanId: string;
      workoutName: string;
      cyclePosition: number | null;
    }) => {
      const uid = await requireUserId();
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: uid,
          workout_id: params.workoutId,
          workout_plan_id: params.workoutPlanId,
          workout_name: params.workoutName,
          cycle_position: params.cyclePosition,
          started_at: new Date().toISOString(),
        })
        .select("id, started_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutSessions"] }),
  });
}

/** Grava uma série concluída no modo de execução ao vivo. */
export function useLogSessionSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      sessionId: string;
      exerciseName: string;
      setNumber: number;
      loadKg: number | null;
      repsDone: number | null;
    }) => {
      const uid = await requireUserId();
      const { error } = await supabase.from("workout_session_sets").insert({
        user_id: uid,
        session_id: params.sessionId,
        exercise_name: params.exerciseName,
        set_number: params.setNumber,
        load_kg: params.loadKg,
        reps_done: params.repsDone,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["workoutSessions"] }),
  });
}

/** Registro de peso — atualiza também o peso do perfil. */
/** Edita dados básicos do perfil (nome, nascimento, sexo, altura) fora do onboarding. */

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
      const { data: screening } = await supabase
        .from("health_screening")
        .select("heart_condition,recent_surgery,persistent_pain,pregnant")
        .eq("user_id", uid)
        .maybeSingle();
      ensureWorkoutSafetyClearance(screening);

      const { data: exercises, error: eErr } = await supabase
        .from("exercises")
        .select("id,name,muscle_group,equipment,place,difficulty,alternative_name,media_url")
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
        equipment: prefs?.equipment ?? null,
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
          current_cycle_position: initialCyclePosition(
            prefs?.training_weekdays ?? null,
            workouts.length,
          ),
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
        .select("training_place,equipment,experience_level")
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
      const { data: screening } = await supabase
        .from("health_screening")
        .select("heart_condition,recent_surgery,persistent_pain,pregnant")
        .eq("user_id", uid)
        .maybeSingle();
      ensureWorkoutSafetyClearance(screening);

      const { data: exercises, error: eErr } = await supabase
        .from("exercises")
        .select("id,name,muscle_group,equipment,place,difficulty,alternative_name,media_url")
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
        equipment: prefs?.equipment ?? null,
        experience: prefs?.experience_level ?? null,
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
