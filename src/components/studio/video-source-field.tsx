"use client";

import { Clapperboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type VideoSourceFieldProps = {
  label: string;
  value: string;
  error?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function VideoSourceField({ label, value, error, disabled, onChange }: VideoSourceFieldProps) {
  const previewable = /^https?:\/\//.test(value.trim());

  return (
    <section className="space-y-2">
      <div>
        <Label htmlFor="video-source" className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">Public http(s) URL or tos:// URI. mp4 or mov, 4-360 s, 480p-1080p, up to 200 MB by URL.</p>
      </div>
      <div className="relative">
        <Clapperboard className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="video-source"
          value={value}
          disabled={disabled}
          placeholder="https://media.example.com/source.mp4"
          className="pl-8"
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {previewable ? <video key={value} src={value.trim()} controls preload="metadata" className="aspect-video w-full rounded-xl border bg-black" /> : null}
    </section>
  );
}
