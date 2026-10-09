import { describe, expect, it } from "vitest";
import { MAX_REQUEST_BYTES } from "@/lib/seed-audio/size";
import { getRequestLimitBytes, VERCEL_REQUEST_BYTES } from "./limits";

describe("getRequestLimitBytes", () => {
  it("uses the API limit by default and Vercel's 4.5 MB body limit on Vercel", () => {
    expect(getRequestLimitBytes({})).toBe(MAX_REQUEST_BYTES);
    expect(getRequestLimitBytes({ VERCEL: "1" })).toBe(VERCEL_REQUEST_BYTES);
    expect(VERCEL_REQUEST_BYTES).toBeLessThan(4.5 * 1024 * 1024 + 1);
    expect(VERCEL_REQUEST_BYTES).toBeGreaterThan(4 * 1024 * 1024);
  });

  it("treats an empty VERCEL variable as not on Vercel", () => {
    expect(getRequestLimitBytes({ VERCEL: "" })).toBe(MAX_REQUEST_BYTES);
  });
});
