import { describe, expect, it } from "vitest";
import { CONFIG_PRESETS, matchPreset } from "./presets";
import { audioConfigSchema } from "./schemas";

describe("config presets", () => {
  it("only offers configurations the API accepts", () => {
    for (const preset of CONFIG_PRESETS) expect(audioConfigSchema.safeParse(preset.config).success, preset.id).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(CONFIG_PRESETS.map((preset) => preset.id)).size).toBe(CONFIG_PRESETS.length);
  });
});

describe("matchPreset", () => {
  it("finds the preset that equals the current format and sample rate", () => {
    expect(matchPreset({ outputFormat: "mp3", sampleRate: 44100 })).toBe("web");
    expect(matchPreset({ outputFormat: "ogg_opus", sampleRate: 48000, speechRate: 10 })).toBe("opus");
  });

  it("returns null for anything else, including defaults", () => {
    expect(matchPreset({})).toBeNull();
    expect(matchPreset({ outputFormat: "mp3" })).toBeNull();
    expect(matchPreset({ outputFormat: "wav", sampleRate: 22050 })).toBeNull();
  });
});
