import { isCancel } from "axios";
import {
  generateResultSchema,
  statusSchema,
  type GenerateRequestInput,
  type GenerateResult,
  type ServiceStatus,
} from "@/lib/seed-audio/schemas";
import { http, RequestCancelled } from "./http";

export type GeneratedTrack = GenerateResult["audios"][number] & { blob: Blob };

export type GeneratedRun = Omit<GenerateResult, "audios"> & { tracks: GeneratedTrack[] };

export async function fetchStatus(): Promise<ServiceStatus> {
  const { data } = await http.get("/status");
  return statusSchema.parse(data);
}

export async function fetchAudioBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const { data } = await http.get<Blob>(url, { baseURL: "", responseType: "blob", signal });
  return data;
}

export async function generateAudio(request: GenerateRequestInput, signal?: AbortSignal): Promise<GeneratedRun> {
  try {
    const { data } = await http.post("/generate", request, { signal });
    const result = generateResultSchema.parse(data);
    const tracks = await Promise.all(
      result.audios.map(async (audio) => ({ ...audio, blob: await fetchAudioBlob(audio.url, signal) })),
    );
    return { id: result.id, model: result.model, created: result.created, outputFormat: result.outputFormat, usage: result.usage, raw: result.raw, tracks };
  } catch (error) {
    if (isCancel(error)) throw new RequestCancelled();
    throw error;
  }
}
