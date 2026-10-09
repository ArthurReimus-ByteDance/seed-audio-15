import { describe, expect, it } from "vitest";
import { MAX_INLINE_AUDIO_BYTES } from "@/lib/seed-audio/constants";
import { checkAudioFile, detectAudioFormat } from "./audio-files";

describe("detectAudioFormat", () => {
  it.each([
    ["voice.wav", "", "wav"],
    ["VOICE.MP3", "", "mp3"],
    ["noext", "audio/mpeg", "mp3"],
    ["clip", "audio/x-wav", "wav"],
    ["clip.flac", "audio/flac", null],
    ["clip.wav.exe", "application/octet-stream", null],
  ])("detects %s (%s) as %s", (name, type, expected) => {
    expect(detectAudioFormat(name, type)).toBe(expected);
  });
});

describe("checkAudioFile", () => {
  it("accepts a normal wav file as native", () => {
    expect(checkAudioFile({ name: "a.wav", type: "audio/wav", size: 1000 })).toEqual({ ok: true, kind: "native", format: "wav" });
  });

  it("marks other audio formats for browser conversion", () => {
    expect(checkAudioFile({ name: "memo.m4a", type: "audio/mp4", size: 1000 })).toEqual({ ok: true, kind: "convert" });
    expect(checkAudioFile({ name: "take.FLAC", type: "", size: 1000 })).toEqual({ ok: true, kind: "convert" });
    expect(checkAudioFile({ name: "voice", type: "audio/ogg", size: 1000 })).toEqual({ ok: true, kind: "convert" });
  });

  it("rejects non-audio files", () => {
    expect(checkAudioFile({ name: "notes.pdf", type: "application/pdf", size: 10 })).toMatchObject({ ok: false, reason: expect.stringContaining("unsupported") });
  });

  it("accepts a file exactly at the size limit and rejects one byte over", () => {
    expect(checkAudioFile({ name: "a.mp3", type: "", size: MAX_INLINE_AUDIO_BYTES }).ok).toBe(true);
    expect(checkAudioFile({ name: "a.mp3", type: "", size: MAX_INLINE_AUDIO_BYTES + 1 }).ok).toBe(false);
  });

  it("rejects empty files with a readable reason", () => {
    expect(checkAudioFile({ name: "a.wav", type: "", size: 0 })).toMatchObject({ ok: false, reason: expect.stringContaining("empty") });
  });
});
