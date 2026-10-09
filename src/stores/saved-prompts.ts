import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudioMode } from "@/lib/seed-audio/modes";

export const SAVED_PROMPT_LIMIT = 100;

export type SavedPrompt = { id: string; title: string; prompt: string; mode: StudioMode; createdAt: number };

type SavedPromptsState = {
  items: SavedPrompt[];
  hydrated: boolean;
  add: (input: { title: string; prompt: string; mode: StudioMode }) => SavedPrompt;
  remove: (id: string) => void;
};

export const useSavedPromptsStore = create<SavedPromptsState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      add: ({ title, prompt, mode }) => {
        const item: SavedPrompt = { id: crypto.randomUUID(), title: title.trim() || prompt.trim().slice(0, 48), prompt, mode, createdAt: Date.now() };
        set((state) => ({ items: [item, ...state.items].slice(0, SAVED_PROMPT_LIMIT) }));
        return item;
      },
      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    }),
    {
      name: "seed-audio:saved-prompts:v1",
      skipHydration: true,
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => () => {
        useSavedPromptsStore.setState({ hydrated: true });
      },
    },
  ),
);
