import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NexoStatus = {
  trainedDates: string[];
  water: { date: string; amountMl: number }[];
};

/** Datas de treinos concluídos e água registrada nos últimos 60 dias pelo
 *  dono do e-mail informado. Não expõe dieta, peso nem nenhum outro dado. */
export async function nexoStatusForEmail(email: string): Promise<NexoStatus> {
  const { data: usersPage, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) throw userError;
  const user = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return { trainedDates: [], water: [] };

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceDate = since.toISOString().slice(0, 10);

  const [sessionsResult, waterResult] = await Promise.all([
    supabaseAdmin
      .from("workout_sessions")
      .select("finished_at")
      .eq("user_id", user.id)
      .not("finished_at", "is", null)
      .gte("finished_at", since.toISOString()),
    supabaseAdmin
      .from("water_logs")
      .select("log_date, amount_ml")
      .eq("user_id", user.id)
      .gte("log_date", sinceDate),
  ]);
  if (sessionsResult.error) throw sessionsResult.error;
  if (waterResult.error) throw waterResult.error;

  const waterByDate = new Map<string, number>();
  for (const row of waterResult.data) {
    waterByDate.set(row.log_date, (waterByDate.get(row.log_date) ?? 0) + row.amount_ml);
  }

  return {
    trainedDates: sessionsResult.data.map((row) => row.finished_at as string),
    water: Array.from(waterByDate, ([date, amountMl]) => ({ date, amountMl })),
  };
}
