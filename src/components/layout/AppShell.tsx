import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Apple,
  ClipboardCheck,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/hooks/useAuth";
import { useIsAdmin } from "@/lib/db";

const NAV = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/meu-dia", label: "Meu dia", icon: Sun },
  { to: "/estrategia", label: "Minha estratégia", icon: Sparkles },
  { to: "/dieta", label: "Minha dieta", icon: Apple },
  { to: "/lista-compras", label: "Lista de compras", icon: ListChecks },
  { to: "/treino", label: "Meu treino", icon: Dumbbell },
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

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground">
        FF
      </div>
      {!compact ? (
        <span className="font-display text-lg font-bold tracking-tight">FormaFit</span>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  const { data: isAdmin } = useIsAdmin();

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Menu lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <nav className="mt-8 flex-1 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/admin"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span className="truncate">Administração</span>
            </Link>
          ) : null}
        </nav>
        <button
          onClick={() => void signOut()}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </aside>

      {/* Topbar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-14 lg:pl-72">
        {children}
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
