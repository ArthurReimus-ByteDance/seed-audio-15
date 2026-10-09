import { createReadStream } from "node:fs";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseAllowedAudioUrl } from "@/server/audio-url";
import { getServerEnv } from "@/server/env";
import { downloadDubAudio, downloadVideo, getMuxLimiter, isFfmpegAvailable, MAX_AUDIO_BYTES, MuxError, muxVideoWithAudio } from "@/server/mux";
import { UnsafeUrlError } from "@/server/url-guard";

export const maxDuration = 300;

const urlField = z.string().trim().min(1).max(4096);

const fail = (message: string, status: number, code?: string) => NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });

export async function POST(request: Request) {
  if (!(await isFfmpegAvailable())) {
    return fail("Combining audio with video needs ffmpeg on the server. Install ffmpeg or set FFMPEG_PATH.", 503);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return fail("Send the video URL and the dubbed audio as multipart form data", 400);

  const videoUrl = urlField.safeParse(form.get("videoUrl"));
  if (!videoUrl.success) return fail("A video URL is required", 400);

  const audioUrl = urlField.safeParse(form.get("audioUrl"));
  const audioFile = form.get("audio");
  if (!audioUrl.success && !(audioFile instanceof File && audioFile.size > 0)) return fail("The dubbed audio is required", 400);
  if (!audioUrl.success && audioFile instanceof File && audioFile.size > MAX_AUDIO_BYTES) return fail("The dubbed audio is too large to combine", 413);

  const allowLocalhost = process.env.NODE_ENV !== "production";
  const { audioHostSuffixes } = getServerEnv();
  const validateAudioHost = (url: URL) => {
    if (!parseAllowedAudioUrl(url.href, { hostSuffixes: audioHostSuffixes, allowLocalhost })) {
      throw new UnsafeUrlError("The dubbed audio must come from a Seed Audio result link");
    }
  };

  const directory = await mkdtemp(join(tmpdir(), "seed-mux-"));
  const cleanup = () => rm(directory, { recursive: true, force: true }).catch(() => undefined);
  const videoPath = join(directory, "source-video");
  const audioPath = join(directory, "dub-audio");
  const outputPath = join(directory, "dubbed.mp4");

  try {
    await getMuxLimiter().run(async () => {
      if (request.signal.aborted) throw new MuxError("Request cancelled", 499);
      await downloadVideo(videoUrl.data, videoPath, { allowLocalhost });
      if (audioUrl.success) {
        await downloadDubAudio(audioUrl.data, audioPath, { allowLocalhost }, validateAudioHost);
      } else if (audioFile instanceof File) {
        await writeFile(audioPath, Buffer.from(await audioFile.arrayBuffer()));
      }
      await muxVideoWithAudio(videoPath, audioPath, outputPath);
    });
    const { size } = await stat(outputPath);
    const stream = createReadStream(outputPath);
    stream.on("close", () => void cleanup());
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: { "content-type": "video/mp4", "content-length": String(size), "cache-control": "no-store" },
    });
  } catch (error) {
    await cleanup();
    if (error instanceof MuxError) return fail(error.message, error.status, error.code);
    return fail("Unexpected error while combining the audio with the video", 500);
  }
}
