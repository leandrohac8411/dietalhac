import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, KeyRound, LogOut, Save, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSignOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock, PageHeader, SectionCard } from "@/components/common";
import {
  useActiveGoal,
  usePreferences,
  useProfile,
  useScreening,
  useUpdateProfile,
} from "@/lib/db";
import { GOAL_LABELS, formatNumber } from "@/lib/fitness";
import { SPLIT_LABELS } from "@/lib/plan-generator";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Page_perfil,
});

const SEX_OPTIONS = [
  { v: "masculino", l: "Masculino" },
  { v: "feminino", l: "Feminino" },
];

const PLACE_LABELS: Record<string, string> = {
  gym: "Academia",
  home: "Em casa",
  outdoor: "Ao ar livre",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function useAuthEmail() {
  return useQuery({
    queryKey: ["authEmail"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.email ?? null;
    },
  });
}

function Page_perfil() {
  const profile = useProfile();
  const goal = useActiveGoal();
  const prefs = usePreferences();
  const screening = useScreening();
  const email = useAuthEmail();
  const updateProfile = useUpdateProfile();
  const signOut = useSignOut();

  const [form, setForm] = useState({
    full_name: "",
    birth_date: "",
    biological_sex: "",
    height_cm: "",
  });
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seeded || !profile.data) return;
    setForm({
      full_name: profile.data.full_name ?? "",
      birth_date: profile.data.birth_date ?? "",
      biological_sex: profile.data.biological_sex ?? "",
      height_cm: profile.data.height_cm ? String(profile.data.height_cm) : "",
    });
    setSeeded(true);
  }, [seeded, profile.data]);

  if (profile.isLoading || goal.isLoading || prefs.isLoading || screening.isLoading) {
    return <LoadingBlock rows={5} />;
  }

  const g = goal.data;
  const pr = prefs.data;
  const sc = screening.data;

  const riskFlags = [
    sc?.diabetes && "Diabetes",
    sc?.hypertension && "Hipertensão",
    sc?.heart_condition && "Condição cardíaca",
    sc?.kidney_disease && "Doença renal",
    sc?.liver_disease && "Doença hepática",
    sc?.eating_disorder && "Transtorno alimentar",
    sc?.pregnant && "Gestante",
    sc?.breastfeeding && "Amamentando",
  ].filter(Boolean) as string[];

  function save() {
    updateProfile.mutate(
      {
        full_name: form.full_name,
        birth_date: form.birth_date || null,
        biological_sex: form.biological_sex || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
      },
      {
        onSuccess: () => toast.success("Perfil atualizado!"),
        onError: (e) =>
          toast.error("Não foi possível salvar", {
            description: e instanceof Error ? e.message : "Tente novamente.",
          }),
      },
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Perfil" subtitle="Seus dados pessoais e um resumo do seu plano." />

      <SectionCard title="Dados pessoais" icon={<User className="h-4 w-4" />} accent="green">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome completo</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
            <Input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sexo biológico</Label>
            <div className="flex gap-2">
              {SEX_OPTIONS.map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, biological_sex: opt.v }))}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.biological_sex === opt.v
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border/60 text-muted-foreground hover:border-accent/50"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Altura (cm)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={form.height_cm}
              onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={save} disabled={updateProfile.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </SectionCard>

      <SectionCard
        title="Objetivo, rotina e treino"
        description="Para mudar dias de treino, refeições por dia, restrições ou saúde, edite o questionário completo."
        icon={<ClipboardList className="h-4 w-4" />}
        accent="blue"
        action={
          <Button asChild size="sm" variant="secondary">
            <Link to="/onboarding">Editar questionário</Link>
          </Button>
        }
      >
        <dl className="divide-y">
          <Row label="Objetivo" value={g ? (GOAL_LABELS[g.goal_type] ?? g.goal_type) : "—"} />
          <Row
            label="Peso atual / meta"
            value={`${formatNumber(profile.data?.current_weight_kg ?? null)} kg${g?.target_weight_kg ? ` → ${formatNumber(g.target_weight_kg)} kg` : ""}`}
          />
          <Row
            label="Treino"
            value={`${pr?.training_days ?? "—"}x/semana · ${PLACE_LABELS[pr?.training_place ?? ""] ?? "—"} · ${pr?.training_duration_min ?? "—"} min`}
          />
          <Row
            label="Estilo de treino"
            value={SPLIT_LABELS[pr?.workout_split_preference ?? "auto"] ?? "Automático"}
          />
          <Row
            label="Refeições por dia"
            value={pr?.meals_per_day ? String(pr.meals_per_day) : "—"}
          />
          <Row
            label="Restrições alimentares"
            value={
              pr?.dietary_restrictions && pr.dietary_restrictions.length > 0
                ? pr.dietary_restrictions.join(", ")
                : "Nenhuma"
            }
          />
          <Row
            label="Triagem de saúde"
            value={riskFlags.length > 0 ? riskFlags.join(", ") : "Sem sinalizações"}
          />
        </dl>
      </SectionCard>

      <SectionCard title="Conta" icon={<KeyRound className="h-4 w-4" />} accent="amber">
        <dl className="divide-y">
          <Row label="E-mail" value={email.data ?? "—"} />
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/reset-password">Redefinir senha</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sair
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
