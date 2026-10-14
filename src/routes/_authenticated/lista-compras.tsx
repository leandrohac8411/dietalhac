import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Plus, RotateCcw, ShoppingCart, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingBlock, PageHeader, SectionCard } from "@/components/common";
import { useFoods, useMealPlan } from "@/lib/db";
import type { FoodItem } from "@/lib/db";
import { householdMeasure } from "@/lib/diet-substitutions";

export const Route = createFileRoute("/_authenticated/lista-compras")({
  component: Page_lista_compras,
});

const CATEGORY_ORDER = [
  "proteina",
  "peixe",
  "ovo",
  "leguminosa",
  "carboidrato",
  "vegetal",
  "fruta",
  "laticinio",
  "gordura",
  "suplemento",
  "outros",
];

const CATEGORY_LABELS: Record<string, string> = {
  proteina: "Proteínas",
  peixe: "Peixes e frutos do mar",
  ovo: "Ovos",
  leguminosa: "Leguminosas",
  carboidrato: "Carboidratos",
  vegetal: "Vegetais",
  fruta: "Frutas",
  laticinio: "Laticínios",
  gordura: "Gorduras e oleaginosas",
  suplemento: "Suplementos",
  outros: "Outros",
  extras: "Itens extras (adicionados por você)",
};

type ListItem = {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  cost: number | null;
};

type CustomItem = { key: string; name: string; amount: string };

const STORAGE = {
  hidden: "nexo:shopping:hidden",
  checked: "nexo:shopping:checked",
  custom: "nexo:shopping:custom",
};

function loadList<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveList(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* navegação privada / armazenamento bloqueado: a lista só não é lembrada */
  }
}

