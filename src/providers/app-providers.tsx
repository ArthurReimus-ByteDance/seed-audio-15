"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";
import { useHistoryStore } from "@/stores/history";
import { registerJobNavigator } from "@/stores/jobs";
import { usePreferencesStore } from "@/stores/preferences";
import { useSavedPromptsStore } from "@/stores/saved-prompts";
import { useStudioDraftsStore } from "@/stores/studio-drafts";

const PERSISTED_STORES = [useHistoryStore, usePreferencesStore, useSavedPromptsStore, useStudioDraftsStore] as const;

function StoreHydrator() {
  const router = useRouter();

  useEffect(() => {
    for (const store of PERSISTED_STORES) {
      void Promise.resolve(store.persist.rehydrate()).catch(() => (store as { setState: (state: { hydrated: boolean }) => void }).setState({ hydrated: true }));
    }
  }, []);

  useEffect(() => {
    registerJobNavigator((href) => router.push(href));
    return () => registerJobNavigator(null);
  }, [router]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } } }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={150}>
          <StoreHydrator />
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
