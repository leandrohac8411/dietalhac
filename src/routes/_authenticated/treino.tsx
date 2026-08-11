import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Dumbbell, Minus, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Disclaimer, EmptyState, LoadingBlock, PageHeader, SectionCard } from "@/components/common";
import {
  useActiveGoal,
  useAddWorkoutExercise,
  useDeleteWorkoutExercise,
  useExercises,
  useGenerateWorkout,
  useProfile,
  useUpdateWorkoutExercise,
  useWorkoutPlan,
} from "@/lib/db";
import type { Exercise, WorkoutExerciseRow } from "@/lib/db";
import { SPLIT_LABELS } from "@/lib/plan-generator";

export const Route = createFileRoute("/_authenticated/treino")({
  component: Treino,
});

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const DIFF_STYLE: Record<string, string> = {
  iniciante: "bg-chart-1/15 text-chart-1",
  intermediario: "bg-chart-4/25 text-[oklch(0.48_0.12_75)]",
  avancado: "bg-chart-5/15 text-chart-5",
};

type WorkoutWithExercises = {
  id: string;
  name: string;
  muscle_groups: string | null;
  weekday: number | null;
  estimated_min: number | null;
  workout_exercises: WorkoutExerciseRow[];
};

function Treino() {
  const profile = useProfile();
  const goal = useActiveGoal();
  const workoutPlan = useWorkoutPlan();
  const exercises = useExercises();
  const generate = useGenerateWorkout();

  if (profile.isLoading || workoutPlan.isLoading) return <LoadingBlock rows={5} />;

  if (!profile.data?.onboarding_completed || !goal.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu treino" subtitle="Seu plano de treino personalizado." />
        <EmptyState
          icon={<Dumbbell className="h-5 w-5" />}
          title="Complete o questionário primeiro"
          description="Precisamos dos seus dias, duração, local e experiência para montar o treino."
          action={
            <Button asChild>
              <Link to="/onboarding">Responder questionário</Link>
            </Button>
          }
        />
      </div>
    );
  }

  function runGenerate() {
    generate.mutate(undefined, {
      onSuccess: () =>
        toast.success("Treino gerado!", { description: "Ajuste séries, cargas e exercícios." }),
      onError: (e) =>
        toast.error("Não foi possível gerar", {
          description: e instanceof Error ? e.message : "Tente novamente.",
        }),
    });
  }

  const data = workoutPlan.data;

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu treino" subtitle="Seu plano de treino personalizado." />
        <EmptyState
          icon={<Dumbbell className="h-5 w-5" />}
          title="Nenhum treino gerado ainda"
          description="Vamos montar sua divisão pelos dias disponíveis, local e equipamentos."
          action={
            <Button onClick={runGenerate} disabled={generate.isPending}>
              {generate.isPending ? "Gerando..." : "Gerar meu treino"}
            </Button>
          }
        />
        <Disclaimer>
          Os treinos são sugestões gerais. Não realize exercícios que provoquem dor e procure
          acompanhamento de um profissional de educação física.
        </Disclaimer>
      </div>
    );
  }

  const workouts = (data.workouts ?? []) as unknown as WorkoutWithExercises[];
  const splitLabel = SPLIT_LABELS[data.plan.split_type] ?? data.plan.split_type;
  const mediaByName = new Map((exercises.data ?? []).map((e) => [e.name, e.media_url] as const));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu treino"
        subtitle={`${splitLabel} · ${workouts.length} treinos por semana`}
        action={<RegenerateButton onConfirm={runGenerate} pending={generate.isPending} />}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {workouts.map((w) => (
          <WorkoutCard
            key={w.id}
            workout={w}
            exercises={exercises.data ?? []}
            mediaByName={mediaByName}
          />
        ))}
      </div>

      <Disclaimer>
        Os treinos são sugestões gerais. Não realize exercícios que provoquem dor e procure
        acompanhamento de um profissional de educação física.
      </Disclaimer>
    </div>
  );
}

