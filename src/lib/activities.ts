/**
 * Gasto calórico de atividades físicas extras (além da musculação já contada em
 * activityFactor). Valores de MET vêm do Compêndio de Atividades Físicas (domínio
 * público, referência acadêmica padrão) — sem custo, sem API externa.
 */

export type ActivityOption = { value: string; label: string; met: number };

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  { value: "jiu_jitsu", label: "Jiu-jitsu / artes marciais", met: 10.3 },
  { value: "muay_thai", label: "Muay thai / boxe", met: 10.3 },
  { value: "natacao", label: "Natação", met: 8.3 },
  { value: "corrida", label: "Corrida", met: 9.0 },
  { value: "ciclismo", label: "Ciclismo", met: 7.5 },
  { value: "funcional", label: "Funcional / crossfit", met: 8.0 },
  { value: "futebol", label: "Futebol", met: 7.0 },
  { value: "basquete", label: "Basquete", met: 6.5 },
  { value: "danca", label: "Dança", met: 5.0 },
  { value: "yoga_pilates", label: "Yoga / pilates", met: 3.0 },
  { value: "caminhada", label: "Caminhada", met: 3.5 },
  { value: "outro", label: "Outro", met: 6.0 },
];

export function metFor(activityValue: string): number {
  return ACTIVITY_OPTIONS.find((a) => a.value === activityValue)?.met ?? 6.0;
}

/** kcal gastos em uma sessão: MET × 3.5 × peso(kg) / 200 × minutos (fórmula padrão). */
export function activityKcal(met: number, weightKg: number, minutes: number): number {
  if (!weightKg || !minutes) return 0;
  return (met * 3.5 * weightKg * minutes) / 200;
}

export type ActivityEntry = {
  activity: string;
  weekdays: number[];
  duration_min: number;
};

/**
 * Soma o gasto semanal de todas as atividades e divide por 7 → kcal extra médio
 * por dia. Mantém o TDEE como um valor único diário em vez de variar por dia da
 * semana, evitando reformular metas/macros para cada dia.
 */
export function weeklyExtraKcalPerDay(activities: ActivityEntry[], weightKg: number): number {
  if (!weightKg || activities.length === 0) return 0;
  const weeklyTotal = activities.reduce((sum, a) => {
    const perSession = activityKcal(metFor(a.activity), weightKg, a.duration_min);
    return sum + perSession * (a.weekdays.length || 0);
  }, 0);
  return Math.round(weeklyTotal / 7);
}
