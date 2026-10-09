import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import bundledFfmpeg from "ffmpeg-static";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildMuxArgs, downloadDubAudio, downloadVideo, ffmpegCandidates, isFfmpegAvailable, MuxError, muxVideoWithAudio, resetFfmpegResolutionForTests, resolveFfmpeg, runFfmpeg } from "./mux";
import { UnsafeUrlError } from "./url-guard";

const local = { allowLocalhost: true };

describe("buildMuxArgs", () => {
  it("copies the video stream, replaces the audio with AAC, pads it and stops at the video end", () => {
    const args = buildMuxArgs("v.mp4", "a.wav", "out.mp4", "copy");
    expect(args).toEqual(expect.arrayContaining(["-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-af", "apad", "-shortest", "+faststart"]));
    expect(args.indexOf("v.mp4")).toBeLessThan(args.indexOf("a.wav"));
    expect(args.at(-1)).toBe("out.mp4");
    expect(args).not.toContain("0:a");
  });

  it("re-encodes the picture to h264 in transcode mode", () => {
    const args = buildMuxArgs("v", "a", "o.mp4", "transcode");
    expect(args).toEqual(expect.arrayContaining(["-c:v", "libx264", "-pix_fmt", "yuv420p"]));
    expect(args).not.toContain("copy");
  });

  it("never builds a shell string: every input is its own argument", () => {
    const hostile = "x; rm -rf / #.mp4";
    expect(buildMuxArgs(hostile, "a", "o.mp4", "copy")).toContain(hostile);
  });
});

describe("downloadVideo", () => {
  let server: Server;
  let base: string;
  let directory: string;
  const payload = Buffer.alloc(200_000, 7);

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "mux-test-"));
    server = createServer((request, response) => {
      const path = request.url ?? "/";
      if (path === "/ok") return void response.writeHead(200, { "content-length": payload.length }).end(payload);
      if (path === "/chunked") {
        response.writeHead(200);
        response.write(payload);
        return void response.end(payload);
      }
      if (path === "/redirect") return void response.writeHead(302, { location: "/ok" }).end();
      if (path === "/loop") return void response.writeHead(302, { location: "/loop" }).end();
      if (path === "/to-metadata") return void response.writeHead(302, { location: "http://169.254.169.254/latest" }).end();
      if (path === "/no-location") return void response.writeHead(302).end();
      if (path === "/forbidden") return void response.writeHead(403).end("no");
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.close();
    await rm(directory, { recursive: true, force: true });
  });

  const destination = () => join(directory, `${Math.random().toString(36).slice(2)}.bin`);

  it("downloads a video and reports its size", async () => {
    const file = destination();
    expect(await downloadVideo(`${base}/ok`, file, local)).toBe(payload.length);
    expect((await readFile(file)).equals(payload)).toBe(true);
  });

  it("follows a same-host redirect", async () => {
    expect(await downloadVideo(`${base}/redirect`, destination(), local)).toBe(payload.length);
  });

  it("refuses a redirect into a private address", async () => {
    await expect(downloadVideo(`${base}/to-metadata`, destination(), local)).rejects.toMatchObject({ name: "MuxError", status: 400 });
  });

  it("stops redirect loops and redirects without a location", async () => {
    await expect(downloadVideo(`${base}/loop`, destination(), local)).rejects.toThrow(/too many times/);
    await expect(downloadVideo(`${base}/no-location`, destination(), local)).rejects.toThrow(/without a location/);
  });

  it("enforces the size cap from the declared length and from the streamed bytes", async () => {
    await expect(downloadVideo(`${base}/ok`, destination(), local, { maxBytes: 1000 })).rejects.toMatchObject({ status: 413 });
    await expect(downloadVideo(`${base}/chunked`, destination(), local, { maxBytes: 300_000 })).rejects.toMatchObject({ status: 413 });
  });

  it("maps HTTP failures and bad input to clear errors", async () => {
    await expect(downloadVideo(`${base}/forbidden`, destination(), local)).rejects.toThrow(/HTTP 403/);
    await expect(downloadVideo(`${base}/missing`, destination(), local)).rejects.toThrow(/HTTP 404/);
    await expect(downloadVideo("not a url", destination(), local)).rejects.toMatchObject({ status: 400 });
    await expect(downloadVideo("http://10.0.0.5/v.mp4", destination(), local)).rejects.toMatchObject({ status: 400 });
  });

  it("does not allow localhost unless the policy says so", async () => {
    await expect(downloadVideo(`${base}/ok`, destination(), { allowLocalhost: false })).rejects.toBeInstanceOf(MuxError);
  });
});

