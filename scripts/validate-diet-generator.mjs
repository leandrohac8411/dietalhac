import assert from "node:assert/strict";
import {
  buildMealPlanFromChoices,
  eligibleDietFoods,
  generateMealPlan,
  generateMealAlternatives,
  mealPlanMacros,
  mealPlanNaturalnessPenalty,
} from "../src/lib/plan-generator.ts";

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const food = (n, name, category, calories, protein, carbs, fat, portion = 100, unit = "g") => ({
  id: id(n),
  name,
  category,
  portion,
  unit,
  calories,
  protein_g: protein,
  carbs_g: carbs,
  fat_g: fat,
  fiber_g: 0,
  tags: [],
});

// Reproduz a seleção que gerou 130 g de gordura: queijo minas em duas
// refeições, cottage repetido e poucas fontes de carboidrato.
const foods = [
  food(1, "Pão de forma integral", "carboidrato", 246, 10, 43, 3.5),
  food(2, "Queijo minas frescal", "laticinio", 264, 17, 3, 20),
  food(3, "Mamão", "fruta", 40, 0.5, 10, 0.1),
  food(4, "Queijo cottage", "laticinio", 98, 11, 3.4, 4.3),
  food(5, "Macarrão cozido", "carboidrato", 158, 5.8, 31, 0.9),
  food(6, "Patinho moído cozido", "proteina", 219, 27, 0, 12),
  food(7, "Abobrinha cozida", "vegetal", 17, 1.2, 3, 0.2),
  food(8, "Azeite de oliva", "gordura", 884, 0, 0, 100, 100, "ml"),
  food(9, "Ovo inteiro", "ovo", 155, 13, 1.1, 11),
  food(10, "Mandioca cozida", "carboidrato", 125, 0.6, 30, 0.3),
  food(11, "Omelete simples", "ovo", 154, 11, 1.6, 11),
  food(12, "Couve refogada", "vegetal", 90, 2.9, 8, 5),
  food(13, "Peito de frango grelhado", "proteina", 165, 31, 0, 3.6),
  food(14, "Iogurte natural desnatado", "laticinio", 41, 4, 5.9, 0.2),
  food(15, "Whey protein isolado", "proteina", 370, 85, 5, 2),
];

const meal = (name, scheduled_time, entries) => ({
  name,
  scheduled_time,
  items: entries.map(([foodId, grams]) => ({ food_item_id: foodId, grams })),
});

const choices = [
  meal("Café da manhã", "08:30", [
    [id(1), 30],
    [id(2), 165],
    [id(3), 40],
  ]),
  meal("Lanche da manhã", "10:00", [
    [id(4), 165],
    [id(3), 40],
  ]),
  meal("Almoço", "12:30", [
    [id(5), 30],
    [id(6), 125],
    [id(7), 90],
    [id(8), 5],
  ]),
  meal("Lanche da tarde", "16:00", [
    [id(1), 30],
    [id(9), 100],
    [id(2), 165],
  ]),
  meal("Jantar", "18:00", [
    [id(10), 30],
    [id(11), 100],
    [id(12), 90],
  ]),
  meal("Ceia", "22:00", [
    [id(4), 165],
    [id(3), 40],
  ]),
];

const targets = { calories: 1990, protein: 167, carbs: 207, fat: 55, fiber: 30 };
const plan = buildMealPlanFromChoices({ foods, choices, targets });
const totals = mealPlanMacros(plan);

// Mesmo quando a IA escolhe a combinação historicamente ruim, os limites
// clínicos impedem a regressão de 130 g de gordura e porções absurdas.
assert.ok(totals.calories <= targets.calories * 1.08, JSON.stringify(totals));
assert.ok(totals.protein >= targets.protein * 0.9, JSON.stringify(totals));
assert.ok(totals.carbs <= targets.carbs * 1.12, JSON.stringify(totals));
assert.ok(totals.fat <= targets.fat * 1.12, JSON.stringify(totals));
for (const item of plan.flatMap((entry) => entry.items)) {
  if (item.food_name === "Queijo minas frescal") assert.ok(item.quantity <= 80);
  assert.equal(item.quantity % 5, 0);
}
assert.ok(
  mealPlanNaturalnessPenalty(plan) >= 3,
  "Pão acompanhado apenas de whey deve ser identificado como combinação artificial.",
);

