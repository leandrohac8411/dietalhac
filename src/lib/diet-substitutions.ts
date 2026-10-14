// Substituições no estilo de plano de nutricionista: cada alimento tem um grupo
// de trocas ("Opções de substituição para Arroz: Batata doce 250 g, Mandioca
// 200 g...") com a porção equivalente já calculada.

type Basis = "protein" | "kcal" | "same";
type Scope = "any" | "main" | "other";

type ExchangeGroup = {
  id: string;
  /** Equivalência: mesma proteína, mesmas calorias ou a mesma quantidade. */
  basis: Basis;
  /** "main" = almoço/jantar; "other" = café, lanches, pré/pós, ceia. */
  scope: Scope;
  names: string[];
};

const GROUPS: ExchangeGroup[] = [
  {
    id: "paes",
    basis: "kcal",
    scope: "any",
    names: [
      "Pão francês",
      "Pão de forma integral",
      "Pão integral",
      "Pão sírio integral",
      "Tapioca (goma hidratada)",
      "Cuscuz de milho cozido",
      "Pão de forma branco",
    ],
  },
  {
    id: "carboidratos-principais",
    basis: "kcal",
    scope: "any",
    names: [
      "Arroz branco cozido",
      "Arroz integral cozido",
      "Arroz parboilizado cozido",
      "Batata doce cozida",
      "Mandioca cozida",
      "Batata inglesa cozida",
      "Macarrão cozido",
      "Inhame cozido",
      "Cará cozido",
      "Batata baroa cozida",
    ],
  },
  {
    id: "feijoes",
    basis: "kcal",
    scope: "any",
    names: [
      "Feijão carioca cozido",
      "Feijão preto cozido",
      "Feijão fradinho cozido",
      "Feijão branco cozido",
      "Lentilha cozida",
      "Grão-de-bico cozido",
    ],
  },
  {
    id: "proteinas-principais",
    basis: "protein",
    scope: "main",
    names: [
      "Peito de frango grelhado",
      "Sobrecoxa de frango sem pele",
      "Coxa de frango sem pele assada",
      "Patinho moído cozido",
      "Alcatra grelhada",
      "Coxão mole grelhado",
      "Carne de panela (músculo)",
      "Filé de tilápia grelhado",
      "Merluza grelhada",
      "Pescada assada",
      "Camarão cozido",
      "Ovos mexidos sem óleo",
      "Ovo inteiro",
      "Omelete simples",
      "Tofu firme",
      "Proteína texturizada de soja",
    ],
  },
  {
    id: "proteinas-leves",
    basis: "protein",
    scope: "other",
    names: [
      "Ovo inteiro",
      "Ovo cozido",
      "Ovos mexidos sem óleo",
      "Omelete simples",
      "Peito de frango desfiado",
      "Atum em água",
      "Peito de peru fatiado (frios)",
      "Presunto cozido",
      "Filé de tilápia grelhado",
    ],
  },
  {
    id: "queijos",
    basis: "kcal",
    scope: "any",
    names: [
      "Queijo minas frescal",
      "Mussarela fatiada",
      "Queijo mussarela light",
      "Requeijão light",
      "Queijo cottage",
      "Ricota",
    ],
  },
  {
    id: "iogurtes",
    basis: "kcal",
    scope: "any",
    names: ["Iogurte natural desnatado", "Iogurte grego natural", "Skyr natural"],
  },
  {
    id: "leites",
    basis: "kcal",
    scope: "any",
    names: ["Leite desnatado", "Leite desnatado sem lactose"],
  },
  {
    id: "frutas",
    basis: "kcal",
    scope: "any",
    names: [
      "Banana prata",
      "Maçã",
      "Mamão",
      "Morango",
      "Laranja",
      "Manga",
      "Uva",
      "Pera",
      "Abacaxi",
      "Kiwi",
      "Melancia",
      "Melão",
      "Tangerina",
    ],
  },
  {
    id: "legumes",
    basis: "same",
    scope: "any",
    names: [
      "Brócolis cozido",
      "Cenoura cozida",
      "Abobrinha cozida",
      "Vagem refogada",
      "Couve-flor cozida",
      "Chuchu cozido",
      "Abóbora cozida",
      "Beterraba cozida",
      "Repolho refogado",
      "Espinafre cozido",
    ],
  },
  {
    id: "saladas",
    basis: "same",
    scope: "any",
    names: ["Alface", "Tomate", "Rúcula", "Pepino", "Pimentão"],
  },
  {
    id: "whey",
    basis: "protein",
    scope: "any",
    names: ["Whey protein isolado", "Whey protein concentrado", "Proteína vegana (ervilha/arroz)"],
  },
  {
    id: "cereais",
    basis: "kcal",
    scope: "any",
    names: ["Aveia em flocos", "Granola sem açúcar"],
  },
  {
    id: "gorduras-boas",
    basis: "kcal",
    scope: "any",
    names: ["Pasta de amendoim", "Amêndoas", "Castanha de caju", "Castanha do Pará", "Nozes"],
  },
  {
    id: "sucos",
    basis: "same",
    scope: "any",
    names: ["Suco de uva integral", "Suco de laranja integral", "Suco de maçã integral"],
  },
];

