import { describe, expect, it } from "vitest";
import { accessToken, constantTimeEqual, hasValidSession, isValidCode } from "./token";

describe("access token", () => {
  it("is deterministic, hex, and does not contain the code", async () => {
    const token = await accessToken("open-sesame");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(token).toBe(await accessToken("open-sesame"));
    expect(token).not.toContain("open-sesame");
  });

  it("differs per code", async () => {
    expect(await accessToken("a")).not.toBe(await accessToken("b"));
  });

  it("validates codes and sessions", async () => {
    expect(await isValidCode("secret", "secret")).toBe(true);
    expect(await isValidCode("secreT", "secret")).toBe(false);
    expect(await isValidCode("", "secret")).toBe(false);
    expect(await hasValidSession(await accessToken("secret"), "secret")).toBe(true);
    expect(await hasValidSession(await accessToken("other"), "secret")).toBe(false);
    expect(await hasValidSession(undefined, "secret")).toBe(false);
    expect(await hasValidSession("", "secret")).toBe(false);
  });
});

describe("constantTimeEqual", () => {
  it.each([
    ["abc", "abc", true],
    ["abc", "abd", false],
    ["abc", "ab", false],
    ["", "", true],
    ["a", "", false],
  ])("compares %j and %j", (a, b, expected) => {
    expect(constantTimeEqual(a, b)).toBe(expected);
  });
});
