import type { AudioConfig, GenerateRequest } from "./schemas";

type ContentItem =
  | { type: "text"; text: string }
  | { type: "audio_url"; audio_url: { url: string }; role: string }
  | { type: "video_url"; video_url: { url: string }; role: string }
  | { type: "image_url"; image_url: { url: string }; role: string };

export type UpstreamPayload = {
  model: string;
  content: ContentItem[];
  output_format?: string;
  audio_config?: Record<string, number>;
  dubbing_config?: {
    target_language: string;
    glossaries?: { source: string; target: string }[];
  };
};

const textItem = (text: string): ContentItem => ({ type: "text", text });
const audioItem = (url: string, role: string): ContentItem => ({ type: "audio_url", audio_url: { url }, role });
const imageItem = (url: string): ContentItem => ({ type: "image_url", image_url: { url }, role: "reference_image" });
const videoItem = (url: string, role: string): ContentItem => ({ type: "video_url", video_url: { url }, role });

function toAudioConfig(config: AudioConfig): Record<string, number> | undefined {
  const entries = {
    sample_rate: config.sampleRate,
    speech_rate: config.speechRate,
    loudness_rate: config.loudnessRate,
    pitch_rate: config.pitchRate,
  };
  const defined = Object.entries(entries).filter((entry): entry is [string, number] => entry[1] !== undefined);
  return defined.length > 0 ? Object.fromEntries(defined) : undefined;
}

function buildContent(request: GenerateRequest): ContentItem[] {
  switch (request.mode) {
    case "text-to-audio":
      return [textItem(request.prompt), ...(request.referenceImage ? [imageItem(request.referenceImage)] : [])];
    case "reference-voice":
      return [textItem(request.prompt), ...request.referenceAudios.map((url) => audioItem(url, "reference_audio"))];
    case "video-to-audio":
      return [
        textItem(request.prompt),
        ...request.referenceAudios.map((url) => audioItem(url, "reference_audio")),
        videoItem(request.referenceVideo, "reference_video"),
      ];
    case "video-translation":
      return [videoItem(request.video, "dubbing_video")];
    case "stem-separation":
      return [textItem(request.prompt), audioItem(request.audio, "separate_audio")];
  }
}

export function buildUpstreamPayload(model: string, request: GenerateRequest): UpstreamPayload {
  const payload: UpstreamPayload = { model, content: buildContent(request) };
  if (request.config.outputFormat) payload.output_format = request.config.outputFormat;
  const audioConfig = toAudioConfig(request.config);
  if (audioConfig) payload.audio_config = audioConfig;
  if (request.mode === "video-translation") {
    payload.dubbing_config = {
      target_language: request.targetLanguage,
      ...(request.glossaries.length > 0 ? { glossaries: request.glossaries } : {}),
    };
  }
  return payload;
}
