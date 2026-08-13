import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Dumbbell, Plus, ShieldAlert, UtensilsCrossed, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, LoadingBlock, PageHeader, SectionCard, StatCard } from "@/components/common";
import {
  useAdminExercises,
  useAdminFoods,
  useAdminUsers,
  useCreateExercise,
  useCreateFoodItem,
  useIsAdmin,
  useUpdateExercise,
  useUpdateFoodItem,
} from "@/lib/db";
import type { Exercise, FoodItem, Profile } from "@/lib/db";
import { MUSCLE_GROUP_LABELS } from "@/lib/plan-generator";
import { formatNumber } from "@/lib/fitness";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Page_admin,
});

const FOOD_CATEGORIES = [
  "proteina",
  "peixe",
  "ovo",
  "leguminosa",
  "carboidrato",
  "vegetal",
  "fruta",
  "laticinio",
  "gordura",
  "suplemento",
  "outros",
];

function Page_admin() {
  const isAdmin = useIsAdmin();
  const foods = useAdminFoods();
  const exercises = useAdminExercises();
  const users = useAdminUsers();

  if (isAdmin.isLoading) return <LoadingBlock rows={5} />;

  if (!isAdmin.data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin" subtitle="Painel de administração do NEXO." />
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" />}
          title="Acesso restrito"
          description="Esta área é exclusiva para administradores."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" subtitle="Painel de administração do NEXO." />

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Alimentos"
          value={String(foods.data?.length ?? 0)}
          icon={<UtensilsCrossed className="h-4 w-4" />}
          accent="green"
        />
        <StatCard
          label="Exercícios"
          value={String(exercises.data?.length ?? 0)}
          icon={<Dumbbell className="h-4 w-4" />}
          accent="blue"
        />
        <StatCard
          label="Usuários"
          value={String(users.data?.length ?? 0)}
          icon={<Users className="h-4 w-4" />}
          accent="amber"
        />
      </div>

      <Tabs defaultValue="alimentos">
        <TabsList>
          <TabsTrigger value="alimentos">Alimentos</TabsTrigger>
          <TabsTrigger value="exercicios">Exercícios</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="alimentos" className="space-y-4">
          <FoodsPanel />
        </TabsContent>
        <TabsContent value="exercicios" className="space-y-4">
          <ExercisesPanel />
        </TabsContent>
        <TabsContent value="usuarios" className="space-y-4">
          <UsersPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersPanel() {
  const users = useAdminUsers();
  const [search, setSearch] = useState("");

  if (users.isLoading) return <LoadingBlock rows={3} />;

  const rows = (users.data ?? []).filter((u: Profile) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SectionCard
      title="Pessoas cadastradas"
      description="Somente leitura — dados vêm do perfil de cada usuário."
      icon={<Users className="h-4 w-4" />}
      accent="amber"
      action={
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(ev) => setSearch(ev.target.value)}
          className="h-9 w-48"
        />
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Nenhum usuário encontrado"
          description="Ajuste a busca ou aguarde novos cadastros."
        />
      ) : (
        <div className="divide-y">
          {rows.map((u: Profile) => (
            <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.full_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">
                  {u.biological_sex ?? "—"} ·{" "}
                  {u.current_weight_kg ? `${formatNumber(Number(u.current_weight_kg))} kg` : "—"} ·
                  cadastrado em{" "}
                  {new Date(u.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Badge variant={u.onboarding_completed ? "default" : "outline"}>
                {u.onboarding_completed ? "Onboarding completo" : "Onboarding pendente"}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

type ExerciseForm = {
  name: string;
  muscle_group: string;
  equipment: string;
  place: string;
  difficulty: string;
  media_url: string;
  instructions: string;
  alternative_name: string;
};

const EXERCISE_INITIAL: ExerciseForm = {
  name: "",
  muscle_group: "peito",
  equipment: "",
  place: "gym",
  difficulty: "iniciante",
  media_url: "",
  instructions: "",
  alternative_name: "",
};

function ExercisesPanel() {
  const exercises = useAdminExercises();
  const create = useCreateExercise();
  const update = useUpdateExercise();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseForm>(EXERCISE_INITIAL);

  if (exercises.isLoading) return <LoadingBlock rows={3} />;

  const rows = (exercises.data ?? []).filter((e: Exercise) =>
    e.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openNew() {
    setEditingId(null);
    setForm(EXERCISE_INITIAL);
    setOpen(true);
  }

  function openEdit(e: Exercise) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      muscle_group: e.muscle_group,
      equipment: e.equipment ?? "",
      place: e.place ?? "gym",
      difficulty: e.difficulty ?? "iniciante",
      media_url: e.media_url ?? "",
      instructions: e.instructions ?? "",
      alternative_name: e.alternative_name ?? "",
    });
    setOpen(true);
  }

  function submit() {
    if (!form.name.trim()) return;
    const patch = {
      name: form.name,
      muscle_group: form.muscle_group,
      equipment: form.equipment || null,
      place: form.place,
      difficulty: form.difficulty,
      media_url: form.media_url || null,
      instructions: form.instructions || null,
      alternative_name: form.alternative_name || null,
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(editingId ? "Exercício atualizado!" : "Exercício criado!");
        setOpen(false);
      },
      onError: (e: unknown) =>
        toast.error("Não foi possível salvar", {
          description: e instanceof Error ? e.message : "Tente novamente.",
        }),
    };
    if (editingId) update.mutate({ id: editingId, patch }, callbacks);
    else create.mutate(patch, callbacks);
  }

  function toggleActive(e: Exercise) {
    update.mutate({ id: e.id, patch: { is_active: !e.is_active } });
  }

  return (
    <SectionCard
      title="Exercícios"
      icon={<Dumbbell className="h-4 w-4" />}
      accent="blue"
      action={
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            className="h-9 w-40"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar exercício" : "Novo exercício"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Grupo muscular</Label>
                  <Select
                    value={form.muscle_group}
                    onValueChange={(v) => setForm((f) => ({ ...f, muscle_group: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MUSCLE_GROUP_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Equipamento</Label>
                  <Input
                    value={form.equipment}
                    onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Local</Label>
                  <Select
                    value={form.place}
                    onValueChange={(v) => setForm((f) => ({ ...f, place: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gym">Academia</SelectItem>
                      <SelectItem value="home">Em casa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Dificuldade</Label>
                  <Select
                    value={form.difficulty}
                    onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">URL da mídia (gif/vídeo)</Label>
                  <Input
                    value={form.media_url}
                    onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome alternativo</Label>
                  <Input
                    value={form.alternative_name}
                    onChange={(e) => setForm((f) => ({ ...f, alternative_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Instruções</Label>
                  <Textarea
                    value={form.instructions}
                    onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>
                  {create.isPending || update.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="divide-y">
        {rows.map((e: Exercise) => (
          <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
            <button type="button" onClick={() => openEdit(e)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium">{e.name}</p>
              <p className="text-xs text-muted-foreground">
                {MUSCLE_GROUP_LABELS[e.muscle_group] ?? e.muscle_group} · {e.place ?? "gym"}
              </p>
            </button>
            <Badge variant={e.is_active ? "default" : "outline"}>
              {e.is_active ? "Ativo" : "Inativo"}
            </Badge>
            <Switch checked={e.is_active} onCheckedChange={() => toggleActive(e)} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

type FoodForm = {
  name: string;
  category: string;
  portion: string;
  unit: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  fiber_g: string;
  sodium_mg: string;
  estimated_cost: string;
  tags: string;
};

const FOOD_INITIAL: FoodForm = {
  name: "",
  category: "proteina",
  portion: "100",
  unit: "g",
  calories: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
  fiber_g: "",
  sodium_mg: "",
  estimated_cost: "",
  tags: "",
};

function FoodsPanel() {
  const foods = useAdminFoods();
  const create = useCreateFoodItem();
  const update = useUpdateFoodItem();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FoodForm>(FOOD_INITIAL);

  if (foods.isLoading) return <LoadingBlock rows={3} />;

  const rows = (foods.data ?? []).filter((f: FoodItem) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  function openNew() {
    setEditingId(null);
    setForm(FOOD_INITIAL);
    setOpen(true);
  }

  function openEdit(f: FoodItem) {
    setEditingId(f.id);
    setForm({
      name: f.name,
      category: f.category,
      portion: String(f.portion),
      unit: f.unit,
      calories: String(f.calories),
      protein_g: String(f.protein_g),
      carbs_g: String(f.carbs_g),
      fat_g: String(f.fat_g),
      fiber_g: String(f.fiber_g),
      sodium_mg: String(f.sodium_mg),
      estimated_cost: f.estimated_cost !== null ? String(f.estimated_cost) : "",
      tags: (f.tags ?? []).join(", "),
    });
    setOpen(true);
  }

  function submit() {
    if (!form.name.trim()) return;
    const num = (v: string) => Number(v.replace(",", ".")) || 0;
    const patch = {
      name: form.name,
      category: form.category,
      portion: num(form.portion) || 100,
      unit: form.unit,
      calories: num(form.calories),
      protein_g: num(form.protein_g),
      carbs_g: num(form.carbs_g),
      fat_g: num(form.fat_g),
      fiber_g: num(form.fiber_g),
      sodium_mg: num(form.sodium_mg),
      estimated_cost: form.estimated_cost ? num(form.estimated_cost) : null,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    };
    const callbacks = {
      onSuccess: () => {
        toast.success(editingId ? "Alimento atualizado!" : "Alimento criado!");
        setOpen(false);
      },
      onError: (e: unknown) =>
        toast.error("Não foi possível salvar", {
          description: e instanceof Error ? e.message : "Tente novamente.",
        }),
    };
    if (editingId) update.mutate({ id: editingId, patch }, callbacks);
    else create.mutate(patch, callbacks);
  }

  function toggleActive(f: FoodItem) {
    update.mutate({ id: f.id, patch: { is_active: !f.is_active } });
  }

  return (
    <SectionCard
      title="Alimentos"
      icon={<UtensilsCrossed className="h-4 w-4" />}
      accent="green"
      action={
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            className="h-9 w-40"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}>
                <Plus className="mr-1.5 h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar alimento" : "Novo alimento"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOOD_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Porção</Label>
                    <Input
                      type="number"
                      value={form.portion}
                      onChange={(e) => setForm((f) => ({ ...f, portion: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Unidade</Label>
                    <Select
                      value={form.unit}
                      onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <NumField
                  label="Calorias"
                  value={form.calories}
                  onChange={(v) => setForm((f) => ({ ...f, calories: v }))}
                />
                <NumField
                  label="Proteína (g)"
                  value={form.protein_g}
                  onChange={(v) => setForm((f) => ({ ...f, protein_g: v }))}
                />
                <NumField
                  label="Carboidrato (g)"
                  value={form.carbs_g}
                  onChange={(v) => setForm((f) => ({ ...f, carbs_g: v }))}
                />
                <NumField
                  label="Gordura (g)"
                  value={form.fat_g}
                  onChange={(v) => setForm((f) => ({ ...f, fat_g: v }))}
                />
                <NumField
                  label="Fibra (g)"
                  value={form.fiber_g}
                  onChange={(v) => setForm((f) => ({ ...f, fiber_g: v }))}
                />
                <NumField
                  label="Sódio (mg)"
                  value={form.sodium_mg}
                  onChange={(v) => setForm((f) => ({ ...f, sodium_mg: v }))}
                />
                <NumField
                  label="Custo estimado (R$)"
                  value={form.estimated_cost}
                  onChange={(v) => setForm((f) => ({ ...f, estimated_cost: v }))}
                />
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    Tags (separadas por vírgula)
                  </Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="animal, carne_branca"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={create.isPending || update.isPending}>
                  {create.isPending || update.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="divide-y">
        {rows.map((f: FoodItem) => (
          <div key={f.id} className="flex items-center justify-between gap-3 py-2.5">
            <button type="button" onClick={() => openEdit(f)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">
                {f.category} · {Math.round(f.calories)} kcal/{f.portion}
                {f.unit}
              </p>
            </button>
            <Badge variant={f.is_active ? "default" : "outline"}>
              {f.is_active ? "Ativo" : "Inativo"}
            </Badge>
            <Switch checked={f.is_active} onCheckedChange={() => toggleActive(f)} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
