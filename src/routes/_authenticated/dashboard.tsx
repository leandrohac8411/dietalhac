import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity,
  Apple,
  ClipboardCheck,
  Droplets,
  Dumbbell,
  Flame,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Scale,
  Target,
  UtensilsCrossed,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Disclaimer, PageHeader, Ring, SectionCard, StatCard } from "@/components/common";
import {
  useActiveGoal,
  useActivities,
  useLogWater,
  useMealPlan,
  usePreferences,
  useProfile,
  useWaterToday,
  useWeightLogs,
} from "@/lib/db";
import type { MealItemRow } from "@/lib/db";
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
  parseHM,
} from "@/lib/fitness";
import { weeklyExtraKcalPerDay } from "@/lib/activities";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type MealWithItems = {
  id: string;
  name: string;
  scheduled_time: string | null;
  meal_items: MealItemRow[];
};

function Dashboard() {
  const [customWater, setCustomWater] = useState("");
  const profile = useProfile();
  const prefs = usePreferences();
  const goal = useActiveGoal();
  const activities = useActivities();
  const water = useWaterToday();
  const weights = useWeightLogs();
  const mealPlan = useMealPlan();
  const logWater = useLogWater();

  const p = profile.data;
  const g = goal.data;
  const age = calcAge(p?.birth_date) ?? 0;
  const weight = Number(p?.current_weight_kg ?? 0);
  const height = Number(p?.height_cm ?? 0);
  const bmi = weight && height ? calcBmi(weight, height) : null;
  const bmr =
    weight && height
      ? calcBmr({ weightKg: weight, heightCm: height, age, sex: p?.biological_sex })
      : null;
  const factor = activityFactor({
    routine: prefs.data?.routine_level ?? null,
    trainingDays: prefs.data?.training_days ?? null,
    dailySteps: prefs.data?.daily_steps ?? null,
  });
  const extraKcal = weeklyExtraKcalPerDay(
    (activities.data ?? []).map((a) => ({
      activity: a.name,
      weekdays: a.weekdays,
      duration_min: a.duration_min,
    })),
    weight,
  );
  const tdee = bmr ? calcTdee(bmr, factor) + extraKcal : null;
  const waterMl = (water.data ?? []).reduce((acc, w) => acc + (w.amount_ml ?? 0), 0);
  const waterGoal = g?.water_ml ?? 2500;
  const firstName = (p?.full_name ?? "").split(" ")[0] || "atleta";

  // Split de macros por contribuição calórica.
  const pg = g?.protein_g ?? 0;
  const cg = g?.carbs_g ?? 0;
  const fg = g?.fat_g ?? 0;
  const macroCals = pg * 4 + cg * 4 + fg * 9;
  const seg = (v: number) => (macroCals > 0 ? `${(v / macroCals) * 100}%` : "0%");

  // Série de peso para o gráfico.
  const weightData = (weights.data ?? []).map((w) => ({
    label: new Date(w.log_date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    weight: Number(w.weight_kg),
  }));
  const weightDelta =
    weightData.length >= 2
      ? weightData[weightData.length - 1]!.weight - weightData[0]!.weight
      : null;

  // Próxima refeição pelo horário.
  const meals = (mealPlan.data?.meals ?? []) as unknown as MealWithItems[];
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const sortedMeals = [...meals].sort(
    (a, b) => (parseHM(a.scheduled_time) ?? 0) - (parseHM(b.scheduled_time) ?? 0),
  );
  const nextMeal =
    sortedMeals.find((m) => (parseHM(m.scheduled_time) ?? 0) >= nowMin) ?? sortedMeals[0];
  const nextMealKcal = nextMeal
    ? Math.round(nextMeal.meal_items.reduce((a, it) => a + Number(it.calories), 0))
    : 0;

  const shortcuts = [
    { to: "/dieta", label: "Minha dieta", icon: Apple, accent: "green" as const },
    { to: "/treino", label: "Meu treino", icon: Dumbbell, accent: "blue" as const },
    { to: "/checkin", label: "Check-in", icon: ClipboardCheck, accent: "amber" as const },
    { to: "/evolucao", label: "Evolução", icon: LineChartIcon, accent: "coral" as const },
  ];
  const chip: Record<string, string> = {
    green: "bg-chart-1/15 text-chart-1",
    blue: "bg-chart-3/15 text-chart-3",
    amber: "bg-chart-4/25 text-[oklch(0.48_0.12_75)]",
    coral: "bg-chart-5/15 text-chart-5",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <LayoutDashboard className="h-4 w-4 text-accent" /> Painel
          </>
        }
        title={`Olá, ${firstName}`}
        subtitle={
          g
            ? `Objetivo atual: ${GOAL_LABELS[g.goal_type] ?? g.goal_type}`
            : "Complete o questionário inicial para gerar sua estratégia."
        }
        action={
          !p?.onboarding_completed ? (
            <Button asChild>
              <Link to="/onboarding">Continuar cadastro</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link to="/estrategia">Ver estratégia</Link>
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Peso atual"
          value={`${formatNumber(weight)} kg`}
          icon={<Scale className="h-4 w-4" />}
          accent="green"
          hint={
            weightDelta !== null
              ? `${weightDelta > 0 ? "+" : ""}${formatNumber(weightDelta)} kg no período`
              : "Registre seu peso"
          }
        />
        <StatCard
          label="IMC"
          value={formatNumber(bmi)}
          icon={<Activity className="h-4 w-4" />}
          accent="blue"
          hint={bmi ? bmiClassification(bmi) : "—"}
        />
        <StatCard
          label="Manutenção"
          value={formatKcal(tdee)}
          icon={<Flame className="h-4 w-4" />}
          accent="amber"
          hint={
            extraKcal > 0
              ? `Fator ${factor} + ${extraKcal} kcal de atividades`
              : `Fator de atividade ${factor}`
          }
        />
        <StatCard
          label="Meta calórica"
          value={g?.target_calories ? formatKcal(g.target_calories) : "—"}
          icon={<Target className="h-4 w-4" />}
          accent="green"
          tone="accent"
          hint={g?.active_scenario ? `Cenário ${g.active_scenario}` : "Defina na estratégia"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Metas de hoje"
          description="Distribuição de macros da sua estratégia"
          icon={<Target className="h-4 w-4" />}
          accent="green"
          className="lg:col-span-2"
        >
          {g?.target_calories ? (
            <div className="space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-4xl font-bold leading-none">
                    {formatKcal(g.target_calories)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">meta diária de energia</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">{pg}g</span> proteína
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">{cg}g</span> carbo ·{" "}
                    <span className="font-semibold text-foreground">{fg}g</span> gordura
                  </p>
                </div>
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="bg-chart-1" style={{ width: seg(pg * 4) }} />
                <div className="bg-chart-3" style={{ width: seg(cg * 4) }} />
                <div className="bg-chart-4" style={{ width: seg(fg * 9) }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MacroTile color="bg-chart-1" label="Proteína" value={`${pg} g`} />
                <MacroTile color="bg-chart-3" label="Carboidrato" value={`${cg} g`} />
                <MacroTile color="bg-chart-4" label="Gordura" value={`${fg} g`} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                Escolha um cenário na estratégia para ver suas metas aqui.
              </p>
              <Button asChild size="sm">
                <Link to="/estrategia">Definir estratégia</Link>
              </Button>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Água de hoje"
          description={`Meta ${(waterGoal / 1000).toFixed(1)} L`}
          icon={<Droplets className="h-4 w-4" />}
          accent="blue"
        >
          <div className="flex flex-col items-center gap-4">
            <Ring
              value={waterMl}
              max={waterGoal}
              accent="blue"
              size={128}
              stroke={12}
              label={`${(waterMl / 1000).toFixed(1)} L`}
              sub={`${Math.round(waterGoal > 0 ? (waterMl / waterGoal) * 100 : 0)}%`}
            />
            <div className="flex w-full gap-2">
              {[100, 250, 500].map((ml) => (
                <Button
                  key={ml}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => logWater.mutate(ml)}
                  disabled={logWater.isPending}
                >
                  <Droplets className="mr-1 h-4 w-4" /> +{ml}
                </Button>
              ))}
            </div>
            <div className="flex w-full gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Outra quantidade (ml)"
                value={customWater}
                onChange={(e) => setCustomWater(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={logWater.isPending || !Number(customWater)}
                onClick={() => {
                  const ml = Math.round(Number(customWater));
                  if (ml > 0) {
                    logWater.mutate(ml);
                    setCustomWater("");
                  }
                }}
              >
                <Droplets className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Evolução do peso"
          description={
            weightDelta !== null
              ? `${weightDelta > 0 ? "+" : ""}${formatNumber(weightDelta)} kg no período`
              : "Registre seu peso para acompanhar"
          }
          icon={<LineChartIcon className="h-4 w-4" />}
          accent="coral"
          className="lg:col-span-2"
        >
          {weightData.length >= 2 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v} kg`, "Peso"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2.5}
                    fill="url(#wg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-muted-foreground">
                Ainda não há registros suficientes de peso.
              </p>
              <Button asChild size="sm" variant="secondary">
                <Link to="/evolucao">Registrar peso</Link>
              </Button>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Próxima refeição"
          icon={<UtensilsCrossed className="h-4 w-4" />}
          accent="amber"
        >
          {nextMeal ? (
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-bold">{nextMeal.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {nextMeal.scheduled_time ?? "—"} · {formatKcal(nextMealKcal)}
                </p>
                <div className="mt-3 space-y-1">
                  {nextMeal.meal_items.slice(0, 4).map((it) => (
                    <p key={it.id} className="truncate text-sm text-muted-foreground">
                      • {it.food_name}{" "}
                      <span className="text-xs">
                        ({Math.round(Number(it.quantity))} {it.unit})
                      </span>
                    </p>
                  ))}
                </div>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link to="/dieta">Ver dieta completa</Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 py-2">
              <p className="text-sm text-muted-foreground">Você ainda não gerou sua dieta.</p>
              <Button asChild size="sm">
                <Link to="/dieta">Gerar dieta</Link>
              </Button>
            </div>
          )}
        </SectionCard>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Atalhos
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {shortcuts.map((s) => (
            <Link key={s.to} to={s.to} className="surface elevate flex items-center gap-3 p-4">
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${chip[s.accent]}`}
              >
                <s.icon className="h-5 w-5" />
              </span>
              <span className="font-semibold">{s.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}

function MacroTile({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <div className="flex items-center gap-1.5">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
    </div>
  );
}
