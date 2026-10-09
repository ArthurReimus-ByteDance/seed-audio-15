import { INLINE_AUDIO_FORMATS, MAX_INLINE_AUDIO_BYTES } from "@/lib/seed-audio/constants";

export type InlineAudioFormat = (typeof INLINE_AUDIO_FORMATS)[number];

const MIME_TO_FORMAT: Record<string, InlineAudioFormat> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
};

export function detectAudioFormat(fileName: string, mimeType: string): InlineAudioFormat | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if ((INLINE_AUDIO_FORMATS as readonly string[]).includes(extension)) return extension as InlineAudioFormat;
  return MIME_TO_FORMAT[mimeType.toLowerCase()] ?? null;
}

const CONVERTIBLE_EXTENSIONS = ["m4a", "aac", "ogg", "oga", "opus", "flac", "webm", "mp4", "caf", "aif", "aiff"];
export const MAX_CONVERTIBLE_SOURCE_BYTES = 200 * 1024 * 1024;

export type AudioFileCheck =
  | { ok: true; kind: "native"; format: InlineAudioFormat }
  | { ok: true; kind: "convert" }
  | { ok: false; reason: string };

export function checkAudioFile(file: { name: string; type: string; size: number }): AudioFileCheck {
  if (file.size === 0) return { ok: false, reason: `${file.name}: the file is empty` };
  const format = detectAudioFormat(file.name, file.type);
  if (format) {
    if (file.size > MAX_INLINE_AUDIO_BYTES) return { ok: false, reason: `${file.name}: files must be 15 MB or smaller` };
    return { ok: true, kind: "native", format };
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const convertible = CONVERTIBLE_EXTENSIONS.includes(extension) || (file.type.startsWith("audio/") && file.type !== "");
  if (!convertible) return { ok: false, reason: `${file.name}: unsupported file type. Use wav, mp3, m4a, ogg or flac` };
  if (file.size > MAX_CONVERTIBLE_SOURCE_BYTES) return { ok: false, reason: `${file.name}: file is too large to convert in the browser` };
  return { ok: true, kind: "convert" };
}

export function readFileAsDataUri(file: File, format: InlineAudioFormat): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.slice(result.indexOf(",") + 1);
      resolve(`data:audio/${format};base64,${base64}`);
    };
    reader.readAsDataURL(file);
  });
}

const DURATION_TIMEOUT_MS = 8000;

export function readAudioDuration(source: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const timer = setTimeout(() => finish(null), DURATION_TIMEOUT_MS);
    const finish = (value: number | null) => {
      clearTimeout(timer);
      audio.removeAttribute("src");
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => finish(null);
    audio.src = source;
  });
}
