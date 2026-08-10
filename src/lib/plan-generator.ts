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

const MEAL_NAMES = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

const DEFAULT_TIMES = ["07:00", "10:00", "12:30", "16:00", "19:30", "21:30"];

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

/** Composição de cada refeição por papel, com preferências de alimento. */
function archetype(name: string, lowCarb: boolean): Slot[] {
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
function makePicker(pool: FoodRow[]) {
  const used = new Set<string>();
  return (slot: Slot): FoodRow | undefined => {
    const candidates = pool.filter((f) => slot.cats.includes(f.category));
    if (candidates.length === 0) return undefined;
    const rank = (f: FoodRow) => {
      const preferred = slot.prefer && slot.prefer.some((p) => f.name.includes(p)) ? 0 : 1;
      const fresh = used.has(f.id) ? 1 : 0;
      return preferred * 2 + fresh;
    };
    const chosen = [...candidates].sort((a, b) => rank(a) - rank(b))[0]!;
    used.add(chosen.id);
    return chosen;
  };
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

function scaleCategories(items: BuildItem[], cats: string[], factor: number) {
  for (const it of items) {
    if (cats.includes(it.food.category)) {
      const [lo, hi] = CLAMP_GRAMS[it.food.category] ?? [10, 400];
      it.grams = clampN(it.grams * factor, lo, hi);
    }
  }
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
}): PlanMeal[] {
  const restrictions = params.restrictions ?? [];
  const lowCarb = restrictions.includes("low_carb");

  const pool = params.foods.filter(
    (f) =>
      allowedByRestrictions(f, restrictions) &&
      !blockedByText(f.name, params.dislikes) &&
      !blockedByText(f.name, params.allergies),
  );

  const count = clampN(Math.round(params.mealsPerDay || 5), 3, 6);
  const names = MEAL_NAMES.slice(0, count);
  const times = names.map((_, i) => params.mealTimes?.[i] ?? DEFAULT_TIMES[i] ?? "12:00");

  const pick = makePicker(pool);
  const items: BuildItem[] = [];
  names.forEach((name, mi) => {
    for (const slot of archetype(name, lowCarb)) {
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

  if (items.length === 0) {
    return names.map((name, i) => ({ name, scheduled_time: times[i]!, items: [] }));
  }

  // Ajuste de macros: fixa proteína → fixa gordura → carbo equilibra a energia.
  // Duas passadas para convergir o acoplamento (leguminosas contam em P e C).
  const t = params.targets;
  const PROT_CATS = ["proteina", "peixe", "ovo", "laticinio"];
  const CARB_CATS = ["carboidrato", "leguminosa", "fruta"];

  const fatFrom = (keep: (c: string) => boolean) =>
    items
      .filter((it) => keep(it.food.category))
      .reduce((a, it) => a + (it.food.fat_g * it.grams) / it.food.portion, 0);
  const carbsNow = () =>
    items
      .filter((it) => CARB_CATS.includes(it.food.category))
      .reduce((a, it) => a + (it.food.carbs_g * it.grams) / it.food.portion, 0);

  for (let pass = 0; pass < 2; pass += 1) {
    // 1) Proteína na meta.
    const mp = macrosOf(items);
    if (mp.protein > 0) scaleCategories(items, PROT_CATS, clampN(t.protein / mp.protein, 0.6, 2.5));

    // 2) Gordura na meta, descontando a que vem de proteínas/outros alimentos.
    const fatGordura = fatFrom((c) => c === "gordura");
    if (fatGordura > 0) {
      const fatOutros = fatFrom((c) => c !== "gordura");
      scaleCategories(items, ["gordura"], clampN((t.fat - fatOutros) / fatGordura, 0.2, 3));
    }

    // 3) Carboidrato equilibra as calorias restantes (P e G já fixados).
    const mc = macrosOf(items);
    const carbTargetG = Math.max(0, (t.calories - mc.protein * 4 - mc.fat * 9) / 4);
    const carbNow = carbsNow();
    if (carbNow > 0) scaleCategories(items, CARB_CATS, clampN(carbTargetG / carbNow, 0.4, 2.4));
  }

  // Arredonda para múltiplos de 5 g (porções realistas).
  for (const it of items) it.grams = Math.max(5, Math.round(it.grams / 5) * 5);

  return names.map((name, i) => ({
    name,
    scheduled_time: times[i]!,
    items: items
      .filter((it) => it.mealIndex === i)
      .map((it) => scaleFood(it.food, it.grams, it.preparation)),
  }));
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
};

export function chooseSplit(days: number, experience?: string | null): string {
  if (days <= 2) return "full_body";
  if (days === 3) return experience === "avancado" ? "abc" : "full_body";
  if (days === 4) return "upper_lower";
  return "abcd";
}

type ExerciseRow = {
  id: string;
  name: string;
  muscle_group: string;
  place: string | null;
  difficulty: string | null;
  alternative_name: string | null;
};

/** Gera o plano de treino conforme objetivo, experiência, dias e local. */
export function generateWorkoutPlan(params: {
  exercises: ExerciseRow[];
  days: number;
  durationMin: number;
  place: string;
  experience?: string | null;
  goal: string;
}): { split: string; workouts: PlanWorkout[] } {
  const split = params.place === "home" ? "home" : chooseSplit(params.days, params.experience);
  const home = params.place === "home" || params.place === "outdoor";

  const pool = params.exercises.filter((e) => (home ? e.place !== "gym" : true));
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

  const maxEx = params.durationMin <= 30 ? 4 : params.durationMin <= 45 ? 5 : 7;

  const blueprints: Record<string, Array<{ name: string; groups: string[]; label: string }>> = {
    full_body: [
      {
        name: "Treino A — Corpo inteiro",
        groups: ["pernas", "peito", "costas", "ombros", "abdomen"],
        label: "Corpo inteiro",
      },
      {
        name: "Treino B — Corpo inteiro",
        groups: ["posterior", "costas", "peito", "biceps", "abdomen"],
        label: "Corpo inteiro",
      },
      {
        name: "Treino C — Corpo inteiro",
        groups: ["pernas", "gluteos", "ombros", "triceps", "cardio"],
        label: "Corpo inteiro",
      },
    ],
    ab: [
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
    upper_lower: [
      {
        name: "Treino A — Superior",
        groups: ["peito", "costas", "ombros", "biceps"],
        label: "Superior",
      },
      {
        name: "Treino B — Inferior",
        groups: ["pernas", "posterior", "gluteos", "panturrilha"],
        label: "Inferior",
      },
      {
        name: "Treino C — Superior",
        groups: ["costas", "peito", "ombros", "triceps"],
        label: "Superior",
      },
      {
        name: "Treino D — Inferior",
        groups: ["pernas", "gluteos", "posterior", "abdomen"],
        label: "Inferior",
      },
    ],
    abc: [
      {
        name: "Treino A — Peito, ombros e tríceps",
        groups: ["peito", "ombros", "triceps"],
        label: "Peito, ombros e tríceps",
      },
      {
        name: "Treino B — Costas e bíceps",
        groups: ["costas", "biceps", "abdomen"],
        label: "Costas e bíceps",
      },
      {
        name: "Treino C — Pernas",
        groups: ["pernas", "posterior", "gluteos", "panturrilha"],
        label: "Pernas",
      },
    ],
    abcd: [
      {
        name: "Treino A — Peito e tríceps",
        groups: ["peito", "triceps"],
        label: "Peito e tríceps",
      },
      {
        name: "Treino B — Costas e bíceps",
        groups: ["costas", "biceps"],
        label: "Costas e bíceps",
      },
      {
        name: "Treino C — Pernas",
        groups: ["pernas", "posterior", "panturrilha"],
        label: "Pernas",
      },
      {
        name: "Treino D — Ombros e abdômen",
        groups: ["ombros", "abdomen", "gluteos"],
        label: "Ombros e abdômen",
      },
    ],
    home: [
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

  const plans = blueprints[split] ?? blueprints["full_body"]!;
  const workouts: PlanWorkout[] = [];
  const weekdays = [1, 2, 3, 4, 5, 6, 0];

  for (let i = 0; i < params.days; i += 1) {
    const bp = plans[i % plans.length]!;
    workouts.push({
      name: bp.name,
      muscle_groups: bp.label,
      weekday: weekdays[i] ?? 1,
      estimated_min: params.durationMin,
      exercises: byGroup(bp.groups, maxEx),
    });
  }

  return { split, workouts };
}
