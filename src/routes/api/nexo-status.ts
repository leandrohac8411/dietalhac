import { createFileRoute } from "@tanstack/react-router";
import { nexoStatusForEmail } from "@/lib/nexo-status.server";

// Somente-leitura para o Casal Fit marcar o treino do dia sozinho.
// Não expõe dieta, peso nem nada além das datas de treinos concluídos.

const PERSON_EMAIL_ENV: Record<string, string> = {
  leandro: "NEXO_LEANDRO_EMAIL",
  stephany: "NEXO_STEPHANY_EMAIL",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization",
};

export const Route = createFileRoute("/api/nexo-status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const secret = process.env["NEXO_CASAL_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

        const url = new URL(request.url);
        const person = url.searchParams.get("person") ?? "";
        const emailEnvKey = PERSON_EMAIL_ENV[person];
        const email = emailEnvKey ? process.env[emailEnvKey] : undefined;
        if (!email)
          return Response.json(
            { error: "Perfil desconhecido" },
            { status: 400, headers: corsHeaders },
          );

        try {
          const status = await nexoStatusForEmail(email);
          return Response.json(status, { headers: corsHeaders });
        } catch (error) {
          console.error("[nexo-status]", error);
          return Response.json(
            { error: "Falha ao consultar treinos" },
            { status: 500, headers: corsHeaders },
          );
        }
      },
    },
  },
});
