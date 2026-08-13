import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertNote, Disclaimer, LoadingBlock, SectionCard } from "@/components/common";
import {
  useActiveGoal,
  useActivities,
  useCompleteOnboarding,
  usePreferences,
  useProfile,
  useScreening,
} from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { ACTIVITY_OPTIONS } from "@/lib/activities";
import {
  GOAL_LABELS,
  activityFactor,
  calcAge,
  calcBmr,
  calcTdee,
  deriveMealTimes,
  formatKcal,
  goalFeasibility,
  mealGapWarnings,
} from "@/lib/fitness";

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

/* ---------- Opções ---------- */

const GOAL_ORDER = [
  "emagrecer",
  "reduzir_gordura",
  "recomposicao",
  "ganhar_massa",
  "ganhar_peso",
  "manter",
  "condicionamento",
  "forca",
] as const;

type Opt = { v: string; l: string };

const ROUTINE: Opt[] = [
  { v: "sentada", l: "Sedentária" },
  { v: "moderada", l: "Moderada" },
  { v: "ativa", l: "Ativa" },
];
const EXPERIENCE: Opt[] = [
  { v: "iniciante", l: "Iniciante" },
  { v: "intermediario", l: "Intermediário" },
  { v: "avancado", l: "Avançado" },
];
const PLACE: Opt[] = [
  { v: "gym", l: "Academia" },
  { v: "home", l: "Em casa" },
  { v: "outdoor", l: "Ao ar livre" },
];
const SPLIT_PREFERENCE: Opt[] = [
  { v: "auto", l: "Automático" },
  { v: "ab", l: "AB" },
  { v: "abc", l: "ABC" },
  { v: "abcd", l: "ABCD" },
];
const PRIORITY_LEVEL: Opt[] = [
  { v: "balanced", l: "Equilíbrio" },
  { v: "muscle", l: "Priorizar músculo" },
  { v: "fat", l: "Priorizar gordura" },
];
const PRIORITY_AREAS: Opt[] = [
  { v: "abdomen", l: "Abdômen" },
  { v: "gluteos", l: "Glúteos" },
  { v: "pernas", l: "Pernas" },
  { v: "bracos", l: "Braços" },
  { v: "costas", l: "Costas" },
  { v: "peito", l: "Peito" },
  { v: "ombros", l: "Ombros" },
];
const EQUIPMENT: Opt[] = [
  { v: "peso_corporal", l: "Peso do corpo" },
  { v: "halteres", l: "Halteres" },
  { v: "barra", l: "Barra e anilhas" },
  { v: "elasticos", l: "Elásticos" },
  { v: "kettlebell", l: "Kettlebell" },
  { v: "banco", l: "Banco" },
];
const RESTRICTIONS: Opt[] = [
  { v: "vegetariano", l: "Vegetariano" },
  { v: "vegano", l: "Vegano" },
  { v: "low_carb", l: "Low carb" },
  { v: "sem_lactose", l: "Sem lactose" },
  { v: "sem_gluten", l: "Sem glúten" },
  { v: "sem_carne_vermelha", l: "Sem carne vermelha" },
];
const BUDGET: Opt[] = [
  { v: "baixo", l: "Econômico" },
  { v: "medio", l: "Médio" },
  { v: "alto", l: "Flexível" },
];
const COOKING: Opt[] = [
  { v: "pouco", l: "Pouco" },
  { v: "medio", l: "Médio" },
  { v: "bastante", l: "Bastante" },
];
const ALCOHOL: Opt[] = [
  { v: "nao", l: "Não bebo" },
  { v: "raramente", l: "Raramente" },
  { v: "moderado", l: "Moderado" },
  { v: "frequente", l: "Frequente" },
];

type HealthKey =
  | "diabetes"
  | "hypertension"
  | "heart_condition"
  | "kidney_disease"
  | "liver_disease"
  | "eating_disorder"
  | "pregnant"
  | "breastfeeding"
  | "recent_surgery"
  | "persistent_pain"
  | "medical_followup";

