import { create } from "zustand";
import { persist } from "zustand/middleware";
import { deleteBlobs } from "@/lib/storage/audio-blobs";
import type { StudioMode } from "@/lib/seed-audio/modes";
import type { AudioConfig } from "@/lib/seed-audio/schemas";

export const HISTORY_LIMIT = 40;

export type HistoryTrack = {
  key: string;
  type?: string;
  description?: string;
  format: string;
  size: number;
};

export type HistoryEntry = {
  id: string;
  createdAt: number;
  mode: StudioMode;
  title: string;
  prompt: string;
  detail?: string;
  config: AudioConfig;
  tracks: HistoryTrack[];
  usage: Record<string, unknown> | null;
  meta?: { id: string | null; model: string | null; created: number | null; take?: string };
};

type HistoryState = {
  entries: HistoryEntry[];
  hydrated: boolean;
  addEntry: (entry: HistoryEntry) => void;
  removeEntry: (id: string) => void;
  clear: () => void;
};

const trackKeys = (entries: HistoryEntry[]) => entries.flatMap((entry) => entry.tracks.map((track) => track.key));

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      hydrated: false,
      addEntry: (entry) => {
        const next = [entry, ...get().entries];
        const evicted = next.slice(HISTORY_LIMIT);
        set({ entries: next.slice(0, HISTORY_LIMIT) });
        void deleteBlobs(trackKeys(evicted));
      },
      removeEntry: (id) => {
        const removed = get().entries.filter((entry) => entry.id === id);
        set({ entries: get().entries.filter((entry) => entry.id !== id) });
        void deleteBlobs(trackKeys(removed));
      },
      clear: () => {
        const all = get().entries;
        set({ entries: [] });
        void deleteBlobs(trackKeys(all));
      },
    }),
    {
      name: "seed-audio:history:v1",
      skipHydration: true,
      partialize: (state) => ({ entries: state.entries }),
      onRehydrateStorage: () => () => {
        useHistoryStore.setState({ hydrated: true });
      },
    },
  ),
);
