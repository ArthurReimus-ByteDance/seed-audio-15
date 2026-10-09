"use client";

import { Check, ChevronDown, ChevronUp, CircleAlert, Copy, RotateCcw, Sparkles, Terminal, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GeneratingBars } from "@/components/audio/generating-bars";
import { WaveformPlayer } from "@/components/audio/waveform-player";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useElapsedSeconds } from "@/hooks/use-elapsed";
import { copyText } from "@/lib/clipboard";
import { downloadFileName, formatDuration, formatTimestamp } from "@/lib/format";
import { MODE_DEFINITIONS } from "@/lib/seed-audio/modes";
import { buildUpstreamPayload } from "@/lib/seed-audio/payload";
import { toCurl } from "@/lib/seed-audio/inspect";
import { useJobsStore, type Job } from "@/stores/jobs";

export function EmptyResults() {
  return (
    <Card className="border-dashed bg-muted/30 shadow-none">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-10 items-end gap-1" aria-hidden>
          {[40, 70, 100, 60, 85, 45, 75, 35].map((height, index) => (
            <span key={index} className="w-1 rounded-full bg-muted-foreground/30" style={{ height: `${height}%` }} />
          ))}
        </div>
        <p className="text-sm font-medium">Your generations will appear here</p>
        <p className="max-w-sm text-xs text-muted-foreground">You can start several at once and keep working. Everything is also saved to History in this browser.</p>
      </CardContent>
    </Card>
  );
}

function takeLabel(job: Job): string | null {
  return job.takes > 1 ? `Take ${job.take} of ${job.takes}` : null;
}

function RunningCard({ job }: { job: Job }) {
  const cancel = useJobsStore((state) => state.cancel);
  const elapsed = useElapsedSeconds(job.startedAt, true);
  const label = takeLabel(job);

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <GeneratingBars />
        <div>
          <p className="flex items-center justify-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-brand" />
            Seed Audio is composing your audio...
            {label ? <Badge variant="secondary">{label}</Badge> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">{formatDuration(elapsed)} elapsed. Long audio and video can take several minutes. You can leave this page.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => cancel(job.id)}>
          <X /> Cancel
        </Button>
      </CardContent>
    </Card>
  );
}

function FailedCard({ job }: { job: Job }) {
  const retry = useJobsStore((state) => state.retry);
  const dismiss = useJobsStore((state) => state.dismiss);
  const label = takeLabel(job);

  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Generation failed{label ? ` (${label})` : ""}</AlertTitle>
      <AlertDescription className="flex items-start justify-between gap-3">
        <span className="break-words">{job.error}</span>
        <span className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="xs" onClick={() => retry(job.id)}>
            <RotateCcw /> Retry
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => dismiss(job.id)} aria-label="Dismiss error">
            <X />
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}

function CancelledCard({ job }: { job: Job }) {
  const dismiss = useJobsStore((state) => state.dismiss);
  const retry = useJobsStore((state) => state.retry);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
      <span>Generation cancelled{takeLabel(job) ? ` (${takeLabel(job)})` : ""}.</span>
      <span className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="xs" onClick={() => retry(job.id)}>
          <RotateCcw /> Run again
        </Button>
        <Button type="button" variant="ghost" size="icon-xs" onClick={() => dismiss(job.id)} aria-label="Dismiss">
          <X />
        </Button>
      </span>
    </div>
  );
}

function JobDetails({ job }: { job: Job }) {
  const [copied, setCopied] = useState(false);
  const run = job.result?.run;
  if (!run) return null;

  const copyCurl = async () => {
    if (await copyText(toCurl(buildUpstreamPayload("model", job.request)))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else toast.error("Could not copy to the clipboard");
  };

  const rows: [string, string][] = [
    ["Request ID", run.id ?? "n/a"],
    ["Model", run.model ?? "n/a"],
    ["Created", run.created ? formatTimestamp(run.created * 1000) : "n/a"],
    ["Output format", run.outputFormat],
    ["Tracks", String(run.tracks.length)],
  ];

  return (
    <div className="space-y-3 rounded-xl bg-muted/50 p-3 text-xs">
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1">
        {rows.map(([name, value]) => (
          <div key={name} className="contents">
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="font-mono break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="xs" onClick={() => void copyCurl()}>
          {copied ? <Check /> : <Terminal />} {copied ? "Copied" : "Copy as cURL"}
        </Button>
        <span className="text-muted-foreground">Uploaded audio is replaced with a placeholder.</span>
      </div>
      <details>
        <summary className="cursor-pointer text-muted-foreground">Raw response (audio links replaced by local proxy paths)</summary>
        <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-background p-3 font-mono text-[11px] leading-relaxed">{JSON.stringify(run.raw, null, 2)}</pre>
      </details>
    </div>
  );
}

function SucceededCard({ job, onReuse }: { job: Job; onReuse: (job: Job) => void }) {
  const dismiss = useJobsStore((state) => state.dismiss);
  const [showDetails, setShowDetails] = useState(false);
  const result = job.result;
  if (!result) return null;
  const { request } = job;
  const prompt = request.mode === "video-translation" ? null : request.prompt;
  const duration = result.run.usage?.final_duration_ms ?? result.run.usage?.duration_ms;
  const label = takeLabel(job);

  const copyPrompt = async () => {
    if (!prompt) return;
    if (await copyText(prompt)) toast.success("Prompt copied");
    else toast.error("Could not copy to the clipboard");
  };

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{MODE_DEFINITIONS[request.mode].title}</Badge>
          {label ? <Badge variant="outline">{label}</Badge> : null}
          <span className="text-xs text-muted-foreground">{formatTimestamp(result.createdAt)}</span>
          {typeof duration === "number" && result.run.tracks.length === 1 ? <span className="text-xs text-muted-foreground">· {formatDuration(duration / 1000)} of audio</span> : null}
          <div className="ml-auto flex items-center gap-1">
            {prompt ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyPrompt()}>
                <Copy /> Copy prompt
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" onClick={() => onReuse(job)}>
              <RotateCcw /> Reuse
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => dismiss(job.id)} aria-label="Dismiss result">
              <X />
            </Button>
          </div>
        </div>
        {prompt ? <p className="line-clamp-2 text-sm text-muted-foreground">{prompt}</p> : null}
        <div className="space-y-2">
          {result.run.tracks.map((track, index) => (
            <WaveformPlayer
              key={`${job.id}-${index}`}
              src={result.urls[index]}
              format={result.run.outputFormat}
              size={track.blob.size}
              title={track.type ?? (result.run.tracks.length > 1 ? `Track ${index + 1}` : undefined)}
              subtitle={track.description}
              fileName={downloadFileName(`seed-audio-${request.mode}${job.takes > 1 ? `-take${job.take}` : ""}`, result.run.outputFormat, index, track.type)}
            />
          ))}
        </div>
        <Button type="button" variant="ghost" size="xs" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails}>
          <Terminal /> Details {showDetails ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {showDetails ? <JobDetails job={job} /> : null}
      </CardContent>
    </Card>
  );
}

export function JobCard({ job, onReuse }: { job: Job; onReuse: (job: Job) => void }) {
  switch (job.status) {
    case "running":
      return <RunningCard job={job} />;
    case "failed":
      return <FailedCard job={job} />;
    case "cancelled":
      return <CancelledCard job={job} />;
    case "succeeded":
      return <SucceededCard job={job} onReuse={onReuse} />;
  }
}
