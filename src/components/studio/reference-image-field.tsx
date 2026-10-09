"use client";

import { ImageIcon, Link2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkImageFile, readImageDataUri, readImageSize } from "@/lib/image-files";
import { formatBytes } from "@/lib/format";
import { imageSourceSchema } from "@/lib/seed-audio/schemas";
import type { ReferenceImageItem } from "./studio-state";

type ReferenceImageFieldProps = {
  value: ReferenceImageItem | null;
  error?: string;
  disabled?: boolean;
  onChange: (value: ReferenceImageItem | null) => void;
};

export function ReferenceImageField({ value, error, disabled, onChange }: ReferenceImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const addFile = async (file: File) => {
    const check = checkImageFile(file);
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    setBusy(true);
    try {
      const source = await readImageDataUri(file, check.format);
      const size = await readImageSize(source);
      onChange({ name: file.name, source, origin: "file", size: file.size, ...(size ?? {}) });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : `Could not read ${file.name}`);
    } finally {
      setBusy(false);
    }
  };

  const addUrl = async () => {
    const parsed = imageSourceSchema.safeParse(url);
    if (!parsed.success || !/^https?:\/\//.test(parsed.data)) {
      setUrlError("Enter a public http(s) image URL");
      return;
    }
    setUrlError(undefined);
    const size = await readImageSize(parsed.data);
    const name = decodeURIComponent(parsed.data.split("?")[0].split("/").pop() || parsed.data);
    onChange({ name, source: parsed.data, origin: "url", ...(size ?? {}) });
    setUrl("");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Reference image (optional)</h3>
          <p className="text-xs text-muted-foreground">One image, 300-6000 px per side, up to 10 MB. It cannot be combined with reference audio or video.</p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {value ? 1 : 0}/1
        </Badge>
      </div>

      {value ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.source} alt="" className="size-14 shrink-0 rounded-lg border object-cover" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-medium">
              <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{value.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {value.width && value.height ? `${value.width}x${value.height}px` : "Size unknown"}
              {value.size ? ` · ${formatBytes(value.size)}` : " · URL"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => onChange(null)} aria-label="Remove reference image">
            <X />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              disabled={disabled}
              placeholder="Paste a public image URL"
              className="pl-8"
              aria-label="Reference image URL"
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
            Add URL
          </Button>
          <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
            <Upload /> {busy ? "Reading..." : "Upload"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*,.heic,.heif"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void addFile(file);
              event.target.value = "";
            }}
          />
        </div>
      )}
      {urlError ? <p className="text-xs text-destructive">{urlError}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
