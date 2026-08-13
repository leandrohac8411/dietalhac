import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Minus,
  ListPlus,
  PenLine,
  Plus,
  RefreshCw,
  Replace,
  Search,
  Target,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertNote,
  Disclaimer,
  EmptyState,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from "@/components/common";
import {
  useActiveGoal,
  useAddMealItem,
  useDeleteFoodLog,
  useDeleteMealItem,
  useFoodLogsToday,
  useFoods,
  useGenerateDiet,
  useLogFreeFood,
  useMealPlan,
  useSubstitutions,
  useSwapMealItem,
  useUpdateMealItem,
  useUpdateMealTime,
} from "@/lib/db";
import type { FoodItem, FoodLogRow, MealItemRow } from "@/lib/db";
import { formatKcal, formatNumber, mealGapWarnings } from "@/lib/fitness";
import { searchOffProducts } from "@/lib/openfoodfacts";
import type { OffProduct } from "@/lib/openfoodfacts";

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
  const foodLogs = useFoodLogsToday();

  if (goal.isLoading || mealPlan.isLoading) return <LoadingBlock rows={5} />;

  const g = goal.data;

  if (!g?.target_calories) {
    return (
      <div className="space-y-6">
        <PageHeader title="Minha dieta" subtitle="Seu cardápio a partir das metas da estratégia." />
        <EmptyState
          icon={<Target className="h-5 w-5" />}
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

  const extraLogs = (foodLogs.data ?? []).filter((l) => !l.meal_id);
  const extraTotals = extraLogs.reduce(
    (a, l) => ({
      kcal: a.kcal + Number(l.calories ?? 0),
      p: a.p + Number(l.protein_g ?? 0),
      c: a.c + Number(l.carbs_g ?? 0),
      f: a.f + Number(l.fat_g ?? 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
  const consumed = {
    kcal: totals.kcal + extraTotals.kcal,
    p: totals.p + extraTotals.p,
    c: totals.c + extraTotals.c,
    f: totals.f + extraTotals.f,
  };

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

      <SectionCard
        title="Resumo do dia"
        description={
          extraTotals.kcal > 0
            ? `Plano + ${formatKcal(extraTotals.kcal)} registrados fora do plano.`
            : "Comparado com as metas da sua estratégia."
        }
        icon={<Target className="h-4 w-4" />}
        accent="green"
      >
        <div className="space-y-3">
          <AdherenceBar
            label="Calorias"
            value={consumed.kcal}
            target={g.target_calories}
            unit="kcal"
            bar="[&>div]:bg-accent"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <AdherenceBar
              label="Proteína"
              value={consumed.p}
              target={g.protein_g}
              unit="g"
              bar="[&>div]:bg-chart-1"
            />
            <AdherenceBar
              label="Carboidrato"
              value={consumed.c}
              target={g.carbs_g}
              unit="g"
              bar="[&>div]:bg-chart-3"
            />
            <AdherenceBar
              label="Gordura"
              value={consumed.f}
              target={g.fat_g}
              unit="g"
              bar="[&>div]:bg-chart-4"
            />
          </div>
        </div>
      </SectionCard>

      <FreeFoodLog foods={foods.data ?? []} entries={extraLogs} />

      {mealGapWarnings(meals.map((m) => m.scheduled_time)).map((w, i) => (
        <AlertNote key={i} tone="warning">
          {w}
        </AlertNote>
      ))}

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
  bar,
}: {
  label: string;
  value: number;
  target: number | null;
  unit: string;
  bar?: string;
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
      <Progress value={pct} className={cn("mt-1.5 h-2", bar)} />
    </div>
  );
}

type PickedFood = {
  name: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  source: "catálogo" | "Open Food Facts";
};

type DraftComponent = {
  name: string;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

function FreeFoodLog({ foods, entries }: { foods: FoodItem[]; entries: FoodLogRow[] }) {
  const logFood = useLogFreeFood();
  const deleteLog = useDeleteFoodLog();
  const [query, setQuery] = useState("");
  const [offResults, setOffResults] = useState<OffProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [picked, setPicked] = useState<PickedFood | null>(null);
  const [grams, setGrams] = useState("100");
  const [draftName, setDraftName] = useState("");
  const [draftItems, setDraftItems] = useState<DraftComponent[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });

  const localResults =
    query.trim().length >= 2
      ? foods.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
      : [];

  async function runOffSearch() {
    if (query.trim().length < 2) return;
    setOffLoading(true);
    try {
      const results = await searchOffProducts(query);
      setOffResults(results);
    } catch {
      toast.error("Não foi possível buscar na Open Food Facts", {
        description: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setOffLoading(false);
    }
  }

  function pickLocal(f: FoodItem) {
    const ratio = 100 / (f.portion || 100);
    setPicked({
      name: f.name,
      kcal100: f.calories * ratio,
      protein100: f.protein_g * ratio,
      carbs100: f.carbs_g * ratio,
      fat100: f.fat_g * ratio,
      source: "catálogo",
    });
    setGrams(String(f.portion || 100));
  }

  function pickOff(p: OffProduct) {
    setPicked({
      name: p.name,
      kcal100: p.kcal100,
      protein100: p.protein100,
      carbs100: p.carbs100,
      fat100: p.fat100,
      source: "Open Food Facts",
    });
    setGrams("100");
  }

  function calculatedPicked(): DraftComponent | null {
    if (!picked) return null;
    const g = Number(grams);
    if (!g || g <= 0) return null;
    const ratio = g / 100;
    return {
      name: picked.name,
      quantity: g,
      calories: Math.round(picked.kcal100 * ratio),
      protein_g: Math.round(picked.protein100 * ratio * 10) / 10,
      carbs_g: Math.round(picked.carbs100 * ratio * 10) / 10,
      fat_g: Math.round(picked.fat100 * ratio * 10) / 10,
    };
  }

  function clearSelection() {
    setPicked(null);
    setQuery("");
    setOffResults([]);
  }

  function confirmLog() {
    const item = calculatedPicked();
    if (!item) return;
    logFood.mutate(item, {
      onSuccess: () => {
        toast.success("Registrado!", { description: `${item.name} adicionado ao seu dia.` });
        clearSelection();
      },
      onError: (e) =>
        toast.error("Não foi possível registrar", {
          description: e instanceof Error ? e.message : "Tente novamente.",
        }),
    });
  }

  function addToDraft() {
    const item = calculatedPicked();
    if (!item) return;
    setDraftItems((current) => [...current, item]);
    clearSelection();
  }

  const draftTotals = draftItems.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein_g: total.protein_g + item.protein_g,
      carbs_g: total.carbs_g + item.carbs_g,
      fat_g: total.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  function confirmDraft() {
    if (!draftName.trim() || draftItems.length === 0) return;
    logFood.mutate(
      { name: draftName.trim(), ...draftTotals },
      {
        onSuccess: () => {
          toast.success("Refeição registrada", {
            description: `${draftName.trim()} somado ao consumo de hoje.`,
          });
          setDraftName("");
          setDraftItems([]);
        },
      },
    );
  }

  function confirmManual() {
    const calories = Number(manual.calories);
    if (!manual.name.trim() || !Number.isFinite(calories) || calories < 0) return;
    logFood.mutate(
      {
        name: manual.name.trim(),
        calories,
        protein_g: Number(manual.protein) || 0,
        carbs_g: Number(manual.carbs) || 0,
        fat_g: Number(manual.fat) || 0,
      },
      {
        onSuccess: () => {
          toast.success("Registrado!", { description: `${manual.name.trim()} adicionado.` });
          setManual({ name: "", calories: "", protein: "", carbs: "", fat: "" });
          setManualOpen(false);
        },
      },
    );
  }

  return (
    <SectionCard
      title="Registrar alimento"
      description="Comeu algo fora do plano? Registre aqui para contar nas calorias de hoje."
      icon={<Search className="h-4 w-4" />}
      accent="amber"
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Ex.: bolo de chocolate, presunto, pizza..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={runOffSearch}
            disabled={offLoading || query.trim().length < 2}
          >
            <Search className="mr-1.5 h-4 w-4" />
            {offLoading ? "Buscando..." : "Buscar"}
          </Button>
        </div>

        {localResults.length > 0 || offResults.length > 0 ? (
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1">
            {localResults.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => pickLocal(f)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {Math.round(f.calories)} kcal / {f.portion}
                  {f.unit}
                </span>
              </button>
            ))}
            {offResults.map((p, i) => (
              <button
                key={`${p.name}-${i}`}
                type="button"
                onClick={() => pickOff(p)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span className="min-w-0 flex-1 truncate">
                  {p.name}
                  {p.brand ? <span className="text-muted-foreground"> · {p.brand}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {Math.round(p.kcal100)} kcal/100g
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {picked ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{picked.name}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(picked.kcal100)} kcal/100g · {picked.source}
              </p>
            </div>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="h-9 w-24"
            />
            <span className="text-xs text-muted-foreground">g</span>
            <Button type="button" size="sm" onClick={confirmLog} disabled={logFood.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Registrar
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={addToDraft}>
              <ListPlus className="mr-1 h-4 w-4" /> Somar à refeição
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(null)}>
              Cancelar
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setManualOpen((v) => !v)}>
            <PenLine className="mr-1.5 h-4 w-4" /> Não encontrou? Informar valores
          </Button>
        </div>

        {manualOpen ? (
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium">Informar uma porção consumida</p>
            <Input
              placeholder="Ex.: Monster 473 ml, McChicken..."
              value={manual.name}
              onChange={(e) => setManual((value) => ({ ...value, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  ["calories", "Calorias (kcal)"],
                  ["protein", "Proteína (g)"],
                  ["carbs", "Carboidrato (g)"],
                  ["fat", "Gordura (g)"],
                ] as const
              ).map(([key, placeholder]) => (
                <Input
                  key={key}
                  type="number"
                  min={0}
                  placeholder={placeholder}
                  value={manual[key]}
                  onChange={(e) => setManual((value) => ({ ...value, [key]: e.target.value }))}
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={confirmManual}
              disabled={!manual.name.trim() || manual.calories === "" || logFood.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Registrar porção
            </Button>
          </div>
        ) : null}

        {draftItems.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
            <div className="flex items-center gap-2">
              <ListPlus className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium">Montar refeição</p>
            </div>
            <Input
              placeholder="Nome da refeição, ex.: Misto quente"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
            <div className="divide-y divide-border/60">
              {draftItems.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {item.name} · {item.quantity} g/ml
                  </span>
                  <span className="text-muted-foreground">{Math.round(item.calories)} kcal</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Remover ${item.name}`}
                    onClick={() => setDraftItems((items) => items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Total: {Math.round(draftTotals.calories)} kcal · P{" "}
              {formatNumber(draftTotals.protein_g)}· C {formatNumber(draftTotals.carbs_g)} · G{" "}
              {formatNumber(draftTotals.fat_g)}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={confirmDraft}
              disabled={!draftName.trim() || logFood.isPending}
            >
              Registrar refeição completa
            </Button>
          </div>
        ) : null}

        {entries.length > 0 ? (
          <div className="divide-y border-t pt-2">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.meal_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(Number(e.calories))} kcal · P {formatNumber(e.protein_g)} · C{" "}
                    {formatNumber(e.carbs_g)} · G {formatNumber(e.fat_g)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  onClick={() => deleteLog.mutate(e.id)}
                  disabled={deleteLog.isPending}
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SectionCard>
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
  const updateTime = useUpdateMealTime();
  const items = meal.meal_items ?? [];
  const mt = macroTotals(items);
  return (
    <SectionCard
      title={meal.name}
      description={`${formatKcal(mt.kcal)} · P ${Math.round(mt.p)}g · C ${Math.round(mt.c)}g · G ${Math.round(mt.f)}g`}
      action={
        <div className="flex items-center gap-2">
          <Input
            type="time"
            aria-label={`Horário de ${meal.name}`}
            value={meal.scheduled_time ?? ""}
            onChange={(e) => updateTime.mutate({ mealId: meal.id, scheduled_time: e.target.value })}
            className="h-9 w-[7.5rem]"
          />
          <AddFoodPopover mealId={meal.id} foods={foods} />
        </div>
      }
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
