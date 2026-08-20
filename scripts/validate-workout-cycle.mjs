import assert from "node:assert/strict";
import {
  currentCycleWorkout,
  defaultTrainingWeekdays,
  isTrainingDay,
  uniqueCycleWorkouts,
} from "../src/lib/workout-cycle.ts";
import { generateWorkoutPlan } from "../src/lib/plan-generator.ts";

const workouts = [
  { id: "a", cycle_position: 0, sort_order: 0, name: "Treino A" },
  { id: "b", cycle_position: 1, sort_order: 1, name: "Treino B" },
  { id: "c", cycle_position: 2, sort_order: 2, name: "Treino C" },
];

const sequence = Array.from(
  { length: 8 },
  (_, position) =>
    currentCycleWorkout({ current_cycle_position: position % 3, cycle_length: 3 }, workouts)?.name,
);
assert.deepEqual(sequence, [
  "Treino A",
  "Treino B",
  "Treino C",
  "Treino A",
  "Treino B",
  "Treino C",
  "Treino A",
  "Treino B",
]);

const legacy = [
  ...workouts,
  { id: "a2", cycle_position: 0, sort_order: 3, name: "Treino A" },
  { id: "b2", cycle_position: 1, sort_order: 4, name: "Treino B" },
];
assert.deepEqual(
  uniqueCycleWorkouts(legacy).map((workout) => workout.id),
  ["a", "b", "c"],
);

assert.deepEqual(defaultTrainingWeekdays(5), [1, 2, 3, 4, 5]);
assert.equal(isTrainingDay([1, 3, 5], new Date("2026-08-19T12:00:00-03:00")), true);
assert.equal(isTrainingDay([1, 3, 5], new Date("2026-08-20T12:00:00-03:00")), false);

const catalog = [
  ["peito-antigo", "peito"],
  ["peito-novo", "peito"],
  ["peito-novo-2", "peito"],
  ["peito-novo-3", "peito"],
  ["peito-novo-4", "peito"],
  ["ombro-antigo", "ombros"],
  ["ombro-novo", "ombros"],
  ["ombro-novo-2", "ombros"],
  ["ombro-novo-3", "ombros"],
  ["ombro-novo-4", "ombros"],
  ["costas-novo", "costas"],
  ["triceps-novo", "triceps"],
  ["biceps-novo", "biceps"],
  ["pernas-novo", "pernas"],
  ["posterior-novo", "posterior"],
  ["gluteos-novo", "gluteos"],
  ["panturrilha-novo", "panturrilha"],
].map(([name, muscle_group], index) => ({
  id: String(index),
  name,
  muscle_group,
  place: "gym",
  difficulty: "intermediario",
  alternative_name: null,
  media_url: "https://example.test/exercise.mp4",
}));
const regenerated = generateWorkoutPlan({
  exercises: catalog,
  days: 3,
  durationMin: 60,
  place: "gym",
  goal: "hipertrofia",
  sex: "masculino",
  splitPreference: "abc",
  previousExerciseNames: ["peito-antigo", "ombro-antigo"],
});
const firstNames = regenerated.workouts[0].exercises.map((exercise) => exercise.exercise_name);
assert.ok(firstNames.includes("peito-novo"));
assert.ok(firstNames.includes("ombro-novo"));
assert.ok(!firstNames.includes("peito-antigo"));
assert.ok(!firstNames.includes("ombro-antigo"));

const isolatedCatalogGroups = [
  "peito",
  "triceps",
  "costas",
  "biceps",
  "pernas",
  "posterior",
  "gluteos",
  "adutor",
  "panturrilha",
  "ombros",
  "abdutor",
];
const isolatedCatalog = isolatedCatalogGroups.flatMap((muscle_group, groupIndex) =>
  Array.from({ length: 6 }, (_, index) => ({
    id: `isolated-${groupIndex}-${index}`,
    name: `${muscle_group}-${index}`,
    muscle_group,
    place: "gym",
    difficulty: "intermediario",
    alternative_name: null,
    media_url: "https://example.test/exercise.mp4",
  })),
);
isolatedCatalog.push({
  id: "new-without-media",
  name: "Crossover na polia",
  muscle_group: "peito",
  place: "gym",
  difficulty: "iniciante",
  alternative_name: null,
  media_url: null,
});
const isolated = generateWorkoutPlan({
  exercises: isolatedCatalog,
  days: 5,
  durationMin: 60,
  place: "gym",
  goal: "hipertrofia",
  splitPreference: "isolated_5",
  priorityAreas: [],
});
assert.equal(isolated.split, "isolated_5");
assert.deepEqual(
  isolated.workouts.map((workout) => workout.muscle_groups),
  ["Peito e tríceps", "Costas e bíceps", "Pernas completas", "Ombros", "Bíceps e tríceps"],
);
assert.ok(
  !isolated.workouts
    .flatMap((workout) => workout.exercises)
    .some((exercise) => exercise.exercise_name === "Crossover na polia"),
);
assert.deepEqual(
  isolated.workouts.map((workout) => workout.exercises.length),
  [6, 6, 6, 4, 6],
);

const isolatedLowerFocus = generateWorkoutPlan({
  exercises: isolatedCatalog,
  days: 5,
  durationMin: 60,
  place: "gym",
  goal: "hipertrofia",
  splitPreference: "isolated_5",
  priorityAreas: ["gluteos"],
});
assert.equal(isolatedLowerFocus.workouts[4].muscle_groups, "Glúteos e posterior");

console.log(
  "Treinos validados: ciclo contínuo, regeneração variada e divisão de 5 dias adaptativa.",
);
