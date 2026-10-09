import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("./http", async () => ({ ...(await vi.importActual<object>("./http")), http: { post: (...args: unknown[]) => post(...args) } }));

const { muxDubbedVideo, originalAudioUrl, MuxRequestError } = await import("./mux");

const errorResponse = (status: number, body: object) => ({ status, data: new Blob([JSON.stringify(body)], { type: "application/json" }), headers: {}, statusText: "", config: {} });

const jsonError = (status: number, body: object) => {
  const response = { status, data: new Blob([JSON.stringify(body)], { type: "application/json" }), headers: {}, statusText: "", config: {} };
  return new AxiosError("failed", "ERR_BAD_RESPONSE", undefined, undefined, response as never);
};

const fields = (callIndex: number) => Object.fromEntries((post.mock.calls[callIndex][1] as FormData).entries());

beforeEach(() => post.mockReset());

describe("originalAudioUrl", () => {
  it("extracts the upstream link from the local audio proxy path", () => {
    expect(originalAudioUrl("/api/audio?src=https%3A%2F%2Fa.volces.com%2Fx.wav%3Fsig%3D1")).toBe("https://a.volces.com/x.wav?sig=1");
  });

  it("returns null for anything else", () => {
    expect(originalAudioUrl("blob:http://localhost/abc")).toBeNull();
    expect(originalAudioUrl("/api/other?src=x")).toBeNull();
    expect(originalAudioUrl("/api/audio")).toBeNull();
    expect(originalAudioUrl("")).toBeNull();
  });
});

describe("muxDubbedVideo", () => {
  const audio = { url: "https://a.volces.com/x.wav", blob: new Blob(["dub"]) };

  it("sends the audio URL and no file when a URL is available", async () => {
    post.mockResolvedValue({ data: new Blob(["mp4"]) });
    await muxDubbedVideo("https://v.test/s.mp4", audio);
    expect(post).toHaveBeenCalledTimes(1);
    expect(fields(0)).toEqual({ videoUrl: "https://v.test/s.mp4", audioUrl: "https://a.volces.com/x.wav" });
  });

  it("falls back to uploading the audio only when the server could not fetch the audio URL", async () => {
    post.mockRejectedValueOnce(jsonError(502, { error: "The dubbed audio URL returned HTTP 403", code: "audio_download_failed" })).mockResolvedValueOnce({ data: new Blob(["mp4"]) });
    const result = await muxDubbedVideo("https://v.test/s.mp4", audio);
    expect(result).toBeInstanceOf(Blob);
    expect(post).toHaveBeenCalledTimes(2);
    expect(fields(1)).toHaveProperty("audio");
    expect(fields(1)).not.toHaveProperty("audioUrl");
  });

  it("does not retry other failures, such as a bad video URL, and surfaces the server message", async () => {
    post.mockRejectedValueOnce(jsonError(502, { error: "The original video URL returned HTTP 403." }));
    await expect(muxDubbedVideo("https://v.test/s.mp4", audio)).rejects.toThrow("The original video URL returned HTTP 403.");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("uploads directly when there is no audio URL", async () => {
    post.mockResolvedValue({ data: new Blob(["mp4"]) });
    await muxDubbedVideo("https://v.test/s.mp4", { url: null, blob: audio.blob });
    expect(fields(0)).toHaveProperty("audio");
  });

  it("reports an unreadable error body with the HTTP status, and keeps error codes", async () => {
    post.mockRejectedValueOnce(new AxiosError("x", "ERR", undefined, undefined, { ...errorResponse(500, {}), data: new Blob(["<html>"]) } as never));
    await expect(muxDubbedVideo("https://v.test/s.mp4", { url: null, blob: audio.blob })).rejects.toThrow(/\(500\)/);
    expect(new MuxRequestError("m", "c").code).toBe("c");
  });
});
