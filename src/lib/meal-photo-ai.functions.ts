import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Não enviamos mais o catálogo de alimentos aqui: com o catálogo já passando
// de ~400 itens, só a lista sozinha consumia a maior parte do limite de tokens
// de entrada por minuto (ITPM) da Groq. A IA estima os macros direto pela foto;
// o casamento com o catálogo (quando existe um item parecido) agora é feito no
// cliente, sem custo de token nenhum.
const inputSchema = z.object({
  imageBase64: z.string().min(100).max(4_000_000), // data: URI completa (com prefixo)
});

const outputSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        grams: z.number().min(5).max(1000),
        calories: z.number().min(0).max(3000),
        protein_g: z.number().min(0).max(300),
        carbs_g: z.number().min(0).max(400),
        fat_g: z.number().min(0).max(300),
      }),
    )
    .min(0)
    .max(12),
});

export const analyzeMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) {
      console.error("[analyzeMealPhoto] GROQ_API_KEY não configurada.");
      return null;
    }

    // Falha fechada: se o banco não puder confirmar a cota, não consome a API externa.
    const { data: quotaAvailable, error: quotaError } = await context.supabase.rpc(
      "consume_meal_photo_quota",
    );
    if (quotaError) {
      console.error("[analyzeMealPhoto] erro ao consultar cota:", quotaError.message);
      return null;
    }
    if (!quotaAvailable) {
      console.error("[analyzeMealPhoto] cota de análises de foto excedida para o usuário.");
      return null;
    }

    try {
      const maxAttempts = 2;
      let response: Response | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        // Timeout individual por tentativa — dividir um timeout único entre
        // retries fazia a foto abortar antes mesmo do 2º pedido terminar.
        const attemptController = new AbortController();
        const attemptTimeout = setTimeout(() => attemptController.abort(), 35_000);
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: attemptController.signal,
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: process.env["GROQ_VISION_MODEL"] || "qwen/qwen3.8-27b",
            temperature: 0.3,
            // Sem isso a Groq reserva o teto padrão do modelo como "saída esperada"
            // e estoura o limite de tokens de saída por minuto (OTPM) da conta antes
            // mesmo de gerar qualquer coisa — 700 cobre os 12 itens do schema com folga.
            max_tokens: 700,
            messages: [
              {
                role: "system",
                content:
                  "Você identifica os alimentos visíveis em uma foto de prato de comida brasileira e estima a porção e os macros de cada um (calorias, proteína, carboidrato e gordura em gramas), pelo que vê na foto. Estime a gramagem realista de cada porção pelo tamanho no prato. Ignore o prato, talheres e coisas que não são comida. Se a foto não mostrar comida com clareza, retorne items vazio.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: data.imageBase64 },
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "meal_photo_analysis",
                strict: true,
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["items"],
                  properties: {
                    items: {
                      type: "array",
                      maxItems: 12,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["name", "grams", "calories", "protein_g", "carbs_g", "fat_g"],
                        properties: {
                          name: { type: "string" },
                          grams: { type: "number", minimum: 5, maximum: 1000 },
                          calories: { type: "number", minimum: 0, maximum: 3000 },
                          protein_g: { type: "number", minimum: 0, maximum: 300 },
                          carbs_g: { type: "number", minimum: 0, maximum: 400 },
                          fat_g: { type: "number", minimum: 0, maximum: 300 },
                        },
                      },
                    },
                  },
                },
              },
            },
          }),
        }).finally(() => clearTimeout(attemptTimeout));

        if (response.ok) break;

        // 429/503 = sobrecarga temporária; a própria Groq recomenda backoff.
        // Outros erros (4xx de validação, auth) não melhoram tentando de novo.
        const retryable = response.status === 429 || response.status === 503;
        if (!retryable || attempt === maxAttempts) break;
        const errBody = await response.text().catch(() => "");
        console.error(
          `[analyzeMealPhoto] tentativa ${attempt}/${maxAttempts} falhou (status ${response.status}), tentando de novo:`,
          errBody,
        );
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }

      if (!response) {
        console.error("[analyzeMealPhoto] nenhuma resposta obtida da Groq.");
        return null;
      }
      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        console.error("[analyzeMealPhoto] Groq respondeu status", response.status, errBody);
        return null;
      }
      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        console.error("[analyzeMealPhoto] resposta sem conteúdo:", JSON.stringify(payload));
        return null;
      }
      const parsed = outputSchema.safeParse(JSON.parse(content));
      if (!parsed.success) {
        console.error("[analyzeMealPhoto] schema inválido:", parsed.error.message, content);
        return null;
      }

      return parsed.data.items;
    } catch (err) {
      console.error(
        "[analyzeMealPhoto] exceção:",
        err instanceof Error ? err.message : String(err),
      );
      return null;
    }
  });
