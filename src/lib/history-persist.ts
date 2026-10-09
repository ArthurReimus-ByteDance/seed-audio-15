import type { GeneratedRun } from "@/lib/api/seed-audio";
import { blobKey, saveBlob } from "@/lib/storage/audio-blobs";
import type { GenerateRequest } from "@/lib/seed-audio/schemas";
import type { HistoryEntry } from "@/stores/history";

export function describeRequest(request: GenerateRequest): string {
  return request.mode === "video-translation" ? `Dub to ${request.targetLanguage}` : request.prompt;
}

export async function buildHistoryEntry(request: GenerateRequest, title: string, run: GeneratedRun, take?: string): Promise<HistoryEntry> {
  const id = crypto.randomUUID();
  const tracks = await Promise.all(
    run.tracks.map(async (track, index) => {
      const key = blobKey(id, index);
      await saveBlob(key, track.blob);
      return { key, type: track.type, description: track.description, format: run.outputFormat, size: track.blob.size };
    }),
  );
  return {
    id,
    createdAt: Date.now(),
    mode: request.mode,
    title,
    prompt: describeRequest(request),
    config: request.config,
    tracks,
    usage: run.usage,
    meta: { id: run.id, model: run.model, created: run.created, take },
  };
}
