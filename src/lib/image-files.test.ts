import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES } from "@/lib/seed-audio/constants";
import { checkImageFile, describeImageProblem, detectImageFormat } from "./image-files";

describe("detectImageFormat", () => {
  it.each([
    ["a.png", "", "png"],
    ["a.JPG", "", "jpeg"],
    ["a.jpeg", "", "jpeg"],
    ["a.tif", "", "tiff"],
    ["a.webp", "image/webp", "webp"],
    ["photo", "image/jpeg", "jpeg"],
    ["scan", "image/x-bmp", "bmp"],
    ["a.heic", "", "heic"],
    ["a.svg", "image/svg+xml", null],
    ["a.pdf", "application/pdf", null],
  ])("detects %s (%s) as %s", (name, type, expected) => {
    expect(detectImageFormat(name, type)).toBe(expected);
  });
});

describe("checkImageFile", () => {
  it("accepts an image at exactly the size limit and rejects one byte over", () => {
    expect(checkImageFile({ name: "a.png", type: "image/png", size: MAX_IMAGE_BYTES }).ok).toBe(true);
    expect(checkImageFile({ name: "a.png", type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatchObject({ ok: false, reason: expect.stringContaining("10 MB") });
  });

  it("rejects empty and unsupported files", () => {
    expect(checkImageFile({ name: "a.png", type: "image/png", size: 0 })).toMatchObject({ ok: false });
    expect(checkImageFile({ name: "a.svg", type: "image/svg+xml", size: 10 })).toMatchObject({ ok: false });
  });
});

describe("describeImageProblem (limits observed on the live API: 300-6000 px, ratio 0.4-2.5)", () => {
  it.each([
    [640, 480],
    [300, 300],
    [6000, 6000],
    [300, 750],
    [750, 300],
  ])("accepts %ix%i", (width, height) => {
    expect(describeImageProblem(width, height)).toBeNull();
  });

  it.each([
    [299, 500],
    [500, 299],
    [6001, 3000],
    [1, 1],
  ])("rejects %ix%i for size", (width, height) => {
    expect(describeImageProblem(width, height)).toMatch(/300-6000px/);
  });

  it.each([
    [300, 800],
    [800, 300],
  ])("rejects %ix%i for aspect ratio", (width, height) => {
    expect(describeImageProblem(width, height)).toMatch(/aspect ratio/);
  });
});
