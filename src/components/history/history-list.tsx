"use client";

import { ChevronDown, ChevronUp, Headphones, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { WaveformPlayer } from "@/components/audio/waveform-player";
import { MODE_HREFS } from "@/components/layout/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistoryHydrated } from "@/hooks/use-hydrated";
import { useStoredBlob } from "@/hooks/use-blob-url";
import { downloadFileName, formatTimestamp } from "@/lib/format";
import { MODE_DEFINITIONS, STUDIO_MODES, type StudioMode } from "@/lib/seed-audio/modes";
import { useDraftStore } from "@/stores/draft";
import { usePreferencesStore } from "@/stores/preferences";
import { useHistoryStore, type HistoryEntry, type HistoryTrack } from "@/stores/history";

function StoredTrack({ track, entry, index }: { track: HistoryTrack; entry: HistoryEntry; index: number }) {
  const { url, isLoading, missing } = useStoredBlob(track.key);

  if (isLoading || (!url && !missing)) return <Skeleton className="h-[92px] w-full rounded-xl" />;
  if (missing || !url) {
    return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">This audio is no longer stored in your browser.</p>;
  }
  return (
    <WaveformPlayer
      src={url}
      format={track.format}
      size={track.size}
      title={track.type ?? (entry.tracks.length > 1 ? `Track ${index + 1}` : undefined)}
      subtitle={track.description}
      fileName={downloadFileName(`seed-audio-${entry.mode}`, track.format, index, track.type)}
    />
  );
}

function HistoryCard({ entry, onDelete }: { entry: HistoryEntry; onDelete: (id: string) => void }) {
  const router = useRouter();
  const setDraft = useDraftStore((state) => state.setDraft);
  const setConfig = usePreferencesStore((state) => state.setConfig);
  const [open, setOpen] = useState(false);

  const rerun = () => {
    setDraft({ mode: entry.mode, prompt: entry.mode === "video-translation" ? "" : entry.prompt, config: entry.config });
    setConfig(entry.config);
    toast.info("Prompt and output settings restored from this generation");
    router.push(MODE_HREFS[entry.mode]);
  };

  const settings = [
    entry.config.outputFormat,
    entry.config.sampleRate ? `${entry.config.sampleRate / 1000} kHz` : null,
    entry.config.speechRate ? `speed ${entry.config.speechRate}` : null,
    entry.config.loudnessRate ? `volume ${entry.config.loudnessRate}` : null,
    entry.config.pitchRate ? `pitch ${entry.config.pitchRate}` : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{MODE_DEFINITIONS[entry.mode].title}</Badge>
          <span className="text-xs text-muted-foreground">{formatTimestamp(entry.createdAt)}</span>
          {entry.meta?.take ? <Badge variant="outline">{entry.meta.take}</Badge> : null}
          {entry.tracks.length > 1 ? <span className="text-xs text-muted-foreground">· {entry.tracks.length} tracks</span> : null}
          {settings.map((setting) => (
            <Badge key={String(setting)} variant="outline" className="font-mono text-[10px]">
              {setting}
            </Badge>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={rerun}>
              <RotateCcw /> Re-run
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onDelete(entry.id)} aria-label="Delete generation">
              <Trash2 />
            </Button>
          </div>
        </div>
        <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">{entry.prompt}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          <Headphones /> {open ? "Hide audio" : "Listen"} {open ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {open ? (
          <div className="space-y-2">
            {entry.tracks.map((track, index) => (
              <StoredTrack key={track.key} track={track} entry={entry} index={index} />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function HistoryList() {
  const hydrated = useHistoryHydrated();
  const entries = useHistoryStore((state) => state.entries);
  const removeEntry = useHistoryStore((state) => state.removeEntry);
  const clear = useHistoryStore((state) => state.clear);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<StudioMode | "all">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => (mode === "all" || entry.mode === mode) && (!needle || entry.prompt.toLowerCase().includes(needle)));
  }, [entries, mode, query]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30 shadow-none">
        <CardContent className="py-14 text-center">
          <p className="text-sm font-medium">No generations yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Audio you generate is saved in this browser only. It never leaves your device.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search prompts" className="h-9 max-w-xs" aria-label="Search history" />
        <Select value={mode} onValueChange={(value) => setMode(value as StudioMode | "all")}>
          <SelectTrigger className="w-44" aria-label="Filter by mode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            {STUDIO_MODES.map((candidate) => (
              <SelectItem key={candidate} value={candidate}>
                {MODE_DEFINITIONS[candidate].title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="destructive" size="sm" className="ml-auto" onClick={() => setConfirmClear(true)}>
          <Trash2 /> Clear all
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No generations match your filters.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              onDelete={(id) => {
                removeEntry(id);
                toast.success("Generation deleted");
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all history?</DialogTitle>
            <DialogDescription>This permanently deletes {entries.length} generation{entries.length === 1 ? "" : "s"} and their audio from this browser.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                clear();
                setConfirmClear(false);
                toast.success("History cleared");
              }}
            >
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
