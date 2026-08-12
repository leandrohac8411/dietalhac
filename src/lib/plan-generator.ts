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
    // Embaralha antes de ordenar para variar entre empates de rank (ex.: "Regenerar"
    // não repete sempre o mesmo alimento quando há várias opções igualmente boas).
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const chosen = shuffled.sort((a, b) => rank(a) - rank(b))[0]!;
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

  // Ênfase: expande as áreas de prioridade para muscle_group e amplia o volume dos
  // dias que já tocam nessas áreas; se o foco não é "balanced" e nenhum dia do
  // blueprint já cobre a prioridade, dedica o último dia (que normalmente repetiria
  // um grupo já treinado) exclusivamente a ela.
  const priorityGroups = (params.priorityAreas ?? []).flatMap((a) => PRIORITY_TO_GROUPS[a] ?? []);
  if (priorityGroups.length > 0 && params.priorityLevel && params.priorityLevel !== "balanced") {
    const alreadyCovered = blueprints.some((bp) =>
      bp.groups.some((g) => priorityGroups.includes(g)),
    );
    const last = blueprints[blueprints.length - 1]!;
    if (!alreadyCovered) {
      blueprints[blueprints.length - 1] = {
        name: `Treino extra — ${last.label.includes("Cárdio") ? "Foco" : "Ênfase"}`,
        groups: [...new Set(priorityGroups)],
        label: "Ênfase escolhida",
      };
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
