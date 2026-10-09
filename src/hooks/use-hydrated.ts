"use client";

import { useHistoryStore } from "@/stores/history";
import { usePreferencesStore } from "@/stores/preferences";
import { useSavedPromptsStore } from "@/stores/saved-prompts";
import { useStudioDraftsStore } from "@/stores/studio-drafts";

export const useHistoryHydrated = () => useHistoryStore((state) => state.hydrated);
export const usePreferencesHydrated = () => usePreferencesStore((state) => state.hydrated);
export const useSavedPromptsHydrated = () => useSavedPromptsStore((state) => state.hydrated);
export const useDraftsHydrated = () => useStudioDraftsStore((state) => state.hydrated);
