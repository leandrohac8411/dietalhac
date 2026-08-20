export type CyclePlan = {
  current_cycle_position: number;
  cycle_length: number;
};

export type CycleWorkout = {
  id: string;
  cycle_position: number | null;
  sort_order: number;
};

/** Remove cópias legadas da mesma letra e devolve A/B/C na ordem do ciclo. */
export function uniqueCycleWorkouts<T extends CycleWorkout>(workouts: T[]): T[] {
  const byPosition = new Map<number, T>();
  for (const workout of [...workouts].sort((a, b) => a.sort_order - b.sort_order)) {
    const position = workout.cycle_position ?? workout.sort_order;
    if (!byPosition.has(position)) byPosition.set(position, workout);
  }
  return [...byPosition.entries()].sort(([a], [b]) => a - b).map(([, workout]) => workout);
}

export function currentCycleWorkout<T extends CycleWorkout>(
  plan: CyclePlan,
  workouts: T[],
): T | null {
  const cycle = uniqueCycleWorkouts(workouts);
  if (!cycle.length) return null;
  const length = Math.max(1, plan.cycle_length || cycle.length);
  const position = Math.max(0, plan.current_cycle_position || 0) % length;
  return (
    cycle.find((workout) => (workout.cycle_position ?? workout.sort_order) === position) ??
    cycle[position % cycle.length] ??
    null
  );
}

export function isTrainingDay(trainingWeekdays: number[] | null | undefined, date = new Date()) {
  return !trainingWeekdays?.length || trainingWeekdays.includes(date.getDay());
}

export function defaultTrainingWeekdays(days: number): number[] {
  const schedules: Record<number, number[]> = {
    1: [1],
    2: [2, 5],
    3: [1, 3, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
    6: [1, 2, 3, 4, 5, 6],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return schedules[Math.min(7, Math.max(1, Math.round(days)))] ?? schedules[3]!;
}