const strangePlan = [
  meal("Café da manhã", "08:30", [[id(1), 100]]),
  meal("Almoço", "12:30", [[id(5), 200]]),
].map((entry) => buildMealPlanFromChoices({ foods, choices: [entry], targets })[0]);
assert.ok(
  mealPlanNaturalnessPenalty(strangePlan) >= 1.3,
  "Uma lista matematicamente possível, mas sem composição de refeição, deve ser penalizada.",
);

const dryBreadPlan = buildMealPlanFromChoices({
  foods,
  choices: [
    meal("Lanche da manhã", "10:00", [
      [id(1), 50],
      [id(15), 30],
      [id(3), 120],
    ]),
  ],
  targets: { calories: 400, protein: 30, carbs: 50, fat: 8, fiber: 5 },
});
assert.ok(
  mealPlanNaturalnessPenalty(dryBreadPlan) >= 3,
  "Whey ao lado não deve ser aceito como recheio do pão.",
);

for (const mealsPerDay of [3, 5, 6]) {
  const scenarioPlan = generateMealPlan({ foods, mealsPerDay, targets });
  assert.equal(scenarioPlan.length, mealsPerDay);
  assert.ok(scenarioPlan.every((entry) => entry.items.length > 0));
  assert.ok(scenarioPlan.flatMap((entry) => entry.items).every((item) => item.quantity % 5 === 0));
}

const contextualPlan = generateMealPlan({
  foods,
  mealsPerDay: 5,
  mealTimes: ["06:00", "08:30", "12:30", "16:00", "19:30"],
  targets,
  dislikes: "legumes",
  supplements: "Whey protein",
  trainingTime: "07:00",
  trainingDurationMin: 60,
});
assert.match(contextualPlan[0].name, /pré-treino/);
assert.match(contextualPlan[1].name, /pós-treino/);
assert.ok(contextualPlan[0].items.some((item) => /whey/i.test(item.food_name)));
const mainDishPattern = /arroz|feij[aã]o|lentilha|macarr[aã]o|mandioca|batata|inhame/i;
assert.ok(
  contextualPlan[1].items.every((item) => !mainDishPattern.test(item.food_name)),
  "Lanche pós-treino não deve virar almoço.",
);
assert.ok(
  contextualPlan
    .flatMap((entry) => entry.items)
    .every((item) => item.food_name !== "Abobrinha cozida"),
);
assert.ok(
  eligibleDietFoods({ foods, dislikes: "legumes" }).every((item) => item.category !== "vegetal"),
);

const lunch = plan.find((entry) => entry.name === "Almoço");
assert.ok(lunch);
const alternatives = generateMealAlternatives({
  foods,
  mealName: lunch.name,
  scheduledTime: lunch.scheduled_time,
  currentItems: lunch.items,
  count: 4,
});
assert.ok(alternatives.length >= 2);
assert.ok(
  alternatives.every((option) =>
    option.items.some((item) => ["proteina", "peixe", "ovo"].includes(item.category)),
  ),
);

const postWorkoutAlternatives = generateMealAlternatives({
  foods,
  mealName: contextualPlan[1].name,
  scheduledTime: contextualPlan[1].scheduled_time,
  currentItems: contextualPlan[1].items,
  count: 4,
});
assert.ok(postWorkoutAlternatives.length >= 1);
assert.ok(
  postWorkoutAlternatives.every((option) =>
    option.items.every((item) => !mainDishPattern.test(item.food_name)),
  ),
  "Alternativas de lanche pós-treino não devem conter carboidratos de almoço.",
);

console.log(
  JSON.stringify({
    status: "ok",
    totals,
    meals: plan.length,
    contextualMeals: contextualPlan.map((entry) => entry.name),
  }),
);
