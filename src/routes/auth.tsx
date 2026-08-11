import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Apple, Dumbbell, ShieldCheck, Target } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — FormaFit" },
      {
        name: "description",
        content:
          "Acesse sua conta FormaFit ou cadastre-se para montar seu plano de dieta e treino.",
      },
      { property: "og:title", content: "Entrar ou criar conta — FormaFit" },
      { property: "og:description", content: "Acesse seu plano de dieta e treino personalizado." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72),
  birth_date: z.string().min(1, "Informe a data de nascimento"),
  biological_sex: z.enum(["masculino", "feminino"]),
  height_cm: z.coerce.number().min(100, "Altura inválida").max(250),
  current_weight_kg: z.coerce.number().min(30, "Peso inválido").max(400),
});

const FEATURES = [
  {
    icon: Target,
    title: "Cálculos e metas reais",
    desc: "IMC, metabolismo, gasto energético e uma meta calórica coerente com o seu prazo.",
  },
  {
    icon: Apple,
    title: "Dieta que você consegue seguir",
    desc: "Refeições nos seus horários, com substituições equivalentes para cada alimento.",
  },
  {
    icon: Dumbbell,
    title: "Treino sob medida",
    desc: "Divisão montada pelos seus dias, local de treino e equipamentos disponíveis.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança primeiro",
    desc: "Triagem de saúde antes do plano e avisos claros quando a meta é agressiva demais.",
  },
];

function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={className}>
      <div className="grid h-10 w-10 place-items-center rounded-xl gradient-accent font-display text-sm font-bold text-accent-foreground shadow-[0_4px_16px_oklch(0.82_0.19_128/0.4)]">
        FF
      </div>
      <span className="font-display text-xl font-bold tracking-tight">FormaFit</span>
    </Link>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: "Verifique e-mail e senha." });
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: form.get("full_name"),
      email: form.get("email"),
      password: form.get("password"),
      birth_date: form.get("birth_date"),
      biological_sex: form.get("biological_sex"),
      height_cm: form.get("height_cm"),
      current_weight_kg: form.get("current_weight_kg"),
    });
    if (!parsed.success) {
      toast.error("Revise os dados", { description: parsed.error.issues[0]?.message });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          birth_date: parsed.data.birth_date,
          biological_sex: parsed.data.biological_sex,
          height_cm: String(parsed.data.height_cm),
          current_weight_kg: String(parsed.data.current_weight_kg),
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível cadastrar", { description: error.message });
      return;
    }
    if (!data.session) {
      toast.success("Confirme seu e-mail", {
        description: "Enviamos um link de confirmação para concluir o cadastro.",
      });
      setMode("login");
      return;
    }
    void navigate({ to: "/onboarding", replace: true });
  }

  async function handleRecover(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail", { description: error.message });
      return;
    }
    toast.success("E-mail enviado", { description: "Verifique sua caixa de entrada." });
    setRecovering(false);
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca (desktop) */}
      <aside className="relative hidden overflow-hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[oklch(0.82_0.19_128/0.25)] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[oklch(0.66_0.13_205/0.18)] blur-3xl"
        />

        <Logo className="relative flex items-center gap-2.5" />

        <div className="relative max-w-md">
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
            Seu plano de dieta e treino, montado a partir dos seus números.
          </h2>
          <p className="mt-4 text-sidebar-foreground/70">
            Estratégia nutricional, cardápio nos seus horários, treino sob medida e acompanhamento —
            tudo em um só lugar.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary/15 text-sidebar-primary">
                  <f.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-sm text-sidebar-foreground/60">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-foreground/50">
          Estimativas geradas por fórmulas populacionais. Não substitui médico, nutricionista ou
          profissional de educação física.
        </p>
      </aside>

      {/* Painel do formulário */}
      <main className="app-bg flex min-h-screen flex-col items-center justify-center px-5 py-10 sm:px-8">
        <Logo className="mb-8 flex items-center gap-2 lg:hidden" />

        <div className="w-full max-w-md">
          <Card className="p-6 shadow-lifted sm:p-8">
            {recovering ? (
              <form onSubmit={handleRecover} className="space-y-4">
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    Recuperar senha
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enviaremos um link para você definir uma nova senha.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-email">E-mail</Label>
                  <Input id="rec-email" name="email" type="email" required maxLength={255} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  Enviar link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setRecovering(false)}
                >
                  Voltar
                </Button>
              </form>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-2xl font-bold tracking-tight">
                    {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode === "login"
                      ? "Entre para ver seu plano de hoje."
                      : "Alguns dados para começarmos sua estratégia."}
                  </p>
                </div>

                <Tabs value={mode} onValueChange={setMode}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Criar conta</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="mt-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" name="email" type="email" required maxLength={255} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          required
                          maxLength={72}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={busy}>
                        {busy ? "Entrando..." : "Entrar"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setRecovering(true)}
                        className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
                      >
                        Esqueci minha senha
                      </button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-6">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="full_name">Nome completo</Label>
                        <Input id="full_name" name="full_name" required maxLength={120} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="s-email">E-mail</Label>
                        <Input id="s-email" name="email" type="email" required maxLength={255} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="s-password">Senha</Label>
                        <Input
                          id="s-password"
                          name="password"
                          type="password"
                          required
                          minLength={8}
                          maxLength={72}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="birth_date">Nascimento</Label>
                          <Input id="birth_date" name="birth_date" type="date" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="biological_sex">Sexo biológico</Label>
                          <Select name="biological_sex" defaultValue="masculino">
                            <SelectTrigger id="biological_sex">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="height_cm">Altura (cm)</Label>
                          <Input
                            id="height_cm"
                            name="height_cm"
                            type="number"
                            step="0.1"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="current_weight_kg">Peso atual (kg)</Label>
                          <Input
                            id="current_weight_kg"
                            name="current_weight_kg"
                            type="number"
                            step="0.1"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={busy}>
                        {busy ? "Criando..." : "Criar conta"}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </Card>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground lg:hidden">
            O FormaFit gera estimativas e não substitui médico, nutricionista ou profissional de
            educação física.
          </p>
        </div>
      </main>
    </div>
  );
}
