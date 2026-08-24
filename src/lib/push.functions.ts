import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("@/lib/push.server");
    const sent = await sendPushToUser(context.userId, {
      title: "Notificações ativadas",
      body: "O NEXO já pode lembrar você das refeições, treinos, água e check-in.",
      url: "/perfil",
      tag: "nexo-test",
    });
    if (sent === 0) throw new Error("Nenhum aparelho ativo foi encontrado.");
    return { sent };
  });
