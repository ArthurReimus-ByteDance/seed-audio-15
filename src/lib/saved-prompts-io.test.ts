import { describe, expect, it } from "vitest";
import { mergeSavedPrompts, parseSavedPrompts, serializeSavedPrompts } from "./saved-prompts-io";
import type { SavedPrompt } from "@/stores/saved-prompts";

const item = (id: string, createdAt: number): SavedPrompt => ({ id, title: id, prompt: `prompt ${id}`, mode: "text-to-audio", createdAt });

describe("saved prompt import and export", () => {
  it("round-trips", () => {
    const prompts = [item("a", 1), item("b", 2)];
    expect(parseSavedPrompts(serializeSavedPrompts(prompts))).toEqual({ ok: true, prompts });
  });

  it.each([
    ["not json", /not valid JSON/],
    ["{}", /not a Seed Audio Studio/],
    [JSON.stringify({ version: 2, prompts: [] }), /not a Seed Audio Studio/],
    [JSON.stringify({ version: 1, prompts: [{ id: "x", title: "t", prompt: "", mode: "text-to-audio", createdAt: 1 }] }), /not a Seed Audio Studio/],
    [JSON.stringify({ version: 1, prompts: [{ id: "x", title: "t", prompt: "p", mode: "music", createdAt: 1 }] }), /not a Seed Audio Studio/],
  ])("rejects %s", (text, pattern) => {
    const result = parseSavedPrompts(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(pattern);
  });

  it("merges without duplicating ids, newest first, within the limit", () => {
    const merged = mergeSavedPrompts([item("a", 1), item("b", 3)], [item("b", 9), item("c", 2)], 2);
    expect(merged.map((entry) => entry.id)).toEqual(["b", "c"]);
    expect(merged[0].createdAt).toBe(3);
  });
});
