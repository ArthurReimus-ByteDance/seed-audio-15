import "server-only";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import bundledFfmpeg from "ffmpeg-static";
import { createLimiter, type Limiter } from "./limiter";
import { assertPublicHost, checkUrlShape, UnsafeUrlError, type HostPolicy } from "./url-guard";

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const DOWNLOAD_TIMEOUT_MS = 180_000;
const FFMPEG_TIMEOUT_MS = 300_000;
const PROBE_TIMEOUT_MS = 10_000;
const STDERR_TAIL_CHARS = 1500;

export class MuxError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MuxError";
  }
}

export function ffmpegCandidates(configured: string | undefined, bundled: string | null | undefined): string[] {
  const ordered = [configured?.trim(), "ffmpeg", bundled ?? undefined];
  return ordered.filter((candidate, index, all): candidate is string => Boolean(candidate) && all.indexOf(candidate) === index);
}

type FfmpegResult = { code: number | null; stderr: string };

function spawnFfmpeg(binary: string, args: string[], timeoutMs: number): Promise<FfmpegResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL_CHARS);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stderr });
    });
  });
}

let resolvedBinary: Promise<string | null> | null = null;

export function resolveFfmpeg(): Promise<string | null> {
  resolvedBinary ??= (async () => {
    for (const candidate of ffmpegCandidates(process.env.FFMPEG_PATH, bundledFfmpeg)) {
      const working = await spawnFfmpeg(candidate, ["-version"], PROBE_TIMEOUT_MS).then(
        (result) => result.code === 0,
        () => false,
      );
      if (working) return candidate;
    }
    return null;
  })();
  return resolvedBinary;
}

export async function isFfmpegAvailable(): Promise<boolean> {
  return (await resolveFfmpeg()) !== null;
}

export function resetFfmpegResolutionForTests() {
  resolvedBinary = null;
}

export async function runFfmpeg(args: string[], timeoutMs = FFMPEG_TIMEOUT_MS): Promise<FfmpegResult> {
  const binary = await resolveFfmpeg();
  if (!binary) throw new MuxError("ffmpeg is not available on the server", 503);
  return spawnFfmpeg(binary, args, timeoutMs);
}

export type VideoMode = "copy" | "transcode";

export function buildMuxArgs(videoPath: string, audioPath: string, outputPath: string, mode: VideoMode, videoSeconds: number): string[] {
  const video = mode === "copy" ? ["-c:v", "copy"] : ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p"];
  return [
    "-y", "-hide_banner", "-loglevel", "error",
    "-i", videoPath,
    "-i", audioPath,
    "-map", "0:v:0",
    "-map", "1:a:0",
    ...video,
    "-c:a", "aac",
    "-b:a", "192k",
    "-af", "apad",
    "-t", videoSeconds.toFixed(3),
    "-movflags", "+faststart",
    outputPath,
  ];
}

function lastLine(text: string): string {
  const lines = text.trim().split("\n").filter(Boolean);
  return lines[lines.length - 1] ?? "unknown error";
}

export function parseDurationSeconds(ffmpegOutput: string): number | null {
  const match = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(ffmpegOutput);
  if (!match) return null;
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  return seconds > 0 ? seconds : null;
}

export async function probeVideoSeconds(videoPath: string): Promise<number> {
  const { stderr } = await runFfmpeg(["-hide_banner", "-i", videoPath], PROBE_TIMEOUT_MS);
  const seconds = parseDurationSeconds(stderr);
  if (seconds === null) throw new MuxError("Could not read the length of the original video", 422);
  return seconds;
}

export async function muxVideoWithAudio(videoPath: string, audioPath: string, outputPath: string): Promise<VideoMode> {
  const videoSeconds = await probeVideoSeconds(videoPath);
  const copy = await runFfmpeg(buildMuxArgs(videoPath, audioPath, outputPath, "copy", videoSeconds));
  if (copy.code === 0) return "copy";
  const transcode = await runFfmpeg(buildMuxArgs(videoPath, audioPath, outputPath, "transcode", videoSeconds));
  if (transcode.code === 0) return "transcode";
  throw new MuxError(`Could not combine the audio with the video: ${lastLine(transcode.stderr)}`, 422);
}

type FetchLike = (input: URL, init: { redirect: "manual"; signal: AbortSignal }) => Promise<Response>;

export type DownloadOptions = {
  maxBytes: number;
  what: string;
  failureCode?: string;
  validateHop?: (url: URL) => void;
  fetchImpl?: FetchLike;
};

export async function downloadToFile(rawUrl: string, destination: string, policy: HostPolicy, options: DownloadOptions): Promise<number> {
  const { maxBytes, what, failureCode, validateHop } = options;
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const fail = (message: string, status: number) => new MuxError(message, status, failureCode);

  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw fail(`The ${what} URL is not valid`, 400);
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    try {
      checkUrlShape(current, policy);
      validateHop?.(current);
      await assertPublicHost(current.hostname, policy);
    } catch (error) {
      if (error instanceof UnsafeUrlError) throw fail(error.message, 400);
      throw error;
    }

    const response = await fetchImpl(current, { redirect: "manual", signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }).catch(() => {
      throw fail(`Could not download the ${what}`, 502);
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw fail(`The ${what} URL redirected without a location`, 502);
      current = new URL(location, current);
      continue;
    }
    if (!response.ok || !response.body) throw fail(`The ${what} URL returned HTTP ${response.status}. Check that it is public and has not expired.`, 502);
    if (Number(response.headers.get("content-length")) > maxBytes) throw fail(`The ${what} is too large to combine`, 413);

    let received = 0;
    const cap = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        if (received > maxBytes) callback(fail(`The ${what} is too large to combine`, 413));
        else callback(null, chunk);
      },
    });
    try {
      await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), cap, createWriteStream(destination));
    } catch (error) {
      if (error instanceof MuxError) throw error;
      throw fail(`The ${what} download was interrupted`, 502);
    }
    return received;
  }
  throw fail(`The ${what} URL redirected too many times`, 502);
}

export function downloadVideo(
  rawUrl: string,
  destination: string,
  policy: HostPolicy,
  options: { maxBytes?: number; fetchImpl?: FetchLike } = {},
): Promise<number> {
  return downloadToFile(rawUrl, destination, policy, { maxBytes: options.maxBytes ?? MAX_VIDEO_BYTES, what: "original video", fetchImpl: options.fetchImpl });
}

export function downloadDubAudio(
  rawUrl: string,
  destination: string,
  policy: HostPolicy,
  validateHop: (url: URL) => void,
  options: { maxBytes?: number; fetchImpl?: FetchLike } = {},
): Promise<number> {
  return downloadToFile(rawUrl, destination, policy, {
    maxBytes: options.maxBytes ?? MAX_AUDIO_BYTES,
    what: "dubbed audio",
    failureCode: "audio_download_failed",
    validateHop,
    fetchImpl: options.fetchImpl,
  });
}

const globalForMux = globalThis as unknown as { __seedAudioMuxLimiter?: Limiter };

export function getMuxLimiter(): Limiter {
  globalForMux.__seedAudioMuxLimiter ??= createLimiter(1);
  return globalForMux.__seedAudioMuxLimiter;
}
