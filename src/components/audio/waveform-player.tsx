"use client";

import { Download, FileAudio, Pause, Play } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAudioFocusStore } from "@/stores/audio-focus";

type WaveformPlayerProps = {
  src: string;
  format: string;
  fileName: string;
  title?: string;
  subtitle?: string;
  size?: number;
  className?: string;
};

type PlayerHandle = {
  playPause: () => Promise<void>;
  pause: () => void;
  isPlaying: () => boolean;
  setPlaybackRate: (rate: number, preservePitch?: boolean) => void;
};

const UNPLAYABLE_FORMATS = new Set(["pcm"]);
const PLAYBACK_RATES = [1, 1.25, 1.5, 0.75];

export function WaveformPlayer({ src, format, fileName, title, subtitle, size, className }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerHandle | null>(null);
  const playerId = useId();
  const { resolvedTheme } = useTheme();
  const activeId = useAudioFocusStore((state) => state.activeId);
  const claim = useAudioFocusStore((state) => state.claim);
  const release = useAudioFocusStore((state) => state.release);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIndex, setRateIndex] = useState(0);
  const previewable = !UNPLAYABLE_FORMATS.has(format) && !failed;
  const rate = PLAYBACK_RATES[rateIndex];

  useEffect(() => {
    const container = containerRef.current;
    if (!container || UNPLAYABLE_FORMATS.has(format)) return;
    let cancelled = false;
    let destroy: (() => void) | undefined;

    void import("wavesurfer.js").then(({ default: WaveSurfer }) => {
      if (cancelled) return;
      const styles = getComputedStyle(container);
      const instance = WaveSurfer.create({
        container,
        url: src,
        height: 56,
        barWidth: 3,
        barGap: 3,
        barRadius: 3,
        cursorWidth: 0,
        normalize: true,
        waveColor: styles.getPropertyValue("--wave").trim() || "#c7c7d1",
        progressColor: styles.getPropertyValue("--wave-progress").trim() || "#6366f1",
      });
      playerRef.current = instance;
      instance.on("ready", (total) => {
        setDuration(total);
        setReady(true);
      });
      instance.on("timeupdate", setCurrentTime);
      instance.on("play", () => {
        setPlaying(true);
        claim(playerId);
      });
      instance.on("pause", () => {
        setPlaying(false);
        release(playerId);
      });
      instance.on("finish", () => {
        setPlaying(false);
        release(playerId);
      });
      instance.on("error", () => setFailed(true));
      destroy = () => instance.destroy();
    });

    return () => {
      cancelled = true;
      playerRef.current = null;
      destroy?.();
      release(playerId);
      setReady(false);
      setPlaying(false);
      setCurrentTime(0);
    };
  }, [src, format, resolvedTheme, claim, release, playerId]);

  useEffect(() => {
    if (activeId !== null && activeId !== playerId && playerRef.current?.isPlaying()) playerRef.current.pause();
  }, [activeId, playerId]);

  useEffect(() => {
    if (ready) playerRef.current?.setPlaybackRate(rate, true);
  }, [rate, ready]);

  return (
    <div className={cn("rounded-xl border bg-card p-3", className)}>
      <div className="flex items-center gap-3">
        <Button
          size="icon-lg"
          className="rounded-full"
          disabled={!previewable || !ready}
          onClick={() => void playerRef.current?.playPause()}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
        </Button>
        <div className="min-w-0 flex-1">
          {previewable ? (
            <div className="relative">
              {!ready ? <Skeleton className="absolute inset-0 h-14 w-full" /> : null}
              <div ref={containerRef} className={cn("h-14 w-full", !ready && "opacity-0")} />
            </div>
          ) : (
            <div className="flex h-14 items-center gap-2 text-sm text-muted-foreground">
              <FileAudio className="size-4" />
              {failed ? "Your browser can't preview this file. Download it to listen." : "Raw PCM can't be previewed. Download it to use it."}
            </div>
          )}
        </div>
        {previewable ? (
          <Button type="button" variant="ghost" size="sm" className="w-12 font-mono text-xs tabular-nums" disabled={!ready} onClick={() => setRateIndex((index) => (index + 1) % PLAYBACK_RATES.length)} aria-label={`Playback speed ${rate}x`}>
            {rate}x
          </Button>
        ) : null}
        <Button asChild variant="outline" size="icon-lg" aria-label="Download audio">
          <a href={src} download={fileName}>
            <Download className="size-4" />
          </a>
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <div className="min-w-0 truncate">
          {title ? <span className="font-medium text-foreground">{title}</span> : null}
          {subtitle ? <span>{title ? " · " : ""}{subtitle}</span> : null}
        </div>
        <div className="shrink-0 tabular-nums">
          {ready ? `${formatDuration(currentTime)} / ${formatDuration(duration)}` : null}
          {ready && size ? " · " : null}
          {size ? formatBytes(size) : null}
          <span className="ml-2 uppercase">{format === "ogg_opus" ? "ogg" : format}</span>
        </div>
      </div>
    </div>
  );
}
