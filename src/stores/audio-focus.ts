import { create } from "zustand";

type AudioFocusState = {
  activeId: string | null;
  claim: (id: string) => void;
  release: (id: string) => void;
};

export const useAudioFocusStore = create<AudioFocusState>()((set) => ({
  activeId: null,
  claim: (id) => set({ activeId: id }),
  release: (id) => set((state) => (state.activeId === id ? { activeId: null } : state)),
}));
