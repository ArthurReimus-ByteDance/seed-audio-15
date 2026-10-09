"use client";

import { Bookmark, Clock, Eraser, LibraryBig, Wand2 } from "lucide-react";
import type { KeyboardEvent, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/format";
import { MAX_PROMPT_LENGTH } from "@/lib/seed-audio/constants";
import { cn } from "@/lib/utils";

type PromptEditorProps = {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  disabled?: boolean;
  speechSeconds: number | null;
  showTimeline: boolean;
  textareaRef: Ref<HTMLTextAreaElement>;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onOpenLibrary: () => void;
  onOpenToolkit: () => void;
  onOpenTimeline: () => void;
  onSave: () => void;
};

export function PromptEditor({ label, placeholder, value, error, disabled, speechSeconds, showTimeline, textareaRef, onChange, onSubmit, onOpenLibrary, onOpenToolkit, onOpenTimeline, onSave }: PromptEditorProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="prompt" className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onOpenLibrary}>
            <LibraryBig /> Examples
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onOpenToolkit}>
            <Wand2 /> Toolkit
          </Button>
          {showTimeline ? (
            <Button type="button" variant="ghost" size="sm" onClick={onOpenTimeline}>
              <Clock /> Timeline
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={onSave} disabled={!value.trim()}>
            <Bookmark /> Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} disabled={!value || disabled}>
            <Eraser /> Clear
          </Button>
        </div>
      </div>
      <Textarea
        id="prompt"
        ref={textareaRef}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "prompt-error" : undefined}
        className="min-h-56 resize-y text-[15px] leading-relaxed"
      />
      <div className="flex items-start justify-between gap-3 text-xs">
        <p id="prompt-error" className={cn("text-destructive", !error && "invisible")} role={error ? "alert" : undefined}>
          {error ?? "No error"}
        </p>
        <p className={cn("shrink-0 tabular-nums text-muted-foreground", value.length > MAX_PROMPT_LENGTH && "text-destructive")}>
          {speechSeconds !== null ? `~${formatDuration(speechSeconds)} of speech · ` : ""}
          {value.length.toLocaleString()} / {MAX_PROMPT_LENGTH.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
