/**
 * Cálculos corporais e nutricionais do FormaFit.
 * Todas as fórmulas ficam isoladas aqui para poderem ser trocadas no futuro.
 * IMPORTANTE: são estimativas e não substituem avaliação profissional.
 */

export type BiologicalSex = "masculino" | "feminino";
export type RoutineLevel = "sentada" | "moderada" | "ativa";
export type ScenarioKey = "confortavel" | "equilibrado" | "acelerado";

export const GOAL_LABELS: Record<string, string> = {
  emagrecer: "Emagrecer",
  reduzir_gordura: "Reduzir percentual de gordura",
  ganhar_massa: "Ganhar massa muscular",
  ganhar_peso: "Ganhar peso",
  recomposicao: "Recomposição corporal",
  manter: "Manter peso",
  condicionamento: "Melhorar condicionamento",
  forca: "Melhorar força",
};

export function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1;
  return age;
}

export function calcBmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

export function bmiClassification(bmi: number): string {
  if (bmi < 18.5) return "Abaixo do peso";
  if (bmi < 25) return "Peso adequado";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidade grau I";
  if (bmi < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

/** Metabolismo basal — fórmula de Mifflin-St Jeor (isolada para troca futura). */
export function calcBmr(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: string | null | undefined;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "feminino" ? base - 161 : base + 5;
}

/** Fator de atividade configurável, derivado da rotina, treinos e passos. */
export function activityFactor(input: {
  routine?: string | null;
  trainingDays?: number | null;
  dailySteps?: number | null;
}): number {
  let factor = 1.2;
  if (input.routine === "moderada") factor = 1.375;
  if (input.routine === "ativa") factor = 1.5;

  const days = input.trainingDays ?? 0;
  factor += Math.min(days, 6) * 0.025;

  const steps = input.dailySteps ?? 0;
  if (steps >= 8000) factor += 0.05;
  if (steps >= 12000) factor += 0.05;

  return Math.round(Math.min(factor, 1.9) * 1000) / 1000;
}

export function calcTdee(bmr: number, factor: number): number {
  return bmr * factor;
}

export function waistHipRatio(waist?: number | null, hip?: number | null): number | null {
  if (!waist || !hip) return null;
  return waist / hip;
}

export function leanAndFatMass(weightKg?: number | null, bodyFatPct?: number | null) {
  if (!weightKg || !bodyFatPct) return { lean: null, fat: null };
  const fat = (weightKg * bodyFatPct) / 100;
  return { lean: Math.round((weightKg - fat) * 10) / 10, fat: Math.round(fat * 10) / 10 };
}

export type Scenario = {
  key: ScenarioKey;
  label: string;
  description: string;
  calories: number;
  deltaCalories: number;
  weeklyRateKg: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  waterMl: number;
  warnings: string[];
};

const DEFICIT_MAP: Record<ScenarioKey, number> = {
  confortavel: 0.1,
  equilibrado: 0.18,
  acelerado: 0.25,
};

const SURPLUS_MAP: Record<ScenarioKey, number> = {
  confortavel: 0.05,
  equilibrado: 0.1,
  acelerado: 0.15,
};

function isFatLoss(goal: string) {
  return goal === "emagrecer" || goal === "reduzir_gordura";
}
function isGain(goal: string) {
  return goal === "ganhar_massa" || goal === "ganhar_peso";
}

/** Gera os três cenários de estratégia nutricional. */
export function buildScenarios(input: {
  goal: string;
  maintenance: number;
  weightKg: number;
  bmr: number;
  proteinPerKg?: number;
  riskFlags?: boolean;
}): Scenario[] {
  const keys: ScenarioKey[] = ["confortavel", "equilibrado", "acelerado"];
  const labels: Record<ScenarioKey, string> = {
    confortavel: "Confortável",
    equilibrado: "Equilibrado",
    acelerado: "Acelerado",
  };
  const descriptions: Record<ScenarioKey, string> = {
    confortavel:
      "Evolução mais lenta, maior flexibilidade e menor restrição — mais fácil de manter.",
    equilibrado: "Evolução moderada, com equilíbrio entre resultado e flexibilidade.",
    acelerado: "Evolução mais rápida, com maior controle e menos margem para desvios.",
  };

  return keys.map((key) => {
    let calories = input.maintenance;
    if (isFatLoss(input.goal)) calories = input.maintenance * (1 - DEFICIT_MAP[key]);
    else if (isGain(input.goal)) calories = input.maintenance * (1 + SURPLUS_MAP[key]);
    else if (input.goal === "recomposicao")
      calories = input.maintenance * (1 - DEFICIT_MAP[key] / 2);

    const warnings: string[] = [];
    const floor = Math.max(input.bmr * 1.05, 1200);
    if (calories < floor) {
      calories = floor;
      warnings.push("Meta calórica ajustada para não ficar abaixo de um patamar seguro.");
    }
    if (key === "acelerado") {
      warnings.push(
        "Ritmo acelerado exige alta adesão e acompanhamento. Não é indicado para iniciantes ou quem tem condição de saúde relevante.",
      );
    }
    if (key === "acelerado" && input.riskFlags) {
      warnings.push(
        "Você indicou uma condição de saúde na triagem: este cenário não é recomendado sem liberação profissional.",
      );
    }

    calories = Math.round(calories / 10) * 10;
    const deltaCalories = Math.round(calories - input.maintenance);
    const weeklyRateKg = Math.round(((deltaCalories * 7) / 7700) * 100) / 100;

    const proteinPerKg = input.proteinPerKg ?? (isFatLoss(input.goal) ? 2.2 : 1.9);
    const protein = Math.round(input.weightKg * proteinPerKg);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 50);
    const fiber = Math.max(25, Math.round((calories / 1000) * 14));
    const waterMl = Math.round((input.weightKg * 35) / 50) * 50;

    return {
      key,
      label: labels[key],
      description: descriptions[key],
      calories,
      deltaCalories,
      weeklyRateKg,
      protein,
      carbs,
      fat,
      fiber,
      waterMl,
      warnings,
    };
  });
}

/** Verifica se a meta/prazo informados são agressivos demais. */
export function goalFeasibility(input: {
  currentWeight: number;
  targetWeight?: number | null;
  weeks?: number | null;
}): { aggressive: boolean; message?: string; weeklyNeeded?: number } {
  if (!input.targetWeight || !input.weeks || input.weeks <= 0) return { aggressive: false };
  const diff = Math.abs(input.currentWeight - input.targetWeight);
  const weekly = diff / input.weeks;
  const limit = 0.01 * input.currentWeight; // ~1% do peso por semana
  if (weekly > limit) {
    return {
      aggressive: true,
      weeklyNeeded: Math.round(weekly * 100) / 100,
      message: `Para essa meta seria necessário variar cerca de ${weekly.toFixed(2)} kg por semana, acima do ritmo considerado seguro (até ${limit.toFixed(2)} kg/semana). Considere ampliar o prazo.`,
    };
  }
  return { aggressive: false, weeklyNeeded: Math.round(weekly * 100) / 100 };
}

/** Regras condicionais do check-in semanal (sem IA). */
export function checkinRecommendation(input: {
  goal: string;
  weightChangeKg: number | null;
  weeksWithoutChange: number;
  adherence: number;
  hasPain: boolean;
  energy: number;
  hunger: number;
}): { title: string; tone: "success" | "warning" | "info" | "danger"; items: string[] } {
  const items: string[] = [];
  let title = "Manter o plano atual";
  let tone: "success" | "warning" | "info" | "danger" = "success";

  if (input.hasPain) {
    return {
      title: "Atenção: relato de dor",
      tone: "danger",
      items: [
        "Interrompa exercícios que provocam dor.",
        "Procure avaliação de um profissional de saúde antes de continuar progredindo.",
        "Mantenha as calorias e a proteína; não aumente a intensidade nesta semana.",
      ],
    };
  }

  if (input.adherence < 60) {
    title = "Foco na consistência antes de ajustar o plano";
    tone = "warning";
    items.push("Sua adesão ficou abaixo de 60% — não vamos reduzir calorias agora.");
    items.push("Escolha 2 refeições para padronizar durante a semana.");
    if (input.hunger >= 8)
      items.push("Aumente alimentos com fibra e proteína para controlar a fome.");
    return { title, tone, items };
  }

  const change = input.weightChangeKg;
  const losing = input.goal === "emagrecer" || input.goal === "reduzir_gordura";
  const gaining = input.goal === "ganhar_massa" || input.goal === "ganhar_peso";

  if (losing) {
    if (change !== null && change < -0.2) {
      items.push("Evolução dentro do esperado. Manter calorias e treino.");
    } else if (input.weeksWithoutChange >= 2) {
      title = "Pequeno ajuste sugerido";
      tone = "info";
      items.push("Sem evolução há 2 semanas ou mais com boa adesão.");
      items.push("Reduzir cerca de 100 kcal/dia OU adicionar 1.500 passos diários.");
    } else {
      items.push("Continue por mais uma semana antes de qualquer ajuste.");
    }
  } else if (gaining) {
    if (change !== null && change > 0.6) {
      title = "Reduzir o superávit";
      tone = "warning";
      items.push("Ganho de peso acima do ideal — reduzir cerca de 150 kcal/dia.");
    } else if (change !== null && change <= 0) {
      title = "Aumentar levemente as calorias";
      tone = "info";
      items.push("Sem ganho na semana: adicionar cerca de 150 kcal/dia.");
    } else {
      items.push("Ritmo de ganho adequado. Manter plano e progressão de carga.");
    }
  } else {
    items.push("Objetivo de manutenção: manter calorias e priorizar desempenho no treino.");
  }

  if (input.energy <= 4) items.push("Energia baixa: revise sono e distribuição de carboidratos.");
  return { title, tone, items };
}

export function formatKcal(v?: number | null) {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v).toLocaleString("pt-BR")} kcal`;
}

export function formatNumber(v?: number | null, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/* ---------- Horários das refeições ---------- */

/** "HH:MM" -> minutos desde 00:00 (ou null se inválido). */
export function parseHM(s?: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** minutos -> "HH:MM" (envolve em 24h). */
export function formatHM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Deriva horários das refeições a partir da rotina, distribuindo entre acordar
 * e dormir e desviando da janela de treino (refeição pós-treino ao terminar).
 */
export function deriveMealTimes(input: {
  mealsPerDay: number;
  wake?: string | null;
  sleep?: string | null;
  trainingTime?: string | null;
  trainingDurationMin?: number | null;
}): string[] {
  const count = Math.min(Math.max(Math.round(input.mealsPerDay || 5), 3), 6);
  const wake = parseHM(input.wake) ?? 420; // 07:00
  let sleep = parseHM(input.sleep) ?? 1380; // 23:00
  if (sleep <= wake) sleep += 1440;

  const first = wake + 45;
  const last = Math.max(first + (count - 1) * 60, sleep - 60);

  const times: number[] = [];
  for (let i = 0; i < count; i += 1) {
    times.push(first + Math.round(((last - first) * i) / (count - 1)));
  }

  // Desvia da janela de treino e garante refeição pós-treino.
  let tStart = parseHM(input.trainingTime);
  if (tStart !== null) {
    if (tStart < wake) tStart += 1440;
    const tEnd = tStart + (input.trainingDurationMin ?? 60);
    const post = tEnd + 30;
    for (let i = 0; i < times.length; i += 1) {
      if (times[i]! >= tStart - 20 && times[i]! <= tEnd + 10) times[i] = post;
    }
    if (!times.some((t) => Math.abs(t - post) <= 15)) {
      let idx = 0;
      let best = Infinity;
      times.forEach((t, i) => {
        const d = Math.abs(t - tStart!);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      times[idx] = post;
    }
  }

  // Ordena, garante intervalo mínimo e mantém dentro do dia acordado.
  times.sort((a, b) => a - b);
  const minGap = 75;
  for (let i = 1; i < times.length; i += 1) {
    if (times[i]! - times[i - 1]! < minGap) times[i] = times[i - 1]! + minGap;
  }
  const cap = sleep - 20;
  const overflow = times[times.length - 1]! - cap;
  if (overflow > 0) {
    for (let i = 0; i < times.length; i += 1) {
      times[i] = Math.max(wake + 15, times[i]! - overflow);
    }
  }

  return times.map((t) => formatHM(Math.round(t / 5) * 5));
}

/** Avisos quando o intervalo entre refeições consecutivas passa de ~5h. */
export function mealGapWarnings(times: (string | null | undefined)[]): string[] {
  const mins = times
    .map((t) => parseHM(t))
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);
  const warnings: string[] = [];
  for (let i = 1; i < mins.length; i += 1) {
    const gap = mins[i]! - mins[i - 1]!;
    if (gap > 300) {
      warnings.push(
        `Intervalo de ${(gap / 60).toFixed(1)}h entre ${formatHM(mins[i - 1]!)} e ${formatHM(mins[i]!)} — considere encaixar um lanche para não ficar tempo demais sem comer.`,
      );
    }
  }
  return warnings;
}
