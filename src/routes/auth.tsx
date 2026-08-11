import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      { title: "Entrar ou criar conta | NEXO" },
      {
        name: "description",
        content: "Acesse sua conta NEXO ou cadastre-se para montar seu plano personalizado.",
      },
      { property: "og:title", content: "Entrar ou criar conta | NEXO" },
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

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-white" aria-label="NEXO, início">
      <img src="/nexo-icon-256.png" alt="" className="h-14 w-14 rounded-2xl" />
      <span className="font-display text-2xl font-bold tracking-[-0.045em]">NEXO</span>
    </Link>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="auth-premium min-h-[100dvh] bg-[#0f120f] text-[#f4f7f1] lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <section className="relative h-[42dvh] min-h-[310px] overflow-hidden lg:sticky lg:top-0 lg:h-[100dvh] lg:min-h-0">
        <img
          src="/nexo-auth.webp"
          alt="Atleta segurando um halter após o treino"
          className="absolute inset-0 h-full w-full object-cover object-[center_18%] lg:object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[linear-gradient(0deg,#0f120f_0%,rgba(15,18,15,.08)_48%),linear-gradient(90deg,transparent_55%,rgba(15,18,15,.42))] lg:bg-[linear-gradient(90deg,transparent_58%,#0f120f_100%),linear-gradient(0deg,rgba(15,18,15,.7),transparent_45%)]" />
        <div className="absolute left-5 top-5 sm:left-8 sm:top-8 lg:left-10 lg:top-10">
          <Brand />
        </div>
        <div className="absolute bottom-10 left-10 hidden max-w-md lg:block">
          <p className="font-display text-4xl font-bold leading-tight tracking-[-0.05em]">
            Seu objetivo muda.
            <br />
            Seu plano acompanha.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/58">
            Entre para acompanhar a rotina que foi calculada para você.
          </p>
        </div>
      </section>

      <main className="relative -mt-10 min-h-[62dvh] rounded-t-[2rem] border-t border-white/10 bg-[#0f120f] px-5 pb-10 pt-8 shadow-[0_-24px_60px_rgba(0,0,0,.28)] sm:px-8 lg:mt-0 lg:flex lg:min-h-[100dvh] lg:items-center lg:rounded-none lg:border-0 lg:px-14 lg:py-12 lg:shadow-none xl:px-20">
        <div className="mx-auto w-full max-w-[460px]">
          <Link
            to="/"
            className="mb-8 hidden w-fit items-center gap-2 text-sm text-white/50 transition-colors hover:text-white lg:flex"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>

          {recovering ? (
            <RecoveryForm
              busy={busy}
              onSubmit={handleRecover}
              onBack={() => setRecovering(false)}
            />
          ) : (
            <>
              <div className="mb-7">
                <h1 className="font-display text-3xl font-bold tracking-[-0.05em] sm:text-4xl">
                  {mode === "login" ? "Bem-vindo de volta" : "Comece seu plano"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/48">
                  {mode === "login"
                    ? "Entre para acompanhar seu plano de hoje."
                    : "Preencha seus dados básicos. A estratégia vem depois."}
                </p>
              </div>

              <Tabs
                value={mode}
                onValueChange={(value) => {
                  setMode(value);
                  setShowPassword(false);
                }}
              >
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl border border-white/9 bg-[#191d19] p-1">
                  <TabsTrigger
                    value="login"
                    className="rounded-lg text-white/50 data-[state=active]:bg-[#2a302a] data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-lg text-white/50 data-[state=active]:bg-[#2a302a] data-[state=active]:text-white data-[state=active]:shadow-none"
                  >
                    Criar conta
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-7">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <DarkField label="E-mail" htmlFor="email" icon={<Mail className="h-4 w-4" />}>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="voce@exemplo.com"
                        required
                        maxLength={255}
                        className="auth-input pl-11"
                      />
                    </DarkField>
                    <PasswordField
                      id="password"
                      visible={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setRecovering(true)}
                        className="text-sm font-medium text-[#9bea36] hover:text-[#b1f266]"
                      >
                        Esqueci minha senha
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl bg-[#9bea36] font-semibold text-[#111411] hover:bg-[#acf153]"
                      disabled={busy}
                    >
                      {busy ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-7">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <DarkField label="Nome completo" htmlFor="full_name">
                      <Input
                        id="full_name"
                        name="full_name"
                        autoComplete="name"
                        required
                        maxLength={120}
                        className="auth-input"
                      />
                    </DarkField>
                    <DarkField label="E-mail" htmlFor="s-email" icon={<Mail className="h-4 w-4" />}>
                      <Input
                        id="s-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={255}
                        className="auth-input pl-11"
                      />
                    </DarkField>
                    <PasswordField
                      id="s-password"
                      visible={showPassword}
                      onToggle={() => setShowPassword((value) => !value)}
                      signup
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <DarkField label="Nascimento" htmlFor="birth_date">
                        <Input
                          id="birth_date"
                          name="birth_date"
                          type="date"
                          required
                          className="auth-input [color-scheme:dark]"
                        />
                      </DarkField>
                      <div className="space-y-2">
                        <Label htmlFor="biological_sex" className="text-sm text-white/72">
                          Sexo biológico
                        </Label>
                        <Select name="biological_sex" defaultValue="masculino">
                          <SelectTrigger id="biological_sex" className="auth-input w-full">
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
                      <DarkField label="Altura (cm)" htmlFor="height_cm">
                        <Input
                          id="height_cm"
                          name="height_cm"
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="100"
                          max="250"
                          required
                          className="auth-input"
                        />
                      </DarkField>
                      <DarkField label="Peso atual (kg)" htmlFor="current_weight_kg">
                        <Input
                          id="current_weight_kg"
                          name="current_weight_kg"
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="30"
                          max="400"
                          required
                          className="auth-input"
                        />
                      </DarkField>
                    </div>

                    <Button
                      type="submit"
                      className="h-12 w-full rounded-xl bg-[#9bea36] font-semibold text-[#111411] hover:bg-[#acf153]"
                      disabled={busy}
                    >
                      {busy ? "Criando..." : "Criar conta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}

          <p className="mt-8 text-center text-[11px] leading-relaxed text-white/32">
            Ao continuar, você reconhece que o NEXO fornece estimativas e não substitui
            acompanhamento profissional.
          </p>
        </div>
      </main>
    </div>
  );
}

function DarkField({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm text-white/72">
        {label}
      </Label>
      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/34">
            {icon}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  visible,
  onToggle,
  signup = false,
}: {
  id: string;
  visible: boolean;
  onToggle: () => void;
  signup?: boolean;
}) {
  return (
    <DarkField label="Senha" htmlFor={id} icon={<LockKeyhole className="h-4 w-4" />}>
      <Input
        id={id}
        name="password"
        type={visible ? "text" : "password"}
        autoComplete={signup ? "new-password" : "current-password"}
        required
        minLength={signup ? 8 : undefined}
        maxLength={72}
        className="auth-input px-11"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/38 transition-colors hover:text-white"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </DarkField>
  );
}

function RecoveryForm({
  busy,
  onSubmit,
  onBack,
}: {
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-2 text-sm text-white/52 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.05em]">Recuperar senha</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/48">
          Enviaremos um link seguro para você definir uma nova senha.
        </p>
      </div>
      <DarkField label="E-mail" htmlFor="rec-email" icon={<Mail className="h-4 w-4" />}>
        <Input
          id="rec-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={255}
          className="auth-input pl-11"
        />
      </DarkField>
      <Button
        type="submit"
        className="h-12 w-full rounded-xl bg-[#9bea36] font-semibold text-[#111411] hover:bg-[#acf153]"
        disabled={busy}
      >
        {busy ? "Enviando..." : "Enviar link"}
      </Button>
    </form>
  );
}
