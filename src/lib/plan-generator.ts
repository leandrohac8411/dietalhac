/**
 * Geradores de plano alimentar e de treino (dados simulados por regras).
 * Substituíveis por IA no futuro — a assinatura das funções não deve mudar.
 */

export type PlanFoodItem = {
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  preparation?: string;
  notes?: string;
};

export type PlanMeal = {
  name: string;
  scheduled_time: string;
  items: PlanFoodItem[];
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

type FoodRow = {
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
};

function scaleFood(food: FoodRow, grams: number, preparation?: string): PlanFoodItem {
  const ratio = grams / food.portion;
  return {
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

/** Monta a dieta distribuindo macros entre as refeições escolhidas. */
export function generateMealPlan(params: {
  foods: FoodRow[];
  mealsPerDay: number;
  mealTimes?: string[] | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): PlanMeal[] {
  const pick = (name: string) => params.foods.find((f) => f.name === name);
  const count = Math.min(Math.max(params.mealsPerDay, 3), 6);
  const names = MEAL_NAMES.slice(0, count);
  const times = names.map((_, i) => params.mealTimes?.[i] ?? DEFAULT_TIMES[i] ?? "12:00");

  // Distribuição percentual de calorias por refeição
  const spread: Record<number, number[]> = {
    3: [0.3, 0.4, 0.3],
    4: [0.25, 0.15, 0.35, 0.25],
    5: [0.22, 0.13, 0.3, 0.13, 0.22],
    6: [0.2, 0.1, 0.28, 0.12, 0.2, 0.1],
  };
  const shares = spread[count] ?? spread[5]!;

  const rice = pick("Arroz branco cozido");
  const chicken = pick("Peito de frango grelhado");
  const bread = pick("Pão francês");
  const eggs = pick("Ovo inteiro");
  const oats = pick("Aveia em flocos");
  const banana = pick("Banana prata");
  const yogurt = pick("Iogurte natural desnatado");
  const beans = pick("Feijão carioca cozido");
  const broccoli = pick("Brócolis cozido");
  const fish = pick("Filé de tilápia");
  const sweetPotato = pick("Batata doce cozida");
  const peanut = pick("Pasta de amendoim");
  const oil = pick("Azeite de oliva");
  const salad = pick("Alface");

  const templates: Array<(kcal: number) => PlanFoodItem[]> = [
    // Café da manhã
    (kcal) => {
      const out: PlanFoodItem[] = [];
      if (oats) out.push(scaleFood(oats, (kcal * 0.35) / (oats.calories / oats.portion) / 1, "Misturar no iogurte ou leite"));
      if (eggs) out.push(scaleFood(eggs, 100, "Mexidos com pouco azeite"));
      if (banana) out.push(scaleFood(banana, 100));
      return out;
    },
    // Lanche da manhã
    () => {
      const out: PlanFoodItem[] = [];
      if (yogurt) out.push(scaleFood(yogurt, 170));
      if (peanut) out.push(scaleFood(peanut, 15));
      return out;
    },
    // Almoço
    (kcal) => {
      const out: PlanFoodItem[] = [];
      if (rice) out.push(scaleFood(rice, Math.max(100, (kcal * 0.3) / (rice.calories / 100)), "Cozido"));
      if (beans) out.push(scaleFood(beans, 100));
      if (chicken) out.push(scaleFood(chicken, Math.max(120, (kcal * 0.3) / (chicken.calories / 100)), "Grelhado"));
      if (salad) out.push(scaleFood(salad, 60, "Cru, à vontade"));
      if (oil) out.push(scaleFood(oil, 8, "Para temperar a salada"));
      return out;
    },
    // Lanche da tarde
    () => {
      const out: PlanFoodItem[] = [];
      if (bread) out.push(scaleFood(bread, 50));
      if (eggs) out.push(scaleFood(eggs, 100, "Cozidos"));
      return out;
    },
    // Jantar
    (kcal) => {
      const out: PlanFoodItem[] = [];
      if (sweetPotato) out.push(scaleFood(sweetPotato, Math.max(120, (kcal * 0.3) / (sweetPotato.calories / 100)), "Assada ou cozida"));
      if (fish) out.push(scaleFood(fish, 130, "Grelhado"));
      if (broccoli) out.push(scaleFood(broccoli, 100, "No vapor"));
      return out;
    },
    // Ceia
    () => {
      const out: PlanFoodItem[] = [];
      if (yogurt) out.push(scaleFood(yogurt, 120));
      return out;
    },
  ];

  return names.map((name, i) => ({
    name,
    scheduled_time: times[i]!,
    items: (templates[i] ?? templates[1]!)(params.calories * (shares[i] ?? 0.2)),
  }));
}

export type PlanWorkoutExercise = {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
  difficulty?: string;
  alternative_name?: string;
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
        reps: params.goal === "forca" ? "4-6" : params.goal === "condicionamento" ? "15-20" : "8-12",
        rest_seconds: params.goal === "forca" ? 150 : 60,
        difficulty: e.difficulty ?? "iniciante",
        alternative_name: e.alternative_name ?? undefined,
      }));

  const maxEx = params.durationMin <= 30 ? 4 : params.durationMin <= 45 ? 5 : 7;

  const blueprints: Record<string, Array<{ name: string; groups: string[]; label: string }>> = {
    full_body: [
      { name: "Treino A — Corpo inteiro", groups: ["pernas", "peito", "costas", "ombros", "abdomen"], label: "Corpo inteiro" },
      { name: "Treino B — Corpo inteiro", groups: ["posterior", "costas", "peito", "biceps", "abdomen"], label: "Corpo inteiro" },
      { name: "Treino C — Corpo inteiro", groups: ["pernas", "gluteos", "ombros", "triceps", "cardio"], label: "Corpo inteiro" },
    ],
    ab: [
      { name: "Treino A — Superiores", groups: ["peito", "costas", "ombros", "biceps", "triceps"], label: "Superiores" },
      { name: "Treino B — Inferiores", groups: ["pernas", "posterior", "gluteos", "panturrilha", "abdomen"], label: "Inferiores" },
    ],
    upper_lower: [
      { name: "Treino A — Superior", groups: ["peito", "costas", "ombros", "biceps"], label: "Superior" },
      { name: "Treino B — Inferior", groups: ["pernas", "posterior", "gluteos", "panturrilha"], label: "Inferior" },
      { name: "Treino C — Superior", groups: ["costas", "peito", "ombros", "triceps"], label: "Superior" },
      { name: "Treino D — Inferior", groups: ["pernas", "gluteos", "posterior", "abdomen"], label: "Inferior" },
    ],
    abc: [
      { name: "Treino A — Peito, ombros e tríceps", groups: ["peito", "ombros", "triceps"], label: "Peito, ombros e tríceps" },
      { name: "Treino B — Costas e bíceps", groups: ["costas", "biceps", "abdomen"], label: "Costas e bíceps" },
      { name: "Treino C — Pernas", groups: ["pernas", "posterior", "gluteos", "panturrilha"], label: "Pernas" },
    ],
    abcd: [
      { name: "Treino A — Peito e tríceps", groups: ["peito", "triceps"], label: "Peito e tríceps" },
      { name: "Treino B — Costas e bíceps", groups: ["costas", "biceps"], label: "Costas e bíceps" },
      { name: "Treino C — Pernas", groups: ["pernas", "posterior", "panturrilha"], label: "Pernas" },
      { name: "Treino D — Ombros e abdômen", groups: ["ombros", "abdomen", "gluteos"], label: "Ombros e abdômen" },
    ],
    home: [
      { name: "Treino A — Corpo inteiro em casa", groups: ["pernas", "peito", "costas", "abdomen"], label: "Corpo inteiro" },
      { name: "Treino B — Inferiores e core", groups: ["gluteos", "pernas", "abdomen", "cardio"], label: "Inferiores e core" },
      { name: "Treino C — Superiores e cardio", groups: ["peito", "costas", "cardio", "abdomen"], label: "Superiores e cardio" },
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
