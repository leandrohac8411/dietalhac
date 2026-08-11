import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Check, ClipboardList, Flame, Scale, Target, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertNote,
  Disclaimer,
  EmptyState,
  LoadingBlock,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/common";
import { useActiveGoal, usePreferences, useProfile, useSaveStrategy, useScreening } from "@/lib/db";
import {
  GOAL_LABELS,
  activityFactor,
  bmiClassification,
  buildScenarios,
  calcAge,
  calcBmi,
  calcBmr,
  calcTdee,
  formatKcal,
  formatNumber,
  goalFeasibility,
} from "@/lib/fitness";
import type { Scenario } from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/estrategia")({
  component: Estrategia,
});

function Estrategia() {
  const profile = useProfile();
  const goal = useActiveGoal();
  const prefs = usePreferences();
  const screening = useScreening();
  const saveStrategy = useSaveStrategy();

  const [selected, setSelected] = useState<string | null>(null);

  if (profile.isLoading || goal.isLoading) return <LoadingBlock rows={5} />;

  const p = profile.data;
  const g = goal.data;

  if (!g || !p?.onboarding_completed) {
    return (
      <div className="space-y-6">
        <PageHeader title="Minha estratégia" subtitle="Defina suas metas de calorias e macros." />
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" />}
          title="Complete o questionário primeiro"
          description="Precisamos dos seus dados e objetivo para calcular os cenários nutricionais."
          action={
            <Button asChild>
              <Link to="/onboarding">Responder questionário</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const weight = Number(p.current_weight_kg ?? 0);
  const height = Number(p.height_cm ?? 0);
  const age = calcAge(p.birth_date) ?? 0;
  const bmi = weight && height ? calcBmi(weight, height) : null;
  const bmr =
    weight && height
      ? calcBmr({ weightKg: weight, heightCm: height, age, sex: p.biological_sex })
      : 0;
  const factor = activityFactor({
    routine: prefs.data?.routine_level ?? null,
    trainingDays: prefs.data?.training_days ?? null,
    dailySteps: prefs.data?.daily_steps ?? null,
  });
  const maintenance = Math.round(calcTdee(bmr, factor));

  const sc = screening.data;
  const riskFlags = Boolean(
    sc?.diabetes ||
    sc?.hypertension ||
    sc?.heart_condition ||
    sc?.kidney_disease ||
    sc?.liver_disease ||
    sc?.eating_disorder ||
    sc?.pregnant ||
    sc?.breastfeeding,
  );

  const scenarios = buildScenarios({
    goal: g.goal_type,
    maintenance,
    weightKg: weight,
    bmr,
    riskFlags,
  });

  const feasibility = goalFeasibility({
    currentWeight: weight,
    targetWeight: g.target_weight_kg,
    weeks: g.deadline_weeks,
  });

  const activeKey = selected ?? g.active_scenario ?? "equilibrado";

  function choose(scenario: Scenario) {
    setSelected(scenario.key);
    saveStrategy.mutate(
      {
        goalId: g!.id,
        maintenance_calories: maintenance,
        target_calories: scenario.calories,
        protein_g: scenario.protein,
        carbs_g: scenario.carbs,
        fat_g: scenario.fat,
        fiber_g: scenario.fiber,
        water_ml: scenario.waterMl,
        weekly_rate_kg: scenario.weeklyRateKg,
        active_scenario: scenario.key,
      },
      {
        onSuccess: () =>
          toast.success("Estratégia definida", {
            description: `Cenário ${scenario.label.toLowerCase()} salvo como sua meta.`,
          }),
        onError: (e) =>
          toast.error("Não foi possível salvar", {
            description: e instanceof Error ? e.message : "Tente novamente.",
          }),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha estratégia"
        subtitle={`Objetivo: ${GOAL_LABELS[g.goal_type] ?? g.goal_type}. Escolha o ritmo que combina com sua rotina.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Peso atual"
          value={`${formatNumber(weight)} kg`}
          icon={<Scale className="h-4 w-4" />}
          accent="green"
        />
        <StatCard
          label="IMC"
          value={formatNumber(bmi)}
          hint={bmi ? bmiClassification(bmi) : ""}
          icon={<Activity className="h-4 w-4" />}
          accent="blue"
        />
        <StatCard
          label="Metabolismo basal"
          value={formatKcal(bmr)}
          icon={<Flame className="h-4 w-4" />}
          accent="amber"
        />
        <StatCard
          label="Manutenção"
          value={formatKcal(maintenance)}
          hint={`Fator ${factor}`}
          icon={<Target className="h-4 w-4" />}
          accent="green"
          tone="accent"
        />
      </div>

      {feasibility.aggressive ? (
        <AlertNote tone="warning" title="Meta agressiva para o prazo informado">
          {feasibility.message}
        </AlertNote>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {scenarios.map((s) => {
          const active = activeKey === s.key;
          return (
            <div
              key={s.key}
              className={cn(
                "surface elevate flex flex-col gap-4 p-5",
                active && "border-accent ring-1 ring-accent",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{s.label}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                </div>
                {active ? (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>

              <div>
                <p className="font-display text-3xl font-bold leading-none">
                  {formatKcal(s.calories)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.deltaCalories === 0
                    ? "Manutenção"
                    : `${s.deltaCalories > 0 ? "+" : ""}${s.deltaCalories} kcal/dia · ${
                        s.weeklyRateKg > 0 ? "+" : ""
                      }${formatNumber(s.weeklyRateKg, 2)} kg/sem`}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Macro label="Proteína" value={`${s.protein} g`} />
                <Macro label="Carboidrato" value={`${s.carbs} g`} />
                <Macro label="Gordura" value={`${s.fat} g`} />
                <Macro label="Fibra" value={`${s.fiber} g`} />
                <Macro label="Água" value={`${(s.waterMl / 1000).toFixed(1)} L`} />
              </dl>

              {s.warnings.length > 0 ? (
                <div className="space-y-1.5">
                  {s.warnings.map((w, i) => (
                    <p
                      key={i}
                      className="flex items-start gap-1.5 text-xs text-warning-foreground/80"
                    >
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      {w}
                    </p>
                  ))}
                </div>
              ) : null}

              <Button
                className="mt-auto"
                variant={active ? "secondary" : "default"}
                onClick={() => choose(s)}
                disabled={saveStrategy.isPending}
              >
                {active ? "Estratégia atual" : "Escolher este"}
              </Button>
            </div>
          );
        })}
      </div>

      <SectionCard title="Como usamos isso" description="A partir da estratégia escolhida:">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>• A meta calórica e os macros alimentam a geração da sua dieta.</li>
          <li>• O ritmo semanal serve de referência nos check-ins.</li>
          <li>• Você pode trocar de cenário quando quiser — nada é definitivo.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/dieta">Gerar minha dieta</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/onboarding">Revisar questionário</Link>
          </Button>
        </div>
      </SectionCard>

      <Disclaimer />
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-sm font-semibold">{value}</dd>
    </div>
  );
}
