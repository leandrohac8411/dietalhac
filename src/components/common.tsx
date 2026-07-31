import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, TriangleAlert } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <Card
      className={cn(
        "gap-0 p-4 shadow-none",
        tone === "accent" && "border-accent/40 bg-accent/10",
        tone === "muted" && "bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
      </div>
      <div className="mt-2 font-display text-2xl font-bold leading-tight">{value}</div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-4 p-5", className)}>
      {title ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

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
    <div className="surface flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon ? (
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
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
    <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
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
    <div className={cn("rounded-xl border p-4 text-sm", tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn("text-muted-foreground", title && "mt-1")}>{children}</div>
    </div>
  );
}