const HEALTH_FLAGS: { k: HealthKey; l: string }[] = [
  { k: "diabetes", l: "Diabetes" },
  { k: "hypertension", l: "Hipertensão" },
  { k: "heart_condition", l: "Condição cardíaca" },
  { k: "kidney_disease", l: "Doença renal" },
  { k: "liver_disease", l: "Doença hepática" },
  { k: "eating_disorder", l: "Transtorno alimentar" },
  { k: "pregnant", l: "Gestante" },
  { k: "breastfeeding", l: "Amamentando" },
  { k: "recent_surgery", l: "Cirurgia recente" },
  { k: "persistent_pain", l: "Dor persistente" },
  { k: "medical_followup", l: "Acompanhamento médico atual" },
];

const STEPS = ["Objetivo", "Atividade", "Alimentação", "Saúde", "Revisão"];

const MEAL_LABELS = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
];

/* ---------- Estado do formulário ---------- */

type ActivityFormEntry = {
  activity: string;
  weekdays: number[];
  duration_min: string;
};

type FormState = {
  current_weight_kg: string;
  goal_type: string;
  target_weight_kg: string;
  target_body_fat: string;
  deadline_weeks: string;
  priority_areas: string[];
  priority_level: string;
  occupation: string;
  routine_level: string;
  daily_steps: string;
  sleep_hours: string;
  wake_time: string;
  sleep_time: string;
  training_days: string;
  training_duration_min: string;
  training_time: string;
  experience_level: string;
  training_place: string;
  equipment: string[];
  workout_split_preference: string;
  activities: ActivityFormEntry[];
  meals_per_day: string;
  meal_times: string[];
  dietary_restrictions: string[];
  liked_foods: string;
  disliked_foods: string;
  allergies: string;
  intolerances: string;
  water_intake_ml: string;
  alcohol_intake: string;
  food_budget: string;
  cooking_time: string;
  supplements: string;
  medications: string;
  injuries: string;
} & Record<HealthKey, boolean>;

const INITIAL: FormState = {
  current_weight_kg: "",
  goal_type: "",
  target_weight_kg: "",
  target_body_fat: "",
  deadline_weeks: "",
  priority_areas: [],
  priority_level: "balanced",
  occupation: "",
  routine_level: "",
  daily_steps: "",
  sleep_hours: "",
  wake_time: "06:30",
  sleep_time: "23:00",
  training_days: "3",
  training_duration_min: "60",
  training_time: "",
  experience_level: "",
  training_place: "",
  equipment: [],
  workout_split_preference: "auto",
  activities: [],
  meals_per_day: "5",
  meal_times: [],
  dietary_restrictions: [],
  liked_foods: "",
  disliked_foods: "",
  allergies: "",
  intolerances: "",
  water_intake_ml: "",
  alcohol_intake: "nao",
  food_budget: "medio",
  cooking_time: "medio",
  supplements: "",
  medications: "",
  injuries: "",
  diabetes: false,
  hypertension: false,
  heart_condition: false,
  kidney_disease: false,
  liver_disease: false,
  eating_disorder: false,
  pregnant: false,
  breastfeeding: false,
  recent_surgery: false,
  persistent_pain: false,
  medical_followup: false,
};

const num = (s: string): number | null => {
  const n = Number(String(s).replace(",", "."));
  return String(s).trim() === "" || Number.isNaN(n) ? null : n;
};
const int = (s: string): number | null => {
  const n = num(s);
  return n === null ? null : Math.round(n);
};

/* ---------- UI auxiliar ---------- */

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Pill key={o.v} active={value === o.v} onClick={() => onChange(o.v)}>
          {o.l}
        </Pill>
      ))}
    </div>
  );
}

