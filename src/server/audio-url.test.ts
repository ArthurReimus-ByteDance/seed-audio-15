import { describe, expect, it } from "vitest";
import { parseAllowedAudioUrl } from "./audio-url";

const policy = { hostSuffixes: [".volces.com", ".bytepluses.com"], allowLocalhost: false };

describe("parseAllowedAudioUrl", () => {
  it("allows https URLs on allowlisted host suffixes", () => {
    const url = "https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/a/b.wav?X-Tos-Signature=abc";
    expect(parseAllowedAudioUrl(url, policy)?.href).toBe(url);
  });

  it.each([
    "http://a.volces.com/x.wav",
    "https://evil.com/x.wav",
    "https://volces.com.evil.com/x.wav",
    "https://notvolces.com/x.wav",
    "https://user:pass@a.volces.com/x.wav",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "not a url",
    "",
  ])("rejects %j", (candidate) => {
    expect(parseAllowedAudioUrl(candidate, policy)).toBeNull();
  });

  it("allows localhost only when explicitly enabled", () => {
    expect(parseAllowedAudioUrl("http://localhost:4010/a.wav", policy)).toBeNull();
    expect(parseAllowedAudioUrl("http://localhost:4010/a.wav", { ...policy, allowLocalhost: true })).not.toBeNull();
    expect(parseAllowedAudioUrl("http://[::1]:4010/a.wav", { ...policy, allowLocalhost: true })).not.toBeNull();
  });

  it("supports exact-host entries", () => {
    expect(parseAllowedAudioUrl("https://media.example.com/a.wav", { ...policy, hostSuffixes: ["media.example.com"] })).not.toBeNull();
    expect(parseAllowedAudioUrl("https://x.media.example.com/a.wav", { ...policy, hostSuffixes: ["media.example.com"] })).toBeNull();
  });
});
