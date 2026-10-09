import { beforeEach, describe, expect, it } from "vitest";
import { useDraftStore } from "./draft";

const store = () => useDraftStore.getState();

beforeEach(() => useDraftStore.setState({ draft: null }));

describe("draft handoff store", () => {
  it("gives every handoff a new nonce, even for identical content, so repeat visits are noticed", () => {
    store().setDraft({ mode: "text-to-audio", prompt: "Same" });
    const first = store().draft?.nonce;
    store().consumeDraft("text-to-audio");
    store().setDraft({ mode: "text-to-audio", prompt: "Same" });
    expect(store().draft?.nonce).toBeGreaterThan(first ?? 0);
  });

  it("replaces an unconsumed handoff with the newest one", () => {
    store().setDraft({ mode: "text-to-audio", prompt: "One" });
    store().setDraft({ mode: "reference-voice", prompt: "Two" });
    expect(store().draft).toMatchObject({ mode: "reference-voice", prompt: "Two" });
  });

  it("only hands a draft to the mode it was meant for and clears it once consumed", () => {
    store().setDraft({ mode: "stem-separation", prompt: "Split", config: { outputFormat: "mp3" } });
    expect(store().consumeDraft("text-to-audio")).toBeNull();
    expect(store().draft).not.toBeNull();
    expect(store().consumeDraft("stem-separation")).toMatchObject({ prompt: "Split", config: { outputFormat: "mp3" } });
    expect(store().draft).toBeNull();
    expect(store().consumeDraft("stem-separation")).toBeNull();
  });
});
