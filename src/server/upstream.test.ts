import { describe, expect, it } from "vitest";
import { describeUpstreamFailure } from "./upstream";

describe("describeUpstreamFailure", () => {
  it("explains rejected keys and mentions the early-access expiry", () => {
    expect(describeUpstreamFailure(401, { error: { message: "bad key" } })).toMatch(/API key[\s\S]*expire[\s\S]*bad key/);
    expect(describeUpstreamFailure(403, undefined)).toMatch(/API key/);
  });

  it("explains concurrency limits", () => {
    expect(describeUpstreamFailure(429, "slow down")).toMatch(/concurrent requests per API key[\s\S]*slow down/);
  });

  it("explains oversized requests", () => {
    expect(describeUpstreamFailure(413, null)).toMatch(/64 MB/);
  });

  it.each([
    [400, { error: { message: "InvalidParameter" } }, "InvalidParameter"],
    [400, { error: "plain string" }, "plain string"],
    [422, { message: "top-level message" }, "top-level message"],
    [400, "raw text body", "raw text body"],
    [400, null, "Seed Audio rejected the request"],
    [400, {}, "Seed Audio rejected the request"],
  ])("surfaces upstream detail for %s %j", (status, body, expected) => {
    expect(describeUpstreamFailure(status, body)).toBe(expected);
  });
});

describe("describeUpstreamFailure hints from live API messages", () => {
  it("explains moderation rejections without hiding the request id", () => {
    const message = describeUpstreamFailure(400, "The request failed because the input text violates policy. Request id: abc123");
    expect(message).toMatch(/content moderation rejected the text/);
    expect(message).toContain("Request id: abc123");
  });

  it("explains a missing spoken line", () => {
    const message = describeUpstreamFailure(400, { error: "The speech content to be synthesized is not fully specified in your prompt." });
    expect(message).toMatch(/exact words to speak, in quotes/);
    expect(message).toMatch(/not fully specified/);
  });

  it("leaves other 400 messages untouched, including source-language rejections", () => {
    expect(describeUpstreamFailure(400, "must not be set; source language is auto-detected Request id: z")).toBe("must not be set; source language is auto-detected Request id: z");
  });

  it("explains missing speakers, images and media URLs", () => {
    const message = describeUpstreamFailure(404, "The specified resource spk_123 is not found. Request id: r1");
    expect(message).toMatch(/speaker could not be found/);
    expect(message).toContain("spk_123");
    expect(describeUpstreamFailure(400, "The specified resource https://x.test/a.png is not found.")).toMatch(/could not be found/);
  });
});
