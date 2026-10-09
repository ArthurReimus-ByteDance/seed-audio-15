import { z } from "zod";
import {
  IMAGE_FORMATS,
  INLINE_AUDIO_FORMATS,
  MAX_GLOSSARY_ENTRIES,
  MAX_IMAGE_BYTES,
  MAX_INLINE_AUDIO_BYTES,
  MAX_PROMPT_LENGTH,
  MAX_REFERENCE_AUDIOS,
  OGG_OPUS_SAMPLE_RATE,
  OUTPUT_FORMATS,
  RATE_LIMITS,
  SAMPLE_RATES,
  TRANSLATION_LANGUAGES,
} from "./constants";

const MAX_DATA_URI_LENGTH = Math.ceil((MAX_INLINE_AUDIO_BYTES * 4) / 3) + 128;
const INLINE_AUDIO_PATTERN = new RegExp(`^data:audio/(${INLINE_AUDIO_FORMATS.join("|")});base64,[A-Za-z0-9+/=]+$`);
const LANGUAGE_CODES = TRANSLATION_LANGUAGES.map(({ code }) => code) as [string, ...string[]];

export const audioSourceSchema = z
  .string()
  .trim()
  .refine((value) => /^https?:\/\/\S+$/.test(value) || INLINE_AUDIO_PATTERN.test(value), {
    message: "Use a public http(s) URL or an uploaded wav/mp3 file",
  })
  .refine((value) => value.length <= MAX_DATA_URI_LENGTH, { message: "Audio exceeds the 15 MB limit" });

const MAX_IMAGE_DATA_URI_LENGTH = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 128;
const INLINE_IMAGE_PATTERN = new RegExp(`^data:image/(${IMAGE_FORMATS.join("|")});base64,[A-Za-z0-9+/=]+$`);

export const imageSourceSchema = z
  .string()
  .trim()
  .refine((value) => /^https?:\/\/\S+$/.test(value) || INLINE_IMAGE_PATTERN.test(value), {
    message: "Use a public http(s) URL or an uploaded image (jpeg, png, webp, bmp, tiff, gif, heic or heif)",
  })
  .refine((value) => value.length <= MAX_IMAGE_DATA_URI_LENGTH, { message: "Image exceeds the 10 MB limit" });

export const videoSourceSchema = z
  .string()
  .trim()
  .refine((value) => /^https?:\/\/\S+$/.test(value) || /^tos:\/\/\S+$/.test(value), {
    message: "Use a public http(s) URL or a tos:// URI",
  });

const rateField = (name: keyof typeof RATE_LIMITS) =>
  z.number().int().min(RATE_LIMITS[name].min).max(RATE_LIMITS[name].max).optional();

export const audioConfigSchema = z
  .object({
    outputFormat: z.enum(OUTPUT_FORMATS).optional(),
    sampleRate: z
      .number()
      .refine((value) => (SAMPLE_RATES as readonly number[]).includes(value), { message: "Unsupported sample rate" })
      .optional(),
    speechRate: rateField("speechRate"),
    loudnessRate: rateField("loudnessRate"),
    pitchRate: rateField("pitchRate"),
  })
  .refine((config) => config.outputFormat !== "ogg_opus" || config.sampleRate === undefined || config.sampleRate === OGG_OPUS_SAMPLE_RATE, {
    path: ["sampleRate"],
    message: "ogg_opus supports only 48000 Hz",
  });

const promptSchema = z
  .string()
  .trim()
  .min(1, "Write a prompt first")
  .max(MAX_PROMPT_LENGTH, `Prompt must be at most ${MAX_PROMPT_LENGTH} characters`);

const config = audioConfigSchema.default({});


const textToAudioSchema = z.object({ mode: z.literal("text-to-audio"), prompt: promptSchema, referenceImage: imageSourceSchema.optional(), config });

const referenceVoiceSchema = z.object({
  mode: z.literal("reference-voice"),
  prompt: promptSchema,
  referenceAudios: z.array(audioSourceSchema).min(1, "Add at least one reference clip").max(MAX_REFERENCE_AUDIOS),
  config,
});

const videoToAudioSchema = z.object({
  mode: z.literal("video-to-audio"),
  prompt: promptSchema,
  referenceVideo: videoSourceSchema,
  referenceAudios: z.array(audioSourceSchema).max(MAX_REFERENCE_AUDIOS).default([]),
  config,
});

const glossarySchema = z.object({
  source: z.string().trim().min(1, "Source term is required"),
  target: z.string().trim().min(1, "Target term is required"),
});

const videoTranslationSchema = z.object({
  mode: z.literal("video-translation"),
  video: videoSourceSchema,
  targetLanguage: z.enum(LANGUAGE_CODES, { error: "Choose a target language" }),
  glossaries: z.array(glossarySchema).max(MAX_GLOSSARY_ENTRIES).default([]),
  config,
});

const stemSeparationSchema = z.object({
  mode: z.literal("stem-separation"),
  prompt: promptSchema,
  audio: audioSourceSchema,
  config,
});

export const generateRequestSchema = z.discriminatedUnion("mode", [
  textToAudioSchema,
  referenceVoiceSchema,
  videoToAudioSchema,
  videoTranslationSchema,
  stemSeparationSchema,
]);

export type AudioConfig = z.infer<typeof audioConfigSchema>;
export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type GenerateRequestInput = z.input<typeof generateRequestSchema>;

export const generatedAudioSchema = z.object({
  url: z.string(),
  type: z.string().optional(),
  description: z.string().optional(),
});

export const upstreamResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  created: z.number().optional(),
  content: z.object({ audios: z.array(generatedAudioSchema).min(1) }),
  output_format: z.string().optional(),
  usage: z.record(z.string(), z.unknown()).optional(),
});

export const generateResultSchema = z.object({
  id: z.string().nullable(),
  model: z.string().nullable(),
  created: z.number().nullable(),
  outputFormat: z.string(),
  usage: z.record(z.string(), z.unknown()).nullable(),
  audios: z.array(generatedAudioSchema).min(1),
  raw: z.record(z.string(), z.unknown()),
});

export type GenerateResult = z.infer<typeof generateResultSchema>;
export type GeneratedAudio = z.infer<typeof generatedAudioSchema>;

export const statusSchema = z.object({
  configured: z.boolean(),
  maxConcurrency: z.number(),
  inFlight: z.number(),
  queued: z.number(),
  endpointHost: z.string(),
  modelHint: z.string().nullable(),
  accessGate: z.boolean(),
  ffmpeg: z.boolean(),
  maxRequestBytes: z.number(),
});

export type ServiceStatus = z.infer<typeof statusSchema>;
