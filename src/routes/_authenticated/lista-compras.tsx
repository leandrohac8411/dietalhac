import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ShoppingCart, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingBlock, PageHeader, SectionCard } from "@/components/common";
import { useActiveGoal, useFoods, usePreferences } from "@/lib/db";
import type { FoodItem } from "@/lib/db";
import { generateMealPlan } from "@/lib/plan-generator";
import type { FoodRow } from "@/lib/plan-generator";

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
  const goal = useActiveGoal();
  const prefs = usePreferences();
  const foods = useFoods();
  const [days, setDays] = useState("7");
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const dayCount = Math.min(14, Math.max(1, Number(days) || 7));
  const g = goal.data;

  // Simula `dayCount` dias DIFERENTES de dieta (não repete o mesmo dia várias
  // vezes) para a lista de compras refletir a variação real de uma semana,
  // usando o mesmo motor de geração da dieta (que já varia entre chamadas).
  const items = useMemo(() => {
    if (!g?.target_calories || !foods.data || foods.data.length === 0) return [];
    const catalog = foods.data as FoodRow[];
    const targets = {
      calories: g.target_calories,
      protein: g.protein_g ?? 0,
      carbs: g.carbs_g ?? 0,
      fat: g.fat_g ?? 0,
      fiber: g.fiber_g ?? 0,
    };
    const foodsById = new Map((foods.data as FoodItem[]).map((f) => [f.id, f]));
    const grouped = new Map<string, ListItem>();

    for (let day = 0; day < dayCount; day += 1) {
      const plan = generateMealPlan({
        foods: catalog,
        mealsPerDay: prefs.data?.meals_per_day ?? 5,
        mealTimes: prefs.data?.meal_times ?? null,
        targets,
        restrictions: prefs.data?.dietary_restrictions ?? [],
        dislikes: prefs.data?.disliked_foods ?? null,
        allergies: prefs.data?.allergies ?? null,
      });
      for (const meal of plan) {
        for (const item of meal.items) {
          const key = item.food_item_id ?? item.food_name;
          const food = item.food_item_id ? foodsById.get(item.food_item_id) : undefined;
          const existing = grouped.get(key);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            grouped.set(key, {
              key,
              name: item.food_name,
              quantity: item.quantity,
              unit: item.unit,
              category: food?.category ?? "outros",
              cost: food?.estimated_cost ? Number(food.estimated_cost) : null,
            });
          }
        }
      }
    }

    return [...grouped.values()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );
  }, [g, foods.data, prefs.data, dayCount]);

  if (goal.isLoading || prefs.isLoading || foods.isLoading) return <LoadingBlock rows={5} />;

  if (!g?.target_calories) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lista de compras" subtitle="Gerada a partir da sua estratégia." />
        <EmptyState
          icon={<Target className="h-5 w-5" />}
          title="Defina sua estratégia primeiro"
          description="Precisamos da sua meta calórica para simular uma semana de compras."
          action={
            <Button asChild>
              <Link to="/estrategia">Ir para a estratégia</Link>
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
        subtitle={`Simulação de ${dayCount} dias variados · estimativa ${totalCost > 0 ? `R$ ${totalCost.toFixed(2).replace(".", ",")}` : "—"}`}
      />

      <SectionCard title="Período" icon={<ShoppingCart className="h-4 w-4" />} accent="green">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Simular</span>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">dias diferentes de dieta</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Cada dia é gerado de novo (não é o mesmo cardápio repetido), então a lista reflete a
          variação real de uma semana.
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
