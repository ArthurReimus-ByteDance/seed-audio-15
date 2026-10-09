import { NextResponse, type NextRequest } from "next/server";
import { parseAllowedAudioUrl } from "@/server/audio-url";
import { getServerEnv } from "@/server/env";

const FORWARDED_HEADERS = ["content-type", "content-length", "accept-ranges", "content-range"];

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("src");
  if (!source) return NextResponse.json({ error: "Missing src" }, { status: 400 });

  const env = getServerEnv();
  const url = parseAllowedAudioUrl(source, {
    hostSuffixes: env.audioHostSuffixes,
    allowLocalhost: process.env.NODE_ENV !== "production",
  });
  if (!url) return NextResponse.json({ error: "Audio host is not allowed" }, { status: 400 });

  const range = request.headers.get("range");
  const upstream = await fetch(url, { redirect: "manual", headers: range ? { range } : undefined }).catch(() => null);
  if (!upstream || !upstream.body || (!upstream.ok && upstream.status !== 206)) {
    return NextResponse.json({ error: "Could not fetch the generated audio" }, { status: 502 });
  }

  const headers = new Headers({ "cache-control": "private, max-age=3600" });
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