function PillMulti({
  options,
  values,
  onToggle,
}: {
  options: Opt[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Pill key={o.v} active={values.includes(o.v)} onClick={() => onToggle(o.v)}>
          {values.includes(o.v) ? <Check className="mr-1 inline h-3.5 w-3.5" /> : null}
          {o.l}
        </Pill>
      ))}
    </div>
  );
}

function optLabel(options: Opt[], value: string): string {
  return options.find((o) => o.v === value)?.l ?? "—";
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

/* ---------- Página ---------- */

function Onboarding() {
  const navigate = useNavigate();
  const profile = useProfile();
  const prefs = usePreferences();
  const goal = useActiveGoal();
  const screening = useScreening();
  const activities = useActivities();
  const complete = useCompleteOnboarding();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const seeded = useRef(false);

  // Pré-preenche com dados já existentes (edição do questionário).
  useEffect(() => {
    if (seeded.current) return;
    if (
      profile.isLoading ||
      prefs.isLoading ||
      goal.isLoading ||
      screening.isLoading ||
      activities.isLoading
    )
      return;
    seeded.current = true;

    const p = profile.data;
    const g = goal.data;
    const pr = prefs.data;
    const sc = screening.data;
    const ac = activities.data;
    const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

    setForm((f) => ({
      ...f,
      current_weight_kg: str(p?.current_weight_kg),
      goal_type: g?.goal_type ?? f.goal_type,
      target_weight_kg: str(g?.target_weight_kg),
      target_body_fat: str(g?.target_body_fat),
      deadline_weeks: str(g?.deadline_weeks),
      priority_areas: g?.priority_areas ?? f.priority_areas,
      priority_level: g?.priority_level ?? f.priority_level,
      occupation: str(pr?.occupation),
      routine_level: pr?.routine_level ?? f.routine_level,
      daily_steps: str(pr?.daily_steps),
      sleep_hours: str(pr?.sleep_hours),
      wake_time: pr?.wake_time || f.wake_time,
      sleep_time: pr?.sleep_time || f.sleep_time,
      training_days: str(pr?.training_days) || f.training_days,
      training_duration_min: str(pr?.training_duration_min) || f.training_duration_min,
      training_time: pr?.training_time || f.training_time,
      experience_level: pr?.experience_level ?? f.experience_level,
      training_place: pr?.training_place ?? f.training_place,
      equipment: pr?.equipment ?? f.equipment,
      workout_split_preference: pr?.workout_split_preference ?? f.workout_split_preference,
      meals_per_day: str(pr?.meals_per_day) || f.meals_per_day,
      meal_times: pr?.meal_times && pr.meal_times.length > 0 ? pr.meal_times : f.meal_times,
      dietary_restrictions: pr?.dietary_restrictions ?? f.dietary_restrictions,
      liked_foods: str(pr?.liked_foods),
      disliked_foods: str(pr?.disliked_foods),
      allergies: str(pr?.allergies),
      intolerances: str(pr?.intolerances),
      water_intake_ml: str(pr?.water_intake_ml),
      alcohol_intake: pr?.alcohol_intake ?? f.alcohol_intake,
      food_budget: pr?.food_budget ?? f.food_budget,
      cooking_time: pr?.cooking_time ?? f.cooking_time,
      supplements: str(pr?.supplements),
      medications: str(sc?.medications),
      injuries: str(sc?.injuries),
      diabetes: sc?.diabetes ?? false,
      hypertension: sc?.hypertension ?? false,
      heart_condition: sc?.heart_condition ?? false,
      kidney_disease: sc?.kidney_disease ?? false,
      liver_disease: sc?.liver_disease ?? false,
      eating_disorder: sc?.eating_disorder ?? false,
      pregnant: sc?.pregnant ?? false,
      breastfeeding: sc?.breastfeeding ?? false,
      recent_surgery: sc?.recent_surgery ?? false,
      persistent_pain: sc?.persistent_pain ?? false,
      medical_followup: sc?.medical_followup ?? false,
      activities:
        ac && ac.length > 0
          ? ac.map((a) => ({
              activity: a.name,
              weekdays: a.weekdays,
              duration_min: str(a.duration_min),
            }))
          : f.activities,
    }));
  }, [profile, prefs, goal, screening, activities]);

  // Deriva os horários das refeições quando a quantidade muda (mantém edições manuais).
  useEffect(() => {
    const count = Math.min(Math.max(Number(form.meals_per_day) || 5, 3), 6);
    if (form.meal_times.length !== count) {
      setForm((f) => ({
        ...f,
        meal_times: deriveMealTimes({
          mealsPerDay: count,
          wake: f.wake_time,
          sleep: f.sleep_time,
          trainingTime: f.training_time,
          trainingDurationMin: Number(f.training_duration_min) || null,
        }),
      }));
    }
  }, [form.meals_per_day, form.meal_times.length]);

  if (profile.isLoading) return <LoadingBlock rows={4} />;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleArr = (key: "priority_areas" | "equipment" | "dietary_restrictions", v: string) =>
    setForm((f) => {
      const cur = f[key];
      return { ...f, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });

  const addActivity = () =>
    setForm((f) => ({
      ...f,
      activities: [...f.activities, { activity: "", weekdays: [], duration_min: "60" }],
    }));

  const removeActivity = (index: number) =>
    setForm((f) => ({ ...f, activities: f.activities.filter((_, i) => i !== index) }));

  const updateActivity = (index: number, patch: Partial<ActivityFormEntry>) =>
    setForm((f) => ({
      ...f,
      activities: f.activities.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));

  const toggleActivityWeekday = (index: number, day: number) =>
    setForm((f) => ({
      ...f,
      activities: f.activities.map((a, i) =>
        i === index
          ? {
              ...a,
              weekdays: a.weekdays.includes(day)
                ? a.weekdays.filter((d) => d !== day)
                : [...a.weekdays, day].sort(),
            }
          : a,
      ),
    }));

  // Recalcula os horários pela rotina (sobrescreve edições manuais).
  const recalcTimes = () =>
    setForm((f) => ({
      ...f,
      meal_times: deriveMealTimes({
        mealsPerDay: Math.min(Math.max(Number(f.meals_per_day) || 5, 3), 6),
        wake: f.wake_time,
        sleep: f.sleep_time,
        trainingTime: f.training_time,
        trainingDurationMin: Number(f.training_duration_min) || null,
      }),
    }));

  const setMealTime = (i: number, value: string) =>
    setForm((f) => {
      const next = [...f.meal_times];
      next[i] = value;
      return { ...f, meal_times: next };
    });

  const riskFlags =
    form.diabetes ||
    form.hypertension ||
    form.heart_condition ||
    form.kidney_disease ||
    form.liver_disease ||
    form.eating_disorder ||
    form.pregnant ||
    form.breastfeeding;

  // Prévia do metabolismo para a etapa de revisão.
  const p = profile.data;
  const weight = num(form.current_weight_kg) ?? Number(p?.current_weight_kg ?? 0);
  const height = Number(p?.height_cm ?? 0);
  const age = calcAge(p?.birth_date) ?? 0;
  const bmr =
    weight && height
      ? calcBmr({ weightKg: weight, heightCm: height, age, sex: p?.biological_sex })
      : null;
  const factor = activityFactor({
    routine: form.routine_level,
    trainingDays: int(form.training_days),
    dailySteps: int(form.daily_steps),
  });
  const tdee = bmr ? calcTdee(bmr, factor) : null;

  const feasibility = goalFeasibility({
    currentWeight: weight,
    targetWeight: num(form.target_weight_kg),
    weeks: int(form.deadline_weeks),
  });

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!form.goal_type) return "Escolha seu objetivo principal.";
      if (num(form.current_weight_kg) === null) return "Informe seu peso atual.";
    }
    if (current === 1) {
      if (!form.routine_level) return "Selecione o nível da sua rotina.";
      if (!form.experience_level) return "Selecione sua experiência de treino.";
      if (!form.training_place) return "Selecione onde você vai treinar.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast.error("Falta um passo", { description: err });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function finish() {
    for (let i = 0; i <= 3; i += 1) {
      const err = validateStep(i);
      if (err) {
        toast.error("Revise o questionário", { description: err });
        setStep(i);
        return;
      }
    }

    complete.mutate(
      {
        profile: {
          current_weight_kg: num(form.current_weight_kg),
          onboarding_step: STEPS.length,
        },
        goal: {
          goal_type: form.goal_type,
          target_weight_kg: num(form.target_weight_kg),
          target_body_fat: num(form.target_body_fat),
          deadline_weeks: int(form.deadline_weeks),
          priority_areas: form.priority_areas,
          priority_level: form.priority_level,
          active_scenario: goal.data?.active_scenario ?? "equilibrado",
          start_weight_kg: num(form.current_weight_kg),
        },
        preferences: {
          occupation: form.occupation || null,
          routine_level: form.routine_level,
          daily_steps: int(form.daily_steps),
          sleep_hours: num(form.sleep_hours),
          wake_time: form.wake_time || null,
          sleep_time: form.sleep_time || null,
          training_days: int(form.training_days),
          training_duration_min: int(form.training_duration_min),
          training_time: form.training_time || null,
          experience_level: form.experience_level,
          training_place: form.training_place,
          equipment: form.equipment,
          workout_split_preference: form.workout_split_preference,
          meals_per_day: int(form.meals_per_day),
          meal_times: form.meal_times,
          dietary_restrictions: form.dietary_restrictions,
          liked_foods: form.liked_foods || null,
          disliked_foods: form.disliked_foods || null,
          allergies: form.allergies || null,
          intolerances: form.intolerances || null,
          water_intake_ml: int(form.water_intake_ml),
          alcohol_intake: form.alcohol_intake,
          food_budget: form.food_budget,
          cooking_time: form.cooking_time,
          supplements: form.supplements || null,
        },
        activities: form.activities
          .filter((a) => a.activity && a.weekdays.length > 0)
          .map((a) => ({
            name: a.activity,
            weekdays: a.weekdays,
            duration_min: int(a.duration_min) ?? 60,
          })),
        screening: {
          diabetes: form.diabetes,
          hypertension: form.hypertension,
          heart_condition: form.heart_condition,
          kidney_disease: form.kidney_disease,
          liver_disease: form.liver_disease,
          eating_disorder: form.eating_disorder,
          pregnant: form.pregnant,
          breastfeeding: form.breastfeeding,
          recent_surgery: form.recent_surgery,
          persistent_pain: form.persistent_pain,
          medical_followup: form.medical_followup,
          medications: form.medications || null,
          injuries: form.injuries || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Questionário concluído!", {
            description: "Agora escolha o ritmo da sua estratégia.",
          });
          void navigate({ to: "/estrategia" });
        },
        onError: (e) =>
          toast.error("Não foi possível salvar", {
            description: getErrorMessage(e),
          }),
      },
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ClipboardList className="h-4 w-4 text-accent" />
          Questionário inicial
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{STEPS[step]}</h1>
        <div className="mt-4 space-y-2">
          <Progress value={((step + 1) / STEPS.length) * 100} />
          <p className="text-xs text-muted-foreground">
            Etapa {step + 1} de {STEPS.length}
          </p>
        </div>
      </header>

      {/* Etapa 1 — Objetivo */}
      {step === 0 ? (
        <div className="space-y-5">
          <SectionCard title="Qual é o seu objetivo principal?">
            <PillGroup
              options={GOAL_ORDER.map((v) => ({ v, l: GOAL_LABELS[v] ?? v }))}
              value={form.goal_type}
              onChange={(v) => set("goal_type", v)}
            />
          </SectionCard>

          <SectionCard title="Seus números">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Peso atual (kg)">
                <Input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form.current_weight_kg}
                  onChange={(e) => set("current_weight_kg", e.target.value)}
                />
              </Field>
              <Field label="Peso desejado (kg)" hint="Opcional">
                <Input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form.target_weight_kg}
                  onChange={(e) => set("target_weight_kg", e.target.value)}
                />
              </Field>
              <Field label="Gordura desejada (%)" hint="Opcional">
                <Input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form.target_body_fat}
                  onChange={(e) => set("target_body_fat", e.target.value)}
                />
              </Field>
              <Field label="Prazo (semanas)" hint="Opcional">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.deadline_weeks}
                  onChange={(e) => set("deadline_weeks", e.target.value)}
                />
              </Field>
            </div>
            {feasibility.aggressive ? (
              <AlertNote tone="warning" title="Meta agressiva">
                {feasibility.message}
              </AlertNote>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Áreas de prioridade"
            description="Onde você mais quer focar (opcional)."
          >
            <PillMulti
              options={PRIORITY_AREAS}
              values={form.priority_areas}
              onToggle={(v) => toggleArr("priority_areas", v)}
            />
            <div className="mt-4">
              <Field label="Foco da estratégia">
                <PillGroup
                  options={PRIORITY_LEVEL}
                  value={form.priority_level}
                  onChange={(v) => set("priority_level", v)}
                />
              </Field>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {/* Etapa 2 — Atividade */}
      {step === 1 ? (
        <div className="space-y-5">
          <SectionCard title="Rotina do dia a dia">
            <Field label="Nível da rotina">
              <PillGroup
                options={ROUTINE}
                value={form.routine_level}
                onChange={(v) => set("routine_level", v)}
              />
            </Field>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Ocupação" hint="Opcional">
                <Input
                  value={form.occupation}
                  onChange={(e) => set("occupation", e.target.value)}
                  placeholder="Ex.: escritório, motorista..."
                />
              </Field>
              <Field label="Passos por dia" hint="Estimativa">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.daily_steps}
                  onChange={(e) => set("daily_steps", e.target.value)}
                />
              </Field>
              <Field label="Que horas acorda">
                <Input
                  type="time"
                  value={form.wake_time}
                  onChange={(e) => set("wake_time", e.target.value)}
                />
              </Field>
              <Field label="Que horas dorme">
                <Input
                  type="time"
                  value={form.sleep_time}
                  onChange={(e) => set("sleep_time", e.target.value)}
                />
              </Field>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Usamos esses horários para montar as refeições na sua rotina.
            </p>
          </SectionCard>

          <SectionCard title="Treino">
            <Field label="Experiência">
              <PillGroup
                options={EXPERIENCE}
                value={form.experience_level}
                onChange={(v) => set("experience_level", v)}
              />
            </Field>
            <div className="mt-4">
              <Field label="Onde vai treinar">
                <PillGroup
                  options={PLACE}
                  value={form.training_place}
                  onChange={(v) => set("training_place", v)}
                />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Dias por semana">
                <PillGroup
                  options={["1", "2", "3", "4", "5", "6"].map((v) => ({ v, l: v }))}
                  value={form.training_days}
                  onChange={(v) => set("training_days", v)}
                />
              </Field>
              <Field label="Duração (min)">
                <PillGroup
                  options={["30", "45", "60", "90"].map((v) => ({ v, l: v }))}
                  value={form.training_duration_min}
                  onChange={(v) => set("training_duration_min", v)}
                />
              </Field>
              <Field label="Horário do treino" hint="Para não marcar refeição no meio do treino">
                <Input
                  type="time"
                  value={form.training_time}
                  onChange={(e) => set("training_time", e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field
                label="Estilo de treino preferido"
                hint="Não sabe? Deixe em automático que a gente monta pra você."
              >
                <PillGroup
                  options={SPLIT_PREFERENCE}
                  value={form.workout_split_preference}
                  onChange={(v) => set("workout_split_preference", v)}
                />
              </Field>
            </div>
            {form.training_place && form.training_place !== "gym" ? (
              <div className="mt-4">
                <Field label="Equipamentos disponíveis">
                  <PillMulti
                    options={EQUIPMENT}
                    values={form.equipment}
                    onToggle={(v) => toggleArr("equipment", v)}
                  />
                </Field>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Outras atividades físicas"
            description="Jiu-jitsu, natação, corrida... o gasto calórico entra na sua meta diária."
          >
            <div className="space-y-4">
              {form.activities.map((a, i) => (
                <div key={i} className="space-y-3 rounded-lg border border-border/60 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Select
                        value={a.activity}
                        onValueChange={(v) => updateActivity(i, { activity: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha a atividade" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeActivity(i)}
                      aria-label="Remover atividade"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Dias da semana">
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_LABELS.map((l, day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleActivityWeekday(i, day)}
                            className={cn(
                              "h-8 w-9 rounded-md border text-xs font-medium transition-colors",
                              a.weekdays.includes(day)
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border/60 text-muted-foreground hover:border-accent/50",
                            )}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Duração (min)">
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={a.duration_min}
                        onChange={(e) => updateActivity(i, { duration_min: e.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addActivity}>
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar atividade
              </Button>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {/* Etapa 3 — Alimentação */}
      {step === 2 ? (
        <div className="space-y-5">
          <SectionCard title="Rotina alimentar">
            <Field label="Refeições por dia">
              <PillGroup
                options={["3", "4", "5", "6"].map((v) => ({ v, l: v }))}
                value={form.meals_per_day}
                onChange={(v) => set("meals_per_day", v)}
              />
            </Field>
            <div className="mt-4">
              <Field label="Restrições alimentares">
                <PillMulti
                  options={RESTRICTIONS}
                  values={form.dietary_restrictions}
                  onToggle={(v) => toggleArr("dietary_restrictions", v)}
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Horários das refeições"
            description="Calculados pela sua rotina — ajuste se quiser."
            action={
              <Button type="button" variant="ghost" size="sm" onClick={recalcTimes}>
                <Clock className="mr-1 h-4 w-4" /> Recalcular
              </Button>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {form.meal_times.map((t, i) => (
                <Field key={i} label={MEAL_LABELS[i] ?? `Refeição ${i + 1}`}>
                  <Input type="time" value={t} onChange={(e) => setMealTime(i, e.target.value)} />
                </Field>
              ))}
            </div>
            {mealGapWarnings(form.meal_times).length > 0 ? (
              <div className="mt-4 space-y-2">
                {mealGapWarnings(form.meal_times).map((w, i) => (
                  <AlertNote key={i} tone="warning">
                    {w}
                  </AlertNote>
                ))}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="Preferências e alergias">
            <div className="space-y-4">
              <Field label="Alimentos que você gosta" hint="Separe por vírgula">
                <Textarea
                  rows={2}
                  value={form.liked_foods}
                  onChange={(e) => set("liked_foods", e.target.value)}
                />
              </Field>
              <Field label="Alimentos que evita" hint="Separe por vírgula">
                <Textarea
                  rows={2}
                  value={form.disliked_foods}
                  onChange={(e) => set("disliked_foods", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Alergias">
                  <Input
                    value={form.allergies}
                    onChange={(e) => set("allergies", e.target.value)}
                  />
                </Field>
                <Field label="Intolerâncias">
                  <Input
                    value={form.intolerances}
                    onChange={(e) => set("intolerances", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Contexto">
            <div className="space-y-4">
              <Field label="Orçamento para alimentação">
                <PillGroup
                  options={BUDGET}
                  value={form.food_budget}
                  onChange={(v) => set("food_budget", v)}
                />
              </Field>
              <Field label="Tempo para cozinhar">
                <PillGroup
                  options={COOKING}
                  value={form.cooking_time}
                  onChange={(v) => set("cooking_time", v)}
                />
              </Field>
              <Field label="Consumo de álcool">
                <PillGroup
                  options={ALCOHOL}
                  value={form.alcohol_intake}
                  onChange={(v) => set("alcohol_intake", v)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Água por dia (ml)" hint="Opcional">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.water_intake_ml}
                    onChange={(e) => set("water_intake_ml", e.target.value)}
                  />
                </Field>
                <Field label="Suplementos em uso" hint="Opcional">
                  <Input
                    value={form.supplements}
                    onChange={(e) => set("supplements", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {/* Etapa 4 — Saúde */}
      {step === 3 ? (
        <div className="space-y-5">
          <SectionCard
            title="Triagem de saúde"
            description="Marque tudo que se aplica. Isso ajusta as recomendações e os limites de segurança."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {HEALTH_FLAGS.map((h) => {
                const active = form[h.k];
                return (
                  <button
                    key={h.k}
                    type="button"
                    onClick={() => set(h.k, !active)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                      active
                        ? "border-accent bg-accent/10"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    {h.l}
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                        active ? "border-accent bg-accent text-accent-foreground" : "border-border",
                      )}
                    >
                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Detalhes">
            <div className="space-y-4">
              <Field label="Medicamentos em uso" hint="Opcional">
                <Textarea
                  rows={2}
                  value={form.medications}
                  onChange={(e) => set("medications", e.target.value)}
                />
              </Field>
              <Field label="Lesões ou dores" hint="Opcional">
                <Textarea
                  rows={2}
                  value={form.injuries}
                  onChange={(e) => set("injuries", e.target.value)}
                />
              </Field>
            </div>
          </SectionCard>

          {riskFlags ? (
            <AlertNote tone="warning" title="Atenção">
              Você indicou uma condição relevante. Cenários acelerados ficarão restritos e
              recomendamos liberação de um profissional de saúde antes de progredir.
            </AlertNote>
          ) : null}
        </div>
      ) : null}

      {/* Etapa 5 — Revisão */}
      {step === 4 ? (
        <div className="space-y-5">
          <SectionCard
            title="Prévia do seu metabolismo"
            description="Estimativa por Mifflin-St Jeor."
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Metabolismo basal
                </p>
                <p className="mt-1 font-display text-2xl font-bold">{formatKcal(bmr)}</p>
              </div>
              <div className="rounded-xl bg-accent/10 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Manutenção estimada
                </p>
                <p className="mt-1 font-display text-2xl font-bold">{formatKcal(tdee)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Fator de atividade {factor}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Resumo">
            <dl className="divide-y text-sm">
              <Row label="Objetivo" value={GOAL_LABELS[form.goal_type] ?? "—"} />
              <Row
                label="Meta"
                value={
                  form.target_weight_kg
                    ? `${form.target_weight_kg} kg${form.deadline_weeks ? ` em ${form.deadline_weeks} semanas` : ""}`
                    : "Sem meta de peso"
                }
              />
              <Row label="Rotina" value={optLabel(ROUTINE, form.routine_level)} />
              <Row
                label="Treino"
                value={`${optLabel(EXPERIENCE, form.experience_level)} · ${optLabel(PLACE, form.training_place)} · ${form.training_days}x/sem`}
              />
              <Row label="Refeições/dia" value={form.meals_per_day} />
              <Row
                label="Triagem de saúde"
                value={riskFlags ? "Condição sinalizada" : "Sem restrições sinalizadas"}
              />
            </dl>
          </SectionCard>

          <Disclaimer />
        </div>
      ) : null}

      {/* Navegação */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={back} disabled={step === 0 || complete.isPending}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        {isLast ? (
          <Button onClick={finish} disabled={complete.isPending}>
            {complete.isPending ? "Salvando..." : "Concluir questionário"}
            <Check className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={next}>
            Continuar <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
