/**
 * Geradores de plano alimentar e de treino (dados por regras).
 * Substituíveis por IA no futuro — mantêm o mesmo formato de saída.
 */

export type PlanFoodItem = {
  food_item_id?: string | undefined;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  preparation?: string | undefined;
  notes?: string | undefined;
};

export type PlanMeal = {
  name: string;
  scheduled_time: string;
  items: PlanFoodItem[];
};

export type FoodRow = {
  id: string;
  name: string;
  category: string;
  portion: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  tags: string[];
};

const DEFAULT_TIME_BY_MEAL: Record<string, string> = {
  "Café da manhã": "07:00",
  "Lanche da manhã": "10:00",
  Almoço: "12:30",
  "Lanche da tarde": "16:00",
  Jantar: "19:30",
  Ceia: "21:30",
};

const TIME_RANGE_BY_MEAL: Record<string, [number, number]> = {
  "Café da manhã": [4 * 60, 10 * 60],
  "Lanche da manhã": [8 * 60, 12 * 60],
  Almoço: [11 * 60, 15 * 60],
  "Lanche da tarde": [14 * 60, 18 * 60],
  Jantar: [17 * 60, 22 * 60],
  Ceia: [19 * 60, 24 * 60 - 1],
};

const MEALS_BY_COUNT: Record<number, string[]> = {
  3: ["Café da manhã", "Almoço", "Jantar"],
  4: ["Café da manhã", "Almoço", "Lanche da tarde", "Jantar"],
  5: ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar"],
  6: ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"],
};

function timeForMeal(name: string, candidate?: string): string {
  const fallback = DEFAULT_TIME_BY_MEAL[name] ?? "12:00";
  if (!candidate || !/^\d{2}:\d{2}$/.test(candidate)) return fallback;
  const [hours, minutes] = candidate.split(":").map(Number);
  const total = (hours ?? 0) * 60 + (minutes ?? 0);
  const [min, max] = TIME_RANGE_BY_MEAL[name] ?? [0, 1439];
  return total >= min && total <= max ? candidate : fallback;
}

// Porções-base (g) por categoria antes do ajuste de macros.
const BASE_GRAMS: Record<string, number> = {
  proteina: 130,
  peixe: 130,
  ovo: 100,
  leguminosa: 100,
  carboidrato: 100,
  vegetal: 90,
  fruta: 120,
  laticinio: 170,
  gordura: 15,
};

// Limites (g) por categoria ao escalar para bater os macros.
const CLAMP_GRAMS: Record<string, [number, number]> = {
  proteina: [60, 300],
  peixe: [60, 300],
  ovo: [50, 200],
  leguminosa: [40, 250],
  carboidrato: [30, 350],
  vegetal: [40, 250],
  fruta: [40, 250],
  laticinio: [80, 350],
  gordura: [5, 60],
};

const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const deburr = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Bloqueia alimentos cujo nome casa com algum token do texto (alergias/aversões). */
function blockedByText(name: string, text?: string | null): boolean {
  if (!text) return false;
  const n = deburr(name.toLowerCase());
  return deburr(text.toLowerCase())
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((tok) => tok.length >= 3)
    .some((tok) => n.includes(tok));
}

const DISLIKE_CATEGORY_ALIASES: Record<string, string[]> = {
  vegetal: ["legume", "legumes", "verdura", "verduras", "vegetal", "vegetais"],
  fruta: ["fruta", "frutas"],
  peixe: ["peixe", "peixes", "frutos do mar"],
  laticinio: ["laticinio", "laticinios", "leite e derivados"],
  ovo: ["ovo", "ovos"],
  leguminosa: ["feijao", "feijoes", "leguminosa", "leguminosas"],
};

function blockedCategory(food: FoodRow, text?: string | null): boolean {
  if (!text) return false;
  const tokens = deburr(text.toLowerCase())
    .split(/[,;\n]+/)
    .map((token) => token.trim());
  return (DISLIKE_CATEGORY_ALIASES[food.category] ?? []).some((alias) => tokens.includes(alias));
}

/** Aplica as restrições alimentares às tags do alimento. */
function allowedByRestrictions(food: FoodRow, restrictions: string[]): boolean {
  const t = food.tags ?? [];
  for (const r of restrictions) {
    if (
      r === "vegetariano" &&
      (t.includes("carne_vermelha") || t.includes("carne_branca") || t.includes("peixe"))
    )
      return false;
    if (r === "vegano" && t.includes("animal")) return false;
    if (r === "sem_lactose" && t.includes("lactose")) return false;
    if (r === "sem_gluten" && t.includes("gluten")) return false;
    if (r === "sem_carne_vermelha" && t.includes("carne_vermelha")) return false;
    // low_carb é tratado na composição/escala, não como exclusão.
  }
  return true;
}

export function eligibleDietFoods(params: {
  foods: FoodRow[];
  restrictions?: string[] | null;
  dislikes?: string | null;
  allergies?: string | null;
  supplements?: string | null;
}): FoodRow[] {
  const restrictions = params.restrictions ?? [];
  const supplementTokens = preferenceTokens(params.supplements);
  return params.foods.filter(
    (food) =>
      allowedByRestrictions(food, restrictions) &&
      !blockedByText(food.name, params.dislikes) &&
      !blockedCategory(food, params.dislikes) &&
      !blockedByText(food.name, params.allergies) &&
      (!isSupplement(food) ||
        supplementTokens.some((token) => deburr(food.name.toLowerCase()).includes(token))),
  );
}

