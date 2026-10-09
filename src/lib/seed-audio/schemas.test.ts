import { describe, expect, it } from "vitest";
import { MAX_INLINE_AUDIO_BYTES } from "./constants";
import { audioConfigSchema, generateRequestSchema } from "./schemas";

const wavDataUri = "data:audio/wav;base64,AAAA";

describe("audioConfigSchema", () => {
  it("accepts boundary values", () => {
    const result = audioConfigSchema.safeParse({ sampleRate: 44100, speechRate: -50, loudnessRate: 100, pitchRate: 12 });
    expect(result.success).toBe(true);
  });

  it.each([{ speechRate: 101 }, { loudnessRate: -51 }, { pitchRate: 13 }, { pitchRate: -13 }, { speechRate: 1.5 }])(
    "rejects out of range or fractional rate %o",
    (config) => {
      expect(audioConfigSchema.safeParse(config).success).toBe(false);
    },
  );

  it("rejects unsupported sample rates", () => {
    expect(audioConfigSchema.safeParse({ sampleRate: 22050 }).success).toBe(false);
  });

  it("requires 48000 Hz for ogg_opus", () => {
    expect(audioConfigSchema.safeParse({ outputFormat: "ogg_opus", sampleRate: 44100 }).success).toBe(false);
    expect(audioConfigSchema.safeParse({ outputFormat: "ogg_opus", sampleRate: 48000 }).success).toBe(true);
    expect(audioConfigSchema.safeParse({ outputFormat: "ogg_opus" }).success).toBe(true);
  });
});

describe("generateRequestSchema", () => {
  it("accepts text to audio and defaults config", () => {
    const result = generateRequestSchema.parse({ mode: "text-to-audio", prompt: "  Hello  " });
    expect(result).toMatchObject({ prompt: "Hello", config: {} });
  });

  it.each(["", "   "])("rejects blank prompt %j", (prompt) => {
    expect(generateRequestSchema.safeParse({ mode: "text-to-audio", prompt }).success).toBe(false);
  });

  it("requires at least one and at most six reference audios", () => {
    const base = { mode: "reference-voice", prompt: "Hi" };
    expect(generateRequestSchema.safeParse({ ...base, referenceAudios: [] }).success).toBe(false);
    const six = Array.from({ length: 6 }, (_, index) => `https://x.test/${index}.wav`);
    expect(generateRequestSchema.safeParse({ ...base, referenceAudios: six }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ ...base, referenceAudios: [...six, "https://x.test/7.wav"] }).success).toBe(false);
  });

  it("accepts inline wav and mp3 but rejects other formats and oversize data", () => {
    const base = { mode: "stem-separation", prompt: "Split" };
    expect(generateRequestSchema.safeParse({ ...base, audio: wavDataUri }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ ...base, audio: "data:audio/mp3;base64,AAAA" }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ ...base, audio: "data:audio/flac;base64,AAAA" }).success).toBe(false);
    const oversize = `data:audio/wav;base64,${"A".repeat(Math.ceil((MAX_INLINE_AUDIO_BYTES * 4) / 3) + 1024)}`;
    expect(generateRequestSchema.safeParse({ ...base, audio: oversize }).success).toBe(false);
  });

  it("rejects non-http audio and video sources", () => {
    expect(generateRequestSchema.safeParse({ mode: "stem-separation", prompt: "Split", audio: "file:///etc/passwd" }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ mode: "video-to-audio", prompt: "Hi", referenceVideo: "clip.mp4" }).success).toBe(false);
  });

  it("accepts tos:// video for translation and requires a target language", () => {
    const base = { mode: "video-translation", video: "tos://bucket/p/v.mp4" };
    expect(generateRequestSchema.safeParse({ ...base, targetLanguage: "en" }).success).toBe(true);
    expect(generateRequestSchema.safeParse(base).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...base, targetLanguage: "xx" }).success).toBe(false);
  });

  it("rejects incomplete glossary entries", () => {
    const base = { mode: "video-translation", video: "https://x.test/v.mp4", targetLanguage: "en" };
    expect(generateRequestSchema.safeParse({ ...base, glossaries: [{ source: "a", target: "" }] }).success).toBe(false);
  });

  it("rejects unknown modes", () => {
    expect(generateRequestSchema.safeParse({ mode: "music", prompt: "x" }).success).toBe(false);
  });

  it("validates the reference image source", () => {
    const base = { mode: "text-to-audio", prompt: "Hi" };
    expect(generateRequestSchema.safeParse({ ...base, referenceImage: "https://x.test/i.png" }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ ...base, referenceImage: "data:image/jpeg;base64,AAAA" }).success).toBe(true);
    expect(generateRequestSchema.safeParse({ ...base, referenceImage: "data:image/svg+xml;base64,AAAA" }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...base, referenceImage: "file:///etc/passwd" }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...base, referenceImage: `data:image/png;base64,${"A".repeat(14_000_000)}` }).success).toBe(false);
  });
});
