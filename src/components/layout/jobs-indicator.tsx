"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { MODE_HREFS } from "./nav-items";
import { MODE_DEFINITIONS } from "@/lib/seed-audio/modes";
import { useJobsStore } from "@/stores/jobs";

export function JobsIndicator({ onNavigate }: { onNavigate?: () => void }) {
  const jobs = useJobsStore((state) => state.jobs);
  const queryClient = useQueryClient();
  const running = jobs.filter((job) => job.status === "running");
  const finished = jobs.length - running.length;

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["service-status"] });
  }, [running.length, finished, queryClient]);

  if (running.length === 0) return null;
  const latest = running[0];

  return (
    <Link
      href={MODE_HREFS[latest.mode]}
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2 text-xs text-foreground"
      aria-live="polite"
    >
      <Loader2 className="size-3.5 animate-spin text-brand" />
      <span className="min-w-0 flex-1 truncate">
        {running.length} generating
        <span className="text-muted-foreground"> · {MODE_DEFINITIONS[latest.mode].title}</span>
      </span>
    </Link>
  );
}
