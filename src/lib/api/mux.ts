import { isAxiosError, isCancel } from "axios";
import { http, RequestCancelled } from "./http";

export class MuxRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MuxRequestError";
  }
}

export function originalAudioUrl(proxyUrl: string): string | null {
  try {
    const url = new URL(proxyUrl, "http://local.invalid");
    return url.pathname === "/api/audio" ? url.searchParams.get("src") : null;
  } catch {
    return null;
  }
}

async function toRequestError(error: unknown): Promise<unknown> {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const parsed = JSON.parse(await error.response.data.text()) as { error?: unknown; code?: unknown };
      if (typeof parsed.error === "string") return new MuxRequestError(parsed.error, typeof parsed.code === "string" ? parsed.code : undefined);
    } catch {
      return new MuxRequestError(`Could not combine the audio with the video (${error.response.status})`);
    }
  }
  return error;
}

async function post(form: FormData, signal?: AbortSignal): Promise<Blob> {
  try {
    const { data } = await http.post<Blob>("/mux", form, { responseType: "blob", signal });
    return data;
  } catch (error) {
    if (isCancel(error)) throw new RequestCancelled();
    throw await toRequestError(error);
  }
}

export type DubAudio = { url: string | null; blob: Blob };

export async function muxDubbedVideo(videoUrl: string, audio: DubAudio, signal?: AbortSignal): Promise<Blob> {
  if (audio.url) {
    const byUrl = new FormData();
    byUrl.append("videoUrl", videoUrl);
    byUrl.append("audioUrl", audio.url);
    try {
      return await post(byUrl, signal);
    } catch (error) {
      if (!(error instanceof MuxRequestError && error.code === "audio_download_failed")) throw error;
    }
  }
  const byUpload = new FormData();
  byUpload.append("videoUrl", videoUrl);
  byUpload.append("audio", audio.blob, "dub-audio");
  return post(byUpload, signal);
}