const ffmpegReady = await isFfmpegAvailable();
const probe = (file: string) => {
  const output = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name:format=duration", "-of", "json", file]).stdout.toString();
  const parsed = JSON.parse(output) as { streams: { codec_type: string; codec_name: string }[]; format: { duration: string } };
  return { streams: parsed.streams, duration: Number(parsed.format.duration) };
};

describe.skipIf(!ffmpegReady)("muxVideoWithAudio (real ffmpeg)", () => {
  let directory: string;
  const make = async (name: string, args: string[]) => {
    const file = join(directory, name);
    const result = await runFfmpeg(["-y", "-hide_banner", "-loglevel", "error", ...args, file]);
    expect(result.code, result.stderr).toBe(0);
    return file;
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "mux-ffmpeg-"));
  });
  afterAll(() => rm(directory, { recursive: true, force: true }));

  const sourceVideo = () => make("source.mp4", ["-f", "lavfi", "-i", "testsrc=size=320x240:rate=25", "-f", "lavfi", "-i", "sine=frequency=300", "-t", "4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"]);
  const dub = (seconds: number, extension = "wav") => make(`dub-${seconds}.${extension}`, ["-f", "lavfi", "-i", "sine=frequency=880", "-t", String(seconds)]);

  it("keeps the picture stream untouched, replaces the audio and matches the video length", async () => {
    const out = join(directory, "copy.mp4");
    expect(await muxVideoWithAudio(await sourceVideo(), await dub(4), out)).toBe("copy");
    const { streams, duration } = probe(out);
    expect(streams.map((stream) => `${stream.codec_type}:${stream.codec_name}`).sort()).toEqual(["audio:aac", "video:h264"]);
    expect(duration).toBeGreaterThan(3.8);
    expect(duration).toBeLessThan(4.3);
  });

  it("pads a shorter dub with silence so the whole video is kept", async () => {
    const out = join(directory, "short.mp4");
    await muxVideoWithAudio(await sourceVideo(), await dub(2), out);
    expect(probe(out).duration).toBeGreaterThan(3.8);
  });

  it("cuts a longer dub at the end of the video", async () => {
    const out = join(directory, "long.mp4");
    await muxVideoWithAudio(await sourceVideo(), await dub(9), out);
    expect(probe(out).duration).toBeLessThan(4.4);
  });

  it("accepts mp3 and ogg dubs", async () => {
    for (const extension of ["mp3", "ogg"]) {
      const out = join(directory, `from-${extension}.mp4`);
      await muxVideoWithAudio(await sourceVideo(), await dub(3, extension), out);
      expect((await stat(out)).size).toBeGreaterThan(1000);
    }
  });

  it("reports a readable error when the video has no picture", async () => {
    const audioOnly = await dub(2, "mp3");
    await expect(muxVideoWithAudio(audioOnly, await dub(2), join(directory, "bad.mp4"))).rejects.toMatchObject({ name: "MuxError", status: 422 });
  });

  it("falls back to re-encoding when the picture cannot be copied into mp4", async () => {
    const hasVp8 = spawnSync("ffmpeg", ["-hide_banner", "-encoders"]).stdout.toString().includes("libvpx ");
    if (!hasVp8) return;
    const webm = await make("source.webm", ["-f", "lavfi", "-i", "testsrc=size=320x240:rate=25", "-t", "2", "-c:v", "libvpx", "-an"]);
    const out = join(directory, "transcoded.mp4");
    expect(await muxVideoWithAudio(webm, await dub(2), out)).toBe("transcode");
    expect(probe(out).streams.map((stream) => stream.codec_name)).toContain("h264");
  });
});

