"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptCard } from "@/components/library/prompt-card";
import { promptsForMode, type PromptEntry } from "@/data/prompt-library";
import { MODE_DEFINITIONS, type StudioMode } from "@/lib/seed-audio/modes";
import { useSavedPromptsStore, type SavedPrompt } from "@/stores/saved-prompts";

type PromptPickerProps = {
  mode: StudioMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: PromptEntry) => void;
  onSelectSaved: (saved: SavedPrompt) => void;
};

export function PromptPicker({ mode, open, onOpenChange, onSelect, onSelectSaved }: PromptPickerProps) {
  const entries = promptsForMode(mode);
  const saved = useSavedPromptsStore((state) => state.items).filter((item) => item.mode === mode);
  const remove = useSavedPromptsStore((state) => state.remove);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Example prompts</DialogTitle>
          <DialogDescription>Starting points for {MODE_DEFINITIONS[mode].title}. Selecting one replaces your current prompt.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="examples">
          <TabsList>
            <TabsTrigger value="examples">Examples ({entries.length})</TabsTrigger>
            <TabsTrigger value="saved">My prompts ({saved.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="examples" className="mt-3">
            <div className="max-h-[56vh] overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                {entries.map((entry) => (
                  <PromptCard
                    key={entry.id}
                    entry={entry}
                    showModes={false}
                    actions={
                      <Button type="button" size="sm" onClick={() => onSelect(entry)}>
                        Use prompt
                      </Button>
                    }
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="saved" className="mt-3">
            <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {saved.length === 0 ? (
              <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Nothing saved yet. Use Save in the prompt editor.</p>
            ) : (
              saved.map((item) => (
                <div key={item.id} className="flex items-start gap-3 rounded-xl border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {item.title} <Badge variant="outline">{MODE_DEFINITIONS[item.mode].title}</Badge>
                    </p>
                    <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">{item.prompt}</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => onSelectSaved(item)}>
                    Use prompt
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(item.id)} aria-label={`Delete ${item.title}`}>
                    <Trash2 />
                  </Button>
                </div>
              ))
            )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
