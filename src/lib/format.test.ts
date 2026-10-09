import { describe, expect, it } from "vitest";
import { downloadFileName, formatBytes, formatDuration } from "./format";

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [5.9, "0:05"],
    [65, "1:05"],
    [3600, "60:00"],
    [-1, "0:00"],
    [Number.NaN, "0:00"],
    [Number.POSITIVE_INFINITY, "0:00"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "512 B"],
    [2048, "2.0 KB"],
    [5 * 1024 * 1024, "5.0 MB"],
  ])("formats %s", (input, expected) => {
    expect(formatBytes(input)).toBe(expected);
  });
});

describe("downloadFileName", () => {
  it("maps ogg_opus to the ogg extension and slugifies labels", () => {
    expect(downloadFileName("seed", "ogg_opus", 0, "Voice Over!")).toMatch(/^seed-.*-voice-over-\.ogg$/);
  });

  it("numbers extra tracks when there is no label", () => {
    expect(downloadFileName("seed", "wav", 2)).toMatch(/-3\.wav$/);
    expect(downloadFileName("seed", "mp3")).toMatch(/\d\.mp3$/);
  });
});
