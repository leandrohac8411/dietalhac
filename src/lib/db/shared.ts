import { supabase } from "@/integrations/supabase/client";

export async function requireUserId() {
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
