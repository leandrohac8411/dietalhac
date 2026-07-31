import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
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
        content: "Acesse sua conta FormaFit ou cadastre-se para montar seu plano de dieta e treino.",
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

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-sm font-bold text-accent-foreground">
            FF
          </div>
          <span className="font-display text-lg font-bold tracking-tight">FormaFit</span>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <Card className="p-6">
          {recovering ? (
            <form onSubmit={handleRecover} className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">Recuperar senha</h1>
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
                    <Input id="password" name="password" type="password" required maxLength={72} />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Entrar
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
                      <Input id="height_cm" name="height_cm" type="number" step="0.1" required />
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
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {!recovering ? (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" className="w-full" onClick={() => void handleGoogle()}>
                Continuar com Google
              </Button>
            </>
          ) : null}
        </Card>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          O FormaFit gera estimativas e não substitui médico, nutricionista ou profissional de
          educação física.
        </p>
      </div>
    </div>
  );
}
