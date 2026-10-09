import { describe, expect, it } from "vitest";
import { describeSize, exceedsRequestLimit, MAX_REQUEST_BYTES, requestBodyBytes } from "./size";

describe("request size", () => {
  it("measures the serialized body in bytes, not characters", () => {
    expect(requestBodyBytes({ a: "é" })).toBe(new TextEncoder().encode('{"a":"é"}').length);
    expect(requestBodyBytes({ a: "é" })).toBeGreaterThan('{"a":"é"}'.length);
  });

  it("allows bodies up to the limit plus a small slack and rejects beyond", () => {
    expect(exceedsRequestLimit(MAX_REQUEST_BYTES)).toBe(false);
    expect(exceedsRequestLimit(MAX_REQUEST_BYTES + 100 * 1024)).toBe(false);
    expect(exceedsRequestLimit(MAX_REQUEST_BYTES + 1024 * 1024)).toBe(true);
  });

  it("formats megabytes", () => {
    expect(describeSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(describeSize(0)).toBe("0.0 MB");
  });
});
