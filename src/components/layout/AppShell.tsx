import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Apple,
  ClipboardCheck,
  Compass,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Settings,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/useAuth";
import { useIsAdmin, useProfile } from "@/lib/db";

const NAV_MAIN = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/meu-dia", label: "Meu dia", icon: Sun },
] as const;

const NAV_PLAN = [
  { to: "/estrategia", label: "Minha estratégia", icon: Compass },
  { to: "/dieta", label: "Minha dieta", icon: Apple },
  { to: "/lista-compras", label: "Lista de compras", icon: ListChecks },
  { to: "/treino", label: "Meu treino", icon: Dumbbell },
] as const;

const NAV_TRACK = [
  { to: "/checkin", label: "Check-in semanal", icon: ClipboardCheck },
  { to: "/evolucao", label: "Minha evolução", icon: LineChart },
  { to: "/perfil", label: "Perfil", icon: Settings },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/dieta", label: "Dieta", icon: Apple },
  { to: "/treino", label: "Treino", icon: Dumbbell },
  { to: "/evolucao", label: "Evolução", icon: LineChart },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/nexo-icon-256.png"
        alt=""
        className="h-12 w-12 shrink-0 rounded-xl shadow-[0_4px_16px_oklch(0.82_0.19_128/0.35)]"
      />
      <span className="font-display text-xl font-bold tracking-tight">NEXO</span>
    </div>
  );
}

function NavLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary/15 text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {active ? (
        <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-sidebar-primary" />
      ) : null}
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-sidebar-primary")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
        {label}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  const { data: isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "Atleta";
  const initials =
    (profile?.full_name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "FF";

  return (
    <div className="app-bg min-h-screen w-full">
      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        <div className="px-2">
          <Logo />
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto pr-1">
          <div className="space-y-1">
            {NAV_MAIN.map((item) => (
              <NavLink key={item.to} {...item} active={pathname === item.to} />
            ))}
          </div>
          <NavGroup label="Meu plano">
            {NAV_PLAN.map((item) => (
              <NavLink key={item.to} {...item} active={pathname === item.to} />
            ))}
          </NavGroup>
          <NavGroup label="Acompanhamento">
            {NAV_TRACK.map((item) => (
              <NavLink key={item.to} {...item} active={pathname === item.to} />
            ))}
            {isAdmin ? (
              <NavLink
                to="/admin"
                label="Administração"
                icon={ShieldCheck}
                active={pathname === "/admin"}
              />
            ) : null}
          </NavGroup>
        </nav>

        <div className="mt-4 space-y-2 border-t border-sidebar-border pt-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-accent text-xs font-bold text-accent-foreground">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{firstName}</p>
              <p className="truncate text-xs text-sidebar-foreground/50">Plano ativo</p>
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="w-full px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pl-[18.5rem]">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>

      {/* Barra inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-accent text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
