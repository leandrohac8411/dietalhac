import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Tables } from "@/integrations/supabase/types";

type PushPayload = { title: string; body: string; url: string; tag: string };
type Preference = Tables<"notification_preferences">;
type Subscription = Tables<"push_subscriptions">;

function configureWebPush() {
  const publicKey = process.env["WEB_PUSH_PUBLIC_KEY"];
  const privateKey = process.env["WEB_PUSH_PRIVATE_KEY"];
  const subject = process.env["WEB_PUSH_SUBJECT"];
  if (!publicKey || !privateKey || !subject)
    throw new Error(
      "WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY e WEB_PUSH_SUBJECT são obrigatórias",
    );
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

async function deliver(subscription: Subscription, payload: PushPayload) {
  configureWebPush();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString(), failure_count: 0, disabled_at: null })
      .eq("id", subscription.id);
    return true;
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const gone = statusCode === 404 || statusCode === 410;
    await supabaseAdmin
      .from("push_subscriptions")
      .update({
        failure_count: subscription.failure_count + 1,
        disabled_at: gone ? new Date().toISOString() : null,
      })
      .eq("id", subscription.id);
    if (!gone) console.error("[push] Falha ao enviar", { statusCode, error });
    return false;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .is("disabled_at", null);
  if (error) throw error;
  const results = await Promise.all(
    (data ?? []).map((subscription) => deliver(subscription, payload)),
  );
  return results.filter(Boolean).length;
}

function localClock(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return { date, minutes, weekday };
}

function timeMinutes(value: string | null | undefined) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function dueAt(target: number | null, now: number, lead = 0) {
  if (target === null) return false;
  const scheduled = (target - lead + 1440) % 1440;
  const elapsed = (now - scheduled + 1440) % 1440;
  return elapsed >= 0 && elapsed < 5;
}

function isHydrationCheckTime(minutes: number) {
  return minutes % 30 < 5;
}

function hydrationProgress(input: {
  nowMinutes: number;
  wakeTime?: string | null;
  sleepTime?: string | null;
  consumed: number;
  target: number;
}) {
  const wake = timeMinutes(input.wakeTime) ?? 7 * 60;
  let sleep = timeMinutes(input.sleepTime) ?? 22 * 60;
  if (sleep <= wake) sleep += 1440;

  let current = input.nowMinutes;
  if (current < wake) current += 1440;
  const hydrationEnd = Math.max(wake + 8 * 60, sleep - 60);
  const activeMinutes = hydrationEnd - wake;
  const elapsedMinutes = Math.max(0, Math.min(activeMinutes, current - wake));
  const expected = Math.round(input.target * (elapsedMinutes / activeMinutes));
  const remaining = Math.max(0, input.target - input.consumed);
  const deficit = Math.max(0, expected - input.consumed);
  const meaningfulDeficit = Math.max(350, Math.round(input.target * 0.15));

  return {
    remaining,
    deficit,
    shouldNotify:
      current >= wake + 60 &&
      current <= hydrationEnd &&
      remaining >= 250 &&
      deficit >= meaningfulDeficit,
  };
}

function formatWater(ml: number) {
  if (ml < 1000) return `${Math.round(ml / 50) * 50} ml`;
  return `${(ml / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} L`;
}

async function reserveDelivery(subscription: Subscription, userId: string, eventKey: string) {
  const { data, error } = await supabaseAdmin
    .from("push_delivery_log")
    .insert({ subscription_id: subscription.id, user_id: userId, event_key: eventKey })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data?.id ?? null;
}

async function deliverEvent(
  subscriptions: Subscription[],
  userId: string,
  eventKey: string,
  payload: PushPayload,
) {
  let sent = 0;
  for (const subscription of subscriptions) {
    const logId = await reserveDelivery(subscription, userId, eventKey);
    if (!logId) continue;
    if (await deliver(subscription, payload)) sent += 1;
    else await supabaseAdmin.from("push_delivery_log").delete().eq("id", logId);
  }
  return sent;
}

