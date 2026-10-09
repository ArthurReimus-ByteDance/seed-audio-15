"use client";

import { useServiceStatus } from "@/hooks/use-service-status";
import { cn } from "@/lib/utils";

export function ServiceStatus({ className }: { className?: string }) {
  const { data, isError, isPending } = useServiceStatus();

  const state = isPending
    ? { dot: "bg-muted-foreground/40", label: "Checking service", detail: "" }
    : isError
      ? { dot: "bg-destructive", label: "Server unreachable", detail: "" }
      : !data.configured
        ? { dot: "bg-warning", label: "API key missing", detail: "Set it in .env.local" }
        : {
            dot: "bg-success",
            label: "Seed Audio connected",
            detail: `${data.inFlight}/${data.maxConcurrency} running${data.queued > 0 ? `, ${data.queued} queued` : ""}`,
          };

  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2", className)} role="status">
      <span className={cn("size-2 shrink-0 rounded-full", state.dot)} aria-hidden />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-medium">{state.label}</p>
        {state.detail ? <p className="truncate text-[11px] text-muted-foreground">{state.detail}</p> : null}
      </div>
    </div>
  );
}
