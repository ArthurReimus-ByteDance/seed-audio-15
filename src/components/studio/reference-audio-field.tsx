"use client";

import { AlertTriangle, ArrowDown, ArrowUp, FileAudio, Link2, Pause, Play, Plus, Scissors, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkAudioFile, readAudioDuration, readFileAsDataUri } from "@/lib/audio-files";
import { convertToWavDataUri } from "@/lib/audio/convert";
import { formatBytes, formatDuration } from "@/lib/format";
import { MAX_INLINE_AUDIO_BYTES, MAX_REFERENCE_AUDIOS, MAX_REFERENCE_TOTAL_SECONDS } from "@/lib/seed-audio/constants";
import { audioSourceSchema } from "@/lib/seed-audio/schemas";
import { cn } from "@/lib/utils";
import { MicRecorder } from "./mic-recorder";
import type { ReferenceAudioItem } from "./studio-state";

type ReferenceAudioFieldProps = {
  title: string;
  description: string;
  items: ReferenceAudioItem[];
  maxItems: number;
  minSeconds: number;
  maxSeconds: number;
  showTags: boolean;
  error?: string;
  clipErrors?: Record<string, string>;
  disabled?: boolean;
  onChange: (items: ReferenceAudioItem[]) => void;
  onInsertTag: (tag: string, label?: string) => void;
};

function ClipPlayButton({ source }: { source: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => toast.error("This clip can't be played in your browser"));
    else audio.pause();
  };

  return (
    <>
      <audio ref={audioRef} src={source} preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <Button type="button" variant="outline" size="icon-sm" className="rounded-full" onClick={toggle} aria-label={playing ? "Pause clip" : "Play clip"}>
        {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
      </Button>
    </>
  );
}

