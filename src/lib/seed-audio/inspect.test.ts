import { describe, expect, it } from "vitest";
import { previewPayload, redactInline, toCurl } from "./inspect";

describe("redactInline", () => {
  it("replaces inline data URIs at any depth and leaves other values alone", () => {
    const redacted = redactInline({ a: [{ url: "data:audio/wav;base64,AAAA" }], b: "https://x.test/a.wav", c: 3 });
    expect(redacted).toEqual({ a: [{ url: "<inline audio/wav data, 26 chars>" }], b: "https://x.test/a.wav", c: 3 });
  });
});

describe("previewPayload and toCurl", () => {
  const payload = { model: "ep-secret-model", content: [{ type: "text", text: "It's alive" }] };

  it("hides the real model ID", () => {
    expect(previewPayload(payload).model).toBe("$SEED_AUDIO_MODEL");
    expect(toCurl(payload)).not.toContain("ep-secret-model");
  });

  it("produces a shell-safe curl with env placeholders and escaped quotes", () => {
    const curl = toCurl(payload);
    expect(curl).toContain('Authorization: Bearer $SEED_AUDIO_API_KEY');
    expect(curl).toContain("<<JSON");
    expect(curl).toContain("It'\\''s alive");
    expect(curl.trim().endsWith("JSON")).toBe(true);
  });
});
