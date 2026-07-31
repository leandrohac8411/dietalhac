import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets, Dumbbell, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer, LoadingBlock, PageHeader, SectionCard, StatCard } from "@/components/common";
import {
  useActiveGoal,
  useLogWater,
  usePreferences,
  useProfile,
  useWaterToday,
  useWeightLogs,
} from "@/lib/db";
import {
  GOAL_LABELS,
  activityFactor,
  bmiClassification,
  calcAge,
  calcBmi,
  calcBmr,
  calcTdee,
  formatKcal,
  formatNumber,
} from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const profile = useProfile();
  const prefs = usePreferences();
  const goal = useActiveGoal();
  const water = useWaterToday();
  const weights = useWeightLogs();
  const logWater = useLogWater();

  if (profile.isLoading) return <LoadingBlock rows={4} />;

  const p = profile.data;
  const age = calcAge(p?.birth_date) ?? 0;
  const weight = Number(p?.current_weight_kg ?? 0);
  const height = Number(p?.height_cm ?? 0);
  const bmi = weight && height ? calcBmi(weight, height) : null;
  const bmr = weight && height ? calcBmr({ weightKg: weight, heightCm: height, age, sex: p?.biological_sex }) : null;
  const factor = activityFactor({
    routine: prefs.data?.routine_level,
    trainingDays: prefs.data?.training_days,
    dailySteps: prefs.data?.daily_steps,
  });
  const tdee = bmr ? calcTdee(bmr, factor) : null;
  const waterMl = (water.data ?? []).reduce((acc, w) => acc + (w.amount_ml ?? 0), 0);
  const firstName = (p?.full_name ?? "").split(" ")[0] || "atleta";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Olá, ${firstName}`}
        subtitle={
          goal.data
            ? `Objetivo atual: ${GOAL_LABELS[goal.data.goal_type] ?? goal.data.goal_type}`
            : "Complete o questionário inicial para gerar sua estratégia."
        }
        action={
          !p?.onboarding_completed ? (
            <Button asChild>
              <Link to="/onboarding">Continuar cadastro</Link>
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Peso atual" value={`${formatNumber(weight)} kg`} icon={<Scale className="h-4 w-4" />} />
        <StatCard label="IMC" value={formatNumber(bmi)} hint={bmi ? bmiClassification(bmi) : undefined} />
        <StatCard label="Manutenção" value={formatKcal(tdee)} hint={`Fator ${factor}`} />
        <StatCard
          label="Meta calórica"
          value={goal.data?.target_calories ? formatKcal(goal.data.target_calories) : "—"}
          tone="accent"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Água de hoje" description={`${waterMl} ml registrados`}>
          <div className="flex flex-wrap gap-2">
            {[250, 500].map((ml) => (
              <Button
                key={ml}
                variant="outline"
                size="sm"
                onClick={() => logWater.mutate(ml)}
                disabled={logWater.isPending}
              >
                <Droplets className="mr-1 h-4 w-4" /> +{ml} ml
              </Button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Atalhos" description="Ações rápidas do dia">
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/dieta">Ver dieta</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/treino">
                <Dumbbell className="mr-1 h-4 w-4" /> Treino
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/checkin">Check-in</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link to="/evolucao">Evolução</Link>
            </Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Metabolismo basal" description="Fórmula de Mifflin-St Jeor">
        <p className="font-display text-3xl font-bold">{formatKcal(bmr)}</p>
        <p className="text-sm text-muted-foreground">
          {weights.data?.length ?? 0} registro(s) de peso no histórico.
        </p>
      </SectionCard>

      <Disclaimer />
    </div>
  );
}
