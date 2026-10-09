import "server-only";
import axios, { isAxiosError, isCancel } from "axios";
import { upstreamResponseSchema, type GenerateResult } from "@/lib/seed-audio/schemas";
import type { UpstreamPayload } from "@/lib/seed-audio/payload";

const REQUEST_TIMEOUT_MS = 15 * 60 * 1000;

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export function describeUpstreamFailure(status: number, data: unknown): string {
  const detail = extractDetail(data);
  if (status === 401 || status === 403) {
    return `Seed Audio rejected the API key (${status}). Check SEED_AUDIO_API_KEY; early-access keys expire after the official release.${detail ? ` Details: ${detail}` : ""}`;
  }
  if (status === 429) {
    return `Rate or concurrency limit reached (2 concurrent requests per API key). Wait for a running job to finish and retry.${detail ? ` Details: ${detail}` : ""}`;
  }
  if (status === 413) return "The request is too large (the limit is 64 MB). Use public URLs instead of uploaded files.";
  if (detail && /violates policy/i.test(detail)) {
    return `Seed Audio's content moderation rejected the text. Rephrase the prompt, since harmless phrases can be flagged. Details: ${detail}`;
  }
  if (status === 404 || (detail && /resource .* is not found/i.test(detail))) {
    return `A referenced file or speaker could not be found. Check that speaker IDs exist and that public URLs are reachable and not expired.${detail ? ` Details: ${detail}` : ""}`;
  }
  if (detail && /not fully specified/i.test(detail)) {
    return `The prompt must contain the exact words to speak, in quotes. Music-only, effects-only and "reproduce the video's lines" prompts are not supported during early access. Details: ${detail}`;
  }
  return detail ?? "Seed Audio rejected the request";
}

function extractDetail(data: unknown): string | null {
  if (typeof data === "string" && data) return data.slice(0, 500);
  if (data && typeof data === "object") {
    const error = (data as { error?: { message?: unknown } | string }).error;
    if (typeof error === "string") return error;
    if (error && typeof error.message === "string") return error.message;
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return null;
}

export async function callSeedAudio(
  endpoint: string,
  apiKey: string,
  payload: UpstreamPayload,
  toProxyUrl: (upstreamUrl: string) => string,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  try {
    const response = await axios.post(endpoint, payload, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: REQUEST_TIMEOUT_MS,
      signal,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    const parsed = upstreamResponseSchema.safeParse(response.data);
    if (!parsed.success) {
      throw new UpstreamError("Seed Audio returned a response without audio", 502);
    }
    const { id, model, created, content, output_format, usage } = parsed.data;
    const audios = content.audios.map((audio) => ({ ...audio, url: toProxyUrl(audio.url) }));
    return {
      id: id ?? null,
      model: model ?? null,
      created: created ?? null,
      outputFormat: output_format ?? "wav",
      usage: usage ?? null,
      audios,
      raw: { ...(response.data as Record<string, unknown>), content: { ...content, audios } },
    };
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (isCancel(error)) throw new UpstreamError("Request cancelled", 499);
    if (isAxiosError(error)) {
      if (error.code === "ECONNABORTED") throw new UpstreamError("Seed Audio timed out", 504);
      if (error.response) {
        throw new UpstreamError(describeUpstreamFailure(error.response.status, error.response.data), error.response.status >= 500 ? 502 : error.response.status);
      }
      throw new UpstreamError("Could not reach Seed Audio", 502);
    }
    throw error;
  }
}
