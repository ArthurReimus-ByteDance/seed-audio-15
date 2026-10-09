import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AudioConfig } from "@/lib/seed-audio/schemas";

type PreferencesState = {
  config: AudioConfig;
  hydrated: boolean;
  setConfig: (config: AudioConfig) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      config: {},
      hydrated: false,
      setConfig: (config) => set({ config }),
    }),
    {
      name: "seed-audio:preferences:v1",
      skipHydration: true,
      partialize: (state) => ({ config: state.config }),
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hydrated: true });
      },
    },
  ),
);
