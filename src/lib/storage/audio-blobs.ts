import { del, delMany, get, set } from "idb-keyval";

const PREFIX = "seed-audio:blob:";

export const blobKey = (entryId: string, index: number) => `${PREFIX}${entryId}:${index}`;

export async function saveBlob(key: string, blob: Blob): Promise<void> {
  await set(key, blob);
}

export async function loadBlob(key: string): Promise<Blob | undefined> {
  return get<Blob>(key);
}

export async function deleteBlob(key: string): Promise<void> {
  await del(key);
}

export async function deleteBlobs(keys: string[]): Promise<void> {
  if (keys.length > 0) await delMany(keys);
}
