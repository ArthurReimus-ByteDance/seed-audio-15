"use client";

import { ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MAX_GLOSSARY_ENTRIES, TRANSLATION_LANGUAGES } from "@/lib/seed-audio/constants";
import type { GlossaryRow } from "./studio-state";

type TranslationFieldsProps = {
  targetLanguage: string;
  glossaries: GlossaryRow[];
  targetError?: string;
  glossaryError?: string;
  glossaryRowErrors?: Record<string, { source?: string; target?: string }>;
  disabled?: boolean;
  onTargetChange: (value: string) => void;
  onGlossariesChange: (rows: GlossaryRow[]) => void;
};

export function TranslationFields({
  targetLanguage,
  glossaries,
  targetError,
  glossaryError,
  glossaryRowErrors,
  disabled,
  onTargetChange,
  onGlossariesChange,
}: TranslationFieldsProps) {
  const updateRow = (id: string, patch: Partial<GlossaryRow>) =>
    onGlossariesChange(glossaries.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <div>
          <Label>Target language</Label>
          <p className="text-xs text-muted-foreground">The source language is detected automatically.</p>
        </div>
          <Select value={targetLanguage} onValueChange={onTargetChange} disabled={disabled}>
            <SelectTrigger className="w-full" aria-invalid={Boolean(targetError)}>
              <SelectValue placeholder="Choose a language" />
            </SelectTrigger>
            <SelectContent>
              {TRANSLATION_LANGUAGES.map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  {language.label} ({language.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {targetError ? (
            <p className="text-xs text-destructive" role="alert">
              {targetError}
            </p>
          ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <Label>Glossary</Label>
            <p className="text-xs text-muted-foreground">Force specific translations for names and terms.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || glossaries.length >= MAX_GLOSSARY_ENTRIES}
            onClick={() => onGlossariesChange([...glossaries, { id: crypto.randomUUID(), source: "", target: "" }])}
          >
            <Plus /> Add term
          </Button>
        </div>
        {glossaries.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <Input value={row.source} disabled={disabled} placeholder="Source term" aria-invalid={Boolean(glossaryRowErrors?.[row.id]?.source)} onChange={(event) => updateRow(row.id, { source: event.target.value })} />
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            <Input value={row.target} disabled={disabled} placeholder="Target term" aria-invalid={Boolean(glossaryRowErrors?.[row.id]?.target)} onChange={(event) => updateRow(row.id, { target: event.target.value })} />
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled} onClick={() => onGlossariesChange(glossaries.filter((candidate) => candidate.id !== row.id))} aria-label="Remove term">
              <X />
            </Button>
          </div>
        ))}
        {glossaryError ? (
          <p className="text-xs text-destructive" role="alert">
            {glossaryError}
          </p>
        ) : null}
      </div>
    </section>
  );
}
