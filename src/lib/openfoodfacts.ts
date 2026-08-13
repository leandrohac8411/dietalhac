/**
 * Busca de alimentos na Open Food Facts (base pública e gratuita, sem chave de API)
 * para cobrir itens fora do catálogo próprio — industrializados, fast-food, doces etc.
 * Usado apenas no registro livre de "o que comi hoje", nunca na dieta gerada automaticamente.
 *
 * Usa o endpoint search-a-licious (search.openfoodfacts.org) em vez do cgi/search.pl
 * legado, que bloqueia requisições sem User-Agent de navegador "real".
 */

export type OffProduct = {
  name: string;
  brand?: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  fiber100: number;
};

type OffHit = {
  product_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
  };
};

export async function searchOffProducts(query: string): Promise<OffProduct[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("page_size", "8");
  url.searchParams.set("fields", "product_name,brands,nutriments");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const res = await fetch(url.toString(), { signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
  if (!res.ok) throw new Error("Não foi possível buscar na Open Food Facts.");
  const data = (await res.json()) as { hits?: OffHit[] };

  return (data.hits ?? [])
    .filter((p) => p.product_name && p.nutriments?.["energy-kcal_100g"] !== undefined)
    .map((p) => ({
      name: p.product_name!,
      ...(p.brands ? { brand: p.brands } : {}),
      kcal100: p.nutriments!["energy-kcal_100g"] ?? 0,
      protein100: p.nutriments!.proteins_100g ?? 0,
      carbs100: p.nutriments!.carbohydrates_100g ?? 0,
      fat100: p.nutriments!.fat_100g ?? 0,
      fiber100: p.nutriments!.fiber_100g ?? 0,
    }));
}
