import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingBlock, PageHeader, SectionCard } from "@/components/common";
import { useFoods, useMealPlan } from "@/lib/db";
import type { FoodItem, MealItemRow } from "@/lib/db";

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
  outros: "Outros",
};

type ListItem = {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  cost: number | null;
};

function Page_lista_compras() {
  const mealPlan = useMealPlan();
  const foods = useFoods();
  const [days, setDays] = useState("7");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const multiplier = Math.max(1, Number(days) || 7);

  const items = useMemo(() => {
    const allItems = (mealPlan.data?.meals ?? []).flatMap(
      (m) => (m.meal_items ?? []) as MealItemRow[],
    );
    const foodsById = new Map((foods.data ?? []).map((f: FoodItem) => [f.id, f]));

    const grouped = new Map<string, ListItem>();
    for (const item of allItems) {
      const key = item.food_item_id ?? item.food_name;
      const food = item.food_item_id ? foodsById.get(item.food_item_id) : undefined;
      const existing = grouped.get(key);
      const qty = Number(item.quantity) * multiplier;
      if (existing) {
        existing.quantity += qty;
      } else {
        grouped.set(key, {
          key,
          name: item.food_name,
          quantity: qty,
          unit: item.unit,
          category: food?.category ?? "outros",
          cost: food?.estimated_cost ? Number(food.estimated_cost) : null,
        });
      }
    }
    return [...grouped.values()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );
  }, [mealPlan.data, foods.data, multiplier]);

  if (mealPlan.isLoading || foods.isLoading) return <LoadingBlock rows={5} />;

  if (!mealPlan.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lista de compras" subtitle="Gerada a partir da sua dieta." />
        <EmptyState
          icon={<ShoppingCart className="h-5 w-5" />}
          title="Nenhuma dieta gerada ainda"
          description="Gere sua dieta primeiro para montarmos a lista de compras."
          action={
            <Button asChild>
              <Link to="/dieta">Ir para a dieta</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const byCategory = new Map<string, ListItem[]>();
  for (const item of items) {
    const arr = byCategory.get(item.category) ?? [];
    arr.push(item);
    byCategory.set(item.category, arr);
  }

  const totalCost = items.reduce((sum, it) => {
    if (it.cost === null) return sum;
    const food = (foods.data ?? []).find((f: FoodItem) => f.name === it.name);
    const portion = food?.portion || 100;
    return sum + (it.cost / portion) * it.quantity;
  }, 0);

  function toggle(key: string) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lista de compras"
        subtitle={`Baseada na sua dieta atual · estimativa ${totalCost > 0 ? `R$ ${totalCost.toFixed(2).replace(".", ",")}` : "—"}`}
      />

      <SectionCard title="Período" icon={<ShoppingCart className="h-4 w-4" />} accent="green">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Comprar para</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">dias</span>
        </div>
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
              <button
                key={item.key}
                type="button"
                onClick={() => toggle(item.key)}
                className="flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${
                    checked.has(item.key)
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border/60"
                  }`}
                >
                  {checked.has(item.key) ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span
                  className={`flex-1 text-sm ${checked.has(item.key) ? "text-muted-foreground line-through" : ""}`}
                >
                  {item.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {Math.round(item.quantity)} {item.unit}
                </span>
              </button>
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
