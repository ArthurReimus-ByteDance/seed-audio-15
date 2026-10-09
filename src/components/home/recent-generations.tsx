"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistoryHydrated } from "@/hooks/use-hydrated";
import { formatTimestamp } from "@/lib/format";
import { MODE_DEFINITIONS } from "@/lib/seed-audio/modes";
import { useHistoryStore } from "@/stores/history";

const RECENT_COUNT = 4;

export function RecentGenerations() {
  const hydrated = useHistoryHydrated();
  const entries = useHistoryStore((state) => state.entries);

  if (!hydrated) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (entries.length === 0) {
    return <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Nothing generated yet. Pick a mode above to start.</p>;
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {entries.slice(0, RECENT_COUNT).map((entry) => (
        <li key={entry.id}>
          <Link href="/history" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
            <Badge variant="secondary">{MODE_DEFINITIONS[entry.mode].title}</Badge>
            <span className="min-w-0 flex-1 truncate text-sm">{entry.prompt}</span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{formatTimestamp(entry.createdAt)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
