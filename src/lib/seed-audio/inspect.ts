export function redactInline(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactInline);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, inner]) => [key, redactInline(inner)]));
  }
  if (typeof value === "string" && value.startsWith("data:")) return `<inline ${value.slice(5, value.indexOf(";"))} data, ${value.length.toLocaleString("en-US")} chars>`;
  return value;
}

const MODEL_PLACEHOLDER = "$SEED_AUDIO_MODEL";

export function previewPayload<T extends { model: string }>(payload: T): T {
  return { ...(redactInline(payload) as T), model: MODEL_PLACEHOLDER };
}

export function toCurl(payload: { model: string }): string {
  const body = JSON.stringify({ ...(redactInline(payload) as object), model: MODEL_PLACEHOLDER }, null, 2).replace(`"${MODEL_PLACEHOLDER}"`, `"${MODEL_PLACEHOLDER}"`);
  const escaped = body.replace(/'/g, "'\\''");
  return [
    `curl --location "$SEED_AUDIO_ENDPOINT" \\`,
    `  --header 'Content-Type: application/json' \\`,
    `  --header "Authorization: Bearer $SEED_AUDIO_API_KEY" \\`,
    `  --data-binary @- <<JSON`,
    escaped,
    `JSON`,
  ].join("\n");
}
