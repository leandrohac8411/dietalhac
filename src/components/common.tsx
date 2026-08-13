import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, TriangleAlert } from "lucide-react";

/* ---------- Sistema de acento colorido ---------- */

export type Accent = "green" | "blue" | "amber" | "coral" | "violet" | "slate";

const ACCENT_CHIP: Record<Accent, string> = {
  green: "bg-chart-1/15 text-chart-1",
  blue: "bg-chart-3/15 text-chart-3",
  amber: "bg-chart-4/25 text-[oklch(0.48_0.12_75)]",
  coral: "bg-chart-5/15 text-chart-5",
  violet: "bg-[oklch(0.62_0.19_300/0.15)] text-[oklch(0.52_0.19_300)]",
  slate: "bg-muted text-foreground/70",
};

const ACCENT_TEXT: Record<Accent, string> = {
  green: "text-chart-1",
  blue: "text-chart-3",
  amber: "text-chart-4",
  coral: "text-chart-5",
  violet: "text-[oklch(0.55_0.19_300)]",
  slate: "text-muted-foreground",
};

/* ---------- Cabeçalho de página ---------- */

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/* ---------- Cartão de métrica ---------- */

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "slate",
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: Accent;
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <Card
      className={cn(
        "elevate gap-0 overflow-hidden p-5 shadow-card",
        tone === "accent" && "border-accent/40 bg-accent/10",
        tone === "muted" && "bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <span
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
              ACCENT_CHIP[accent],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 font-display text-3xl font-bold leading-none tracking-tight">
        {value}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

/* ---------- Cartão de seção ---------- */

export function SectionCard({
  title,
  description,
  action,
  icon,
  accent = "green",
  children,
  className,
}: {
  title?: string;
  description?: string | undefined;
  action?: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-4 p-5 shadow-card sm:p-6", className)}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {icon ? (
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                  ACCENT_CHIP[accent],
                )}
              >
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="text-base font-semibold">{title}</h2>
              {description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

/* ---------- Anel de progresso ---------- */

export function Ring({
  value,
  max,
  label,
  sub,
  accent = "green",
  size = 92,
  stroke = 9,
}: {
  value: number;
  max: number;
  label: ReactNode;
  sub?: string;
  accent?: Accent;
  size?: number;
  stroke?: number;
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            className="fill-none stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={c}
            strokeDashoffset={off}
            className={cn("fill-none transition-all duration-500", ACCENT_TEXT[accent])}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center px-2 text-center">
          <div>
            <div className="font-display text-base font-bold leading-none">{label}</div>
            {sub ? (
              <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {sub}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Estados auxiliares ---------- */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent-foreground">
          <span className="text-accent">{icon}</span>
        </div>
      ) : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="surface border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Não foi possível carregar</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {message ?? "Tente novamente em alguns instantes."}
          </p>
          {onRetry ? (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-semibold text-foreground underline underline-offset-4"
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Disclaimer({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-border/60 bg-muted/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {children ??
          "Os valores são estimativas geradas por fórmulas populacionais e não substituem avaliação de médico, nutricionista ou profissional de educação física. Não realize exercícios que provoquem dor."}
      </p>
    </div>
  );
}

export function AlertNote({
  tone = "warning",
  title,
  children,
}: {
  tone?: "warning" | "danger" | "success" | "info";
  title?: string;
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    warning: "border-warning/40 bg-warning/10",
    danger: "border-destructive/40 bg-destructive/10",
    success: "border-success/40 bg-success/10",
    info: "border-border bg-muted/60",
  };
  return (
    <div className={cn("rounded-2xl border p-4 text-sm", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn("text-muted-foreground", title && "mt-1")}>{children}</div>
    </div>
  );
}
