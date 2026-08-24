import { createFileRoute } from "@tanstack/react-router";
import { runScheduledPushes } from "@/lib/push.server";

export const Route = createFileRoute("/api/push-cron")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          return Response.json(await runScheduledPushes());
        } catch (error) {
          console.error("[push-cron]", error);
          return Response.json({ error: "Falha ao processar notificações" }, { status: 500 });
        }
      },
    },
  },
});
