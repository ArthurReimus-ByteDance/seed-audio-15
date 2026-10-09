import { describeImageProblem } from "@/lib/image-files";
import { lintPrompt } from "@/lib/prompt/lint";
import { CLIP_SECONDS, MAX_REFERENCE_TOTAL_SECONDS } from "@/lib/seed-audio/constants";
import { MODE_DEFINITIONS, type StudioMode } from "@/lib/seed-audio/modes";
import { describeSize, exceedsRequestLimit, MAX_REQUEST_BYTES } from "@/lib/seed-audio/size";
import { generateRequestSchema, type AudioConfig, type GenerateRequest } from "@/lib/seed-audio/schemas";

export type ReferenceAudioItem = {
  id: string;
  name: string;
  source: string;
  origin: "file" | "url";
  size?: number;
  durationSeconds?: number | null;
  label?: string;
  file?: Blob;
  converted?: boolean;
};

export type ReferenceImageItem = {
  name: string;
  source: string;
  origin: "file" | "url";
  width?: number;
  height?: number;
  size?: number;
};

export type GlossaryRow = { id: string; source: string; target: string };

export type StudioFormState = {
  prompt: string;
  referenceAudios: ReferenceAudioItem[];
  videoSource: string;
  targetLanguage: string;
  glossaries: GlossaryRow[];
  referenceImage: ReferenceImageItem | null;
  muxVideo: boolean;
  takes: number;
};

export const EMPTY_FORM: StudioFormState = {
  prompt: "",
  referenceAudios: [],
  videoSource: "",
  targetLanguage: "",
  glossaries: [],
  referenceImage: null,
  muxVideo: false,
  takes: 1,
};

type TextField = "prompt" | "audios" | "video" | "targetLanguage" | "glossaries" | "config" | "image" | "mux";

export type FieldErrors = Partial<Record<TextField, string>> & {
  clips?: Record<string, string>;
  glossaryRows?: Record<string, { source?: string; target?: string }>;
};

export function clipLimits(mode: StudioMode): { min: number; max: number } {
  return MODE_DEFINITIONS[mode].singleAudio ? CLIP_SECONDS.separation : CLIP_SECONDS.reference;
}

