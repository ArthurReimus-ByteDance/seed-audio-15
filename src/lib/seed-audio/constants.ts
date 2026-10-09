export const OUTPUT_FORMATS = ["wav", "mp3", "pcm", "ogg_opus"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const SAMPLE_RATES = [8000, 16000, 24000, 32000, 44100, 48000] as const;
export const OGG_OPUS_SAMPLE_RATE = 48000;

export const RATE_LIMITS = {
  speechRate: { min: -50, max: 100, label: "Speed" },
  loudnessRate: { min: -50, max: 100, label: "Volume" },
  pitchRate: { min: -12, max: 12, label: "Pitch" },
} as const;

export const MAX_REFERENCE_AUDIOS = 6;
export const MAX_INLINE_AUDIO_BYTES = 15 * 1024 * 1024;
export const INLINE_AUDIO_FORMATS = ["wav", "mp3"] as const;
export const CLIP_SECONDS = {
  reference: { min: 2, max: 30 },
  separation: { min: 2, max: 360 },
} as const;
export const MAX_REFERENCE_TOTAL_SECONDS = 180;
export const IMAGE_FORMATS = ["jpeg", "png", "webp", "bmp", "tiff", "gif", "heic", "heif"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_PIXELS = { min: 300, max: 6000 } as const;
export const IMAGE_ASPECT = { min: 0.4, max: 2.5 } as const;
export const MAX_PROMPT_LENGTH = 20000;
export const MAX_GLOSSARY_ENTRIES = 50;

export const TRANSLATION_LANGUAGES = [
  { code: "zh", label: "Chinese" },
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "pt-BR", label: "Portuguese (Brazil)" },
  { code: "th", label: "Thai" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "ms", label: "Malay" },
  { code: "fil", label: "Filipino" },
  { code: "it", label: "Italian" },
  { code: "ru", label: "Russian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "tr", label: "Turkish" },
  { code: "sv", label: "Swedish" },
  { code: "es-ES", label: "Spanish (Spain)" },
  { code: "es-MX", label: "Spanish (Mexico)" },
  { code: "ar", label: "Arabic" },
  { code: "pt-PT", label: "Portuguese (Portugal)" },
  { code: "fi", label: "Finnish" },
  { code: "da", label: "Danish" },
  { code: "no", label: "Norwegian" },
  { code: "cs", label: "Czech" },
  { code: "hu", label: "Hungarian" },
  { code: "el", label: "Greek" },
  { code: "ro", label: "Romanian" },
  { code: "hi", label: "Hindi" },
] as const;

export const DEFAULT_STEM_PROMPT =
  "Split this audio into separate tracks for vocals, sound effects, and background music, and provide the name and content description for each track.";
