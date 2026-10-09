"use client";

import { Check, Copy, Mic } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { copyText } from "@/lib/clipboard";
import { MODE_DEFINITIONS } from "@/lib/seed-audio/modes";
import type { PromptEntry } from "@/data/prompt-library";

export function PromptCard({ entry, actions, showModes = true }: { entry: PromptEntry; actions: ReactNode; showModes?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyText(entry.prompt)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else toast.error("Could not copy to the clipboard");
  };

  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex h-full flex-col gap-3 px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{entry.category}</Badge>
          {showModes ? entry.modes.map((mode) => (
            <Badge key={mode} variant="outline">
              {MODE_DEFINITIONS[mode].title}
            </Badge>
          )) : null}
          {entry.referenceClips ? (
            <Badge variant="outline" className="gap-1">
              <Mic className="size-3" /> {entry.referenceClips} clip{entry.referenceClips > 1 ? "s" : ""}
            </Badge>
          ) : null}
        </div>
        <div>
          <h3 className="text-sm font-semibold">{entry.title}</h3>
          <p className="text-xs text-muted-foreground">{entry.description}</p>
        </div>
        <p className="line-clamp-4 rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed whitespace-pre-line text-muted-foreground">{entry.prompt}</p>
        <div className="mt-auto flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void copy()}>
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          {actions}
        </div>
      </CardContent>
    </Card>
  );
}