function formatSeconds(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export type ValidationResult = { ok: true; request: GenerateRequest } | { ok: false; errors: FieldErrors };

function buildBase(mode: StudioMode, form: StudioFormState, config: AudioConfig): Record<string, unknown> {
  const audios = form.referenceAudios.map((item) => item.source);
  switch (mode) {
    case "text-to-audio":
      return { mode, prompt: form.prompt, referenceImage: form.referenceImage?.source, config };
    case "reference-voice":
      return { mode, prompt: form.prompt, referenceAudios: audios, config };
    case "video-to-audio":
      return { mode, prompt: form.prompt, referenceVideo: form.videoSource, referenceAudios: audios, config };
    case "video-translation":
      return {
        mode,
        video: form.videoSource,
        targetLanguage: form.targetLanguage,
        glossaries: form.glossaries
          .filter((row) => row.source.trim() || row.target.trim())
          .map(({ source, target }) => ({ source, target })),
        config,
      };
    case "stem-separation":
      return { mode, prompt: form.prompt, audio: audios[0] ?? "", config };
  }
}

function fieldFor(path: PropertyKey[]): TextField | null {
  switch (path[0]) {
    case "prompt":
      return "prompt";
    case "referenceAudios":
    case "audio":
      return "audios";
    case "referenceVideo":
    case "video":
      return "video";
    case "targetLanguage":
      return "targetLanguage";
    case "glossaries":
      return "glossaries";
    case "config":
      return "config";
    case "referenceImage":
      return "image";
    default:
      return null;
  }
}

function missingInputMessage(mode: StudioMode): FieldErrors {
  const definition = MODE_DEFINITIONS[mode];
  const errors: FieldErrors = {};
  if (definition.referenceAudio === "required") errors.audios = definition.singleAudio ? "Add the audio to separate" : "Add at least one reference clip";
  if (definition.referenceVideo === "required") errors.video = "Add a video URL";
  return errors;
}

function clipErrors(mode: StudioMode, form: StudioFormState): { clips?: Record<string, string>; total?: string } {
  if (MODE_DEFINITIONS[mode].referenceAudio === "none") return {};
  const { min, max } = clipLimits(mode);
  const clips: Record<string, string> = {};
  for (const item of form.referenceAudios) {
    if (typeof item.durationSeconds !== "number") continue;
    if (item.durationSeconds < min || item.durationSeconds > max) {
      clips[item.id] = `${formatSeconds(item.durationSeconds)} long. Clips must be ${min}-${max} seconds.`;
    }
  }
  const total = form.referenceAudios.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
  const overTotal = !MODE_DEFINITIONS[mode].singleAudio && total > MAX_REFERENCE_TOTAL_SECONDS ? `Reference clips total ${formatSeconds(total)}; the limit is ${formatSeconds(MAX_REFERENCE_TOTAL_SECONDS)}.` : undefined;
  return { clips: Object.keys(clips).length > 0 ? clips : undefined, total: overTotal };
}

function inlineUploadBytes(form: StudioFormState): number {
  const audio = form.referenceAudios.reduce((sum, item) => sum + (item.source.startsWith("data:") ? item.source.length : 0), 0);
  const image = form.referenceImage?.source.startsWith("data:") ? form.referenceImage.source.length : 0;
  return audio + image;
}

export type FormLimits = { maxRequestBytes: number };

function requestLimitMessage(uploadBytes: number, limit: number): string {
  const size = describeSize(uploadBytes);
  return limit < MAX_REQUEST_BYTES
    ? `Uploads are about ${size}, but this deployment accepts at most ${describeSize(limit)} per request. Paste public URLs instead of uploading files.`
    : `Uploads are about ${size}; the request limit is ${describeSize(limit)}. Use public URLs for some files.`;
}

function glossaryRowErrors(form: StudioFormState): FieldErrors["glossaryRows"] {
  const rows: NonNullable<FieldErrors["glossaryRows"]> = {};
  for (const row of form.glossaries) {
    const hasSource = row.source.trim() !== "";
    const hasTarget = row.target.trim() !== "";
    if (hasSource && !hasTarget) rows[row.id] = { target: "Add the translation" };
    if (!hasSource && hasTarget) rows[row.id] = { source: "Add the source term" };
  }
  return Object.keys(rows).length > 0 ? rows : undefined;
}

export function validateStudioForm(mode: StudioMode, form: StudioFormState, config: AudioConfig, limits: FormLimits = { maxRequestBytes: MAX_REQUEST_BYTES }): ValidationResult {
  const errors: FieldErrors = {};
  const parsed = generateRequestSchema.safeParse(buildBase(mode, form, config));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldFor(issue.path);
      if (field && !errors[field]) errors[field] = issue.message;
    }
    const missing = missingInputMessage(mode);
    if (form.videoSource.trim() === "" && errors.video) errors.video = missing.video ?? errors.video;
    if (form.referenceAudios.length === 0 && errors.audios) errors.audios = missing.audios ?? errors.audios;
  }

  const clip = clipErrors(mode, form);
  if (clip.clips) {
    errors.clips = clip.clips;
    errors.audios ??= `${Object.keys(clip.clips).length === 1 ? "A clip is" : "Some clips are"} outside the allowed length. Trim or replace ${Object.keys(clip.clips).length === 1 ? "it" : "them"}.`;
  }
  if (clip.total) errors.audios ??= clip.total;
  const uploadBytes = inlineUploadBytes(form);
  if (exceedsRequestLimit(uploadBytes, limits.maxRequestBytes)) {
    const message = requestLimitMessage(uploadBytes, limits.maxRequestBytes);
    if (form.referenceAudios.length > 0 || !form.referenceImage) errors.audios ??= message;
    else errors.image ??= message;
  }

  if (MODE_DEFINITIONS[mode].usesPrompt && form.prompt.trim()) {
    const blocking = lintPrompt(form.prompt, { mode, clipCount: form.referenceAudios.length }).find((issue) => issue.severity === "error");
    if (blocking) errors.prompt ??= blocking.message;
  }

  if (MODE_DEFINITIONS[mode].referenceImage && form.referenceImage?.width && form.referenceImage.height) {
    const problem = describeImageProblem(form.referenceImage.width, form.referenceImage.height);
    if (problem) errors.image = problem;
  }

  if (mode === "video-translation" && form.muxVideo && config.outputFormat === "pcm") {
    errors.mux = "Raw PCM can't be combined with video. Choose wav, mp3 or ogg to create the dubbed video.";
  }

  const rows = mode === "video-translation" ? glossaryRowErrors(form) : undefined;
  if (rows) {
    errors.glossaryRows = rows;
    errors.glossaries = "Fill in both sides of each glossary term, or remove the row.";
  }

  if (parsed.success && Object.keys(errors).length === 0) return { ok: true, request: parsed.data };
  return { ok: false, errors };
}

export function visibleErrors(errors: FieldErrors, form: StudioFormState, attempted: boolean): FieldErrors {
  if (attempted) return errors;
  const visible: FieldErrors = { ...errors };
  if (form.prompt.trim() === "") delete visible.prompt;
  if (form.referenceAudios.length === 0) delete visible.audios;
  if (form.videoSource.trim() === "") delete visible.video;
  if (form.targetLanguage === "") delete visible.targetLanguage;
  return visible;
}
