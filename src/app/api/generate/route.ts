import { NextResponse } from "next/server";
import { buildUpstreamPayload } from "@/lib/seed-audio/payload";
import { generateRequestSchema } from "@/lib/seed-audio/schemas";
import { describeSize, exceedsRequestLimit } from "@/lib/seed-audio/size";
import { getServerEnv, isConfigured } from "@/server/env";
import { getRequestLimitBytes } from "@/server/limits";
import { getLimiter } from "@/server/limiter";
import { callSeedAudio, UpstreamError } from "@/server/upstream";

export const maxDuration = 300;

const toProxyUrl = (upstreamUrl: string) => `/api/audio?src=${encodeURIComponent(upstreamUrl)}`;

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!isConfigured(env)) {
    return NextResponse.json(
      { error: "Seed Audio is not configured on the server. Set SEED_AUDIO_API_KEY and SEED_AUDIO_MODEL." },
      { status: 503 },
    );
  }

  const declaredBytes = Number(request.headers.get("content-length") ?? 0);
  const limit = getRequestLimitBytes();
  if (exceedsRequestLimit(declaredBytes, limit)) {
    return NextResponse.json(
      { error: `The request is ${describeSize(declaredBytes)}, over the ${describeSize(limit)} limit. Use public URLs for some audio instead of uploading it.` },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
    return NextResponse.json({ error: issues[0]?.message ?? "Invalid request", issues }, { status: 400 });
  }

  const payload = buildUpstreamPayload(env.model, parsed.data);
  try {
    const result = await getLimiter(env.maxConcurrency).run(() => {
      if (request.signal.aborted) throw new UpstreamError("Request cancelled", 499);
      return callSeedAudio(env.endpoint, env.apiKey, payload, toProxyUrl, request.signal);
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
