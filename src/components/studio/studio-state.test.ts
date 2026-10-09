import { describe, expect, it } from "vitest";
import { clipLimits, EMPTY_FORM, validateStudioForm, visibleErrors, type ReferenceAudioItem, type StudioFormState } from "./studio-state";

const clip = (id: string, source = `https://x.test/${id}.wav`): ReferenceAudioItem => ({ id, name: id, source, origin: "url" });
const form = (patch: Partial<StudioFormState>): StudioFormState => ({ ...EMPTY_FORM, ...patch });

describe("validateStudioForm", () => {
  it("accepts a text prompt and carries the config", () => {
    const result = validateStudioForm("text-to-audio", form({ prompt: "Hello" }), { speechRate: 5 });
    expect(result).toMatchObject({ ok: true, request: { mode: "text-to-audio", prompt: "Hello", config: { speechRate: 5 } } });
  });

  it("reports a blank prompt on the prompt field", () => {
    expect(validateStudioForm("text-to-audio", form({ prompt: "  " }), {})).toMatchObject({ ok: false, errors: { prompt: expect.any(String) } });
  });

  it("requires a reference clip for reference voice", () => {
    const result = validateStudioForm("reference-voice", form({ prompt: "Hi" }), {});
    expect(result).toMatchObject({ ok: false, errors: { audios: expect.stringContaining("reference") } });
  });

  it("flags a seventh reference clip", () => {
    const clips = Array.from({ length: 7 }, (_, index) => clip(String(index)));
    expect(validateStudioForm("reference-voice", form({ prompt: "Hi", referenceAudios: clips }), {})).toMatchObject({ ok: false });
  });

  it("requires a video URL for video to audio but allows no audio clips", () => {
    expect(validateStudioForm("video-to-audio", form({ prompt: "Hi" }), {})).toMatchObject({ ok: false, errors: { video: "Add a video URL" } });
    expect(validateStudioForm("video-to-audio", form({ prompt: "Hi", videoSource: "https://x.test/v.mp4" }), {})).toMatchObject({ ok: true });
  });

  it("explains an invalid video URL differently from a missing one", () => {
    const result = validateStudioForm("video-to-audio", form({ prompt: "Hi", videoSource: "clip.mp4" }), {});
    expect(result).toMatchObject({ ok: false, errors: { video: expect.stringContaining("public") } });
  });

  it("builds a translation request without text, dropping blank glossary rows", () => {
    const result = validateStudioForm(
      "video-translation",
      form({
        videoSource: "https://x.test/s.mp4",
        targetLanguage: "en",
        glossaries: [
          { id: "1", source: "火山方舟", target: "ModelArk" },
          { id: "2", source: "", target: "" },
        ],
      }),
      {},
    );
    expect(result).toMatchObject({ ok: true });
    if (result.ok && result.request.mode === "video-translation") {
      expect(result.request.glossaries).toEqual([{ source: "火山方舟", target: "ModelArk" }]);
    }
  });

  it("requires a target language for translation", () => {
    expect(validateStudioForm("video-translation", form({ videoSource: "https://x.test/s.mp4" }), {})).toMatchObject({
      ok: false,
      errors: { targetLanguage: expect.any(String) },
    });
  });

  it("flags half-filled glossary rows", () => {
    const result = validateStudioForm(
      "video-translation",
      form({ videoSource: "https://x.test/s.mp4", targetLanguage: "en", glossaries: [{ id: "1", source: "a", target: "" }] }),
      {},
    );
    expect(result).toMatchObject({ ok: false, errors: { glossaries: expect.any(String) } });
  });

  it("uses only the first clip for stem separation and requires one", () => {
    expect(validateStudioForm("stem-separation", form({ prompt: "Split" }), {})).toMatchObject({ ok: false, errors: { audios: "Add the audio to separate" } });
    const result = validateStudioForm("stem-separation", form({ prompt: "Split", referenceAudios: [clip("a"), clip("b")] }), {});
    expect(result).toMatchObject({ ok: true, request: { audio: "https://x.test/a.wav" } });
  });

  it("surfaces audio config conflicts on the config field", () => {
    const result = validateStudioForm("text-to-audio", form({ prompt: "Hi" }), { outputFormat: "ogg_opus", sampleRate: 44100 });
    expect(result).toMatchObject({ ok: false, errors: { config: expect.stringContaining("48000") } });
  });
});

