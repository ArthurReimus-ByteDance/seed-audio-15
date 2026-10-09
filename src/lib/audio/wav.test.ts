import { describe, expect, it } from "vitest";
import { encodeWav, mixToMono, sliceSeconds } from "./wav";

const text = (bytes: Uint8Array, start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));

describe("encodeWav", () => {
  it("writes a valid 16-bit mono PCM header", () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5]), 24000);
    const view = new DataView(wav.buffer);
    expect(text(wav, 0, 4)).toBe("RIFF");
    expect(text(wav, 8, 4)).toBe("WAVE");
    expect(text(wav, 36, 4)).toBe("data");
    expect(view.getUint32(4, true)).toBe(36 + 6);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint32(28, true)).toBe(48000);
    expect(view.getUint32(40, true)).toBe(6);
    expect(wav.byteLength).toBe(44 + 6);
  });

  it("scales and clamps samples", () => {
    const wav = encodeWav(new Float32Array([1, -1, 2, -2, 0]), 8000);
    const view = new DataView(wav.buffer);
    expect([0, 1, 2, 3, 4].map((index) => view.getInt16(44 + index * 2, true))).toEqual([32767, -32768, 32767, -32768, 0]);
  });

  it("encodes empty audio as a header-only file", () => {
    expect(encodeWav(new Float32Array(0), 16000).byteLength).toBe(44);
  });
});

describe("mixToMono", () => {
  it("averages channels and tolerates uneven lengths", () => {
    expect(Array.from(mixToMono([new Float32Array([1, 0.5, 0.25]), new Float32Array([0, 0.5])]))).toEqual([0.5, 0.5]);
  });

  it("returns a single channel untouched and handles no channels", () => {
    const only = new Float32Array([0.1, 0.2]);
    expect(mixToMono([only])).toBe(only);
    expect(mixToMono([]).length).toBe(0);
  });
});

describe("sliceSeconds", () => {
  it("trims to the requested duration and never over-reads", () => {
    const samples = new Float32Array(10);
    expect(sliceSeconds(samples, 2, 3).length).toBe(6);
    expect(sliceSeconds(samples, 2, 100).length).toBe(10);
    expect(sliceSeconds(samples, 2, -1).length).toBe(0);
  });
});
