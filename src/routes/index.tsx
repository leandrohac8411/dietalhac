import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Dumbbell,
  HeartPulse,
  Play,
  Salad,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXO | Dieta e treino no seu ritmo" },
      {
        name: "description",
        content:
          "Plano personalizado de dieta, treino e acompanhamento criado a partir da sua rotina, objetivo e evolução.",
      },
      { property: "og:title", content: "NEXO | Dieta e treino no seu ritmo" },
      {
        property: "og:description",
        content: "Um plano possível de seguir, calculado para a vida que você realmente leva.",
      },
    ],
  }),
  component: Home,
});

const STATS = [
  { v: "3", l: "cenários de meta" },
  { v: "58", l: "alimentos com troca" },
  { v: "54", l: "exercícios em vídeo" },
];

const JOURNEY = [
  {
    icon: ClipboardCheck,
    title: "Responda",
    text: "Conte sua rotina, preferências, objetivo e condições de saúde.",
  },
  {
    icon: Target,
    title: "Receba",
    text: "Veja estratégia, dieta e treino organizados para seus horários.",
  },
  {
    icon: Activity,
    title: "Evolua",
    text: "Registre o dia e acompanhe os ajustes conforme seu resultado.",
  },
];

const PLAN_POINTS = [
  "Refeições distribuídas nos seus horários",
  "Substituições equivalentes para cada alimento",
  "Vídeo de demonstração em cada exercício",
  "Macros e calorias explicados com clareza",
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-white" aria-label="NEXO, início">
      <img src="/nexo-icon-256.png" alt="" className="h-11 w-11 rounded-xl" />
      <span className="font-display text-xl font-bold tracking-[-0.04em]">NEXO</span>
    </Link>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#9bea36]">
      {children}
    </p>
  );
}