describe("clip length rules", () => {
  const timed = (id: string, durationSeconds: number | null): ReferenceAudioItem => ({ ...clip(id), durationSeconds });

  it("shares one set of limits with the form: 2-30 s for references, 2-360 s for separation", () => {
    expect(clipLimits("reference-voice")).toEqual({ min: 2, max: 30 });
    expect(clipLimits("video-to-audio")).toEqual({ min: 2, max: 30 });
    expect(clipLimits("stem-separation")).toEqual({ min: 2, max: 360 });
  });

  it("blocks clips outside the range at both boundaries and names the clip", () => {
    const form1 = form({ prompt: "Woman (@Audio1) says hi", referenceAudios: [timed("short", 1.9), timed("ok-low", 2), timed("ok-high", 30), timed("long", 30.1)] });
    const result = validateStudioForm("reference-voice", form1, {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors.clips ?? {}).sort()).toEqual(["long", "short"]);
      expect(result.errors.clips?.long).toMatch(/2-30 seconds/);
      expect(result.errors.audios).toMatch(/outside the allowed length/);
    }
  });

  it("accepts clips of unknown duration (URLs we could not probe)", () => {
    expect(validateStudioForm("reference-voice", form({ prompt: "Woman (@Audio1) says hi", referenceAudios: [timed("a", null)] }), {}).ok).toBe(true);
  });

  it("allows a 5 minute separation file that a reference clip would not", () => {
    expect(validateStudioForm("stem-separation", form({ prompt: "Split", referenceAudios: [timed("a", 300)] }), {}).ok).toBe(true);
    expect(validateStudioForm("stem-separation", form({ prompt: "Split", referenceAudios: [timed("a", 361)] }), {}).ok).toBe(false);
  });

  it("enforces the 180 second total across reference clips", () => {
    const clips = Array.from({ length: 7 }, (_, index) => timed(String(index), 28)).slice(0, 6);
    const exactly = form({ prompt: "(@Audio1)(@Audio2)(@Audio3)(@Audio4)(@Audio5)(@Audio6)", referenceAudios: clips.map((item) => ({ ...item, durationSeconds: 30 })) });
    expect(validateStudioForm("reference-voice", exactly, {}).ok).toBe(true);
    const over = form({ prompt: "(@Audio1)(@Audio2)(@Audio3)(@Audio4)(@Audio5)(@Audio6)", referenceAudios: clips.map((item, index) => ({ ...item, durationSeconds: index === 0 ? 30.5 : 30 })) });
    const result = validateStudioForm("reference-voice", over, {});
    expect(result.ok).toBe(false);
  });

  it("does not apply clip rules to modes without reference audio", () => {
    expect(validateStudioForm("text-to-audio", form({ prompt: "Hi", referenceAudios: [timed("a", 999)] }), {}).ok).toBe(true);
  });
});

describe("prompt check errors block submission", () => {
  it("rejects a tag with no matching clip", () => {
    const result = validateStudioForm("reference-voice", form({ prompt: "Woman (@Audio3) says hi", referenceAudios: [clip("a")] }), {});
    expect(result).toMatchObject({ ok: false, errors: { prompt: expect.stringContaining("@Audio3") } });
  });

  it("rejects tags in a mode without reference audio", () => {
    expect(validateStudioForm("text-to-audio", form({ prompt: "Woman (@Audio1) says hi" }), {})).toMatchObject({ ok: false, errors: { prompt: expect.any(String) } });
  });

  it("rejects timeline lines whose end is not after the start", () => {
    expect(validateStudioForm("text-to-audio", form({ prompt: "00:09-00:07 Mara (steady): Again please." }), {})).toMatchObject({ ok: false, errors: { prompt: expect.stringContaining("end time") } });
  });

  it("lets warnings and tips through", () => {
    expect(validateStudioForm("reference-voice", form({ prompt: "Say hello warmly", referenceAudios: [clip("a")] }), {}).ok).toBe(true);
  });

  it("keeps the schema message when the prompt is empty", () => {
    expect(validateStudioForm("text-to-audio", form({ prompt: " " }), {})).toMatchObject({ ok: false, errors: { prompt: "Write a prompt first" } });
  });
});