type Nutrient = {
  name: string;
  portion: number;
  calories: number;
  protein_g: number;
};

export type SubstitutionOption = {
  foodId: string;
  name: string;
  grams: number;
  unit: string;
  calories: number;
  measure: string | null;
};

function isMainMeal(mealName: string): boolean {
  return /^(almo[cç]o|jantar)/i.test(mealName.trim());
}

const roundPortion = (grams: number) =>
  grams >= 100 ? Math.round(grams / 10) * 10 : Math.round(grams / 5) * 5;

/** Medidas caseiras aproximadas (g por unidade), só pros alimentos onde isso é natural. */
const HOUSEHOLD: { test: RegExp; grams: number; one: string; many: string }[] = [
  { test: /^(ovo inteiro|ovo cozido|ovos mexidos)/i, grams: 50, one: "ovo", many: "ovos" },
  { test: /^pão francês/i, grams: 50, one: "pão", many: "pães" },
  { test: /^pão (de forma|integral|sírio)/i, grams: 25, one: "fatia", many: "fatias" },
  { test: /^whey/i, grams: 30, one: "scoop", many: "scoops" },
  { test: /^banana/i, grams: 70, one: "banana", many: "bananas" },
  { test: /^maçã/i, grams: 130, one: "maçã", many: "maçãs" },
  { test: /^laranja/i, grams: 180, one: "laranja", many: "laranjas" },
  { test: /^queijo minas/i, grams: 30, one: "fatia", many: "fatias" },
  { test: /^mussarela fatiada/i, grams: 20, one: "fatia", many: "fatias" },
  {
    test: /^(pasta de amendoim|aveia em flocos|requeijão)/i,
    grams: 15,
    one: "colher de sopa",
    many: "colheres de sopa",
  },
  { test: /^azeite/i, grams: 5, one: "colher de chá", many: "colheres de chá" },
];

/** "≈ 2 ovos", "≈ 1,5 fatias"... ou null quando a medida caseira não fica redonda. */
export function householdMeasure(foodName: string, quantity: number): string | null {
  const entry = HOUSEHOLD.find((h) => h.test.test(foodName));
  if (!entry || quantity <= 0) return null;
  const units = quantity / entry.grams;
  const halves = Math.round(units * 2) / 2;
  if (halves < 0.5 || halves > 12 || Math.abs(units - halves) > 0.15) return null;
  const text = Number.isInteger(halves) ? String(halves) : String(halves).replace(".", ",");
  return `≈ ${text} ${halves <= 1 ? entry.one : entry.many}`;
}

/** Substituições equivalentes pra um item, só com alimentos que a pessoa pode comer. */
export function substitutionOptions(params: {
  foodName: string;
  mealName: string;
  grams: number;
  calories: number;
  protein: number;
  foods: (Nutrient & { id: string; unit: string })[];
  limit?: number;
}): SubstitutionOption[] {
  const main = isMainMeal(params.mealName);
  const scopes: Scope[] = main ? ["main", "any"] : ["other", "any"];
  const group = GROUPS.find((g) => scopes.includes(g.scope) && g.names.includes(params.foodName));
  if (!group || params.grams <= 0) return [];

  const byName = new Map(params.foods.map((food) => [food.name, food]));
  const result: SubstitutionOption[] = [];
  for (const name of group.names) {
    if (name === params.foodName) continue;
    const food = byName.get(name);
    if (!food || food.portion <= 0) continue;
    let grams: number;
    if (group.basis === "same") grams = params.grams;
    else if (group.basis === "protein") {
      const perGram = food.protein_g / food.portion;
      if (perGram <= 0 || params.protein <= 0) continue;
      grams = params.protein / perGram;
    } else {
      const perGram = food.calories / food.portion;
      if (perGram <= 0 || params.calories <= 0) continue;
      grams = params.calories / perGram;
    }
    grams = roundPortion(grams);
    if (grams < 5 || grams > params.grams * 4 || grams < params.grams * 0.25) continue;
    // Frios: ninguém troca por 75 g de presunto.
    if (/presunto|peito de peru fatiado/i.test(food.name) && grams > 50) continue;
    result.push({
      foodId: food.id,
      name: food.name,
      grams,
      unit: food.unit,
      calories: Math.round((food.calories * grams) / food.portion),
      measure: householdMeasure(food.name, grams),
    });
  }
  return result.slice(0, params.limit ?? 10);
}
