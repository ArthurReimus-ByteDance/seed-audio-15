import { create } from "zustand";
import type { StudioMode } from "@/lib/seed-audio/modes";
import type { AudioConfig } from "@/lib/seed-audio/schemas";

export type DraftInput = {
  mode: StudioMode;
  prompt: string;
  config?: AudioConfig;
};

export type Draft = DraftInput & { nonce: number };

type DraftState = {
  draft: Draft | null;
  setDraft: (draft: DraftInput) => void;
  consumeDraft: (mode: StudioMode) => Draft | null;
};

let nextNonce = 1;

export const useDraftStore = create<DraftState>()((set, get) => ({
  draft: null,
  setDraft: (draft) => set({ draft: { ...draft, nonce: nextNonce++ } }),
  consumeDraft: (mode) => {
    const { draft } = get();
    if (!draft || draft.mode !== mode) return null;
    set({ draft: null });
    return draft;
  },
}));
