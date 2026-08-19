import { useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Clock3,
  Droplets,
  Dumbbell,
  Flame,
  Medal,
  Search,
  ShieldAlert,
  Trophy,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingBlock, SectionCard } from "@/components/common";
import { useAdminEngagement } from "@/lib/db";
import type { AdminEngagementDay, AdminEngagementEvent, AdminEngagementUser } from "@/lib/db";

export function AdminEngagementPanel() {
  const engagement = useAdminEngagement();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminEngagementUser | null>(null);

  if (engagement.isLoading) return <LoadingBlock rows={5} />;
  if (engagement.isError) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Não foi possível carregar o acompanhamento"
        description="Confirme se a migração do painel de engajamento foi aplicada no Supabase."
      />
    );
  }

  const allUsers = engagement.data?.users ?? [];
  const rows = allUsers.filter((user) =>
    (user.full_name || "").toLowerCase().includes(search.trim().toLowerCase()),
  );
  const activeToday = allUsers.filter((user) => isToday(user.last_activity_at)).length;
  const averageAdherence = allUsers.length
    ? Math.round(allUsers.reduce((sum, user) => sum + user.adherence_percent, 0) / allUsers.length)
    : 0;
  const todayPoints = allUsers.reduce((sum, user) => sum + Number(user.today_points || 0), 0);
  const needsAttention = allUsers.filter(
    (user) =>
      user.onboarding_completed &&
      (user.adherence_percent < 50 || isInactive(user.last_activity_at)),
  ).length;

  const kpis = [
    {
      label: "Ativos hoje",
      value: activeToday,
      hint: `de ${allUsers.length} pessoas`,
      icon: Activity,
      tone: "text-cyan-400 bg-cyan-400/10",
    },
    {
      label: "Adesão média",
      value: `${averageAdherence}%`,
      hint: `últimos ${engagement.data?.days ?? 30} dias`,
      icon: Trophy,
      tone: "text-accent bg-accent/10",
    },
    {
      label: "Pontos hoje",
      value: todayPoints.toFixed(1),
      hint: "somados no ranking",
      icon: Medal,
      tone: "text-amber-400 bg-amber-400/10",
    },
    {
      label: "Pedem atenção",
      value: needsAttention,
      hint: "baixa adesão ou inativos",
      icon: Clock3,
      tone: "text-red-400 bg-red-400/10",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-border/80 bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </div>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <SectionCard
        title="Ranking de consistência"
        description="Até 10 pontos por dia, proporcionais ao que cada pessoa cumpriu."
        icon={<Trophy className="h-4 w-4" />}
        accent="green"
        action={
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar pessoa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-9 pl-9"
            />
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="Nenhuma pessoa encontrada"
            description="Ajuste a busca ou aguarde novos registros de uso."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((user, index) => (
              <EngagementRow
                key={user.user_id}
                user={user}
                rank={allUsers.findIndex((item) => item.user_id === user.user_id) + 1 || index + 1}
                onOpen={() => setSelected(user)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          {selected ? <UserEngagementDetail user={selected} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EngagementRow({
  user,
  rank,
  onOpen,
}: {
  user: AdminEngagementUser;
  rank: number;
  onOpen: () => void;
}) {
  const today = user.last_7_days.find((day) => day.date === localDateKey());
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-transparent bg-muted/25 p-3 text-left transition-colors hover:border-border hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-7 shrink-0 text-center font-display text-lg font-bold text-muted-foreground">
          {rank <= 3 ? <Medal className={`mx-auto h-5 w-5 ${rankTone(rank)}`} /> : rank}
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-accent/20 bg-accent/10 text-xs font-bold text-accent">
          {getInitials(user.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate font-semibold">{user.full_name || "Sem nome"}</p>
            {!user.onboarding_completed ? <Badge variant="outline">Cadastro pendente</Badge> : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {lastActivityLabel(user.last_activity_at)}
          </p>
          <HabitBar day={today} className="mt-2 max-w-xl" />
        </div>
        <div className="hidden min-w-24 text-right sm:block">
          <p className="font-display text-xl font-bold">
            {Number(user.today_points).toFixed(1)}
            <span className="text-xs font-medium text-muted-foreground">/10</span>
          </p>
          <p className="text-[11px] text-muted-foreground">hoje</p>
        </div>
        <div className="hidden min-w-24 text-right lg:block">
          <p className="text-sm font-semibold">{user.adherence_percent}%</p>
          <p className="text-[11px] text-muted-foreground">adesão</p>
        </div>
        <div className="hidden min-w-20 items-center justify-end gap-1.5 text-amber-400 xl:flex">
          <Flame className="h-4 w-4" />
          <span className="text-sm font-semibold">{user.streak_days} dias</span>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 sm:hidden">
        <span className="text-xs text-muted-foreground">Hoje</span>
        <span className="text-sm font-semibold">
          {Number(user.today_points).toFixed(1)}/10 · {user.adherence_percent}% adesão
        </span>
      </div>
    </button>
  );
}

function HabitBar({ day, className = "" }: { day?: AdminEngagementDay; className?: string }) {
  const meals = day?.meals_planned ? Math.min(day.meals_completed / day.meals_planned, 1) : 0;
  const workout = day?.workout_expected ? (day.workout_completed ? 1 : 0) : null;
  const water = day?.water_target ? Math.min(day.water_ml / day.water_target, 1) : 0;
  return (
    <div
      className={`flex h-1.5 overflow-hidden rounded-full bg-border/60 ${className}`}
      aria-label="Cumprimento de hoje"
    >
      <BarPart value={meals} className="flex-[7]" fill="bg-accent" />
      {workout !== null ? (
        <BarPart value={workout} className="ml-0.5 flex-[2]" fill="bg-cyan-400" />
      ) : null}
      <BarPart value={water} className="ml-0.5 flex-1" fill="bg-amber-400" />
    </div>
  );
}

function BarPart({ value, className, fill }: { value: number; className: string; fill: string }) {
  return (
    <div className={`relative bg-white/5 ${className}`}>
      <span className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${value * 100}%` }} />
    </div>
  );
}

function UserEngagementDetail({ user }: { user: AdminEngagementUser }) {
  const todayKey = localDateKey();
  const availableDays = [...user.last_7_days].reverse();
  const initialDate = availableDays.some((day) => day.date === todayKey)
    ? todayKey
    : (availableDays[0]?.date ?? todayKey);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const selectedDay = availableDays.find((day) => day.date === selectedDate);
  const selectedEvents = user.recent_events.filter(
    (event) => eventLocalDateKey(event.at) === selectedDate,
  );
  const isSelectedToday = selectedDate === todayKey;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-3 pr-8">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-accent/20 bg-accent/10 font-display font-bold text-accent">
            {getInitials(user.full_name)}
          </div>
          <div className="min-w-0">
            <DialogTitle className="truncate text-xl">{user.full_name || "Sem nome"}</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {lastActivityLabel(user.last_activity_at)}
            </p>
          </div>
        </div>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <DetailMetric
          label={isSelectedToday ? "Hoje" : shortDate(selectedDate)}
          value={`${Number(selectedDay?.points ?? 0).toFixed(1)}/10`}
        />
        <DetailMetric label="30 dias" value={`${Number(user.period_points).toFixed(1)} pts`} />
        <DetailMetric label="Adesão" value={`${user.adherence_percent}%`} />
        <DetailMetric label="Sequência" value={`${user.streak_days} dias`} />
      </div>
      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Últimos 7 dias</h3>
            <p className="text-xs text-muted-foreground">
              Refeições, treino e água que formaram a pontuação.
            </p>
          </div>
          <div className="hidden items-center gap-3 text-[10px] text-muted-foreground sm:flex">
            <Legend color="bg-accent" label="Refeições" />
            <Legend color="bg-cyan-400" label="Treino" />
            <Legend color="bg-amber-400" label="Água" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {availableDays.map((day) => (
            <button
              type="button"
              key={day.date}
              onClick={() => setSelectedDate(day.date)}
              aria-pressed={selectedDate === day.date}
              className={`rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedDate === day.date
                  ? "border-accent/50 bg-accent/10"
                  : "border-border/60 bg-background/35 hover:border-border hover:bg-muted/35"
              }`}
            >
              <div className="flex items-center justify-between sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {day.date === todayKey ? "Hoje" : shortDate(day.date)}
                </p>
                <p className="font-display text-lg font-bold sm:mt-1">
                  {Number(day.points).toFixed(1)}
                </p>
              </div>
              <HabitBar day={day} className="mt-2" />
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
            <div>
              <h3 className="font-semibold">
                {isSelectedToday ? "Atividade de hoje" : "Atividade do dia"}
              </h3>
              <p className="text-xs text-muted-foreground">{longDate(selectedDate)}</p>
            </div>
          </div>
          {isSelectedToday ? (
            <Badge className="border-accent/25 bg-accent/10 text-accent hover:bg-accent/10">
              Hoje
            </Badge>
          ) : null}
        </div>
        {selectedEvents.length ? (
          <div className="space-y-1">
            {selectedEvents.map((event, index) => (
              <ActivityEvent key={`${event.at}-${event.type}-${index}`} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            Nenhuma atividade registrada no período.
          </div>
        )}
      </div>
    </>
  );
}

function ActivityEvent({ event }: { event: AdminEngagementEvent }) {
  const Icon =
    event.type === "meal"
      ? UtensilsCrossed
      : event.type === "workout"
        ? Dumbbell
        : event.type === "water"
          ? Droplets
          : CalendarDays;
  const tone =
    event.type === "meal"
      ? "text-accent bg-accent/10"
      : event.type === "workout"
        ? "text-cyan-400 bg-cyan-400/10"
        : event.type === "water"
          ? "text-blue-400 bg-blue-400/10"
          : "text-amber-400 bg-amber-400/10";
  return (
    <div className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-muted/30">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{event.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
      </div>
      <time className="shrink-0 whitespace-pre-line text-right text-[11px] text-muted-foreground">
        {eventDate(event.at)}
      </time>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
function localDateKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
function eventLocalDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(value),
  );
}
function isToday(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
        new Date(value),
      ) === localDateKey()
    : false;
}
function isInactive(value: string | null) {
  return !value || Date.now() - new Date(value).getTime() > 3 * 86_400_000;
}
function lastActivityLabel(value: string | null) {
  if (!value) return "Ainda não utilizou o plano";
  const date = new Date(value);
  return isToday(value)
    ? `Ativo hoje às ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : `Última atividade em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
}
function eventDate(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}\n${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
function shortDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
  });
}
function longDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}
function getInitials(name: string) {
  const parts = (name || "?").trim().split(/\s+/);
  return `${parts[0]?.[0] ?? "?"}${parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""}`.toUpperCase();
}
function rankTone(rank: number) {
  return rank === 1 ? "text-amber-300" : rank === 2 ? "text-slate-300" : "text-orange-400";
}
