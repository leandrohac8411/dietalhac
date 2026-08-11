import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Apple,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  RotateCcw,
  Target,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  Ring,
  SectionCard,
} from "@/components/common";
import { cn } from "@/lib/utils";
import {
  today,
  useActiveGoal,
  useCompleteWorkout,
  useFoodLogsToday,
  useLogWater,
  useMealPlan,
  useProfile,
  useSessions,
  useToggleMealCompletion,
  useUndoWater,
  useWaterToday,
  useWorkoutPlan,
} from "@/lib/db";
import type { MealItemRow } from "@/lib/db";
import { formatNumber, parseHM } from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/meu-dia")({
  component: MeuDia,
});

type MealWithItems = {
  id: string;
  name: string;
  scheduled_time: string | null;
  sort_order: number;
  meal_items: MealItemRow[];
};

type WorkoutWithExercises = {
  id: string;
  name: string;
  muscle_groups: string | null;
  weekday: number | null;
  estimated_min: number | null;
  workout_exercises: Array<{ id: string }>;
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function localDateOf(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function MeuDia() {
  const profile = useProfile();
  const goal = useActiveGoal();
  const mealPlan = useMealPlan();
  const foodLogs = useFoodLogsToday();
  const water = useWaterToday();
  const workoutPlan = useWorkoutPlan();
  const sessions = useSessions();

  const queries = [profile, goal, mealPlan, foodLogs, water, workoutPlan, sessions];
  if (queries.some((query) => query.isLoading)) return <LoadingBlock rows={6} />;

  const failed = queries.find((query) => query.isError);
  if (failed) {
    return (
      <ErrorState
        message="Não foi possível montar sua rotina de hoje."
        onRetry={() => void Promise.all(queries.map((query) => query.refetch()))}
      />
    );
  }

  if (!profile.data?.onboarding_completed || !goal.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu dia" subtitle="Seu plano traduzido em ações simples para hoje." />
        <EmptyState
          icon={<ClipboardList className="h-5 w-5" />}
          title="Prepare seu plano primeiro"
          description="Complete o questionário para receber sua rotina diária de alimentação, água e treino."
          action={
            <Button asChild>
              <Link to="/onboarding">Responder questionário</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const firstName = (profile.data.full_name ?? "").split(" ")[0] || "atleta";
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const meals = (mealPlan.data?.meals ?? []) as unknown as MealWithItems[];
  const completedMealIds = new Set(
    (foodLogs.data ?? []).filter((log) => log.completed).map((log) => log.meal_id),
  );
  const completedMeals = meals.filter((meal) => completedMealIds.has(meal.id)).length;
  const consumed = (foodLogs.data ?? []).reduce(
    (acc, log) => ({
      calories: acc.calories + Number(log.calories ?? 0),
      protein: acc.protein + Number(log.protein_g ?? 0),
      carbs: acc.carbs + Number(log.carbs_g ?? 0),
      fat: acc.fat + Number(log.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const waterMl = (water.data ?? []).reduce((sum, item) => sum + Number(item.amount_ml ?? 0), 0);
  const workouts = (workoutPlan.data?.workouts ?? []) as unknown as WorkoutWithExercises[];
  const weekday = new Date().getDay();
  const todayWorkout = workouts.find((workout) => workout.weekday === weekday) ?? null;
  const completedWorkout = (sessions.data ?? []).find(
    (session) =>
      session.finished_at &&
      localDateOf(session.finished_at) === today() &&
      (!todayWorkout || session.workout_id === todayWorkout.id),
  );
  const totalActions = meals.length + (todayWorkout ? 1 : 0);
  const completedActions = completedMeals + (completedWorkout ? 1 : 0);
  const dayProgress = totalActions ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <CalendarDays className="h-4 w-4 text-accent" /> {dateLabel}
          </>
        }
        title={`Vamos nessa, ${firstName}`}
        subtitle="Acompanhe o plano conforme o dia acontece. Cada registro atualiza seu progresso."
      />

      <Card className="relative gap-0 overflow-hidden border-primary/10 bg-primary p-5 text-primary-foreground shadow-lifted sm:p-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/55">
              Ritmo de hoje
            </p>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-5xl font-bold tracking-tight">{dayProgress}%</span>
              <span className="text-sm text-primary-foreground/65">
                {completedActions} de {totalActions || 0} ações
              </span>
            </div>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-primary-foreground/70">
              {dayProgress === 100
                ? "Rotina concluída. Consistência construída um dia de cada vez."
                : "Sem compensações ou pressa: apenas siga a próxima ação do seu plano."}
            </p>
          </div>
          <Ring
            value={dayProgress}
            max={100}
            label={`${dayProgress}%`}
            sub="concluído"
            accent="green"
            size={108}
            stroke={10}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Metric
          icon={<Flame className="h-4 w-4" />}
          label="Energia"
          value={`${Math.round(consumed.calories)}`}
          target={goal.data.target_calories ? `${goal.data.target_calories} kcal` : "kcal"}
          progress={ratio(consumed.calories, goal.data.target_calories)}
          color="bg-chart-4"
        />
        <Metric
          icon={<Target className="h-4 w-4" />}
          label="Proteína"
          value={`${formatNumber(consumed.protein)}g`}
          target={`de ${goal.data.protein_g ?? 0}g`}
          progress={ratio(consumed.protein, goal.data.protein_g)}
          color="bg-chart-1"
        />
        <Metric
          icon={<Utensils className="h-4 w-4" />}
          label="Refeições"
          value={`${completedMeals}/${meals.length}`}
          target="realizadas"
          progress={ratio(completedMeals, meals.length)}
          color="bg-chart-3"
        />
        <Metric
          icon={<Droplets className="h-4 w-4" />}
          label="Água"
          value={`${formatNumber(waterMl / 1000)}L`}
          target={`de ${formatNumber((goal.data.water_ml ?? 2500) / 1000)}L`}
          progress={ratio(waterMl, goal.data.water_ml ?? 2500)}
          color="bg-chart-3"
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <SectionCard
          title="Roteiro alimentar"
          description={`${completedMeals} de ${meals.length} refeições realizadas`}
          icon={<Apple className="h-4 w-4" />}
          accent="green"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/dieta">Ver dieta <ChevronRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          }
        >
          {meals.length ? (
            <MealTimeline meals={meals} completedIds={completedMealIds} />
          ) : (
            <div className="rounded-2xl bg-muted/60 p-5 text-sm text-muted-foreground">
              Gere sua dieta para transformar seus horários em um roteiro diário.
              <Button asChild variant="link" className="ml-1 h-auto p-0">
                <Link to="/dieta">Gerar dieta</Link>
              </Button>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <WaterCard current={waterMl} goal={goal.data.water_ml ?? 2500} />
          <WorkoutCard workout={todayWorkout} completed={Boolean(completedWorkout)} />
        </div>
      </div>
    </div>
  );
}

function ratio(value: number, max: number | null | undefined) {
  return max && max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
}

function Metric({
  icon,
  label,
  value,
  target,
  progress,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  target: string;
  progress: number;
  color: string;
}) {
  return (
    <Card className="gap-3 p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div>
        <span className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{value}</span>
        <span className="ml-1.5 text-xs text-muted-foreground">{target}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${progress}%` }} />
      </div>
    </Card>
  );
}

function MealTimeline({ meals, completedIds }: { meals: MealWithItems[]; completedIds: Set<string | null> }) {
  const toggle = useToggleMealCompletion();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const sorted = [...meals].sort((a, b) => a.sort_order - b.sort_order);
  const nextId = sorted.find((meal) => !completedIds.has(meal.id) && (parseHM(meal.scheduled_time) ?? 0) >= nowMinutes)?.id;

  function setCompleted(meal: MealWithItems, completed: boolean) {
    toggle.mutate(
      { meal, completed },
      {
        onSuccess: () => toast.success(completed ? `${meal.name} registrada` : "Registro desfeito"),
        onError: () => toast.error("Não foi possível atualizar a refeição."),
      },
    );
  }

  return (
    <div>
      {sorted.map((meal, index) => {
        const completed = completedIds.has(meal.id);
        const calories = Math.round(meal.meal_items.reduce((sum, item) => sum + Number(item.calories ?? 0), 0));
        const isNext = meal.id === nextId;
        return (
          <div key={meal.id} className="grid grid-cols-[36px_minmax(0,1fr)_auto] gap-3">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setCompleted(meal, !completed)}
                disabled={toggle.isPending}
                aria-label={completed ? `Desmarcar ${meal.name}` : `Concluir ${meal.name}`}
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  completed
                    ? "border-accent bg-accent text-accent-foreground"
                    : isNext
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-card text-muted-foreground hover:border-accent/60",
                )}
              >
                {completed ? <Check className="h-4 w-4" /> : <Clock3 className="h-3.5 w-3.5" />}
              </button>
              {index < sorted.length - 1 ? <span className="my-1 h-full min-h-8 w-px bg-border" /> : null}
            </div>
            <div className="min-w-0 pb-5 pt-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className={cn("text-sm font-semibold", completed && "text-muted-foreground line-through")}>{meal.name}</p>
                {isNext && !completed ? (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
                    Próxima
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {meal.meal_items.map((item) => item.food_name).join(" · ") || "Sem alimentos"}
              </p>
            </div>
            <div className="pb-5 pt-1 text-right">
              <p className="text-sm font-semibold tabular-nums">{meal.scheduled_time?.slice(0, 5) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{calories} kcal</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WaterCard({ current, goal }: { current: number; goal: number }) {
  const logWater = useLogWater();
  const undoWater = useUndoWater();
  const pending = logWater.isPending || undoWater.isPending;
  const cups = Math.round(current / 250);

  function add(amount: number) {
    logWater.mutate(amount, {
      onSuccess: () => toast.success(`${amount} ml de água registrados`),
      onError: () => toast.error("Não foi possível registrar a água."),
    });
  }

  return (
    <SectionCard title="Hidratação" description={`${cups} copos registrados`} icon={<Droplets className="h-4 w-4" />} accent="blue">
      <div className="flex items-center gap-5">
        <Ring value={current} max={goal} label={`${Math.round((current / goal) * 100)}%`} sub="da meta" accent="blue" size={82} stroke={8} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-bold">{formatNumber(current / 1000)} L</p>
          <p className="text-xs text-muted-foreground">Meta de {formatNumber(goal / 1000)} L</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => add(250)} disabled={pending}>+ 250 ml</Button>
            <Button size="sm" variant="secondary" onClick={() => add(500)} disabled={pending}>+ 500 ml</Button>
            {current > 0 ? (
              <Button size="icon" variant="ghost" onClick={() => undoWater.mutate()} disabled={pending} aria-label="Desfazer último registro">
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function WorkoutCard({ workout, completed }: { workout: WorkoutWithExercises | null; completed: boolean }) {
  const complete = useCompleteWorkout();

  if (!workout) {
    return (
      <SectionCard title="Treino" description={`Hoje é ${WEEKDAYS[new Date().getDay()]}`} icon={<Dumbbell className="h-4 w-4" />} accent="violet">
        <div className="rounded-2xl bg-muted/60 p-4">
          <p className="text-sm font-semibold">Dia de recuperação</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Sono, hidratação e alimentação também fazem parte do resultado.</p>
        </div>
      </SectionCard>
    );
  }

  function finish() {
    complete.mutate(workout, {
      onSuccess: () => toast.success("Treino concluído!", { description: "Sua sessão entrou no histórico." }),
      onError: () => toast.error("Não foi possível concluir o treino."),
    });
  }

  return (
    <SectionCard title="Treino de hoje" description={WEEKDAYS[new Date().getDay()]} icon={<Dumbbell className="h-4 w-4" />} accent="violet">
      <div className={cn("rounded-2xl border p-4", completed ? "border-success/30 bg-success/10" : "bg-muted/40")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{workout.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{workout.muscle_groups ?? "Treino completo"}</p>
          </div>
          {completed ? <span className="grid h-8 w-8 place-items-center rounded-full bg-success text-success-foreground"><Check className="h-4 w-4" /></span> : null}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          <span>{workout.workout_exercises.length} exercícios</span>
          <span>~{workout.estimated_min ?? 60} min</span>
        </div>
        <div className="mt-4 flex gap-2">
          {completed ? (
            <Button variant="secondary" className="flex-1" disabled>Concluído hoje</Button>
          ) : (
            <Button className="flex-1" onClick={finish} disabled={complete.isPending}>{complete.isPending ? "Concluindo..." : "Concluir treino"}</Button>
          )}
          <Button asChild variant="outline" size="icon" aria-label="Ver treino">
            <Link to="/treino"><ChevronRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
