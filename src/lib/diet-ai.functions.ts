import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  meals: z
    .array(z.object({ name: z.string(), scheduled_time: z.string() }))
    .min(3)
    .max(6),
  foods: z
    .array(z.object({ id: z.string().uuid(), name: z.string(), category: z.string() }))
    .min(1)
    .max(250),
  restrictions: z.array(z.string()).max(20),
  dislikes: z.string().nullable(),
  allergies: z.string().nullable(),
  likedFoods: z.string().nullable(),
  supplements: z.string().nullable(),
  trainingTime: z.string().nullable(),
});

const outputSchema = z.object({
  meals: z.array(
    z.object({
      name: z.string(),
      scheduled_time: z.string(),
      items: z
        .array(
          z.object({
            food_item_id: z.string().uuid(),
            grams: z.number().min(5).max(400),
            preparation: z.string().max(80),
          }),
        )
        .min(2)
        .max(6),
    }),
  ),
});

export const generateNaturalDiet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) return null;

    // Falha fechada: se o banco não puder confirmar a cota, não consome a API externa.
    const { data: quotaAvailable, error: quotaError } = await context.supabase.rpc(
      "consume_diet_generation_quota",
    );
    if (quotaError || !quotaAvailable) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env["GROQ_DIET_MODEL"] || "openai/gpt-oss-20b",
          temperature: 0.65,
          messages: [
            {
              role: "system",
              content:
                "Você organiza refeições brasileiras comuns e apetitosas. Use exclusivamente os IDs fornecidos. Respeite os alimentos preferidos, suplementos, aversões e o contexto de treino recebidos. Refeições marcadas como pré-treino devem ser leves, com carboidrato e proteína; pós-treino deve conter proteína e carboidrato, mas deve continuar respeitando o tipo da refeição. Em café da manhã e lanches, nunca use arroz, feijão, lentilha, macarrão, mandioca, batata ou inhame; prefira frutas, aveia, pão recheado, tapioca, cuscuz, iogurte, ovos ou whey. Pão precisa de recheio. Quando usar presunto ou peito de peru com pão, combine com uma porção pequena de queijo, ricota ou cottage; não repita embutidos em mais de uma refeição do dia. Fruta é acompanhamento ou combina com iogurte/aveia; almoço e jantar devem parecer pratos reais. Nunca invente alimentos, macros ou IDs. Evite repetir o mesmo alimento em refeições diferentes.",
            },
            { role: "user", content: JSON.stringify(data) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "natural_diet",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["meals"],
                properties: {
                  meals: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["name", "scheduled_time", "items"],
                      properties: {
                        name: { type: "string" },
                        scheduled_time: { type: "string" },
                        items: {
                          type: "array",
                          minItems: 2,
                          maxItems: 6,
                          items: {
                            type: "object",
                            additionalProperties: false,
                            required: ["food_item_id", "grams", "preparation"],
                            properties: {
                              food_item_id: { type: "string" },
                              grams: { type: "number", minimum: 5, maximum: 400 },
                              preparation: { type: "string" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = outputSchema.safeParse(JSON.parse(content));
      if (!parsed.success || parsed.data.meals.length !== data.meals.length) return null;

      const validIds = new Set(data.foods.map((food) => food.id));
      if (
        parsed.data.meals.some((meal) =>
          meal.items.some((item) => !validIds.has(item.food_item_id)),
        )
      )
        return null;
      return parsed.data.meals.map((meal, index) => ({
        ...meal,
        name: data.meals[index]!.name,
        scheduled_time: data.meals[index]!.scheduled_time,
      }));
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  });