function scaleFood(food: FoodRow, grams: number, preparation?: string): PlanFoodItem {
  const ratio = grams / food.portion;
  return {
    food_item_id: food.id,
    food_name: food.name,
    quantity: Math.round(grams),
    unit: food.unit,
    calories: Math.round(food.calories * ratio),
    protein_g: Math.round(food.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(food.carbs_g * ratio * 10) / 10,
    fat_g: Math.round(food.fat_g * ratio * 10) / 10,
    fiber_g: Math.round(food.fiber_g * ratio * 10) / 10,
    preparation,
  };
}

function prep(category: string): string | undefined {
  switch (category) {
    case "proteina":
    case "peixe":
      return "Grelhado ou assado";
    case "ovo":
      return "Cozido ou mexido";
    case "carboidrato":
    case "leguminosa":
      return "Cozido";
    case "vegetal":
      return "No vapor ou cru";
    case "gordura":
      return "Para temperar";
    default:
      return undefined;
  }
}

type Slot = { cats: string[]; prefer?: string[] };

const NATURAL_COMBOS: Record<string, string[][]> = {
  "Café da manhã": [
    ["Pão integral", "Ovo inteiro", "Banana prata"],
    ["Pão de forma integral", "Queijo minas frescal", "Mamão"],
    ["Tapioca (goma hidratada)", "Ovo inteiro", "Queijo cottage"],
    ["Cuscuz de milho cozido", "Ovo inteiro", "Banana prata"],
    ["Aveia em flocos", "Iogurte natural desnatado", "Banana prata"],
    ["Granola sem açúcar", "Iogurte grego natural", "Morango"],
  ],
  "Lanche da manhã": [
    ["Iogurte natural desnatado", "Banana prata", "Aveia em flocos"],
    ["Iogurte grego natural", "Morango", "Chia"],
    ["Maçã", "Pasta de amendoim"],
    ["Queijo cottage", "Mamão"],
  ],
  Almoço: [
    [
      "Arroz branco cozido",
      "Feijão carioca cozido",
      "Peito de frango grelhado",
      "Brócolis cozido",
      "Azeite de oliva",
    ],
    [
      "Arroz integral cozido",
      "Feijão preto cozido",
      "Patinho moído cozido",
      "Cenoura cozida",
      "Azeite de oliva",
    ],
    ["Batata inglesa cozida", "Filé de tilápia grelhado", "Brócolis cozido", "Azeite de oliva"],
    ["Macarrão cozido", "Patinho moído cozido", "Abobrinha cozida", "Azeite de oliva"],
    ["Arroz branco cozido", "Lentilha cozida", "Peito de frango grelhado", "Couve refogada"],
  ],
  "Lanche da tarde": [
    ["Pão integral", "Peito de peru fatiado (frios)", "Queijo cottage"],
    ["Pão de forma integral", "Ovo inteiro", "Queijo minas frescal"],
    ["Tapioca (goma hidratada)", "Peito de frango desfiado", "Queijo cottage"],
    ["Iogurte grego natural", "Banana prata", "Aveia em flocos"],
    ["Skyr natural", "Frutas vermelhas (mix congelado)", "Chia"],
  ],
  Jantar: [
    [
      "Arroz branco cozido",
      "Feijão carioca cozido",
      "Peito de frango grelhado",
      "Abobrinha cozida",
    ],
    ["Batata doce cozida", "Filé de tilápia grelhado", "Brócolis cozido", "Azeite de oliva"],
    ["Arroz integral cozido", "Patinho moído cozido", "Cenoura cozida"],
    ["Macarrão cozido", "Peito de frango desfiado", "Abobrinha cozida"],
    ["Mandioca cozida", "Omelete simples", "Couve refogada"],
  ],
  Ceia: [
    ["Iogurte natural desnatado", "Chia"],
    ["Leite desnatado", "Aveia em flocos"],
    ["Queijo cottage", "Mamão"],
    ["Skyr natural", "Morango"],
  ],
};

/** Composição de cada refeição por papel, com preferências de alimento. */
type MealRole = "regular" | "pre_workout" | "post_workout";

function archetype(name: string, lowCarb: boolean, role: MealRole): Slot[] {
  if (role === "pre_workout")
    return [
      { cats: ["carboidrato", "fruta"], prefer: ["Banana", "Pão", "Tapioca", "Aveia"] },
      { cats: ["laticinio", "proteina", "ovo"], prefer: ["Whey", "Iogurte", "Peito de peru"] },
    ];
  if (role === "post_workout")
    return [
      { cats: ["laticinio", "proteina", "peixe", "ovo"], prefer: ["Whey", "Iogurte", "Frango"] },
      { cats: ["carboidrato", "fruta"], prefer: ["Arroz", "Batata", "Mandioca", "Banana"] },
    ];
  switch (name) {
    case "Café da manhã":
      return lowCarb
        ? [{ cats: ["ovo", "laticinio", "proteina"] }, { cats: ["fruta"] }, { cats: ["gordura"] }]
        : [
            { cats: ["carboidrato"], prefer: ["Aveia", "Pão", "Tapioca", "Cuscuz"] },
            { cats: ["ovo", "laticinio", "proteina"] },
            { cats: ["fruta"] },
          ];
    case "Almoço":
      return lowCarb
        ? [
            { cats: ["proteina", "peixe"] },
            { cats: ["leguminosa"] },
            { cats: ["vegetal"] },
            { cats: ["gordura"] },
          ]
        : [
            { cats: ["carboidrato"], prefer: ["Arroz", "Batata", "Mandioca", "Macarrão"] },
            { cats: ["proteina", "peixe"] },
            { cats: ["leguminosa"] },
            { cats: ["vegetal"] },
            { cats: ["gordura"] },
          ];
    case "Jantar":
      return lowCarb
        ? [{ cats: ["proteina", "peixe"] }, { cats: ["vegetal"] }, { cats: ["gordura"] }]
        : [
            { cats: ["carboidrato"], prefer: ["Batata", "Mandioca", "Arroz"] },
            { cats: ["proteina", "peixe"] },
            { cats: ["vegetal"] },
            { cats: ["gordura"] },
          ];
    case "Lanche da manhã":
      return lowCarb
        ? [{ cats: ["laticinio", "ovo"] }, { cats: ["gordura"] }]
        : [{ cats: ["fruta"] }, { cats: ["laticinio", "gordura"] }];
    case "Lanche da tarde":
      return lowCarb
        ? [{ cats: ["laticinio", "ovo"] }, { cats: ["gordura"] }]
        : [{ cats: ["proteina", "laticinio"] }, { cats: ["gordura"] }];
    case "Ceia":
      return [{ cats: ["laticinio", "proteina"], prefer: ["Iogurte", "Queijo", "Whey"] }];
    default:
      return [{ cats: ["proteina", "peixe"] }, { cats: ["carboidrato"] }, { cats: ["vegetal"] }];
  }
}

/** Seletor com variedade: evita repetir alimentos e respeita preferências. */
function preferenceTokens(text?: string | null): string[] {
  if (!text) return [];
  return deburr(text.toLowerCase())
    .split(/[,;\n]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function makePicker(
  pool: FoodRow[],
  likedFoods?: string | null,
  supplements?: string | null,
  used = new Set<string>(),
) {
  const liked = preferenceTokens(likedFoods);
  const supplementNames = preferenceTokens(supplements);
  return (slot: Slot): FoodRow | undefined => {
    const candidates = pool.filter((f) => slot.cats.includes(f.category));
    if (candidates.length === 0) return undefined;
    const rank = (f: FoodRow) => {
      const preferred = slot.prefer && slot.prefer.some((p) => f.name.includes(p)) ? 0 : 1;
      const fresh = used.has(f.id) ? 1 : 0;
      const normalized = deburr(f.name.toLowerCase());
      const personal = [...liked, ...supplementNames].some((token) => normalized.includes(token))
        ? 0
        : 1;
      return personal * 4 + preferred * 2 + fresh * 10;
    };
    // Embaralha antes de ordenar para variar entre empates de rank (ex.: "Regenerar"
    // não repete sempre o mesmo alimento quando há várias opções igualmente boas).
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const chosen = shuffled.sort((a, b) => rank(a) - rank(b))[0]!;
    used.add(chosen.id);
    return chosen;
  };
}

function minutesOf(value?: string | null): number | null {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours === undefined || minutes === undefined || hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function workoutRoles(
  times: string[],
  trainingTime?: string | null,
  trainingDurationMin?: number | null,
): MealRole[] {
  const roles: MealRole[] = times.map(() => "regular");
  const start = minutesOf(trainingTime);
  if (start === null) return roles;
  const end = start + clampN(trainingDurationMin ?? 60, 15, 240);
  const mealMinutes = times.map(minutesOf);
  let preIndex = -1;
  let postIndex = -1;
  let preDistance = Infinity;
  let postDistance = Infinity;
  mealMinutes.forEach((meal, index) => {
    if (meal === null) return;
    const before = start - meal;
    if (before >= 0 && before <= 180 && before < preDistance) {
      preDistance = before;
      preIndex = index;
    }
    const after = meal - end;
    if (after >= 0 && after <= 180 && after < postDistance) {
      postDistance = after;
      postIndex = index;
    }
  });
  if (preIndex >= 0) roles[preIndex] = "pre_workout";
  if (postIndex >= 0) roles[postIndex] = "post_workout";
  return roles;
}

type BuildItem = {
  food: FoodRow;
  grams: number;
  mealIndex: number;
  preparation?: string | undefined;
};

function macrosOf(items: BuildItem[]) {
  return items.reduce(
    (acc, it) => {
      const r = it.grams / it.food.portion;
      acc.calories += it.food.calories * r;
      acc.protein += it.food.protein_g * r;
      acc.carbs += it.food.carbs_g * r;
      acc.fat += it.food.fat_g * r;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

type DietTargets = { calories: number; protein: number; carbs: number; fat: number; fiber: number };

/** Limites clínicos de porção. A categoria sozinha não basta: 170 g pode ser
 * normal para iogurte desnatado, mas é irreal para queijo gorduroso. */
function portionBounds(food: FoodRow): [number, number] {
  const name = deburr(food.name.toLowerCase());
  if (isSupplement(food)) return [20, 40];
  if (name.includes("aveia")) return [20, 40];
  if (name.includes("chia")) return [5, 20];
  if (name.includes("pasta de amendoim")) return [10, 20];
  if (name.includes("cottage")) return [60, 150];
  if (name.includes("queijo")) return [20, 60];
  if (name.includes("iogurte") || name.includes("skyr")) return [100, 250];
  if (name.includes("azeite") || name.includes("oleo")) return [0, 10];
  if (name.includes("pao")) return [25, 100];
  if (food.category === "fruta") return [80, 250];
  if (food.category === "vegetal") return [50, 150];
  if (food.category === "proteina" || food.category === "peixe") return [60, 200];
  const fatPerProtein = food.protein_g > 0 ? food.fat_g / food.protein_g : Infinity;
  if (food.category === "gordura") return [0, 15];
  if (food.category === "laticinio" && fatPerProtein > 0.4) return [20, 80];
  if (food.category === "laticinio") return [80, 300];
  if (food.category === "ovo") return [50, 150];
  return CLAMP_GRAMS[food.category] ?? [10, 400];
}

const MEAL_ENERGY_SHARES: Record<number, number[]> = {
  3: [0.25, 0.4, 0.35],
  4: [0.22, 0.34, 0.14, 0.3],
  5: [0.2, 0.1, 0.32, 0.13, 0.25],
  6: [0.2, 0.1, 0.3, 0.1, 0.22, 0.08],
};

function mealDistributionPenalty(items: BuildItem[], targets: DietTargets): number {
  const mealCount = Math.max(1, ...items.map((item) => item.mealIndex + 1));
  const shares = MEAL_ENERGY_SHARES[mealCount];
  if (!shares) return 0;
  let penalty = 0;
  for (let index = 0; index < mealCount; index += 1) {
    const meal = macrosOf(items.filter((item) => item.mealIndex === index));
    const calorieTarget = targets.calories * (shares[index] ?? 1 / mealCount);
    const proteinTarget = targets.protein * (shares[index] ?? 1 / mealCount);
    const fatTarget = targets.fat * (shares[index] ?? 1 / mealCount);
    penalty += ((meal.calories - calorieTarget) / Math.max(1, calorieTarget)) ** 2 * 0.1;
    penalty += ((meal.protein - proteinTarget) / Math.max(1, proteinTarget)) ** 2 * 0.02;
    const fatExcess = Math.max(0, meal.fat - fatTarget * 1.35) / Math.max(1, fatTarget);
    penalty += fatExcess ** 2 * 0.8;
  }
  return penalty;
}

/** Erro normalizado dos quatro alvos. Excesso de gordura e calorias recebe
 * penalidade maior, pois era a regressão que criava dietas hiperlipídicas. */
function macroObjective(items: BuildItem[], targets: DietTargets): number {
  const m = macrosOf(items);
  const relative = (actual: number, target: number) =>
    target > 0 ? (actual - target) / target : 0;
  const calorieError = relative(m.calories, targets.calories);
  const proteinError = relative(m.protein, targets.protein);
  const carbError = relative(m.carbs, targets.carbs);
  const fatError = relative(m.fat, targets.fat);
  return (
    calorieError ** 2 * (calorieError > 0 ? 2.5 : 1.5) +
    proteinError ** 2 * (proteinError < 0 ? 2 : 1.2) +
    carbError ** 2 * 1.3 +
    fatError ** 2 * (fatError > 0 ? 4 : 1.5) +
    mealDistributionPenalty(items, targets)
  );
}

/** Otimização discreta em passos de 5 g. O LLM escolhe combinações; somente
 * este algoritmo decide as quantidades finais dentro de limites plausíveis. */
function optimizePortions(items: BuildItem[], targets: DietTargets): void {
  for (const item of items) {
    const [lo, hi] = portionBounds(item.food);
    item.grams = clampN(item.grams, lo, hi);
  }

  for (const step of [25, 10, 5]) {
    for (let pass = 0; pass < 30; pass += 1) {
      let improved = false;
      for (const item of items) {
        const [lo, hi] = portionBounds(item.food);
        const original = item.grams;
        let bestGrams = original;
        let bestScore = macroObjective(items, targets);
        for (const candidate of [original - step, original + step, lo, hi]) {
          item.grams = clampN(candidate, lo, hi);
          const score = macroObjective(items, targets);
          if (score + 1e-9 < bestScore) {
            bestScore = score;
            bestGrams = item.grams;
          }
        }
        item.grams = bestGrams;
        if (bestGrams !== original) improved = true;
      }
      if (!improved) break;
    }
  }
}

const proteinCategories = ["proteina", "peixe", "ovo", "laticinio"];
const fatPerProtein = (food: FoodRow) =>
  food.protein_g > 0 ? food.fat_g / food.protein_g : Infinity;

function isSupplement(food: FoodRow): boolean {
  const name = deburr(food.name.toLowerCase());
  return name.includes("whey") || name.includes("proteina em po");
}

/** Repara uma seleção inviável antes de mexer nas porções. Mantém a escolha
 * culinária da IA quando possível, mas troca o excesso de fontes gordurosas
 * por fontes magras do catálogo. */
function repairProteinSelection(
  names: string[],
  items: BuildItem[],
  foods: FoodRow[],
  targets: DietTargets,
): void {
  const used = new Set(items.map((item) => item.food.id));
  const leanFoods = foods
    .filter(
      (food) =>
        proteinCategories.includes(food.category) &&
        food.protein_g / Math.max(1, food.portion) >= 0.08 &&
        fatPerProtein(food) <= 0.3,
    )
    .sort((a, b) => fatPerProtein(a) - fatPerProtein(b));

  const fattyItems = items
    .filter(
      (item) => proteinCategories.includes(item.food.category) && fatPerProtein(item.food) > 0.4,
    )
    .sort(
      (a, b) =>
        (b.food.fat_g * b.grams) / b.food.portion - (a.food.fat_g * a.grams) / a.food.portion,
    );

  for (const item of fattyItems) {
    if (macrosOf(items).fat <= targets.fat * 1.05) break;
    const mealName = names[item.mealIndex] ?? "";
    const mainMeal = mealName === "Almoço" || mealName === "Jantar";
    const preferredCategories = mainMeal ? ["proteina", "peixe"] : ["laticinio", "ovo", "proteina"];
    const replacement = leanFoods.find(
      (food) =>
        preferredCategories.includes(food.category) &&
        (!mainMeal || !isSupplement(food)) &&
        !used.has(food.id),
    );
    if (!replacement) continue;
    used.delete(item.food.id);
    used.add(replacement.id);
    item.food = replacement;
    const [lo, hi] = portionBounds(replacement);
    item.grams = clampN(BASE_GRAMS[replacement.category] ?? 100, lo, hi);
    item.preparation = prep(replacement.category);
  }
}

function repairMealCompatibility(names: string[], items: BuildItem[], foods: FoodRow[]): void {
  const used = new Set(items.map((item) => item.food.id));
  for (const item of items) {
    const mealName = names[item.mealIndex] ?? "";
    const mainMeal = mealName === "Almoço" || mealName === "Jantar";
    if (!mainMeal || !isSupplement(item.food)) continue;
    const replacement = foods.find(
      (food) =>
        ["proteina", "peixe", "ovo"].includes(food.category) &&
        !isSupplement(food) &&
        fatPerProtein(food) <= 0.4 &&
        !used.has(food.id),
    );
    if (!replacement) continue;
    used.delete(item.food.id);
    used.add(replacement.id);
    item.food = replacement;
    const [lo, hi] = portionBounds(replacement);
    item.grams = clampN(BASE_GRAMS[replacement.category] ?? 100, lo, hi);
    item.preparation = prep(replacement.category);
  }

  for (let mealIndex = 0; mealIndex < names.length; mealIndex += 1) {
    if (!names[mealIndex]?.startsWith("Café da manhã")) continue;
    const mealItems = items.filter((item) => item.mealIndex === mealIndex);
    const hasBowlCereal = mealItems.some((item) => {
      const name = deburr(item.food.name.toLowerCase());
      return name.includes("granola") || name.includes("aveia");
    });
    const egg = mealItems.find((item) => item.food.category === "ovo");
    if (!hasBowlCereal || !egg) continue;
    const dairy = foods.find((food) => {
      const name = deburr(food.name.toLowerCase());
      return (
        food.category === "laticinio" &&
        (name.includes("iogurte") || name.includes("skyr") || name.includes("leite")) &&
        !used.has(food.id)
      );
    });
    if (!dairy) continue;
    used.delete(egg.food.id);
    used.add(dairy.id);
    egg.food = dairy;
    const [lo, hi] = portionBounds(dairy);
    egg.grams = clampN(BASE_GRAMS[dairy.category] ?? 170, lo, hi);
    egg.preparation = undefined;
  }
}

function balanceAndFormat(
  names: string[],
  times: string[],
  items: BuildItem[],
  targets: DietTargets,
): PlanMeal[] {
  if (items.length === 0)
    return names.map((name, i) => ({ name, scheduled_time: times[i]!, items: [] }));

  optimizePortions(items, targets);

  for (const item of items) item.grams = Math.max(5, Math.round(item.grams / 5) * 5);
  return names.map((name, index) => ({
    name,
    scheduled_time: times[index]!,
    items: items
      .filter((item) => item.mealIndex === index)
      .map((item) => scaleFood(item.food, item.grams, item.preparation)),
  }));
}

export function mealPlanMacros(plan: PlanMeal[]) {
  return plan
    .flatMap((meal) => meal.items)
    .reduce(
      (total, item) => ({
        calories: total.calories + item.calories,
        protein: total.protein + item.protein_g,
        carbs: total.carbs + item.carbs_g,
        fat: total.fat + item.fat_g,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}

export function mealPlanDeviation(plan: PlanMeal[], targets: DietTargets): number {
  const totals = mealPlanMacros(plan);
  const relative = (actual: number, target: number) =>
    target > 0 ? Math.abs(actual - target) / target : 0;
  return (
    relative(totals.calories, targets.calories) +
    relative(totals.protein, targets.protein) +
    relative(totals.carbs, targets.carbs) +
    relative(totals.fat, targets.fat) * 2
  );
}

export function mealPlanWithinTolerance(plan: PlanMeal[], targets: DietTargets): boolean {
  const totals = mealPlanMacros(plan);
  const within = (actual: number, target: number, tolerance: number) =>
    target <= 0 || Math.abs(actual - target) / target <= tolerance;
  const shares = MEAL_ENERGY_SHARES[plan.length] ?? plan.map(() => 1 / Math.max(1, plan.length));
  const mealsAreBalanced = plan.every((meal, index) => {
    const mealFat = meal.items.reduce((sum, item) => sum + item.fat_g, 0);
    const fatCeiling = Math.max(8, targets.fat * (shares[index] ?? 0) * 1.5);
    const names = meal.items.map((item) => deburr(item.food_name.toLowerCase()));
    const hasOmelet = names.some((name) => name.includes("omelete"));
    const stacksOmeletFat =
      hasOmelet &&
      names.some(
        (name) =>
          name.includes("queijo") ||
          name.includes("azeite") ||
          name.includes("bacon") ||
          name.includes("linguica") ||
          name.includes("frango") ||
          name.includes("carne") ||
          name.includes("patinho") ||
          name.includes("tilapia") ||
          name.includes("camarao") ||
          name.includes("atum") ||
          name.includes("peru") ||
          name.includes("ovo inteiro"),
      );
    return mealFat <= fatCeiling && !stacksOmeletFat;
  });
  return (
    within(totals.calories, targets.calories, 0.08) &&
    within(totals.protein, targets.protein, 0.1) &&
    within(totals.carbs, targets.carbs, 0.12) &&
    within(totals.fat, targets.fat, 0.1) &&
    mealsAreBalanced
  );
}

export type NaturalMealChoice = {
  name: string;
  scheduled_time: string;
  items: { food_item_id: string; grams: number; preparation?: string | undefined }[];
};

export function buildMealPlanFromChoices(params: {
  foods: FoodRow[];
  choices: NaturalMealChoice[];
  targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
}): PlanMeal[] {
  const foodsById = new Map(params.foods.map((food) => [food.id, food]));
  const items: BuildItem[] = [];
  params.choices.forEach((meal, mealIndex) => {
    const seen = new Set<string>();
    meal.items.slice(0, 6).forEach((choice) => {
      const food = foodsById.get(choice.food_item_id);
      if (!food || seen.has(food.id)) return;
      seen.add(food.id);
      const [min, max] = CLAMP_GRAMS[food.category] ?? [5, 400];
      items.push({
        food,
        grams: clampN(Number(choice.grams) || BASE_GRAMS[food.category] || 100, min, max),
        mealIndex,
        preparation: choice.preparation ?? prep(food.category),
      });
    });
  });
  repairProteinSelection(
    params.choices.map((meal) => meal.name),
    items,
    params.foods,
    params.targets,
  );
  repairMealCompatibility(
    params.choices.map((meal) => meal.name),
    items,
    params.foods,
  );
  return balanceAndFormat(
    params.choices.map((meal) => meal.name),
    params.choices.map((meal) => meal.scheduled_time),
    items,
    params.targets,
  );
}

/** Monta a dieta respeitando restrições e aproximando os macros da meta. */
export function generateMealPlan(params: {
  foods: FoodRow[];
  mealsPerDay: number;
  mealTimes?: string[] | null;
  targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  restrictions?: string[] | null;
  dislikes?: string | null;
  allergies?: string | null;
  likedFoods?: string | null;
  supplements?: string | null;
  trainingTime?: string | null;
  trainingDurationMin?: number | null;
}): PlanMeal[] {
  const restrictions = params.restrictions ?? [];
  const lowCarb = restrictions.includes("low_carb");

  const pool = eligibleDietFoods(params);

  const count = clampN(Math.round(params.mealsPerDay || 5), 3, 6);
  const names = MEALS_BY_COUNT[count] ?? MEALS_BY_COUNT[5]!;
  const times = names.map((name, i) => timeForMeal(name, params.mealTimes?.[i]));
  const roles = workoutRoles(times, params.trainingTime, params.trainingDurationMin);
  const displayNames = names.map((name, index) => {
    if (roles[index] === "pre_workout") return `${name} (pré-treino)`;
    if (roles[index] === "post_workout") return `${name} (pós-treino)`;
    return name;
  });

  const usedFoods = new Set<string>();
  const pick = makePicker(pool, params.likedFoods, params.supplements, usedFoods);
  const items: BuildItem[] = [];
  names.forEach((name, mi) => {
    const compatibleCombos = (roles[mi] === "regular" ? (NATURAL_COMBOS[name] ?? []) : [])
      .map((combo) => combo.map((foodName) => pool.find((food) => food.name === foodName)))
      .filter((combo) => combo.length > 0 && combo.every(Boolean)) as FoodRow[][];
    const chosenCombo = lowCarb
      ? undefined
      : [...compatibleCombos].sort((a, b) => {
          const repeats = (combo: FoodRow[]) =>
            combo.reduce((count, food) => count + Number(usedFoods.has(food.id)), 0);
          return repeats(a) - repeats(b) || Math.random() - 0.5;
        })[0];

    if (chosenCombo) {
      chosenCombo.forEach((food) => {
        usedFoods.add(food.id);
        items.push({
          food,
          grams: BASE_GRAMS[food.category] ?? 100,
          mealIndex: mi,
          preparation: prep(food.category),
        });
      });
      return;
    }

    for (const slot of archetype(name, lowCarb, roles[mi] ?? "regular")) {
      const food = pick(slot);
      if (food) {
        items.push({
          food,
          grams: BASE_GRAMS[food.category] ?? 100,
          mealIndex: mi,
          preparation: prep(food.category),
        });
      }
    }
  });

  repairProteinSelection(names, items, pool, params.targets);
  repairMealCompatibility(names, items, pool);
  return balanceAndFormat(displayNames, times, items, params.targets);
}

export type PlanWorkoutExercise = {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string | undefined;
  difficulty?: string | undefined;
  alternative_name?: string | undefined;
};

export type PlanWorkout = {
  name: string;
  muscle_groups: string;
  weekday: number;
  estimated_min: number;
  exercises: PlanWorkoutExercise[];
};

export const SPLIT_LABELS: Record<string, string> = {
  full_body: "Corpo inteiro",
  ab: "Treino AB",
  abc: "Treino ABC",
  abcd: "Treino ABCD",
  upper_lower: "Superior e Inferior",
  home: "Treino em casa",
  feminino: "Foco em pernas e glúteos",
};

export function chooseSplit(days: number, experience?: string | null): string {
  if (days <= 2) return "full_body";
  if (days === 3) return experience === "avancado" ? "abc" : "full_body";
  if (days === 4) return "upper_lower";
  return "abcd";
}

export type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
  place: string | null;
  difficulty: string | null;
  alternative_name: string | null;
};

// Grupos musculares disponíveis para montar/trocar um treino manualmente.
export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  pernas: "Pernas",
  posterior: "Posterior de coxa",
  gluteos: "Glúteos",
  panturrilha: "Panturrilha",
  abdomen: "Abdômen",
  adutor: "Adutor",
  abdutor: "Abdutor",
  lombar: "Lombar",
  cardio: "Cardio",
};

/** Monta a lista de exercícios para um conjunto arbitrário de grupos musculares
 *  (usado tanto pelos blueprints automáticos quanto para o usuário trocar/gerar
 *  um único dia manualmente, ex.: "só tríceps" ou "costas e ombro"). */
export function buildWorkoutExercises(params: {
  exercises: ExerciseRow[];
  groups: string[];
  durationMin: number;
  place: string;
  goal: string;
}): PlanWorkoutExercise[] {
  const home = params.place === "home" || params.place === "outdoor";
  const pool = params.exercises.filter((e) => (home ? e.place !== "gym" : true));
  const maxEx = params.durationMin <= 30 ? 4 : params.durationMin <= 45 ? 5 : 7;

  return params.groups
    .flatMap((g) => pool.filter((e) => e.muscle_group === g))
    .slice(0, maxEx)
    .map<PlanWorkoutExercise>((e) => ({
      exercise_name: e.name,
      sets: params.goal === "forca" ? 4 : 3,
      reps: params.goal === "forca" ? "4-6" : params.goal === "condicionamento" ? "15-20" : "8-12",
      rest_seconds: params.goal === "forca" ? 150 : 60,
      difficulty: e.difficulty ?? "iniciante",
      alternative_name: e.alternative_name ?? undefined,
    }));
}

type Blueprint = { name: string; groups: string[]; label: string };

// Mapeia as áreas de prioridade do onboarding para os muscle_group do catálogo.
const PRIORITY_TO_GROUPS: Record<string, string[]> = {
  abdomen: ["abdomen"],
  gluteos: ["gluteos", "abdutor"],
  pernas: ["pernas", "posterior", "adutor"],
  bracos: ["biceps", "triceps"],
  costas: ["costas"],
  peito: ["peito"],
  ombros: ["ombros"],
};

const HOME_BLUEPRINTS: Record<number, Blueprint[]> = {
  1: [
    {
      name: "Treino A — Corpo inteiro em casa",
      groups: ["pernas", "gluteos", "peito", "costas", "abdomen"],
      label: "Corpo inteiro",
    },
  ],
  2: [
    {
      name: "Treino A — Inferiores e core",
      groups: ["gluteos", "pernas", "posterior", "abdomen"],
      label: "Inferiores e core",
    },
    {
      name: "Treino B — Superiores e cardio",
      groups: ["peito", "costas", "ombros", "cardio"],
      label: "Superiores e cardio",
    },
  ],
  3: [
    {
      name: "Treino A — Corpo inteiro em casa",
      groups: ["pernas", "peito", "costas", "abdomen"],
      label: "Corpo inteiro",
    },
    {
      name: "Treino B — Inferiores e core",
      groups: ["gluteos", "pernas", "abdomen", "cardio"],
      label: "Inferiores e core",
    },
    {
      name: "Treino C — Superiores e cardio",
      groups: ["peito", "costas", "cardio", "abdomen"],
      label: "Superiores e cardio",
    },
  ],
};

// Masculino: reflete o padrão real de fichas avançadas — pernas em 2 dias, um dia
// dedicado a cada grupo de tronco, um dia de cárdio/abdômen quando sobra espaço.
const MALE_BLUEPRINTS: Record<number, Blueprint[]> = {
  1: [
    {
      name: "Treino A — Corpo inteiro",
      groups: ["pernas", "peito", "costas", "ombros", "abdomen"],
      label: "Corpo inteiro",
    },
  ],
  2: [
    {
      name: "Treino A — Superiores",
      groups: ["peito", "costas", "ombros", "biceps", "triceps"],
      label: "Superiores",
    },
    {
      name: "Treino B — Inferiores",
      groups: ["pernas", "posterior", "gluteos", "panturrilha", "abdomen"],
      label: "Inferiores",
    },
  ],
  3: [
    {
      name: "Treino A — Peito e ombro",
      groups: ["peito", "ombros"],
      label: "Peito e ombro",
    },
    {
      name: "Treino B — Costas, tríceps e bíceps",
      groups: ["costas", "triceps", "biceps"],
      label: "Costas, tríceps e bíceps",
    },
    {
      name: "Treino C — Inferior",
      groups: ["pernas", "posterior", "gluteos", "panturrilha"],
      label: "Inferior",
    },
  ],
  4: [
    {
      name: "Treino A — Peito e ombro",
      groups: ["peito", "ombros"],
      label: "Peito e ombro",
    },
    {
      name: "Treino B — Costas, tríceps e bíceps",
      groups: ["costas", "triceps", "biceps"],
      label: "Costas, tríceps e bíceps",
    },
    {
      name: "Treino C — Inferior",
      groups: ["pernas", "posterior", "gluteos", "panturrilha"],
      label: "Inferior",
    },
    {
      name: "Treino D — Inferior (2ª sessão)",
      groups: ["pernas", "adutor", "abdutor", "panturrilha"],
      label: "Inferior",
    },
  ],
  5: [
    {
      name: "Treino A — Pernas",
      groups: ["pernas", "posterior", "adutor", "abdutor", "panturrilha"],
      label: "Pernas",
    },
    {
      name: "Treino B — Peito e tríceps",
      groups: ["peito", "triceps", "abdomen"],
      label: "Peito e tríceps",
    },
    { name: "Treino C — Costas", groups: ["costas", "abdomen"], label: "Costas" },
    {
      name: "Treino D — Ombros e bíceps",
      groups: ["ombros", "biceps", "abdomen"],
      label: "Ombros e bíceps",
    },
    {
      name: "Treino E — Pernas (2ª sessão)",
      groups: ["posterior", "gluteos", "pernas", "panturrilha"],
      label: "Pernas",
    },
  ],
  6: [
    {
      name: "Treino A — Pernas",
      groups: ["pernas", "posterior", "adutor", "abdutor", "panturrilha"],
      label: "Pernas",
    },
    {
      name: "Treino B — Peito e tríceps",
      groups: ["peito", "triceps", "abdomen"],
      label: "Peito e tríceps",
    },
    { name: "Treino C — Costas", groups: ["costas", "lombar", "abdomen"], label: "Costas" },
    {
      name: "Treino D — Pernas (2ª sessão)",
      groups: ["posterior", "gluteos", "pernas", "panturrilha"],
      label: "Pernas",
    },
    {
      name: "Treino E — Ombros e bíceps",
      groups: ["ombros", "biceps", "abdomen"],
      label: "Ombros e bíceps",
    },
    {
      name: "Treino F — Cárdio e abdômen",
      groups: ["cardio", "abdomen"],
      label: "Cárdio e abdômen",
    },
  ],
  7: [
    {
      name: "Treino A — Pernas",
      groups: ["pernas", "posterior", "adutor", "abdutor", "panturrilha"],
      label: "Pernas",
    },
    {
      name: "Treino B — Peito e tríceps",
      groups: ["peito", "triceps", "abdomen"],
      label: "Peito e tríceps",
    },
    { name: "Treino C — Costas", groups: ["costas", "lombar", "abdomen"], label: "Costas" },
    {
      name: "Treino D — Pernas (2ª sessão)",
      groups: ["posterior", "gluteos", "pernas", "panturrilha"],
      label: "Pernas",
    },
    {
      name: "Treino E — Ombros e bíceps",
      groups: ["ombros", "biceps", "abdomen"],
      label: "Ombros e bíceps",
    },
    {
      name: "Treino F — Cárdio e abdômen",
      groups: ["cardio", "abdomen"],
      label: "Cárdio e abdômen",
    },
    {
      name: "Treino G — Peito e costas (extra)",
      groups: ["peito", "costas"],
      label: "Peito e costas",
    },
  ],
};

// Feminino: reflete o padrão real das fichas — a maioria dos dias é glúteo/perna,
// tronco (peito/costas/ombro/braço) fica comprimido em 1-2 dias de volume menor.
const FEMALE_BLUEPRINTS: Record<number, Blueprint[]> = {
  1: [
    {
      name: "Treino A — Pernas e glúteos",
      groups: ["gluteos", "pernas", "posterior", "adutor", "abdutor", "panturrilha"],
      label: "Pernas e glúteos",
    },
  ],
  2: [
    {
      name: "Treino A — Glúteos e pernas",
      groups: ["gluteos", "pernas", "adutor", "abdutor", "panturrilha"],
      label: "Glúteos e pernas",
    },
    {
      name: "Treino B — Tronco",
      groups: ["peito", "costas", "ombros", "biceps", "triceps", "abdomen"],
      label: "Tronco",
    },
  ],
  3: [
    {
      name: "Treino A — Glúteos, posterior e panturrilha",
      groups: ["gluteos", "posterior", "adutor", "abdutor", "panturrilha"],
      label: "Glúteos e posterior",
    },
    {
      name: "Treino B — Tronco e abdômen",
      groups: ["peito", "costas", "ombros", "abdomen"],
      label: "Tronco e abdômen",
    },
    {
      name: "Treino C — Pernas completas",
      groups: ["pernas", "gluteos", "posterior", "panturrilha"],
      label: "Pernas completas",
    },
  ],
  4: [
    {
      name: "Treino A — Glúteos e posterior",
      groups: ["gluteos", "posterior", "adutor", "abdutor", "panturrilha"],
      label: "Glúteos e posterior",
    },
    {
      name: "Treino B — Peito e costas",
      groups: ["peito", "costas", "abdomen"],
      label: "Peito e costas",
    },
    {
      name: "Treino C — Pernas completas",
      groups: ["pernas", "gluteos", "posterior", "panturrilha"],
      label: "Pernas completas",
    },
    {
      name: "Treino D — Ombros e braços",
      groups: ["ombros", "biceps", "triceps", "abdomen"],
      label: "Ombros e braços",
    },
  ],
  5: [
    {
      name: "Treino A — Glúteos e posterior",
      groups: ["gluteos", "posterior", "adutor", "abdutor"],
      label: "Glúteos e posterior",
    },
    {
      name: "Treino B — Peito, tríceps e ombros",
      groups: ["peito", "triceps", "ombros"],
      label: "Peito, tríceps e ombros",
    },
    {
      name: "Treino C — Pernas completas",
      groups: ["pernas", "gluteos", "posterior", "panturrilha"],
      label: "Pernas completas",
    },
    {
      name: "Treino D — Costas e bíceps",
      groups: ["costas", "biceps", "abdomen"],
      label: "Costas e bíceps",
    },
    {
      name: "Treino E — Glúteos (2ª sessão)",
      groups: ["gluteos", "abdutor", "adutor", "panturrilha"],
      label: "Glúteos",
    },
  ],
  6: [
    {
      name: "Treino A — Glúteos e posterior",
      groups: ["gluteos", "posterior", "adutor", "abdutor"],
      label: "Glúteos e posterior",
    },
    {
      name: "Treino B — Peito, tríceps e ombros",
      groups: ["peito", "triceps", "ombros"],
      label: "Peito, tríceps e ombros",
    },
    {
      name: "Treino C — Pernas completas",
      groups: ["pernas", "gluteos", "posterior", "panturrilha"],
      label: "Pernas completas",
    },
    {
      name: "Treino D — Costas e bíceps",
      groups: ["costas", "biceps", "abdomen"],
      label: "Costas e bíceps",
    },
    {
      name: "Treino E — Glúteos (2ª sessão)",
      groups: ["gluteos", "abdutor", "adutor", "panturrilha"],
      label: "Glúteos",
    },
    {
      name: "Treino F — Cárdio e abdômen",
      groups: ["cardio", "abdomen"],
      label: "Cárdio e abdômen",
    },
  ],
  7: [
    {
      name: "Treino A — Glúteos e posterior",
      groups: ["gluteos", "posterior", "adutor", "abdutor"],
      label: "Glúteos e posterior",
    },
    {
      name: "Treino B — Peito, tríceps e ombros",
      groups: ["peito", "triceps", "ombros"],
      label: "Peito, tríceps e ombros",
    },
    {
      name: "Treino C — Pernas completas",
      groups: ["pernas", "gluteos", "posterior", "panturrilha"],
      label: "Pernas completas",
    },
    {
      name: "Treino D — Costas e bíceps",
      groups: ["costas", "biceps", "abdomen"],
      label: "Costas e bíceps",
    },
    {
      name: "Treino E — Glúteos (2ª sessão)",
      groups: ["gluteos", "abdutor", "adutor", "panturrilha"],
      label: "Glúteos",
    },
    {
      name: "Treino F — Cárdio e abdômen",
      groups: ["cardio", "abdomen"],
      label: "Cárdio e abdômen",
    },
    {
      name: "Treino G — Pernas (extra)",
      groups: ["pernas", "posterior", "panturrilha"],
      label: "Pernas",
    },
  ],
};

const SPLIT_PREFERENCE_DAYS: Record<string, number> = { ab: 2, abc: 3, abcd: 4 };

function pickBlueprint(
  days: number,
  sex: string | null | undefined,
  home: boolean,
  splitPreference?: string | null,
): Blueprint[] {
  const d = clampDays(days);
  if (home) return HOME_BLUEPRINTS[Math.min(d, 3)] ?? HOME_BLUEPRINTS[3]!;
  const table = sex === "feminino" ? FEMALE_BLUEPRINTS : MALE_BLUEPRINTS;

  // Com um estilo explícito (AB/ABC/ABCD), o split escolhido cicla (A,B,C,A,B,C...)
  // independente de quantos dias por semana a pessoa treina, em vez de ganhar um
  // dia extra dedicado. "auto" mantém o comportamento por contagem de dias.
  if (splitPreference && splitPreference in SPLIT_PREFERENCE_DAYS) {
    const fixedDays = SPLIT_PREFERENCE_DAYS[splitPreference]!;
    return table[fixedDays] ?? table[3]!;
  }

  return table[d] ?? table[3]!;
}

function clampDays(d: number): number {
  return Math.min(Math.max(Math.round(d), 1), 7);
}

/** Gera o plano de treino conforme objetivo, experiência, dias, local, sexo e ênfase. */
export function generateWorkoutPlan(params: {
  exercises: ExerciseRow[];
  days: number;
  durationMin: number;
  place: string;
  experience?: string | null;
  goal: string;
  sex?: string | null;
  priorityAreas?: string[] | null;
  priorityLevel?: string | null;
  splitPreference?: string | null;
}): { split: string; workouts: PlanWorkout[] } {
  const home = params.place === "home" || params.place === "outdoor";
  const days = clampDays(params.days);
  const blueprints = pickBlueprint(days, params.sex, home, params.splitPreference).map((bp) => ({
    ...bp,
  }));
  const explicitSplit =
    params.splitPreference && params.splitPreference in SPLIT_PREFERENCE_DAYS
      ? params.splitPreference
      : null;
  const split =
    explicitSplit ??
    (home ? "home" : params.sex === "feminino" ? "feminino" : chooseSplit(days, params.experience));

  const pool = params.exercises.filter((e) => (home ? e.place !== "gym" : true));
  const baseMaxEx = params.durationMin <= 30 ? 4 : params.durationMin <= 45 ? 5 : 7;

  // Ênfase: expande as áreas de prioridade para muscle_group. Se o foco não é
  // "balanced", garante que pelo menos metade dos dias da semana toquem a
  // prioridade — não basta 1 dia já tocar o grupo "de passagem"; converte dias
  // não relacionados (de trás para frente, pulando o dia de cárdio puro) até
  // atingir essa cobertura, para a ênfase ser sentida de verdade no plano.
  const priorityGroups = [
    ...new Set((params.priorityAreas ?? []).flatMap((a) => PRIORITY_TO_GROUPS[a] ?? [])),
  ];
  if (priorityGroups.length > 0 && params.priorityLevel && params.priorityLevel !== "balanced") {
    const emphasisLabel = priorityGroups.map((g) => MUSCLE_GROUP_LABELS[g] ?? g).join(" e ");
    const wantedCoverage = Math.max(1, Math.ceil((blueprints.length * 2) / 3));
    let covered = blueprints.filter((bp) =>
      bp.groups.some((g) => priorityGroups.includes(g)),
    ).length;
    for (let i = blueprints.length - 1; i >= 0 && covered < wantedCoverage; i -= 1) {
      const bp = blueprints[i]!;
      if (bp.groups.some((g) => priorityGroups.includes(g))) continue;
      if (bp.label.includes("Cárdio")) continue;
      const prefix = bp.name.split("—")[0]?.trim() ?? "Treino";
      blueprints[i] = {
        name: `${prefix} — Ênfase: ${emphasisLabel}`,
        groups: priorityGroups,
        label: `Ênfase: ${emphasisLabel}`,
      };
      covered += 1;
    }
  }

  const byGroup = (groups: string[], limit: number) =>
    groups
      .flatMap((g) => pool.filter((e) => e.muscle_group === g))
      .slice(0, limit)
      .map<PlanWorkoutExercise>((e) => ({
        exercise_name: e.name,
        sets: params.goal === "forca" ? 4 : 3,
        reps:
          params.goal === "forca" ? "4-6" : params.goal === "condicionamento" ? "15-20" : "8-12",
        rest_seconds: params.goal === "forca" ? 150 : 60,
        difficulty: e.difficulty ?? "iniciante",
        alternative_name: e.alternative_name ?? undefined,
      }));

  const workouts: PlanWorkout[] = [];
  const weekdays = [1, 2, 3, 4, 5, 6, 0];
  const cardioPool = pool.filter((e) => e.muscle_group === "cardio");

  for (let i = 0; i < days; i += 1) {
    const bp = blueprints[i % blueprints.length]!;
    const hasPriority = bp.groups.some((g) => priorityGroups.includes(g));
    const maxEx = hasPriority ? baseMaxEx + 1 : baseMaxEx;
    const exs = byGroup(bp.groups, maxEx);

    // Finaliza todo treino de musculação com um cardio curto, como no treino de
    // referência do usuário — dias que já são de cárdio puro não repetem.
    if (!bp.groups.includes("cardio") && cardioPool.length > 0) {
      const c = cardioPool[i % cardioPool.length]!;
      exs.push({
        exercise_name: c.name,
        sets: 1,
        reps: "12-15 min",
        rest_seconds: 0,
        difficulty: c.difficulty ?? "iniciante",
        alternative_name: c.alternative_name ?? undefined,
      });
    }

    workouts.push({
      name: bp.name,
      muscle_groups: bp.label,
      weekday: weekdays[i] ?? 1,
      estimated_min: params.durationMin,
      exercises: exs,
    });
  }

  return { split, workouts };
}
