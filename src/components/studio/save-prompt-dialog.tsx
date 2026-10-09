"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StudioMode } from "@/lib/seed-audio/modes";
import { useSavedPromptsStore } from "@/stores/saved-prompts";

type SavePromptDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; prompt: string; mode: StudioMode };

export function SavePromptDialog({ open, onOpenChange, prompt, mode }: SavePromptDialogProps) {
  const add = useSavedPromptsStore((state) => state.add);
  const [title, setTitle] = useState("");

  const save = () => {
    add({ title, prompt, mode });
    setTitle("");
    onOpenChange(false);
    toast.success("Saved to My prompts");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save prompt</DialogTitle>
          <DialogDescription>Keep this prompt in your browser to reuse it later from the library or the Examples picker.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="saved-title">Name</Label>
          <Input
            id="saved-title"
            value={title}
            autoFocus
            placeholder={prompt.trim().slice(0, 48) || "Untitled prompt"}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && save()}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={!prompt.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
