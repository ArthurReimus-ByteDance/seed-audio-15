import "server-only";
import { MAX_REQUEST_BYTES } from "@/lib/seed-audio/size";

export const VERCEL_REQUEST_BYTES = Math.floor(4.5 * 1024 * 1024);

export function getRequestLimitBytes(source: Record<string, string | undefined> = process.env): number {
  return source.VERCEL ? VERCEL_REQUEST_BYTES : MAX_REQUEST_BYTES;
}
