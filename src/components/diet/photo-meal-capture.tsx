import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeMealPhoto } from "@/lib/meal-photo-ai.functions";
import type { FoodItem } from "@/lib/db";

type DraftComponent = {
  name: string;
  quantity: number;
  unit: "g" | "ml" | "g/ml" | "porção";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

type IdentifiedItem = {
  name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Macros por grama — usado para recalcular quando a pessoa ajusta a porção. */
  perGram: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};

type PhotoMealCaptureProps = {
  mealName: string;
  foods: FoodItem[];
  onItemsConfirmed: (items: DraftComponent[]) => void;
};

/**
 * Reduz a foto para no máximo `maxDim` px no lado maior e recodifica como
 * JPEG comprimido. Fotos de câmera saem com vários megapixels — sem isso, o
 * limite de tokens por minuto da API de visão estoura fácil.
 */
function resizeImageToDataUrl(file: File, maxDim = 720, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = objectUrl;
  });
}

export function PhotoMealCapture({ mealName, foods, onItemsConfirmed }: PhotoMealCaptureProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [identified, setIdentified] = useState<IdentifiedItem[] | null>(null);

  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    },
    [photoUrl],
  );

  function selectPhoto(file?: File) {
    if (!file) return;
    setPhotoFile(file);
    setIdentified(null);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function clearPhoto() {
    setPhotoFile(null);
    setIdentified(null);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (cameraInput.current) cameraInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
  }

  async function analyze() {
    if (!photoFile) return;
    setAnalyzing(true);
    try {
      const imageBase64 = await resizeImageToDataUrl(photoFile);
      const result = await analyzeMealPhoto({
        data: {
          imageBase64,
          foods: foods.map((f, i) => [i, f.name] as [number, string]),
        },
      });

      if (result === null) {
        toast.error("Não foi possível analisar a foto agora", {
          description: "Tente de novo em instantes, ou registre manualmente abaixo.",
        });
        return;
      }
      if (result.length === 0) {
        toast.error("Não identifiquei alimentos nessa foto", {
          description: "Tente outro ângulo com mais luz, ou registre manualmente.",
        });
        return;
      }

      setIdentified(
        result.map((item) => {
          const catalog = item.food_item_index !== null ? foods[item.food_item_index] : undefined;
          const grams = Math.max(1, Math.round(item.grams));
          if (catalog && catalog.portion > 0) {
            const perGram = {
              calories: catalog.calories / catalog.portion,
              protein_g: catalog.protein_g / catalog.portion,
              carbs_g: catalog.carbs_g / catalog.portion,
              fat_g: catalog.fat_g / catalog.portion,
            };
            return {
              name: catalog.name,
              grams,
              calories: Math.round(perGram.calories * grams),
              protein_g: Math.round(perGram.protein_g * grams * 10) / 10,
              carbs_g: Math.round(perGram.carbs_g * grams * 10) / 10,
              fat_g: Math.round(perGram.fat_g * grams * 10) / 10,
              perGram,
            };
          }
          // Sem equivalente no catálogo: usa a estimativa da própria IA como base fixa por grama.
          const perGram = {
            calories: item.calories / grams,
            protein_g: item.protein_g / grams,
            carbs_g: item.carbs_g / grams,
            fat_g: item.fat_g / grams,
          };
          return {
            name: item.name,
            grams,
            calories: Math.round(item.calories),
            protein_g: Math.round(item.protein_g * 10) / 10,
            carbs_g: Math.round(item.carbs_g * 10) / 10,
            fat_g: Math.round(item.fat_g * 10) / 10,
            perGram,
          };
        }),
      );
    } catch {
      toast.error("Não foi possível analisar a foto agora", {
        description: "Verifique sua conexão e tente novamente.",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  function updateGrams(index: number, grams: number) {
    setIdentified((current) => {
      if (!current) return current;
      const next = [...current];
      const item = next[index]!;
      const g = Math.max(1, grams);
      next[index] = {
        ...item,
        grams: g,
        calories: Math.round(item.perGram.calories * g),
        protein_g: Math.round(item.perGram.protein_g * g * 10) / 10,
        carbs_g: Math.round(item.perGram.carbs_g * g * 10) / 10,
        fat_g: Math.round(item.perGram.fat_g * g * 10) / 10,
      };
      return next;
    });
  }

  function removeItem(index: number) {
    setIdentified((current) => (current ? current.filter((_, i) => i !== index) : current));
  }

  function confirmItems() {
    if (!identified || identified.length === 0) return;
    onItemsConfirmed(
      identified.map((item) => ({
        name: item.name,
        quantity: item.grams,
        unit: "g",
        calories: item.calories,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
      })),
    );
    toast.success("Itens adicionados!", {
      description: "Confira as quantidades antes de registrar a refeição.",
    });
    clearPhoto();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-accent/30 bg-[linear-gradient(145deg,hsl(var(--accent)/0.08),transparent_58%)]">
      <div className="flex items-start gap-3 border-b border-border/50 px-4 py-4 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
          <Camera className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Registrar {mealName} por foto</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            Fotografe o prato inteiro. Se houver bebida, deixe-a visível ao lado.
          </p>
        </div>
      </div>

      {photoUrl ? (
        <div className="space-y-4 p-3 sm:p-5">
          <div className="relative aspect-[4/3] max-h-[430px] overflow-hidden rounded-xl bg-black">
            <img
              src={photoUrl}
              alt="Prévia da refeição selecionada"
              className="h-full w-full object-contain"
            />
            {!identified ? (
              <div className="pointer-events-none absolute inset-3 rounded-lg border border-accent/30">
                <span className="absolute -left-px -top-px h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-accent" />
                <span className="absolute -right-px -top-px h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-accent" />
                <span className="absolute -bottom-px -left-px h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-accent" />
                <span className="absolute -bottom-px -right-px h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-accent" />
              </div>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-3 top-3 h-9 w-9 rounded-full bg-background/85 backdrop-blur"
              onClick={clearPhoto}
              aria-label="Remover foto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {identified ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Identifiquei {identified.length} {identified.length === 1 ? "item" : "itens"} —
                ajuste antes de adicionar:
              </p>
              <div className="space-y-2">
                {identified.map((item, i) => (
                  <div
                    key={`${item.name}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3.5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.calories} kcal · P {item.protein_g}g · C {item.carbs_g}g · G{" "}
                        {item.fat_g}g
                      </p>
                    </div>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={item.grams}
                      onChange={(e) => updateGrams(i, Number(e.target.value) || 1)}
                      className="h-9 w-20 text-center"
                    />
                    <span className="text-xs text-muted-foreground">g</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground"
                      onClick={() => removeItem(i)}
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={clearPhoto}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refazer foto
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={identified.length === 0}
                  onClick={confirmItems}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar itens
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-border/60 bg-background/40 px-3.5 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  Você confirma antes de registrar
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Alimentos e porções ficarão editáveis antes de entrar nas calorias do dia.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-full min-h-11 flex-1 sm:flex-none"
                  onClick={() => cameraInput.current?.click()}
                  disabled={analyzing}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refazer
                </Button>
                <Button
                  type="button"
                  className="h-full min-h-11 flex-1 sm:flex-none"
                  onClick={analyze}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="mr-2 h-4 w-4" />
                  )}
                  {analyzing ? "Analisando..." : "Analisar foto"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-5">
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="group flex min-h-32 items-center gap-4 rounded-xl border border-accent/35 bg-accent/10 p-4 text-left transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_0_24px_hsl(var(--accent)/0.2)]">
              <Camera className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-foreground">Fotografar prato</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Abra a câmera e enquadre tudo o que vai consumir.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => galleryInput.current?.click()}
            className="flex min-h-32 items-center gap-4 rounded-xl border border-border/70 bg-background/35 p-4 text-left transition-colors hover:border-accent/30 hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
              <ImagePlus className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold text-foreground">Escolher da galeria</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                Use uma foto que já está salva neste aparelho.
              </span>
            </span>
          </button>
        </div>
      )}

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => selectPhoto(event.target.files?.[0])}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => selectPhoto(event.target.files?.[0])}
      />
    </div>
  );
}