export async function runScheduledPushes(now = new Date()) {
  const { data: preferences, error: preferenceError } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("enabled", true);
  if (preferenceError) throw preferenceError;
  if (!preferences?.length) return { users: 0, sent: 0 };

  const userIds = preferences.map((preference) => preference.user_id);
  const [{ data: subscriptions }, { data: plans }, { data: routines }, { data: goals }] =
    await Promise.all([
      supabaseAdmin
        .from("push_subscriptions")
        .select("*")
        .in("user_id", userIds)
        .is("disabled_at", null),
      supabaseAdmin
        .from("meal_plans")
        .select("id,user_id")
        .in("user_id", userIds)
        .eq("is_active", true),
      supabaseAdmin
        .from("user_preferences")
        .select("user_id,training_time,training_weekdays,wake_time,sleep_time")
        .in("user_id", userIds),
      supabaseAdmin
        .from("user_goals")
        .select("user_id,water_ml")
        .in("user_id", userIds)
        .eq("is_active", true),
    ]);

  const planIds = (plans ?? []).map((plan) => plan.id);
  const { data: meals } = planIds.length
    ? await supabaseAdmin
        .from("meals")
        .select("id,meal_plan_id,name,scheduled_time")
        .in("meal_plan_id", planIds)
    : { data: [] };
  const planOwner = new Map((plans ?? []).map((plan) => [plan.id, plan.user_id]));
  const subscriptionsByUser = new Map<string, Subscription[]>();
  for (const subscription of subscriptions ?? []) {
    const current = subscriptionsByUser.get(subscription.user_id) ?? [];
    current.push(subscription);
    subscriptionsByUser.set(subscription.user_id, current);
  }
  const routineByUser = new Map((routines ?? []).map((routine) => [routine.user_id, routine]));
  const waterTargetByUser = new Map(
    (goals ?? []).map((goal) => [goal.user_id, goal.water_ml ?? 2500]),
  );
  let sent = 0;

  for (const preference of preferences as Preference[]) {
    const devices = subscriptionsByUser.get(preference.user_id) ?? [];
    if (!devices.length) continue;
    const clock = localClock(now, preference.timezone);

    if (preference.meal_enabled) {
      for (const meal of meals ?? []) {
        if (planOwner.get(meal.meal_plan_id) !== preference.user_id) continue;
        if (!dueAt(timeMinutes(meal.scheduled_time), clock.minutes, preference.meal_lead_minutes))
          continue;
        const { count: mealAlreadyLogged } = await supabaseAdmin
          .from("daily_food_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", preference.user_id)
          .eq("meal_id", meal.id)
          .eq("log_date", clock.date)
          .eq("completed", true);
        if ((mealAlreadyLogged ?? 0) > 0) continue;
        sent += await deliverEvent(devices, preference.user_id, `meal:${clock.date}:${meal.id}`, {
          title: `${meal.name} em ${preference.meal_lead_minutes} minutos`,
          body: "Abra o NEXO para conferir sua refeição planejada e registrar o que consumiu.",
          url: "/dieta",
          tag: `meal-${meal.id}`,
        });
      }
    }

    const routine = routineByUser.get(preference.user_id);
    if (
      preference.workout_enabled &&
      routine?.training_weekdays?.includes(clock.weekday) &&
      dueAt(timeMinutes(routine.training_time), clock.minutes, preference.workout_lead_minutes)
    ) {
      const dayStart = `${clock.date}T00:00:00-03:00`;
      const dayEnd = `${clock.date}T23:59:59-03:00`;
      const { count: workoutAlreadyDone } = await supabaseAdmin
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", preference.user_id)
        .not("finished_at", "is", null)
        .gte("started_at", dayStart)
        .lte("started_at", dayEnd);
      if ((workoutAlreadyDone ?? 0) === 0)
        sent += await deliverEvent(devices, preference.user_id, `workout:${clock.date}`, {
          title: `Treino em ${preference.workout_lead_minutes} min`,
          body: "Sua próxima ficha está pronta. Abra o NEXO para conferir o treino de hoje.",
          url: "/treino",
          tag: "workout-reminder",
        });
    }

    if (preference.water_enabled && isHydrationCheckTime(clock.minutes)) {
      const target = waterTargetByUser.get(preference.user_id) ?? 2500;
      const { data: waterLogs } = await supabaseAdmin
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", preference.user_id)
        .eq("log_date", clock.date);
      const consumed = (waterLogs ?? []).reduce((total, log) => total + log.amount_ml, 0);
      const progress = hydrationProgress({
        nowMinutes: clock.minutes,
        wakeTime: routine?.wake_time,
        sleepTime: routine?.sleep_time,
        consumed,
        target,
      });
      if (progress.shouldNotify) {
        const { count: recentWaterReminder } = await supabaseAdmin
          .from("push_delivery_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", preference.user_id)
          .like("event_key", `water:${clock.date}:%`)
          .gte("created_at", new Date(now.getTime() - 90 * 60_000).toISOString());
        if ((recentWaterReminder ?? 0) === 0)
          sent += await deliverEvent(
            devices,
            preference.user_id,
            `water:${clock.date}:${clock.minutes - (clock.minutes % 30)}`,
            {
              title: `Faltam ${formatWater(progress.remaining)} de água hoje`,
              body: `Você registrou ${formatWater(consumed)} de uma meta de ${formatWater(target)}. Hidrate-se aos poucos e registre no NEXO.`,
              url: "/dashboard",
              tag: "water-reminder",
            },
          );
      }
    }

    if (
      preference.checkin_enabled &&
      preference.checkin_weekday === clock.weekday &&
      dueAt(timeMinutes(preference.checkin_time), clock.minutes)
    ) {
      const weekAgo = new Date(now.getTime() - 6 * 86_400_000).toISOString().slice(0, 10);
      const { count: recentCheckin } = await supabaseAdmin
        .from("weekly_checkins")
        .select("id", { count: "exact", head: true })
        .eq("user_id", preference.user_id)
        .gte("checkin_date", weekAgo);
      if ((recentCheckin ?? 0) === 0)
        sent += await deliverEvent(devices, preference.user_id, `checkin:${clock.date}`, {
          title: "Seu check-in semanal está disponível",
          body: "Registre peso, medidas e percepção da semana para acompanhar sua evolução.",
          url: "/checkin",
          tag: "weekly-checkin",
        });
    }
  }

  return { users: preferences.length, sent };
}
