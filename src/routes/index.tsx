import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Apple, Dumbbell, LineChart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FormaFit — plano de dieta e treino personalizado" },
      {
        name: "description",
        content:
          "Cadastre seus dados, rotina e objetivo e receba estratégia nutricional, dieta, treino e acompanhamento semanal de evolução.",
      },
      { property: "og:title", content: "FormaFit — plano de dieta e treino personalizado" },
      {
        property: "og:description",
        content: "Cálculos corporais, estratégia nutricional, dieta, treino e check-in semanal.",
      },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    icon: LineChart,
    title: "Cálculos e metas reais",
    text: "IMC, metabolismo basal, gasto energético e uma meta calórica coerente com o seu prazo.",
  },
  {
    icon: Apple,
    title: "Dieta que você consegue seguir",
    text: "Refeições nos seus horários, com substituições equivalentes para cada alimento.",
  },
  {
    icon: Dumbbell,
    title: "Treino sob medida",
    text: "Divisão montada pelos dias disponíveis, local de treino, equipamentos e limitações.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança primeiro",
    text: "Triagem de saúde antes do plano e avisos claros quando a meta é agressiva demais.",
  },
];

function Home() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground">
            FF
          </div>
          <span className="font-display text-lg font-bold tracking-tight">FormaFit</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:pt-16">
        <p className="inline-flex items-center rounded-full border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Dieta • Treino • Evolução
        </p>
        <h1 className="mt-5 max-w-3xl text-balance-tight text-4xl font-extrabold leading-[1.05] sm:text-6xl">
          Seu plano de dieta e treino, montado a partir dos seus números.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Responda ao questionário inicial e receba estratégia nutricional, plano alimentar, treino
          e check-ins semanais que ajustam o plano conforme o seu resultado.
        </p>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/auth">
              Criar minha conta
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="surface p-6">
              <f.icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>

        <p className="mt-12 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          O FormaFit não substitui médico, nutricionista ou profissional de educação física. Todos
          os cálculos são estimativas. Dores e sintomas devem ser avaliados por um profissional.
        </p>
      </section>
    </div>
  );
}
