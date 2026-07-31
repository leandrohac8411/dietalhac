import { createFileRoute } from "@tanstack/react-router";
import { Hourglass } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common";

export const Route = createFileRoute("/_authenticated/dieta")({
  component: Page_dieta,
});

function Page_dieta() {
  return (
    <div className="space-y-6">
      <PageHeader title="Minha dieta" subtitle="Esta etapa está sendo construída na próxima entrega." />
      <EmptyState
        icon={<Hourglass className="h-5 w-5" />}
        title="Em construção"
        description="A estrutura, o banco de dados e os cálculos já estão prontos. Esta tela entra na sequência da implementação."
      />
    </div>
  );
}
