import "server-only";
import { z } from "zod";

const DEFAULT_ENDPOINT = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations";
const DEFAULT_AUDIO_HOSTS = [".volces.com", ".bytepluses.com"];

const envSchema = z.object({
  SEED_AUDIO_API_KEY: z.string().trim().min(1).optional(),
  SEED_AUDIO_MODEL: z.string().trim().min(1).optional(),
  SEED_AUDIO_ENDPOINT: z.url().default(DEFAULT_ENDPOINT),
  SEED_AUDIO_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  SEED_AUDIO_AUDIO_HOSTS: z.string().optional(),
  STUDIO_ACCESS_CODE: z.string().min(1).optional(),
});

export type ServerEnv = {
  apiKey?: string;
  model?: string;
  endpoint: string;
  maxConcurrency: number;
  audioHostSuffixes: string[];
  accessCode?: string;
};

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const parsed = envSchema.parse({
    SEED_AUDIO_API_KEY: source.SEED_AUDIO_API_KEY || undefined,
    SEED_AUDIO_MODEL: source.SEED_AUDIO_MODEL || undefined,
    SEED_AUDIO_ENDPOINT: source.SEED_AUDIO_ENDPOINT || undefined,
    SEED_AUDIO_MAX_CONCURRENCY: source.SEED_AUDIO_MAX_CONCURRENCY || undefined,
    SEED_AUDIO_AUDIO_HOSTS: source.SEED_AUDIO_AUDIO_HOSTS || undefined,
    STUDIO_ACCESS_CODE: source.STUDIO_ACCESS_CODE || undefined,
  });
  const extraHosts = (parsed.SEED_AUDIO_AUDIO_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return {
    apiKey: parsed.SEED_AUDIO_API_KEY,
    model: parsed.SEED_AUDIO_MODEL,
    endpoint: parsed.SEED_AUDIO_ENDPOINT,
    maxConcurrency: parsed.SEED_AUDIO_MAX_CONCURRENCY,
    audioHostSuffixes: [...DEFAULT_AUDIO_HOSTS, ...extraHosts],
    accessCode: parsed.STUDIO_ACCESS_CODE,
  };
}

export function getServerEnv(): ServerEnv {
  return parseServerEnv(process.env);
}

export function isConfigured(env: ServerEnv): env is ServerEnv & { apiKey: string; model: string } {
  return Boolean(env.apiKey && env.model);
}

export function maskModelId(model: string | undefined): string | null {
  if (!model) return null;
  return model.length <= 12 ? `${model.slice(0, 3)}…` : `${model.slice(0, 7)}…${model.slice(-5)}`;
}

export function endpointHost(endpoint: string): string {
  return new URL(endpoint).host;
}