/** 1500 g → "1,5 kg"; 250 g → "250 g"; 1200 ml → "1,2 L". */
function formatAmount(quantity: number, unit: string) {
  const rounded = Math.max(10, Math.round(quantity / 10) * 10);
  if (unit === "g" && rounded >= 1000) {
    return `${(rounded / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
  }
  if (unit === "ml" && rounded >= 1000) {
    return `${(rounded / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;
  }
  return `${rounded} ${unit}`;
}

function Page_lista_compras() {
  const mealPlan = useMealPlan();
  const foods = useFoods();
  const [days, setDays] = useState("7");
  const [hidden, setHidden] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [custom, setCustom] = useState<CustomItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    setHidden(loadList<string[]>(STORAGE.hidden, []));
    setChecked(loadList<string[]>(STORAGE.checked, []));
    setCustom(loadList<CustomItem[]>(STORAGE.custom, []));
  }, []);

  const dayCount = Math.min(31, Math.max(1, Number(days) || 7));

  // A lista sai do cardápio que a pessoa realmente tem hoje (quantidade do dia
  // × número de dias), para bater com o que ela vai comer.
  const items = useMemo(() => {
    const meals = mealPlan.data?.meals ?? [];
    const foodsById = new Map(((foods.data ?? []) as FoodItem[]).map((f) => [f.id, f]));
    const grouped = new Map<string, ListItem>();
    for (const meal of meals) {
      for (const item of meal.meal_items ?? []) {
        const key = item.food_item_id ?? item.food_name;
        const food = item.food_item_id ? foodsById.get(item.food_item_id) : undefined;
        const quantity = Number(item.quantity) * dayCount;
        const existing = grouped.get(key);
        if (existing) existing.quantity += quantity;
        else
          grouped.set(key, {
            key,
            name: item.food_name,
            quantity,
            unit: item.unit,
            category: food?.category ?? "outros",
            cost: food?.estimated_cost ? Number(food.estimated_cost) : null,
          });
      }
    }
    return [...grouped.values()].sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        a.name.localeCompare(b.name),
    );
  }, [mealPlan.data, foods.data, dayCount]);

  if (mealPlan.isLoading || foods.isLoading) return <LoadingBlock rows={5} />;

  if (!mealPlan.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lista de compras" subtitle="Gerada a partir da sua dieta." />
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="Gere sua dieta primeiro"
          description="A lista de compras usa os alimentos do seu cardápio."
          action={
            <Button asChild>
              <Link to="/dieta">Ir para a dieta</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const visible = items.filter((item) => !hidden.includes(item.key));
  const byCategory = new Map<string, ListItem[]>();
  for (const item of visible) {
    const arr = byCategory.get(item.category) ?? [];
    arr.push(item);
    byCategory.set(item.category, arr);
  }

  const totalCost = visible.reduce((sum, it) => {
    if (it.cost === null) return sum;
    const food = (foods.data ?? []).find((f: FoodItem) => f.name === it.name);
    const portion = food?.portion || 100;
    return sum + (it.cost / portion) * it.quantity;
  }, 0);

  function toggle(key: string) {
    const next = checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key];
    setChecked(next);
    saveList(STORAGE.checked, next);
  }

  function hide(key: string) {
    const next = [...hidden, key];
    setHidden(next);
    saveList(STORAGE.hidden, next);
  }

  function restore() {
    setHidden([]);
    saveList(STORAGE.hidden, []);
  }

  function addCustom() {
    const name = newName.trim();
    if (!name) return;
    const next = [...custom, { key: `custom-${Date.now()}`, name, amount: newAmount.trim() }];
    setCustom(next);
    saveList(STORAGE.custom, next);
    setNewName("");
    setNewAmount("");
  }

  function removeCustom(key: string) {
    const next = custom.filter((c) => c.key !== key);
    setCustom(next);
    saveList(STORAGE.custom, next);
  }

  const Row = ({
    id,
    name,
    amount,
    onRemove,
  }: {
    id: string;
    name: string;
    amount: string;
    onRemove: () => void;
  }) => (
    <div className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => toggle(id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
            checked.includes(id)
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border/60"
          }`}
        >
          {checked.includes(id) ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
        <span
          className={`min-w-0 flex-1 truncate text-sm ${checked.includes(id) ? "text-muted-foreground line-through" : ""}`}
        >
          {name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{amount}</span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground"
        onClick={onRemove}
        aria-label={`Remover ${name}`}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de compras"
        subtitle={`Seu cardápio de ${dayCount} dias · estimativa ${totalCost > 0 ? `R$ ${totalCost.toFixed(2).replace(".", ",")}` : "—"}`}
      />

      <SectionCard title="Período" icon={<ShoppingCart className="h-4 w-4" />} accent="green">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Comprar para</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">dias</span>
          {hidden.length > 0 ? (
            <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={restore}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar {hidden.length} removido
              {hidden.length > 1 ? "s" : ""}
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          As quantidades são as do seu cardápio atual multiplicadas pelos dias. Toque num item pra
          marcar como comprado, ou no X para tirar da lista (por exemplo, o que você já tem em
          casa). Se trocar alimentos na dieta, a lista acompanha.
        </p>
      </SectionCard>

      {[...byCategory.entries()].map(([category, catItems]) => (
        <SectionCard
          key={category}
          title={CATEGORY_LABELS[category] ?? category}
          icon={<ShoppingCart className="h-4 w-4" />}
          accent="blue"
        >
          <div className="divide-y">
            {catItems.map((item) => (
              <Row
                key={item.key}
                id={item.key}
                name={item.name}
                amount={`${formatAmount(item.quantity, item.unit)}${householdMeasure(item.name, item.quantity) ? ` (${householdMeasure(item.name, item.quantity)})` : ""}`}
                onRemove={() => hide(item.key)}
              />
            ))}
          </div>
        </SectionCard>
      ))}

      <SectionCard
        title={CATEGORY_LABELS["extras"]!}
        icon={<Plus className="h-4 w-4" />}
        accent="blue"
      >
        {custom.length > 0 ? (
          <div className="mb-3 divide-y">
            {custom.map((item) => (
              <Row
                key={item.key}
                id={item.key}
                name={item.name}
                amount={item.amount}
                onRemove={() => removeCustom(item.key)}
              />
            ))}
          </div>
        ) : null}
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            addCustom();
          }}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Adicionar item (ex.: café, azeite, sal)"
            className="sm:flex-1"
          />
          <Input
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="Quantidade (opcional)"
            className="sm:w-48"
          />
          <Button type="submit" variant="secondary" disabled={!newName.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
