import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff, ClipboardList, KeyRound, LogOut, Save, Send, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSignOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LoadingBlock, PageHeader, SectionCard } from "@/components/common";
import {
  useActiveGoal,
  useIsAdmin,
  usePreferences,
  useProfile,
  useScreening,
  useUpdateProfile,
} from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { GOAL_LABELS, formatNumber } from "@/lib/fitness";
import { SPLIT_LABELS } from "@/lib/plan-generator";
import {
  useDisablePush,
  useEnablePush,
  useNotificationPreferences,
  usePushStatus,
  useSendTestPush,
  useUpdateNotificationPreferences,
} from "@/lib/push-notifications";

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

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-snug">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border/60 py-3 first:border-t-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
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

function NotificationSettings() {
  const isAdmin = useIsAdmin();
  const status = usePushStatus();
  const preferences = useNotificationPreferences();
  const enable = useEnablePush();
  const disable = useDisablePush();
  const update = useUpdateNotificationPreferences();
  const test = useSendTestPush();

  const pending = enable.isPending || disable.isPending || update.isPending;
  const change = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, {
      onSuccess: () => toast.success("Preferências atualizadas"),
      onError: (error) =>
        toast.error("Não foi possível atualizar", { description: getErrorMessage(error) }),
    });

  if (status.isLoading) return <LoadingBlock rows={2} />;
  const current = status.data;

  if (current?.capability === "unsupported") {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        Este navegador não oferece suporte a notificações Web Push.
      </div>
    );
  }

  if (current?.capability === "needs-install") {
    return (
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="text-sm font-semibold">Instale o NEXO na Tela de Início</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No iPhone, abra o menu de compartilhamento, escolha “Adicionar à Tela de Início” e depois
          acesse o NEXO pelo ícone instalado. Esta exigência é do iOS.
        </p>
      </div>
    );
  }

  if (!current?.subscribed) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="text-sm font-semibold">Receba lembretes mesmo com o NEXO fechado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A ativação é opcional. O navegador solicitará sua autorização uma única vez.
        </p>
        {current?.permission === "denied" && (
          <p className="mt-3 text-xs font-medium text-destructive">
            As notificações estão bloqueadas nos ajustes deste aparelho.
          </p>
        )}
        <Button
          className="mt-4"
          disabled={enable.isPending || current?.permission === "denied"}
          onClick={() =>
            enable.mutate(undefined, {
              onSuccess: () => toast.success("Notificações ativadas neste aparelho"),
              onError: (error) =>
                toast.error("Não foi possível ativar", { description: getErrorMessage(error) }),
            })
          }
        >
          <Bell className="mr-1.5 h-4 w-4" />
          {enable.isPending ? "Ativando..." : "Ativar notificações"}
        </Button>
      </div>
    );
  }

  const preference = preferences.data;
  const options = [
    {
      key: "meal_enabled" as const,
      title: "Refeições",
      description: `${preference?.meal_lead_minutes ?? 15} min antes do horário planejado`,
    },
    {
      key: "workout_enabled" as const,
      title: "Treino",
      description: `${preference?.workout_lead_minutes ?? 30} min antes do treino`,
    },
    {
      key: "water_enabled" as const,
      title: "Água",
      description: "Progresso verificado a cada 30 min; alerta somente quando estiver atrasado",
    },
    {
      key: "checkin_enabled" as const,
      title: "Check-in semanal",
      description: "Aviso no dia programado para acompanhar sua evolução",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <div>
          <p className="text-sm font-semibold text-accent">Ativas neste aparelho</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Sem cache offline e sem interferir na navegação.
          </p>
        </div>
        <Bell className="h-5 w-5 shrink-0 text-accent" />
      </div>

      <div className="divide-y divide-border/60 rounded-xl border border-border/60 px-4">
        {options.map((option) => (
          <div key={option.key} className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-sm font-medium">{option.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
            </div>
            <Switch
              checked={preference?.[option.key] ?? true}
              disabled={pending || preferences.isLoading}
              onCheckedChange={(checked) => change({ [option.key]: checked })}
              aria-label={`Notificações de ${option.title}`}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {isAdmin.data && (
          <Button
            variant="outline"
            size="sm"
            disabled={test.isPending}
            onClick={() =>
              test.mutate(undefined, {
                onSuccess: () => toast.success("Notificação de teste enviada"),
                onError: (error) =>
                  toast.error("Não foi possível testar", { description: getErrorMessage(error) }),
              })
            }
          >
            <Send className="mr-1.5 h-4 w-4" />
            {test.isPending ? "Enviando..." : "Enviar teste"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={disable.isPending}
          onClick={() =>
            disable.mutate(undefined, {
              onSuccess: () => toast.success("Notificações desativadas neste aparelho"),
              onError: (error) =>
                toast.error("Não foi possível desativar", { description: getErrorMessage(error) }),
            })
          }
        >
          <BellOff className="mr-1.5 h-4 w-4" /> Desativar neste aparelho
        </Button>
      </div>
    </div>
  );
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
            description: getErrorMessage(e),
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
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="Objetivo" value={g ? (GOAL_LABELS[g.goal_type] ?? g.goal_type) : "—"} />
          <Tile
            label="Peso atual / meta"
            value={`${formatNumber(profile.data?.current_weight_kg ?? null)} kg${g?.target_weight_kg ? ` → ${formatNumber(g.target_weight_kg)} kg` : ""}`}
          />
          <Tile
            label="Treino"
            value={`${pr?.training_days ?? "—"}x/sem · ${PLACE_LABELS[pr?.training_place ?? ""] ?? "—"}`}
          />
          <Tile
            label="Estilo de treino"
            value={SPLIT_LABELS[pr?.workout_split_preference ?? "auto"] ?? "Automático"}
          />
          <Tile
            label="Refeições por dia"
            value={pr?.meals_per_day ? String(pr.meals_per_day) : "—"}
          />
          <Tile
            label="Duração do treino"
            value={pr?.training_duration_min ? `${pr.training_duration_min} min` : "—"}
          />
        </dl>
        <dl className="mt-1">
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
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p className="mt-1 break-all text-sm font-medium">{email.data ?? "—"}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/reset-password">Redefinir senha</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sair
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Notificações"
        description="Escolha os lembretes que fazem sentido para sua rotina."
        icon={<Bell className="h-4 w-4" />}
        accent="green"
      >
        <NotificationSettings />
      </SectionCard>
    </div>
  );
}
