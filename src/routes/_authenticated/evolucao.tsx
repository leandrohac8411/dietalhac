import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LineChart as LineChartIcon, Percent, Plus, Ruler, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, LoadingBlock, PageHeader, SectionCard, StatCard } from "@/components/common";
import {
  useAssessments,
  useDeleteAssessment,
  useDeleteMeasurement,
  useDeleteWeightLog,
  useMeasurements,
  useSaveAssessment,
  useSaveMeasurement,
  useWeightLogs,
  useLogWeight,
} from "@/lib/db";
import type { Assessment, Measurement, WeightLog } from "@/lib/db";
import { formatNumber } from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/evolucao")({
  component: Page_evolucao,
});

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function Page_evolucao() {
  const weights = useWeightLogs();
  const assessments = useAssessments();
  const measurements = useMeasurements();

  if (weights.isLoading || assessments.isLoading || measurements.isLoading) {
    return <LoadingBlock rows={5} />;
  }

  const weightRows = weights.data ?? [];
  const assessmentRows = [...(assessments.data ?? [])].reverse();
  const measurementRows = [...(measurements.data ?? [])].reverse();

  const weightData = weightRows.map((w) => ({
    label: fmtDate(w.log_date),
    weight: Number(w.weight_kg),
  }));
  const lastWeight = weightRows[weightRows.length - 1] ?? null;
  const weightDelta =
    weightRows.length >= 2
      ? Number(weightRows[weightRows.length - 1]!.weight_kg) - Number(weightRows[0]!.weight_kg)
      : null;
  const lastAssessment = assessmentRows[0] ?? null;
  const lastMeasurement = measurementRows[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minha evolução"
        subtitle="Acompanhe peso, avaliação corporal e medidas ao longo do tempo."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Peso atual"
          value={lastWeight ? `${formatNumber(Number(lastWeight.weight_kg))} kg` : "—"}
          hint={
            weightDelta !== null
              ? `${weightDelta > 0 ? "+" : ""}${formatNumber(weightDelta)} kg no período`
              : "Sem histórico"
          }
          icon={<Scale className="h-4 w-4" />}
          accent="green"
        />
        <StatCard
          label="Gordura corporal"
          value={
            lastAssessment?.body_fat_pct
              ? `${formatNumber(Number(lastAssessment.body_fat_pct))}%`
              : "—"
          }
          hint={lastAssessment ? fmtDate(lastAssessment.assessed_at) : "Nenhuma avaliação"}
          icon={<Percent className="h-4 w-4" />}
          accent="amber"
        />
        <StatCard
          label="Massa magra"
          value={
            lastAssessment?.lean_mass_kg
              ? `${formatNumber(Number(lastAssessment.lean_mass_kg))} kg`
              : "—"
          }
          hint={lastAssessment ? fmtDate(lastAssessment.assessed_at) : "Nenhuma avaliação"}
          icon={<LineChartIcon className="h-4 w-4" />}
          accent="blue"
        />
        <StatCard
          label="Cintura"
          value={
            lastMeasurement?.waist_cm ? `${formatNumber(Number(lastMeasurement.waist_cm))} cm` : "—"
          }
          hint={lastMeasurement ? fmtDate(lastMeasurement.measured_at) : "Nenhuma medida"}
          icon={<Ruler className="h-4 w-4" />}
          accent="coral"
        />
      </div>

      <Tabs defaultValue="peso">
        <TabsList>
          <TabsTrigger value="peso">Peso</TabsTrigger>
          <TabsTrigger value="avaliacao">Avaliação corporal</TabsTrigger>
          <TabsTrigger value="medidas">Medidas</TabsTrigger>
        </TabsList>

        <TabsContent value="peso" className="space-y-4">
          <WeightSection weightData={weightData} rows={weightRows} />
        </TabsContent>

        <TabsContent value="avaliacao" className="space-y-4">
          <AssessmentSection rows={assessmentRows} />
        </TabsContent>

        <TabsContent value="medidas" className="space-y-4">
          <MeasurementSection rows={measurementRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WeightSection({
  weightData,
  rows,
}: {
  weightData: { label: string; weight: number }[];
  rows: WeightLog[];
}) {
  const logWeight = useLogWeight();
  const del = useDeleteWeightLog();
  const [value, setValue] = useState("");

  function add() {
    const kg = Number(value.replace(",", "."));
    if (!kg || kg <= 0) return;
    logWeight.mutate(kg, {
      onSuccess: () => {
        toast.success("Peso registrado!");
        setValue("");
      },
      onError: (e) =>
        toast.error("Não foi possível registrar", {
          description: e instanceof Error ? e.message : "Tente novamente.",
        }),
    });
  }

  return (
    <>
      <SectionCard title="Registrar peso" icon={<Scale className="h-4 w-4" />} accent="green">
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="Peso (kg)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="max-w-[10rem]"
          />
          <Button onClick={add} disabled={logWeight.isPending || !value}>
            <Plus className="mr-1.5 h-4 w-4" /> Registrar
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Gráfico" icon={<LineChartIcon className="h-4 w-4" />} accent="blue">
        {weightData.length >= 2 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="wgFull" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#wgFull)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Registre pelo menos 2 pesos para ver o gráfico.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Histórico" icon={<Scale className="h-4 w-4" />} accent="green">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <div className="divide-y">
            {[...rows].reverse().map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground">{fmtDate(r.log_date)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {formatNumber(Number(r.weight_kg))} kg
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => del.mutate(r.id)}
                    disabled={del.isPending}
                    aria-label="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

function AssessmentSection({ rows }: { rows: Assessment[] }) {
  const save = useSaveAssessment();
  const del = useDeleteAssessment();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    weight_kg: "",
    body_fat_pct: "",
    muscle_mass_kg: "",
    lean_mass_kg: "",
    fat_mass_kg: "",
    visceral_fat: "",
    body_water_pct: "",
    notes: "",
  });

  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  function submit() {
    save.mutate(
      {
        weight_kg: num(form.weight_kg),
        body_fat_pct: num(form.body_fat_pct),
        muscle_mass_kg: num(form.muscle_mass_kg),
        lean_mass_kg: num(form.lean_mass_kg),
        fat_mass_kg: num(form.fat_mass_kg),
        visceral_fat: num(form.visceral_fat),
        body_water_pct: num(form.body_water_pct),
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          toast.success("Avaliação registrada!");
          setOpen(false);
          setForm({
            weight_kg: "",
            body_fat_pct: "",
            muscle_mass_kg: "",
            lean_mass_kg: "",
            fat_mass_kg: "",
            visceral_fat: "",
            body_water_pct: "",
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
    <SectionCard
      title="Avaliações corporais"
      description="Bioimpedância, adipômetro ou o que sua balança/avaliador usar."
      icon={<Percent className="h-4 w-4" />}
      accent="amber"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Nova avaliação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova avaliação corporal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Peso (kg)"
                value={form.weight_kg}
                onChange={(v) => setForm((f) => ({ ...f, weight_kg: v }))}
              />
              <FormField
                label="Gordura (%)"
                value={form.body_fat_pct}
                onChange={(v) => setForm((f) => ({ ...f, body_fat_pct: v }))}
              />
              <FormField
                label="Massa muscular (kg)"
                value={form.muscle_mass_kg}
                onChange={(v) => setForm((f) => ({ ...f, muscle_mass_kg: v }))}
              />
              <FormField
                label="Massa magra (kg)"
                value={form.lean_mass_kg}
                onChange={(v) => setForm((f) => ({ ...f, lean_mass_kg: v }))}
              />
              <FormField
                label="Massa gorda (kg)"
                value={form.fat_mass_kg}
                onChange={(v) => setForm((f) => ({ ...f, fat_mass_kg: v }))}
              />
              <FormField
                label="Gordura visceral"
                value={form.visceral_fat}
                onChange={(v) => setForm((f) => ({ ...f, visceral_fat: v }))}
              />
              <FormField
                label="Água corporal (%)"
                value={form.body_water_pct}
                onChange={(v) => setForm((f) => ({ ...f, body_water_pct: v }))}
              />
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar avaliação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<Percent className="h-5 w-5" />}
          title="Nenhuma avaliação ainda"
          description="Registre sua primeira avaliação corporal para acompanhar a evolução."
        />
      ) : (
        <div className="divide-y">
          {rows.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{fmtDate(a.assessed_at)}</p>
                <p className="text-xs text-muted-foreground">
                  {a.body_fat_pct !== null
                    ? `Gordura ${formatNumber(Number(a.body_fat_pct))}% · `
                    : ""}
                  {a.lean_mass_kg !== null
                    ? `Magra ${formatNumber(Number(a.lean_mass_kg))}kg · `
                    : ""}
                  {a.muscle_mass_kg !== null
                    ? `Muscular ${formatNumber(Number(a.muscle_mass_kg))}kg`
                    : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={() => del.mutate(a.id)}
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
  );
}

function MeasurementSection({ rows }: { rows: Measurement[] }) {
  const save = useSaveMeasurement();
  const del = useDeleteMeasurement();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    chest_cm: "",
    waist_cm: "",
    abdomen_cm: "",
    hip_cm: "",
    arm_right_cm: "",
    arm_left_cm: "",
    thigh_right_cm: "",
    thigh_left_cm: "",
    calf_right_cm: "",
    calf_left_cm: "",
  });

  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  function submit() {
    save.mutate(
      {
        chest_cm: num(form.chest_cm),
        waist_cm: num(form.waist_cm),
        abdomen_cm: num(form.abdomen_cm),
        hip_cm: num(form.hip_cm),
        arm_right_cm: num(form.arm_right_cm),
        arm_left_cm: num(form.arm_left_cm),
        thigh_right_cm: num(form.thigh_right_cm),
        thigh_left_cm: num(form.thigh_left_cm),
        calf_right_cm: num(form.calf_right_cm),
        calf_left_cm: num(form.calf_left_cm),
      },
      {
        onSuccess: () => {
          toast.success("Medidas registradas!");
          setOpen(false);
          setForm({
            chest_cm: "",
            waist_cm: "",
            abdomen_cm: "",
            hip_cm: "",
            arm_right_cm: "",
            arm_left_cm: "",
            thigh_right_cm: "",
            thigh_left_cm: "",
            calf_right_cm: "",
            calf_left_cm: "",
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
    <SectionCard
      title="Medidas corporais"
      description="Circunferências em centímetros."
      icon={<Ruler className="h-4 w-4" />}
      accent="coral"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Nova medida
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novas medidas</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Peito (cm)"
                value={form.chest_cm}
                onChange={(v) => setForm((f) => ({ ...f, chest_cm: v }))}
              />
              <FormField
                label="Cintura (cm)"
                value={form.waist_cm}
                onChange={(v) => setForm((f) => ({ ...f, waist_cm: v }))}
              />
              <FormField
                label="Abdômen (cm)"
                value={form.abdomen_cm}
                onChange={(v) => setForm((f) => ({ ...f, abdomen_cm: v }))}
              />
              <FormField
                label="Quadril (cm)"
                value={form.hip_cm}
                onChange={(v) => setForm((f) => ({ ...f, hip_cm: v }))}
              />
              <FormField
                label="Braço dir. (cm)"
                value={form.arm_right_cm}
                onChange={(v) => setForm((f) => ({ ...f, arm_right_cm: v }))}
              />
              <FormField
                label="Braço esq. (cm)"
                value={form.arm_left_cm}
                onChange={(v) => setForm((f) => ({ ...f, arm_left_cm: v }))}
              />
              <FormField
                label="Coxa dir. (cm)"
                value={form.thigh_right_cm}
                onChange={(v) => setForm((f) => ({ ...f, thigh_right_cm: v }))}
              />
              <FormField
                label="Coxa esq. (cm)"
                value={form.thigh_left_cm}
                onChange={(v) => setForm((f) => ({ ...f, thigh_left_cm: v }))}
              />
              <FormField
                label="Panturrilha dir. (cm)"
                value={form.calf_right_cm}
                onChange={(v) => setForm((f) => ({ ...f, calf_right_cm: v }))}
              />
              <FormField
                label="Panturrilha esq. (cm)"
                value={form.calf_left_cm}
                onChange={(v) => setForm((f) => ({ ...f, calf_left_cm: v }))}
              />
            </div>
            <DialogFooter>
              <Button onClick={submit} disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar medidas"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<Ruler className="h-5 w-5" />}
          title="Nenhuma medida ainda"
          description="Registre suas primeiras medidas para acompanhar a evolução."
        />
      ) : (
        <div className="divide-y">
          {rows.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{fmtDate(m.measured_at)}</p>
                <p className="text-xs text-muted-foreground">
                  {m.waist_cm !== null ? `Cintura ${formatNumber(Number(m.waist_cm))}cm · ` : ""}
                  {m.abdomen_cm !== null
                    ? `Abdômen ${formatNumber(Number(m.abdomen_cm))}cm · `
                    : ""}
                  {m.hip_cm !== null ? `Quadril ${formatNumber(Number(m.hip_cm))}cm` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={() => del.mutate(m.id)}
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
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
