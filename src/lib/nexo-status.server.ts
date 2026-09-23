import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NexoStatus = {
  trainedDates: string[];
  water: { date: string; amountMl: number }[];
  waterGoalMl: number | null;
  sessions: {
    date: string;
    workoutName: string | null;
    durationMin: number | null;
    totalVolume: number | null;
    exerciseCount: number;
    setCount: number;
  }[];
};

const EMPTY_STATUS: NexoStatus = { trainedDates: [], water: [], waterGoalMl: null, sessions: [] };

/** Treinos concluídos, água registrada e meta de água dos últimos 60 dias do
 *  dono do e-mail informado. Não expõe dieta, peso nem nenhum outro dado. */
export async function nexoStatusForEmail(email: string): Promise<NexoStatus> {
  const { data: usersPage, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) throw userError;
  const user = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return EMPTY_STATUS;

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceDate = since.toISOString().slice(0, 10);

  const [sessionsResult, waterResult, goalResult] = await Promise.all([
    supabaseAdmin
      .from("workout_sessions")
      .select("id, workout_name, finished_at, duration_min, total_volume")
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .gte("finished_at", since.toISOString()),
    supabaseAdmin
      .from("water_logs")
      .select("log_date, amount_ml")
      .eq("user_id", user.id)
      .gte("log_date", sinceDate),
    supabaseAdmin
      .from("user_goals")
      .select("water_ml")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);
  if (sessionsResult.error) throw sessionsResult.error;
  if (waterResult.error) throw waterResult.error;
  if (goalResult.error) throw goalResult.error;

  const sessions = sessionsResult.data;
  const sessionIds = sessions.map((s) => s.id);
  const setsResult = sessionIds.length
    ? await supabaseAdmin
        .from("workout_session_sets")
        .select("session_id, exercise_name")
        .in("session_id", sessionIds)
    : { data: [] as { session_id: string; exercise_name: string }[], error: null };
  if (setsResult.error) throw setsResult.error;

  const statsBySession = new Map<string, { exercises: Set<string>; setCount: number }>();
  for (const row of setsResult.data) {
    const stat = statsBySession.get(row.session_id) ?? {
      exercises: new Set<string>(),
      setCount: 0,
    };
    stat.exercises.add(row.exercise_name);
    stat.setCount += 1;
    statsBySession.set(row.session_id, stat);
  }

  const waterByDate = new Map<string, number>();
  for (const row of waterResult.data) {
    waterByDate.set(row.log_date, (waterByDate.get(row.log_date) ?? 0) + row.amount_ml);
  }

  return {
    trainedDates: sessions.map((row) => row.finished_at as string),
    water: Array.from(waterByDate, ([date, amountMl]) => ({ date, amountMl })),
    waterGoalMl: goalResult.data?.water_ml ?? null,
    sessions: sessions.map((s) => {
      const stat = statsBySession.get(s.id);
      return {
        date: (s.finished_at as string).slice(0, 10),
        workoutName: s.workout_name,
        durationMin: s.duration_min,
        totalVolume: s.total_volume,
        exerciseCount: stat ? stat.exercises.size : 0,
        setCount: stat ? stat.setCount : 0,
      };
    }),
  };
}
