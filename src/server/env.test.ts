import { describe, expect, it } from "vitest";
import { isConfigured, parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("uses defaults and reports not configured when secrets are missing", () => {
    const env = parseServerEnv({});
    expect(isConfigured(env)).toBe(false);
    expect(env.maxConcurrency).toBe(2);
    expect(env.endpoint).toContain("bytepluses.com");
  });

  it("treats empty strings as unset", () => {
    const env = parseServerEnv({ SEED_AUDIO_API_KEY: "", SEED_AUDIO_MODEL: "", SEED_AUDIO_MAX_CONCURRENCY: "" });
    expect(isConfigured(env)).toBe(false);
    expect(env.maxConcurrency).toBe(2);
  });

  it("is configured when key and model are present", () => {
    expect(isConfigured(parseServerEnv({ SEED_AUDIO_API_KEY: "k", SEED_AUDIO_MODEL: "ep-1" }))).toBe(true);
  });

  it("merges extra audio hosts and normalises case", () => {
    const env = parseServerEnv({ SEED_AUDIO_AUDIO_HOSTS: " Media.Example.com ,, cdn.test" });
    expect(env.audioHostSuffixes).toEqual([".volces.com", ".bytepluses.com", "media.example.com", "cdn.test"]);
  });

  it("rejects invalid concurrency and endpoint values", () => {
    expect(() => parseServerEnv({ SEED_AUDIO_MAX_CONCURRENCY: "0" })).toThrow();
    expect(() => parseServerEnv({ SEED_AUDIO_ENDPOINT: "not-a-url" })).toThrow();
  });
});
