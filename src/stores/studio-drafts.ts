import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudioMode } from "@/lib/seed-audio/modes";

export type StudioDraft = {
  prompt: string;
  videoSource: string;
  targetLanguage: string;
  glossaries: { id: string; source: string; target: string }[];
  takes: number;
};

export const EMPTY_DRAFT: StudioDraft = {
  prompt: "",
  videoSource: "",
  targetLanguage: "",
  glossaries: [],
  takes: 1,
};

type StudioDraftsState = {
  drafts: Partial<Record<StudioMode, StudioDraft>>;
  hydrated: boolean;
  save: (mode: StudioMode, draft: StudioDraft) => void;
  clearAll: () => void;
};

export const useStudioDraftsStore = create<StudioDraftsState>()(
  persist(
    (set) => ({
      drafts: {},
      hydrated: false,
      save: (mode, draft) => set((state) => ({ drafts: { ...state.drafts, [mode]: draft } })),
      clearAll: () => set({ drafts: {} }),
    }),
    {
      name: "seed-audio:studio-drafts:v1",
      skipHydration: true,
      partialize: (state) => ({ drafts: state.drafts }),
      onRehydrateStorage: () => () => {
        useStudioDraftsStore.setState({ hydrated: true });
      },
    },
  ),
);
