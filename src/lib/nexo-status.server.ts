import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Datas (finished_at) dos treinos concluídos nos últimos 60 dias pelo dono
 *  do e-mail informado. Não expõe dieta, peso nem nenhum outro dado. */
export async function trainedDatesForEmail(email: string): Promise<string[]> {
  const { data: usersPage, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) throw userError;
  const user = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return [];

  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data, error } = await supabaseAdmin
    .from("workout_sessions")
    .select("finished_at")
    .eq("user_id", user.id)
    .not("finished_at", "is", null)
    .gte("finished_at", since.toISOString());
  if (error) throw error;

  return data.map((r) => r.finished_at as string);
}