export function ReferenceAudioField({ title, description, items, maxItems, minSeconds, maxSeconds, showTags, error, clipErrors, disabled, onChange, onInsertTag }: ReferenceAudioFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string>();
  const full = items.length >= maxItems;
  const totalSeconds = items.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);

  const update = (id: string, patch: Partial<ReferenceAudioItem>) => onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const move = (index: number, delta: number) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const addFiles = async (files: File[]) => {
    const room = maxItems - items.length;
    if (room <= 0) {
      toast.error(`You can add at most ${maxItems} ${maxItems === 1 ? "clip" : "clips"}`);
      return;
    }
    setBusy(true);
    const added: ReferenceAudioItem[] = [];
    for (const file of files.slice(0, room)) {
      const check = checkAudioFile(file);
      if (!check.ok) {
        toast.error(check.reason);
        continue;
      }
      try {
        if (check.kind === "native") {
          const source = await readFileAsDataUri(file, check.format);
          const durationSeconds = await readAudioDuration(source);
          added.push({ id: crypto.randomUUID(), name: file.name, source, origin: "file", size: file.size, durationSeconds, file });
        } else {
          const converted = await convertToWavDataUri(file);
          if (converted.bytes > MAX_INLINE_AUDIO_BYTES) {
            toast.error(`${file.name}: converted audio is over 15 MB. Trim it or use a URL.`);
            continue;
          }
          added.push({ id: crypto.randomUUID(), name: `${file.name.replace(/\.[^.]+$/, "")}.wav`, source: converted.dataUri, origin: "file", size: converted.bytes, durationSeconds: converted.durationSeconds, file, converted: true });
          toast.info(`${file.name} was converted to wav in your browser`);
        }
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : `Could not read ${file.name}`);
      }
    }
    setBusy(false);
    if (files.length > room) toast.warning(`Only the first ${room} ${room === 1 ? "file was" : "files were"} added`);
    if (added.length > 0) onChange([...items, ...added]);
  };

  const addRecording = (result: { dataUri: string; durationSeconds: number; bytes: number; blob: Blob }) => {
    onChange([...items, { id: crypto.randomUUID(), name: `Recording ${items.length + 1}.wav`, source: result.dataUri, origin: "file", size: result.bytes, durationSeconds: result.durationSeconds, file: result.blob, converted: true }]);
  };

  const trim = async (item: ReferenceAudioItem) => {
    if (!item.file) return;
    setBusy(true);
    try {
      const converted = await convertToWavDataUri(item.file, maxSeconds);
      update(item.id, { source: converted.dataUri, durationSeconds: converted.durationSeconds, size: converted.bytes, converted: true });
      toast.success(`Trimmed to the first ${formatDuration(converted.durationSeconds)}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not trim the clip");
    } finally {
      setBusy(false);
    }
  };

  const addUrl = async () => {
    const parsed = audioSourceSchema.safeParse(url);
    if (!parsed.success || !/^https?:\/\//.test(parsed.data)) {
      setUrlError("Enter a public http(s) URL");
      return;
    }
    setUrlError(undefined);
    const durationSeconds = await readAudioDuration(parsed.data);
    const name = decodeURIComponent(parsed.data.split("?")[0].split("/").pop() || parsed.data);
    onChange([...items, { id: crypto.randomUUID(), name, source: parsed.data, origin: "url", durationSeconds }]);
    setUrl("");
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) void addFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {items.length}/{maxItems}
        </Badge>
      </div>

      {!full ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
            dragging ? "border-brand bg-brand-soft" : "bg-muted/40 hover:bg-muted/70",
            error && "border-destructive/60",
          )}
        >
          <Upload className="size-5 text-muted-foreground" />
          <p className="text-sm">
            {busy ? (
              "Processing audio..."
            ) : (
              <>
                Drop audio files here or{" "}
                <button type="button" className="font-medium underline underline-offset-4 disabled:opacity-50" disabled={disabled} onClick={() => inputRef.current?.click()}>
                  browse
                </button>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            wav or mp3 up to 15 MB; m4a, ogg and flac are converted for you. {minSeconds}-{maxSeconds} seconds each.
          </p>
          <MicRecorder maxSeconds={maxSeconds} disabled={disabled || busy} onRecorded={addRecording} />
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple={maxItems > 1}
            accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.opus,.flac,.webm"
            onChange={(event) => {
              void addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {!full ? (
        <div className="space-y-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                disabled={disabled}
                placeholder="Or paste a public audio URL"
                className="pl-8"
                aria-invalid={Boolean(urlError)}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addUrl();
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" disabled={disabled || !url.trim()} onClick={() => void addUrl()}>
              <Plus /> Add
            </Button>
          </div>
          {urlError ? <p className="text-xs text-destructive">{urlError}</p> : null}
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const clipError = clipErrors?.[item.id];
            const tooLong = typeof item.durationSeconds === "number" && item.durationSeconds > maxSeconds;
            const tag = `@Audio${index + 1}`;
            return (
              <li key={item.id} className="space-y-2 rounded-xl border bg-card p-2.5">
                <div className="flex items-center gap-3">
                  <ClipPlayButton source={item.source} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      <FileAudio className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.name}</span>
                      {item.converted ? <Badge variant="outline" className="text-[10px]">wav</Badge> : null}
                    </p>
                    <p className={cn("flex flex-wrap items-center gap-1 text-xs text-muted-foreground", clipError && "text-destructive")} role={clipError ? "alert" : undefined}>
                      {clipError ? <AlertTriangle className="size-3" /> : null}
                      {typeof item.durationSeconds === "number" ? formatDuration(item.durationSeconds) : "Duration unknown"}
                      {item.size ? ` · ${formatBytes(item.size)}` : " · URL"}
                      {clipError ? ` · must be ${minSeconds}-${maxSeconds}s` : ""}
                    </p>
                  </div>
                  {tooLong && item.file ? (
                    <Button type="button" variant="outline" size="xs" disabled={busy} onClick={() => void trim(item)}>
                      <Scissors /> Trim to {maxSeconds}s
                    </Button>
                  ) : null}
                  {showTags ? (
                    <Button type="button" variant="secondary" size="xs" className="font-mono" onClick={() => onInsertTag(tag, item.label)} title="Insert into the script">
                      {tag}
                    </Button>
                  ) : null}
                  {items.length > 1 ? (
                    <div className="flex flex-col">
                      <Button type="button" variant="ghost" size="icon-xs" disabled={disabled || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${item.name} up`}>
                        <ArrowUp />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-xs" disabled={disabled || index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${item.name} down`}>
                        <ArrowDown />
                      </Button>
                    </div>
                  ) : null}
                  <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))} aria-label={`Remove ${item.name}`}>
                    <X />
                  </Button>
                </div>
                {showTags ? (
                  <Input
                    value={item.label ?? ""}
                    disabled={disabled}
                    placeholder={`Character name for ${tag} (optional, used when inserting a line)`}
                    className="h-7 text-xs"
                    onChange={(event) => update(item.id, { label: event.target.value })}
                    aria-label={`Character name for ${tag}`}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {maxItems === MAX_REFERENCE_AUDIOS && totalSeconds > 0 ? (
        <p className={cn("text-xs text-muted-foreground", totalSeconds > MAX_REFERENCE_TOTAL_SECONDS && "text-destructive")}>
          Total reference length {formatDuration(totalSeconds)} of {formatDuration(MAX_REFERENCE_TOTAL_SECONDS)}
        </p>
      ) : null}
      {showTags && items.length > 1 ? <p className="text-xs text-muted-foreground">Order matters: the first clip is always @Audio1. Keep it stable across the whole script.</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
