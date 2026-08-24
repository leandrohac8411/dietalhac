import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { sendTestPush } from "@/lib/push.functions";

export type PushCapability = "unsupported" | "needs-install" | "available";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function pushCapability(): PushCapability {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "unsupported";
  if (isIos() && !isStandalone()) return "needs-install";
  return "available";
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

async function currentSubscription() {
  if (pushCapability() !== "available") return null;
  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  return registration.pushManager.getSubscription();
}

export function usePushStatus() {
  return useQuery({
    queryKey: ["push-status"],
    queryFn: async () => ({
      capability: pushCapability(),
      permission: Notification.permission,
      subscribed: Boolean(await currentSubscription()),
    }),
    staleTime: 30_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useEnablePush() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const capability = pushCapability();
      if (capability === "needs-install")
        throw new Error("Adicione o NEXO à Tela de Início e abra pelo ícone para ativar.");
      if (capability === "unsupported")
        throw new Error("Este navegador não oferece suporte a notificações Web Push.");

      const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined;
      if (!publicKey) throw new Error("A chave pública de notificações ainda não foi configurada.");

      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "A permissão não foi concedida. Libere as notificações nos ajustes do aparelho.",
        );

      const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
        throw new Error("O aparelho não retornou uma inscrição válida.");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: auth.user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
          disabled_at: null,
          failure_count: 0,
        },
        { onConflict: "endpoint" },
      );
      if (subscriptionError) throw subscriptionError;

      const { error: preferenceError } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: auth.user.id, enabled: true }, { onConflict: "user_id" });
      if (preferenceError) throw preferenceError;
      return subscription;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["push-status"] });
      await client.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}

export function useDisablePush() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const subscription = await currentSubscription();
      if (subscription) {
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
        if (error) throw error;
        await subscription.unsubscribe();
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["push-status"] }),
  });
}

export function useUpdateNotificationPreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"notification_preferences">) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: auth.user.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["notification-preferences"] }),
  });
}

export function useSendTestPush() {
  return useMutation({ mutationFn: () => sendTestPush() });
}
