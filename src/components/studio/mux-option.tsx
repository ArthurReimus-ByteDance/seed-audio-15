"use client";

import { Film } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type MuxOptionProps = {
  checked: boolean;
  available: boolean | undefined;
  error?: string;
  onChange: (checked: boolean) => void;
};

export function MuxOption({ checked, available, error, onChange }: MuxOptionProps) {
  const unavailable = available === false;

  return (
    <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-start gap-3">
        <Film className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <Label htmlFor="mux-video" className="text-sm font-medium">
            Also create a dubbed video
          </Label>
          <p className="text-xs text-muted-foreground">
            Replaces the original audio with the dub and gives you an mp4. The picture is not re-encoded when it can be copied.
          </p>
          {unavailable ? <p className="mt-1 text-xs text-warning">ffmpeg was not found on the server. Install it (or set FFMPEG_PATH) to enable this.</p> : null}
        </div>
        <Switch id="mux-video" checked={checked && !unavailable} disabled={unavailable} onCheckedChange={onChange} aria-label="Create a dubbed video" />
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