describe("glossary rows", () => {
  const base = { videoSource: "https://x.test/s.mp4", targetLanguage: "en" };

  it("flags the exact row and side that is incomplete", () => {
    const result = validateStudioForm("video-translation", form({ ...base, glossaries: [{ id: "r1", source: "a", target: "" }, { id: "r2", source: "", target: "b" }, { id: "r3", source: "c", target: "d" }] }), {});
    expect(result).toMatchObject({ ok: false, errors: { glossaries: expect.stringContaining("both sides"), glossaryRows: { r1: { target: expect.any(String) }, r2: { source: expect.any(String) } } } });
    if (!result.ok) expect(result.errors.glossaryRows?.r3).toBeUndefined();
  });

  it("treats whitespace-only terms as blank and ignores fully blank rows", () => {
    expect(validateStudioForm("video-translation", form({ ...base, glossaries: [{ id: "r1", source: "  ", target: " " }] }), {}).ok).toBe(true);
    expect(validateStudioForm("video-translation", form({ ...base, glossaries: [{ id: "r1", source: "a", target: "  " }] }), {}).ok).toBe(false);
  });
});

describe("request size", () => {
  it("blocks inline uploads that cannot fit in the 64 MB request even when each clip is under 15 MB", () => {
    const big = (id: string) => ({ ...clip(id, `data:audio/wav;base64,${"A".repeat(20_000_000)}`), origin: "file" as const });
    const result = validateStudioForm("reference-voice", form({ prompt: "(@Audio1)(@Audio2)(@Audio3)(@Audio4)", referenceAudios: ["a", "b", "c", "d"].map(big) }), {});
    expect(result).toMatchObject({ ok: false, errors: { audios: expect.stringMatching(/request limit/) } });
  });

  it("accepts a realistic mix of uploads under the request limit", () => {
    const ok = (id: string) => ({ ...clip(id, `data:audio/wav;base64,${"A".repeat(5_000_000)}`), origin: "file" as const });
    expect(validateStudioForm("reference-voice", form({ prompt: "(@Audio1)(@Audio2)(@Audio3)", referenceAudios: ["a", "b", "c"].map(ok) }), {}).ok).toBe(true);
  });
});

describe("visibleErrors", () => {
  const empty = form({});
  const all = { prompt: "Write a prompt first", audios: "Add at least one reference clip", video: "Add a video URL", targetLanguage: "Choose a target language", config: "bad" };

  it("hides required-field errors on untouched empty fields until a submit is attempted", () => {
    expect(visibleErrors(all, empty, false)).toEqual({ config: "bad" });
    expect(visibleErrors(all, empty, true)).toEqual(all);
  });

  it("shows invalid values immediately once the field has content", () => {
    const typed = form({ prompt: "x", videoSource: "clip.mp4", targetLanguage: "xx", referenceAudios: [clip("a")] });
    expect(visibleErrors(all, typed, false)).toEqual(all);
  });
});