function WorkoutCard({
  workout,
  exercises,
  mediaByName,
}: {
  workout: WorkoutWithExercises;
  exercises: Exercise[];
  mediaByName: Map<string, string | null>;
}) {
  const list = workout.workout_exercises ?? [];
  const weekday = workout.weekday !== null ? WEEKDAYS[workout.weekday] : null;
  return (
    <SectionCard
      title={workout.name}
      description={`${workout.muscle_groups ?? ""}${weekday ? ` · ${weekday}` : ""} · ~${workout.estimated_min ?? 60} min`}
      icon={<Dumbbell className="h-4 w-4" />}
      accent="blue"
      action={<AddExercisePopover workoutId={workout.id} exercises={exercises} />}
      className="min-w-0 overflow-hidden p-4 sm:p-6"
    >
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum exercício neste treino.</p>
      ) : (
        <div className="divide-y">
          {list.map((ex) => (
            <ExerciseRow key={ex.id} ex={ex} media={mediaByName.get(ex.exercise_name) ?? null} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ExerciseRow({ ex, media }: { ex: WorkoutExerciseRow; media: string | null }) {
  const update = useUpdateWorkoutExercise();
  const del = useDeleteWorkoutExercise();

  const stepSets = (d: number) =>
    update.mutate({ id: ex.id, patch: { sets: Math.max(1, Number(ex.sets) + d) } });
  const stepRest = (d: number) =>
    update.mutate({
      id: ex.id,
      patch: { rest_seconds: Math.max(15, Number(ex.rest_seconds) + d) },
    });

  return (
    <div className="py-3">
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <MediaThumb media={media} name={ex.exercise_name} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{ex.exercise_name}</p>
              {ex.difficulty ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    DIFF_STYLE[ex.difficulty] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {ex.difficulty}
                </span>
              ) : null}
            </div>
            {ex.alternative_name ? (
              <p className="truncate text-xs text-muted-foreground">
                Alternativa: {ex.alternative_name}
              </p>
            ) : null}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={() => del.mutate(ex.id)}
          disabled={del.isPending}
          aria-label="Remover exercício"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Stepper
          label="Séries"
          value={`${ex.sets}`}
          onDec={() => stepSets(-1)}
          onInc={() => stepSets(1)}
          disabled={update.isPending}
        />
        <Field label="Reps">
          <Input
            defaultValue={ex.reps}
            onBlur={(e) => {
              if (e.target.value !== ex.reps)
                update.mutate({ id: ex.id, patch: { reps: e.target.value } });
            }}
            className="h-7 w-20 text-center"
          />
        </Field>
        <Stepper
          label="Descanso"
          value={`${ex.rest_seconds}s`}
          onDec={() => stepRest(-15)}
          onInc={() => stepRest(15)}
          disabled={update.isPending}
        />
        <Field label="Carga (kg)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.5"
            defaultValue={ex.load_kg ?? ""}
            placeholder="—"
            onBlur={(e) => {
              const v = e.target.value.trim() === "" ? null : Number(e.target.value);
              if (v !== ex.load_kg) update.mutate({ id: ex.id, patch: { load_kg: v } });
            }}
            className="h-7 w-20 text-center"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  disabled,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-0.5">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={onDec}
          disabled={disabled}
          aria-label={`Diminuir ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-10 text-center text-sm font-medium tabular-nums">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={onInc}
          disabled={disabled}
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function MediaThumb({ media, name }: { media: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const isVideo = !!media && /\.mp4(\?|$)/i.test(media);
  if (!media || failed) {
    return (
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Dumbbell className="h-5 w-5" />
      </span>
    );
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted"
          aria-label={`Ver demonstração de ${name}`}
        >
          {isVideo ? (
            <video
              src={media}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              onLoadedMetadata={(event) => {
                event.currentTarget.currentTime = 0.05;
              }}
              onCanPlay={(event) => {
                void event.currentTarget.play().catch(() => {
                  event.currentTarget.currentTime = 0.05;
                });
              }}
              onError={() => setFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={media}
              alt=""
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover"
            />
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 fill-white text-white" />
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        {isVideo ? (
          <video
            src={media}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full rounded-xl bg-black"
          />
        ) : (
          <img src={media} alt={name} className="w-full rounded-xl" />
        )}
        <p className="text-xs text-muted-foreground">Demonstração ilustrativa (ExerciseDB).</p>
      </DialogContent>
    </Dialog>
  );
}

function AddExercisePopover({
  workoutId,
  exercises,
}: {
  workoutId: string;
  exercises: Exercise[];
}) {
  const add = useAddWorkoutExercise();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3">
          <Plus className="h-4 w-4 sm:mr-1" />
          <span className="sr-only sm:not-sr-only">Adicionar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Buscar exercício..." />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {exercises.map((ex) => (
                <CommandItem
                  key={ex.id}
                  value={`${ex.name} ${ex.muscle_group}`}
                  onSelect={() => {
                    add.mutate({ workoutId, exercise: ex });
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{ex.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {ex.muscle_group}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RegenerateButton({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          <RefreshCw className="mr-1 h-4 w-4" /> {pending ? "Gerando..." : "Regenerar"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerar o treino?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso cria uma nova divisão e substitui o treino atual, incluindo os ajustes que você
            fez.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Regenerar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
