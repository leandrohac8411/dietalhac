type ErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Supabase/PostgREST errors are plain objects, not native Error instances.
 * Normalize them so the UI never hides the actual cause behind "Tente novamente".
 */
export function getErrorMessage(error: unknown, fallback = "Tente novamente.") {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (!error || typeof error !== "object") return fallback;

  const value = error as ErrorLike;
  const message = text(value.message);
  const details = text(value.details);
  const hint = text(value.hint);
  const code = text(value.code);
  const parts = [message, details, hint].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
  );

  if (parts.length === 0) return fallback;
  return `${parts.join(" — ")}${code ? ` (${code})` : ""}`;
}

export function databaseError(step: string, error: unknown) {
  return new Error(`${step}: ${getErrorMessage(error, "erro desconhecido no banco de dados")}`);
}