describe("reference image", () => {
  const image = (width: number, height: number) => ({ name: "i.png", source: "https://x.test/i.png", origin: "url" as const, width, height });

  it("is sent only for text to audio and blocks images the API would reject", () => {
    expect(validateStudioForm("text-to-audio", form({ prompt: "Hi", referenceImage: image(640, 480) }), {})).toMatchObject({ ok: true, request: { referenceImage: "https://x.test/i.png" } });
    const small = validateStudioForm("text-to-audio", form({ prompt: "Hi", referenceImage: image(100, 100) }), {});
    expect(small).toMatchObject({ ok: false, errors: { image: expect.stringContaining("300-6000px") } });
    const wide = validateStudioForm("text-to-audio", form({ prompt: "Hi", referenceImage: image(2000, 400) }), {});
    expect(wide).toMatchObject({ ok: false, errors: { image: expect.stringContaining("aspect ratio") } });
  });

  it("does not check dimensions it does not know, and ignores the image in other modes", () => {
    const unknown = { name: "i.png", source: "https://x.test/i.png", origin: "url" as const };
    expect(validateStudioForm("text-to-audio", form({ prompt: "Hi", referenceImage: unknown }), {}).ok).toBe(true);
    const voice = validateStudioForm("reference-voice", form({ prompt: "(@Audio1) says hi", referenceAudios: [clip("a")], referenceImage: image(10, 10) }), {});
    expect(voice.ok).toBe(true);
  });
});

describe("dubbed video option", () => {
  const dub = { videoSource: "https://x.test/s.mp4", targetLanguage: "ja" };

  it("is fine for wav, mp3 and ogg, and for the default format", () => {
    for (const outputFormat of [undefined, "wav", "mp3", "ogg_opus"] as const) {
      expect(validateStudioForm("video-translation", form({ ...dub, muxVideo: true }), { outputFormat }).ok, String(outputFormat)).toBe(true);
    }
  });

  it("is blocked for raw PCM, which ffmpeg cannot read without parameters", () => {
    expect(validateStudioForm("video-translation", form({ ...dub, muxVideo: true }), { outputFormat: "pcm" })).toMatchObject({ ok: false, errors: { mux: expect.stringContaining("PCM") } });
  });

  it("does not matter when the option is off or in other modes", () => {
    expect(validateStudioForm("video-translation", form({ ...dub, muxVideo: false }), { outputFormat: "pcm" }).ok).toBe(true);
    expect(validateStudioForm("text-to-audio", form({ prompt: "Hi", muxVideo: true }), { outputFormat: "pcm" }).ok).toBe(true);
  });
});

describe("platform upload limit", () => {
  const vercel = { maxRequestBytes: Math.floor(4.5 * 1024 * 1024) };
  const upload = (id: string, chars: number) => ({ ...clip(id, `data:audio/wav;base64,${"A".repeat(chars)}`), origin: "file" as const });

  it("blocks uploads over a small platform limit with an explanation that points to URLs", () => {
    const result = validateStudioForm("reference-voice", form({ prompt: "(@Audio1) says hi", referenceAudios: [upload("a", 6_000_000)] }), {}, vercel);
    expect(result).toMatchObject({ ok: false, errors: { audios: expect.stringMatching(/this deployment accepts at most 4\.5 MB.*public URLs/) } });
  });

  it("allows the same upload where the limit is larger, and small uploads on both", () => {
    const big = form({ prompt: "(@Audio1) says hi", referenceAudios: [upload("a", 6_000_000)] });
    expect(validateStudioForm("reference-voice", big, {}).ok).toBe(true);
    const small = form({ prompt: "(@Audio1) says hi", referenceAudios: [upload("a", 3_000_000)] });
    expect(validateStudioForm("reference-voice", small, {}, vercel).ok).toBe(true);
  });

  it("counts an uploaded reference image toward the limit and reports it on the image field", () => {
    const image = { name: "i.png", source: `data:image/png;base64,${"A".repeat(6_000_000)}`, origin: "file" as const, width: 800, height: 600 };
    expect(validateStudioForm("text-to-audio", form({ prompt: "Hi", referenceImage: image }), {}, vercel)).toMatchObject({ ok: false, errors: { image: expect.stringContaining("this deployment") } });
    expect(validateStudioForm("text-to-audio", form({ prompt: "Hi", referenceImage: image }), {}).ok).toBe(true);
  });

  it("does not count URL sources", () => {
    expect(validateStudioForm("reference-voice", form({ prompt: "(@Audio1) says hi", referenceAudios: [clip("a")] }), {}, vercel).ok).toBe(true);
  });
});
