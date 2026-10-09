import { encodeWav, mixToMono, sliceSeconds } from "./wav";

export type DecodedAudio = { samples: Float32Array; sampleRate: number; durationSeconds: number };

export async function decodeAudio(source: Blob): Promise<DecodedAudio> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await source.arrayBuffer());
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
    return { samples: mixToMono(channels), sampleRate: buffer.sampleRate, durationSeconds: buffer.duration };
  } catch {
    throw new Error("This audio file could not be decoded. Try a wav or mp3 file.");
  } finally {
    void context.close();
  }
}

export function wavDataUri(samples: Float32Array, sampleRate: number): string {
  const bytes = encodeWav(samples, sampleRate);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export async function convertToWavDataUri(source: Blob, maxSeconds?: number): Promise<{ dataUri: string; durationSeconds: number; bytes: number }> {
  const decoded = await decodeAudio(source);
  const samples = maxSeconds ? sliceSeconds(decoded.samples, decoded.sampleRate, maxSeconds) : decoded.samples;
  const dataUri = wavDataUri(samples, decoded.sampleRate);
  return { dataUri, durationSeconds: samples.length / decoded.sampleRate, bytes: Math.floor(((dataUri.length - dataUri.indexOf(",") - 1) * 3) / 4) };
}
