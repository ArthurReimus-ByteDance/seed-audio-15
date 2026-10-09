import { z } from "zod";
import { STUDIO_MODES } from "@/lib/seed-audio/modes";
import type { SavedPrompt } from "@/stores/saved-prompts";

const exportSchema = z.object({
  version: z.literal(1),
  prompts: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        title: z.string().max(200),
        prompt: z.string().min(1).max(20000),
        mode: z.enum(STUDIO_MODES),
        createdAt: z.number(),
      }),
    )
    .max(500),
});

export function serializeSavedPrompts(prompts: SavedPrompt[]): string {
  return JSON.stringify({ version: 1, prompts }, null, 2);
}

export type ImportResult = { ok: true; prompts: SavedPrompt[] } | { ok: false; error: string };

export function parseSavedPrompts(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "The file is not a Seed Audio Studio prompt export." };
  return { ok: true, prompts: parsed.data.prompts };
}

export function mergeSavedPrompts(existing: SavedPrompt[], incoming: SavedPrompt[], limit: number): SavedPrompt[] {
  const known = new Set(existing.map((item) => item.id));
  const merged = [...existing, ...incoming.filter((item) => !known.has(item.id))];
  return merged.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