describe("ffmpegCandidates", () => {
  it("orders the configured path, then the system binary, then the bundled one, without duplicates or blanks", () => {
    expect(ffmpegCandidates("/opt/ffmpeg", "/app/node_modules/ffmpeg-static/ffmpeg")).toEqual(["/opt/ffmpeg", "ffmpeg", "/app/node_modules/ffmpeg-static/ffmpeg"]);
    expect(ffmpegCandidates(undefined, "/b/ffmpeg")).toEqual(["ffmpeg", "/b/ffmpeg"]);
    expect(ffmpegCandidates("  ", null)).toEqual(["ffmpeg"]);
    expect(ffmpegCandidates("ffmpeg", "ffmpeg")).toEqual(["ffmpeg"]);
  });
});

describe("bundled ffmpeg (the binary a Vercel deployment would use)", () => {
  it("is installed, executable and reports its version", () => {
    expect(bundledFfmpeg).toBeTruthy();
    const result = spawnSync(bundledFfmpeg as string, ["-version"]);
    expect(result.status).toBe(0);
    expect(result.stdout.toString()).toMatch(/^ffmpeg version/);
  });

  it("is used when the configured path and the system binary are unavailable", async () => {
    vi.stubEnv("FFMPEG_PATH", "/nonexistent/ffmpeg");
    resetFfmpegResolutionForTests();
    const binary = await resolveFfmpeg();
    expect(binary).not.toBe("/nonexistent/ffmpeg");
    expect(binary).toBeTruthy();
    vi.unstubAllEnvs();
    resetFfmpegResolutionForTests();
  });

  it("muxes with the bundled binary alone", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mux-bundled-"));
    const run = (args: string[]) => spawnSync(bundledFfmpeg as string, ["-y", "-hide_banner", "-loglevel", "error", ...args]);
    run(["-f", "lavfi", "-i", "testsrc=size=320x240:rate=25", "-t", "2", "-c:v", "libx264", "-pix_fmt", "yuv420p", join(directory, "v.mp4")]);
    run(["-f", "lavfi", "-i", "sine=frequency=500", "-t", "2", join(directory, "a.wav")]);
    vi.stubEnv("FFMPEG_PATH", bundledFfmpeg as string);
    resetFfmpegResolutionForTests();
    expect(await muxVideoWithAudio(join(directory, "v.mp4"), join(directory, "a.wav"), join(directory, "out.mp4"))).toBe("copy");
    expect((await stat(join(directory, "out.mp4"))).size).toBeGreaterThan(1000);
    vi.unstubAllEnvs();
    resetFfmpegResolutionForTests();
    await rm(directory, { recursive: true, force: true });
  });
});

describe("downloadDubAudio", () => {
  let server: Server;
  let base: string;
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "mux-audio-"));
    server = createServer((request, response) => {
      if (request.url === "/dub.wav") return void response.writeHead(200, { "content-length": 5000 }).end(Buffer.alloc(5000, 1));
      response.writeHead(410).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.close();
    await rm(directory, { recursive: true, force: true });
  });

  const allowAll = () => undefined;

  it("downloads the dub audio", async () => {
    expect(await downloadDubAudio(`${base}/dub.wav`, join(directory, "a.wav"), local, allowAll)).toBe(5000);
  });

  it("tags every failure with a code so the client knows an upload fallback is worthwhile", async () => {
    const reject = () => {
      throw new UnsafeUrlError("The dubbed audio must come from a Seed Audio result link");
    };
    await expect(downloadDubAudio(`${base}/dub.wav`, join(directory, "b.wav"), local, reject)).rejects.toMatchObject({ status: 400, code: "audio_download_failed" });
    await expect(downloadDubAudio(`${base}/expired.wav`, join(directory, "c.wav"), local, allowAll)).rejects.toMatchObject({ status: 502, code: "audio_download_failed" });
    await expect(downloadDubAudio("nope", join(directory, "d.wav"), local, allowAll)).rejects.toMatchObject({ status: 400, code: "audio_download_failed" });
    await expect(downloadDubAudio(`${base}/dub.wav`, join(directory, "e.wav"), local, allowAll, { maxBytes: 100 })).rejects.toMatchObject({ status: 413, code: "audio_download_failed" });
  });

  it("does not tag video failures, which an audio upload cannot fix", async () => {
    await expect(downloadVideo(`${base}/expired.mp4`, join(directory, "v.mp4"), local)).rejects.toMatchObject({ status: 502, code: undefined });
  });
});
