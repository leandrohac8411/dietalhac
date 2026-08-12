import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, LoadingBlock, PageHeader, SectionCard } from "@/components/common";
import { useCheckins, useDeleteCheckin, useSaveCheckin } from "@/lib/db";
import type { Checkin } from "@/lib/db";
import { formatNumber } from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/checkin")({
  component: Page_checkin,
});

const SCALE_FIELDS = [
  { key: "hunger", label: "Fome" },
  { key: "energy", label: "Energia" },
  { key: "sleep", label: "Sono" },
  { key: "stress", label: "Estresse" },
  { key: "performance", label: "Desempenho no treino" },
] as const;

const DIFFICULTY_OPTIONS = [
  { v: "facil", l: "Fácil" },
  { v: "moderada", l: "Moderada" },
  { v: "dificil", l: "Difícil" },
];

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function Page_checkin() {
  const checkins = useCheckins();
  const save = useSaveCheckin();
  const del = useDeleteCheckin();

  const [form, setForm] = useState({
    weight_kg: "",
    abdomen_cm: "",
    diet_adherence: "",
    workouts_done: "",
    hunger: 3,
    energy: 3,
    sleep: 3,
    stress: 3,
    performance: 3,
    diet_difficulty: "",
    notes: "",
  });

  if (checkins.isLoading) return <LoadingBlock rows={5} />;

  const rows = checkins.data ?? [];
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  function submit() {
    save.mutate(
      {
        weight_kg: num(form.weight_kg),
        abdomen_cm: num(form.abdomen_cm),
        diet_adherence: num(form.diet_adherence),
        workouts_done: num(form.workouts_done),
        hunger: form.hunger,
        energy: form.energy,
        sleep: form.sleep,
        stress: form.stress,
        performance: form.performance,
        diet_difficulty: form.diet_difficulty || null,
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Check-in registrado!");
          setForm({
            weight_kg: "",
            abdomen_cm: "",
            diet_adherence: "",
            workouts_done: "",
            hunger: 3,
            energy: 3,
            sleep: 3,
            stress: 3,
            performance: 3,
            diet_difficulty: "",
            notes: "",
          });
        },
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
        title="Check-in semanal"
        subtitle="Registre como foi a semana: peso, aderência, sensações e dificuldades."
      />

      <SectionCard
        title="Novo check-in"
        icon={<ClipboardCheck className="h-4 w-4" />}
        accent="green"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Peso (kg)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value }))}
            />
          </Field>
          <Field label="Abdômen (cm)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={form.abdomen_cm}
              onChange={(e) => setForm((f) => ({ ...f, abdomen_cm: e.target.value }))}
            />
          </Field>
          <Field label="Aderência à dieta (%)">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={form.diet_adherence}
              onChange={(e) => setForm((f) => ({ ...f, diet_adherence: e.target.value }))}
            />
          </Field>
          <Field label="Treinos concluídos">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.workouts_done}
              onChange={(e) => setForm((f) => ({ ...f, workouts_done: e.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-4 space-y-3">
          {SCALE_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <Label className="text-sm text-muted-foreground">{f.label}</Label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, [f.key]: n }))}
                    className={cn(
                      "h-8 w-8 rounded-full border text-xs font-medium transition-colors",
                      form[f.key] === n
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border/60 text-muted-foreground hover:border-accent/50",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Label className="text-xs text-muted-foreground">Dificuldade em seguir a dieta</Label>
          <div className="mt-1.5 flex gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setForm((f) => ({ ...f, diet_difficulty: opt.v }))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  form.diet_difficulty === opt.v
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border/60 text-muted-foreground hover:border-accent/50",
                )}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Observações</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Como foi a semana? O que mudou?"
          />
        </div>

        <Button className="mt-4" onClick={submit} disabled={save.isPending}>
          <Plus className="mr-1.5 h-4 w-4" />
          {save.isPending ? "Salvando..." : "Registrar check-in"}
        </Button>
      </SectionCard>

      <SectionCard title="Histórico" icon={<ClipboardCheck className="h-4 w-4" />} accent="blue">
        {rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="Nenhum check-in ainda"
            description="Registre seu primeiro check-in semanal acima."
          />
        ) : (
          <div className="divide-y">
            {rows.map((c: Checkin) => (
              <div key={c.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{fmtDate(c.checkin_date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.weight_kg !== null ? `Peso ${formatNumber(Number(c.weight_kg))}kg · ` : ""}
                    {c.diet_adherence !== null ? `Aderência ${c.diet_adherence}% · ` : ""}
                    {c.workouts_done !== null ? `${c.workouts_done} treinos` : ""}
                  </p>
                  {c.notes ? <p className="mt-1 text-xs text-muted-foreground">{c.notes}</p> : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground"
                  onClick={() => del.mutate(c.id)}
                  disabled={del.isPending}
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
