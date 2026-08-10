import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, RefreshCw, Replace, Sparkles, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  useAddMealItem,
  useDeleteMealItem,
  useFoods,
  useGenerateDiet,
  useMealPlan,
  useSubstitutions,
  useSwapMealItem,
  useUpdateMealItem,
} from "@/lib/db";
import type { FoodItem, MealItemRow } from "@/lib/db";
import { formatKcal, formatNumber } from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/dieta")({
  component: Dieta,
});

type MealWithItems = {
  id: string;
  name: string;
  scheduled_time: string | null;
  sort_order: number;
  meal_items: MealItemRow[];
};

type SubRow = { food_item_id: string | null; substitute: FoodItem | null };

function macroTotals(items: MealItemRow[]) {
  return items.reduce(
    (a, it) => ({
      kcal: a.kcal + Number(it.calories),
      p: a.p + Number(it.protein_g),
      c: a.c + Number(it.carbs_g),
      f: a.f + Number(it.fat_g),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
}

function Dieta() {
  const goal = useActiveGoal();
  const mealPlan = useMealPlan();
  const foods = useFoods();
  const subs = useSubstitutions();
  const generate = useGenerateDiet();

  if (goal.isLoading || mealPlan.isLoading) return <LoadingBlock rows={5} />;

  const g = goal.data;

  if (!g?.target_calories) {
    return (
      <div className="space-y-6">
        <PageHeader title="Minha dieta" subtitle="Seu cardápio a partir das metas da estratégia." />
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Defina sua estratégia primeiro"
          description="A dieta é gerada a partir da meta calórica e dos macros escolhidos na estratégia."
          action={
            <Button asChild>
              <Link to="/estrategia">Ir para a estratégia</Link>
            </Button>
          }
        />
      </div>
    );
  }

  function runGenerate() {
    generate.mutate(undefined, {
      onSuccess: () =>
        toast.success("Dieta gerada!", { description: "Ajuste como quiser abaixo." }),
      onError: (e) =>
        toast.error("Não foi possível gerar", {
          description: e instanceof Error ? e.message : "Tente novamente.",
        }),
    });
  }

  const data = mealPlan.data;

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Minha dieta" subtitle="Seu cardápio a partir das metas da estratégia." />
        <EmptyState
          icon={<UtensilsCrossed className="h-5 w-5" />}
          title="Nenhuma dieta gerada ainda"
          description="Vamos montar um cardápio equilibrado nos seus horários, respeitando restrições e preferências."
          action={
            <Button onClick={runGenerate} disabled={generate.isPending}>
              {generate.isPending ? "Gerando..." : "Gerar minha dieta"}
            </Button>
          }
        />
        <Disclaimer />
      </div>
    );
  }

  const meals = (data.meals ?? []) as unknown as MealWithItems[];
  const totals = macroTotals(meals.flatMap((m) => m.meal_items ?? []));

  const subsByFood = new Map<string, FoodItem[]>();
  for (const s of (subs.data ?? []) as unknown as SubRow[]) {
    if (s.food_item_id && s.substitute) {
      const arr = subsByFood.get(s.food_item_id) ?? [];
      arr.push(s.substitute);
      subsByFood.set(s.food_item_id, arr);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha dieta"
        subtitle={`${meals.length} refeições · ${formatKcal(totals.kcal)} no total`}
        action={<RegenerateButton onConfirm={runGenerate} pending={generate.isPending} />}
      />

      <SectionCard title="Resumo do dia" description="Comparado com as metas da sua estratégia.">
        <div className="space-y-3">
          <AdherenceBar
            label="Calorias"
            value={totals.kcal}
            target={g.target_calories}
            unit="kcal"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <AdherenceBar label="Proteína" value={totals.p} target={g.protein_g} unit="g" />
            <AdherenceBar label="Carboidrato" value={totals.c} target={g.carbs_g} unit="g" />
            <AdherenceBar label="Gordura" value={totals.f} target={g.fat_g} unit="g" />
          </div>
        </div>
      </SectionCard>

      {meals.map((meal) => (
        <MealCard key={meal.id} meal={meal} foods={foods.data ?? []} subsByFood={subsByFood} />
      ))}

      <Disclaimer />
    </div>
  );
}

function AdherenceBar({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number | null;
  unit: string;
}) {
  const pct = target && target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(value)} / {target ?? "—"} {unit}
        </span>
      </div>
      <Progress value={pct} className="mt-1.5 h-2" />
    </div>
  );
}

function MealCard({
  meal,
  foods,
  subsByFood,
}: {
  meal: MealWithItems;
  foods: FoodItem[];
  subsByFood: Map<string, FoodItem[]>;
}) {
  const items = meal.meal_items ?? [];
  const mt = macroTotals(items);
  return (
    <SectionCard
      title={meal.name}
      description={`${meal.scheduled_time ?? ""} · ${formatKcal(mt.kcal)} · P ${Math.round(mt.p)}g · C ${Math.round(mt.c)}g · G ${Math.round(mt.f)}g`}
      action={<AddFoodPopover mealId={meal.id} foods={foods} />}
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum alimento nesta refeição.</p>
      ) : (
        <div className="divide-y">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              subs={subsByFood.get(item.food_item_id ?? "") ?? []}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ItemRow({ item, subs }: { item: MealItemRow; subs: FoodItem[] }) {
  const update = useUpdateMealItem();
  const swap = useSwapMealItem();
  const del = useDeleteMealItem();

  const step = (delta: number) =>
    update.mutate({ item, quantity: Math.max(5, Number(item.quantity) + delta) });

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.food_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {Math.round(Number(item.calories))} kcal · P {formatNumber(item.protein_g)} · C{" "}
          {formatNumber(item.carbs_g)} · G {formatNumber(item.fat_g)}
          {item.preparation ? ` · ${item.preparation}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => step(-10)}
          disabled={update.isPending}
          aria-label="Diminuir"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-16 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(Number(item.quantity))} {item.unit}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => step(10)}
          disabled={update.isPending}
          aria-label="Aumentar"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>

        {subs.length > 0 ? <SwapPopover item={item} subs={subs} swap={swap} /> : null}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={() => del.mutate(item.id)}
          disabled={del.isPending}
          aria-label="Remover"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SwapPopover({
  item,
  subs,
  swap,
}: {
  item: MealItemRow;
  subs: FoodItem[];
  swap: ReturnType<typeof useSwapMealItem>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Substituir">
          <Replace className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Substituir por</p>
        <div className="max-h-60 overflow-y-auto">
          {subs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                swap.mutate({ item, substitute: s });
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {Math.round(s.calories)} kcal
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddFoodPopover({ mealId, foods }: { mealId: string; foods: FoodItem[] }) {
  const add = useAddMealItem();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm">
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar alimento..." />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup>
              {foods.map((f) => (
                <CommandItem
                  key={f.id}
                  value={f.name}
                  onSelect={() => {
                    add.mutate({ mealId, food: f });
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {Math.round(f.calories)} kcal
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
          <AlertDialogTitle>Regenerar a dieta?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso cria um novo cardápio e substitui o plano atual, incluindo os ajustes que você fez.
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
