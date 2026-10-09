import { describe, expect, it } from "vitest";
import { STUDIO_MODES } from "@/lib/seed-audio/modes";
import { MAX_PROMPT_LENGTH } from "@/lib/seed-audio/constants";
import { PROMPT_CATEGORIES, PROMPT_LIBRARY, promptsForMode } from "./prompt-library";

describe("prompt library", () => {
  it("has unique ids and valid categories", () => {
    const ids = PROMPT_LIBRARY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of PROMPT_LIBRARY) expect(PROMPT_CATEGORIES).toContain(entry.category);
  });

  it("keeps every prompt within the API limit and non-empty", () => {
    for (const entry of PROMPT_LIBRARY) {
      expect(entry.prompt.trim().length).toBeGreaterThan(0);
      expect(entry.prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
    }
  });

  it("never offers prompts for video translation, which accepts no text", () => {
    expect(promptsForMode("video-translation")).toEqual([]);
  });

  it("offers at least one prompt for every text-driven mode", () => {
    for (const mode of STUDIO_MODES.filter((candidate) => candidate !== "video-translation")) {
      expect(promptsForMode(mode).length).toBeGreaterThan(0);
    }
  });

  it("requires reference clips only where the prompt tags them", () => {
    for (const entry of PROMPT_LIBRARY.filter((candidate) => candidate.referenceClips)) {
      const tags = entry.prompt.match(/@Audio\d/g) ?? [];
      expect(tags.length).toBeGreaterThan(0);
    }
  });
});
