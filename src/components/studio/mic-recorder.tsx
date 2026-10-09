"use client";

import { Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { convertToWavDataUri } from "@/lib/audio/convert";
import { formatDuration } from "@/lib/format";

type MicRecorderProps = {
  maxSeconds: number;
  disabled?: boolean;
  onRecorded: (result: { dataUri: string; durationSeconds: number; bytes: number; blob: Blob }) => void;
};

export function MicRecorder({ maxSeconds, disabled, onRecorded }: MicRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const supported = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) stop();
    }, 200);
    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [recording, maxSeconds, stop]);

  useEffect(
    () => () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => event.data.size > 0 && chunksRef.current.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        try {
          const converted = await convertToWavDataUri(blob, maxSeconds);
          onRecorded({ ...converted, blob });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not process the recording");
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access was denied or is unavailable");
    }
  };

  if (!supported) return null;

  return recording ? (
    <Button type="button" variant="destructive" size="sm" onClick={stop}>
      <Square className="fill-current" /> Stop {formatDuration(seconds)} / {formatDuration(maxSeconds)}
    </Button>
  ) : (
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => void start()}>
      <Mic /> Record
    </Button>
  );
}
