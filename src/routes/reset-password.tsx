import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Definir nova senha — FormaFit" },
      { name: "description", content: "Defina uma nova senha para acessar sua conta FormaFit." },
      { property: "og:title", content: "Definir nova senha — FormaFit" },
      { property: "og:description", content: "Recuperação de acesso da sua conta FormaFit." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password.length < 8) {
      toast.error("A senha precisa ter ao menos 8 caracteres");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível alterar a senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada");
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-5">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-bold">Definir nova senha</h1>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" required minLength={8} maxLength={72} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            Salvar nova senha
          </Button>
        </form>
      </Card>
    </div>
  );
}
