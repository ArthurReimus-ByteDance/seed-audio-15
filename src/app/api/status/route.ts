import { connection, NextResponse } from "next/server";
import { endpointHost, getServerEnv, isConfigured, maskModelId } from "@/server/env";
import { getRequestLimitBytes } from "@/server/limits";
import { getLimiter } from "@/server/limiter";
import { isFfmpegAvailable } from "@/server/mux";

export async function GET() {
  await connection();
  const env = getServerEnv();
  const { inFlight, queued } = getLimiter(env.maxConcurrency).stats();
  return NextResponse.json({
    configured: isConfigured(env),
    maxConcurrency: env.maxConcurrency,
    inFlight,
    queued,
    endpointHost: endpointHost(env.endpoint),
    modelHint: maskModelId(env.model),
    accessGate: Boolean(env.accessCode),
    ffmpeg: await isFfmpegAvailable(),
    maxRequestBytes: getRequestLimitBytes(),
  });
}