function Home() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="marketing-page grain min-h-[100dvh] bg-[#111411] text-[#f4f7f1]">
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
        <nav className="mx-auto flex h-16 max-w-[1380px] items-center justify-between rounded-2xl border border-white/10 bg-[#111411]/80 px-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl sm:px-6">
          <Brand />
          <div className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="#metodo" className="transition-colors hover:text-white">
              Como funciona
            </a>
            <a href="#plano" className="transition-colors hover:text-white">
              Seu plano
            </a>
            <a href="#seguranca" className="transition-colors hover:text-white">
              Segurança
            </a>
          </div>
          <Button
            asChild
            className="h-10 rounded-full bg-[#9bea36] px-5 font-semibold text-[#111411] hover:bg-[#acf153]"
          >
            <Link to="/auth">Entrar</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="relative flex min-h-[100dvh] items-end overflow-hidden pt-24 lg:items-center">
          <img
            src="/nexo-hero.webp"
            alt="Atleta realizando exercício com cordas em um estúdio escuro"
            className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#101410_0%,rgba(16,20,16,.95)_32%,rgba(16,20,16,.2)_72%),linear-gradient(0deg,#101410_0%,transparent_42%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_35%,rgba(155,234,54,.12),transparent_30%)]" />

          <div className="relative mx-auto w-full max-w-[1380px] px-5 pb-14 sm:px-8 lg:pb-0">
            <div className="marketing-rise max-w-2xl">
              <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9bea36]">
                <HeartPulse className="h-4 w-4" /> Tudo conectado. Seu resultado também.
              </p>
              <h1 className="max-w-xl font-display text-5xl font-extrabold leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl">
                Plano certo.
                <br />
                Rotina possível.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-white/66 sm:text-lg">
                Dieta, treino e acompanhamento calculados para a vida que você realmente leva.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-[#9bea36] px-6 font-semibold text-[#111411] shadow-[0_10px_40px_-8px_rgba(155,234,54,.55)] hover:bg-[#acf153]"
                >
                  <Link to="/auth">
                    Começar agora <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/20 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#metodo">Ver como funciona</a>
                </Button>
              </div>

              <dl className="mt-12 flex max-w-md flex-wrap gap-x-10 gap-y-4">
                {STATS.map((s) => (
                  <div key={s.l}>
                    <dt className="font-display text-3xl font-extrabold tracking-[-0.04em] text-white">
                      {s.v}
                    </dt>
                    <dd className="text-xs text-white/50">{s.l}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div
            aria-hidden
            className="absolute bottom-[11%] left-[43%] hidden h-px w-[48%] -rotate-6 bg-gradient-to-r from-transparent via-[#9bea36]/70 to-transparent shadow-[0_0_18px_rgba(155,234,54,.45)] lg:block"
          />
          <a
            href="#metodo"
            aria-label="Rolar para o conteúdo"
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce text-white/40 transition-colors hover:text-white lg:block"
          >
            <ChevronDown className="h-6 w-6" />
          </a>
        </section>

        <section className="border-y border-white/8 bg-[#151915]">
          <div className="mx-auto grid max-w-[1380px] grid-cols-2 gap-px bg-white/8 md:grid-cols-4">
            {["Estratégia clara", "Dieta flexível", "Treino guiado", "Evolução contínua"].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center justify-center gap-2 bg-[#151915] px-4 py-5 text-center text-sm font-semibold text-white/72"
                >
                  <Check className="h-4 w-4 text-[#9bea36]" /> {item}
                </div>
              ),
            )}
          </div>
        </section>

        <section id="metodo" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-[1240px]">
            <div className="mx-auto max-w-2xl text-center" data-reveal>
              <div className="flex justify-center">
                <Eyebrow>Como funciona</Eyebrow>
              </div>
              <h2 className="font-display text-4xl font-bold leading-tight tracking-[-0.05em] sm:text-5xl">
                Você informa. O plano ganha forma.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/58">
                Sem promessas genéricas. Cada escolha nasce dos seus dados e da sua disponibilidade.
              </p>
            </div>

            <div className="relative mt-14 grid gap-5 md:grid-cols-3">
              <div
                aria-hidden
                className="absolute left-[16%] right-[16%] top-[2.7rem] hidden h-px bg-gradient-to-r from-transparent via-white/12 to-transparent md:block"
              />
              {JOURNEY.map((item, index) => (
                <article
                  key={item.title}
                  data-reveal
                  style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}
                  className="group relative overflow-hidden rounded-[1.5rem] border border-white/9 bg-[#191d19] p-7 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[#9bea36]/35"
                >
                  <span className="relative mb-12 grid h-11 w-11 place-items-center rounded-xl border border-[#9bea36]/25 bg-[#9bea36]/8 text-[#9bea36] transition-shadow duration-300 group-hover:shadow-[0_0_24px_-4px_rgba(155,234,54,.6)]">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <p className="font-display text-2xl font-bold tracking-[-0.04em]">{item.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/52">{item.text}</p>
                  <span className="absolute right-6 top-6 font-display text-2xl font-bold text-white/10">
                    0{index + 1}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="plano" className="px-5 pb-24 sm:px-8 lg:pb-32">
          <div
            data-reveal
            className="mx-auto grid max-w-[1240px] overflow-hidden rounded-[2rem] border border-white/9 bg-[#191d19] lg:grid-cols-[1.05fr_.95fr]"
          >
            <div className="p-7 sm:p-10 lg:p-14">
              <Eyebrow>Seu plano</Eyebrow>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#9bea36] text-[#111411]">
                <Salad className="h-6 w-6" />
              </span>
              <h2 className="mt-8 max-w-lg font-display text-4xl font-bold leading-tight tracking-[-0.05em] sm:text-5xl">
                Comida de verdade, no seu horário.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-white/56">
                Seu cardápio respeita preferências, restrições e o tempo disponível para cada
                refeição.
              </p>
              <div className="mt-10 space-y-4">
                {PLAN_POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-3 text-sm text-white/76">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#9bea36]/25 text-[#9bea36]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[440px] overflow-hidden lg:min-h-full">
              <img
                src="/nexo-auth.webp"
                alt="Atleta segurando um halter após o treino"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#191d19] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#191d19]/35 lg:to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-[#111411]/72 p-5 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9bea36]/12 text-[#9bea36]">
                    <Play className="h-4 w-4 fill-current" />
                  </span>
                  <div>
                    <p className="font-semibold">Treino com demonstração</p>
                    <p className="text-xs text-white/48">Vídeo de cada exercício, no seu nível.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="seguranca" className="px-5 py-20 sm:px-8">
          <div
            data-reveal
            className="mx-auto flex max-w-[1120px] flex-col gap-8 rounded-[2rem] border border-white/9 bg-[#191d19] p-8 sm:p-10 md:flex-row md:items-center md:justify-between md:gap-10"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-[#9bea36]/25 bg-[#9bea36]/8 text-[#9bea36]">
                <ShieldCheck className="h-8 w-8" />
              </span>
              <div>
                <Eyebrow>Segurança</Eyebrow>
                <h2 className="font-display text-3xl font-bold tracking-[-0.04em]">
                  Segurança antes da intensidade.
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/52">
                  A triagem de saúde sinaliza condições relevantes e os cálculos respeitam limites
                  conservadores.
                </p>
              </div>
            </div>
            <Button
              asChild
              className="w-fit shrink-0 rounded-full bg-[#9bea36] px-6 font-semibold text-[#111411] hover:bg-[#acf153]"
            >
              <Link to="/auth">
                Criar meu plano <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:py-32">
          <div
            data-reveal
            className="relative mx-auto grid max-w-[1240px] gap-10 overflow-hidden rounded-[2rem] bg-[#9bea36] px-7 py-12 text-[#111411] sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#111411_1.1px,transparent_1.1px)] [background-size:16px_16px]"
            />
            <div className="relative">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#111411] text-[#9bea36]">
                <TrendingUp className="h-5 w-5" />
              </span>
              <h2 className="mt-8 max-w-xl font-display text-4xl font-extrabold leading-tight tracking-[-0.055em] sm:text-6xl">
                Comece com o plano que cabe na sua rotina.
              </h2>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-[#111411] px-6 text-white hover:bg-[#242924]"
                >
                  <Link to="/auth">
                    Começar agora <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <span className="text-sm font-medium text-[#111411]/70">
                  Grátis para começar. Leva menos de 5 minutos.
                </span>
              </div>
            </div>

            <div className="relative rounded-2xl border border-[#111411]/12 bg-[#111411]/6 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#111411]/60">
                O que você recebe
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Estratégia calculada em minutos",
                  "Dieta com trocas equivalentes",
                  "Treino com vídeo em cada exercício",
                ].map((point) => (
                  <div key={point} className="flex items-center gap-3 text-sm font-medium">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#111411] text-[#9bea36]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {point}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-4 text-xs leading-relaxed text-white/38">
              O NEXO fornece estimativas e não substitui médico, nutricionista ou profissional de
              educação física.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3 text-sm text-white/55">
            <a href="#metodo" className="transition-colors hover:text-white">
              Como funciona
            </a>
            <a href="#plano" className="transition-colors hover:text-white">
              Seu plano
            </a>
            <a href="#seguranca" className="transition-colors hover:text-white">
              Segurança
            </a>
            <Link to="/auth" className="transition-colors hover:text-white">
              Entrar
            </Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-[1240px] border-t border-white/8 pt-6 text-xs text-white/30">
          © {new Date().getFullYear()} NEXO
        </div>
      </footer>
    </div>
  );
}
