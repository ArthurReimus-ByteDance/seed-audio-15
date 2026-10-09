import { describe, expect, it } from "vitest";
import { buildUpstreamPayload } from "./payload";
import { generateRequestSchema } from "./schemas";

const build = (input: unknown) => buildUpstreamPayload("ep-test", generateRequestSchema.parse(input));

describe("buildUpstreamPayload", () => {
  it("builds a text-only payload without optional blocks", () => {
    expect(build({ mode: "text-to-audio", prompt: "Hello" })).toEqual({
      model: "ep-test",
      content: [{ type: "text", text: "Hello" }],
    });
  });

  it("maps output options to snake_case", () => {
    const payload = build({
      mode: "text-to-audio",
      prompt: "Hello",
      config: { outputFormat: "mp3", sampleRate: 24000, speechRate: 10, pitchRate: 0 },
    });
    expect(payload.output_format).toBe("mp3");
    expect(payload.audio_config).toEqual({ sample_rate: 24000, speech_rate: 10, pitch_rate: 0 });
  });

  it("keeps zero-valued rates because zero is a real setting", () => {
    expect(build({ mode: "text-to-audio", prompt: "Hi", config: { speechRate: 0 } }).audio_config).toEqual({ speech_rate: 0 });
  });

  it("attaches reference audios with the reference_audio role in order", () => {
    const payload = build({ mode: "reference-voice", prompt: "Hi", referenceAudios: ["https://x.test/a.wav", "https://x.test/b.wav"] });
    expect(payload.content.map((item) => ("role" in item ? item.role : item.type))).toEqual(["text", "reference_audio", "reference_audio"]);
    expect(payload.content[1]).toMatchObject({ audio_url: { url: "https://x.test/a.wav" } });
  });

  it("uses reference_video for video to audio and never dubbing_video", () => {
    const payload = build({ mode: "video-to-audio", prompt: "Dub", referenceVideo: "https://x.test/v.mp4", referenceAudios: ["https://x.test/a.wav"] });
    const roles = payload.content.map((item) => ("role" in item ? item.role : null));
    expect(roles).toEqual([null, "reference_audio", "reference_video"]);
    expect(roles).not.toContain("dubbing_video");
  });

  it("sends translation with no text item and a dubbing config", () => {
    const payload = build({
      mode: "video-translation",
      video: "https://x.test/s.mp4",
      targetLanguage: "en",
      glossaries: [{ source: "火山方舟", target: "ModelArk" }],
    });
    expect(payload.content).toEqual([{ type: "video_url", video_url: { url: "https://x.test/s.mp4" }, role: "dubbing_video" }]);
    expect(payload.dubbing_config).toEqual({
      target_language: "en",
      glossaries: [{ source: "火山方舟", target: "ModelArk" }],
    });
  });

  it("omits empty glossaries", () => {
    const payload = build({ mode: "video-translation", video: "https://x.test/s.mp4", targetLanguage: "ja" });
    expect(payload.dubbing_config).toEqual({ target_language: "ja" });
  });

  it("builds stem separation with the separate_audio role", () => {
    const payload = build({ mode: "stem-separation", prompt: "Split", audio: "https://x.test/a.wav" });
    expect(payload.content[1]).toMatchObject({ role: "separate_audio" });
  });

  it("adds one reference_image content item after the text for text-to-audio", () => {
    const payload = build({ mode: "text-to-audio", prompt: "Hello", referenceImage: "https://x.test/i.png" });
    expect(payload.content).toEqual([
      { type: "text", text: "Hello" },
      { type: "image_url", image_url: { url: "https://x.test/i.png" }, role: "reference_image" },
    ]);
  });

  it("accepts an inline image and ignores a reference image on modes that cannot use one", () => {
    const inline = `data:image/png;base64,${"A".repeat(40)}`;
    expect(build({ mode: "text-to-audio", prompt: "Hi", referenceImage: inline }).content).toHaveLength(2);
    const voice = build({ mode: "reference-voice", prompt: "Hi", referenceAudios: ["https://x.test/a.wav"], referenceImage: "https://x.test/i.png" });
    expect(voice.content.some((item) => "type" in item && item.type === "image_url")).toBe(false);
  });
});
