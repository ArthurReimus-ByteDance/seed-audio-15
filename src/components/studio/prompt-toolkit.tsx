"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CONSTRAINT_PRESETS,
  MUSIC_VOCABULARY,
  SOUND_VOCABULARY,
  STEM_PRESETS,
  VOCAL_ACTIONS,
  VOICE_AGE_GENDER,
  VOICE_ARCHETYPES,
  VOICE_EMOTION,
  VOICE_PACE,
  VOICE_REGISTER,
  VOICE_TEXTURE,
  VOICE_TRAITS,
  type ConstraintId,
  type VocabularyGroup,
} from "@/data/prompt-vocabulary";
import { composeConstraints, composeStemTracks, composeVoice, readConstraintIds, type StemTrack } from "@/lib/prompt/compose";
import type { StudioMode } from "@/lib/seed-audio/modes";
import { cn } from "@/lib/utils";

export type ToolkitActions = {
  insert: (snippet: string) => void;
  append: (block: string) => void;
  replace: (text: string) => void;
  setConstraints: (header: string) => void;
};

type PromptToolkitProps = ToolkitActions & {
  mode: StudioMode;
  prompt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NONE = "none";

function Chip({ active, children, onClick }: { active?: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function VocabularyGroups({ groups, onPick }: { groups: VocabularyGroup[]; onPick: (term: string) => void }) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">{group.label}</h4>
          <div className="flex flex-wrap gap-1.5">
            {group.terms.map((term) => (
              <Chip key={term} onClick={() => onPick(term)}>
                {term}
              </Chip>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? "" : next)}>
        <SelectTrigger className="w-full" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not specified</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function VoiceDesigner({ onInsert }: { onInsert: (text: string) => void }) {
  const [parts, setParts] = useState({ ageGender: "", register: "", texture: "", traits: [] as string[], emotion: "", pace: "", dialogue: "" });
  const composed = composeVoice(parts);
  const patch = (change: Partial<typeof parts>) => setParts((previous) => ({ ...previous, ...change }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Start from an archetype</h4>
        <div className="flex flex-wrap gap-1.5">
          {VOICE_ARCHETYPES.map((archetype) => (
            <Chip key={archetype.label} onClick={() => patch({ ageGender: archetype.ageGender, register: archetype.register, texture: archetype.texture, traits: archetype.traits, emotion: archetype.emotion, pace: archetype.pace })}>
              {archetype.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <OptionSelect label="Age and gender" value={parts.ageGender} options={VOICE_AGE_GENDER} onChange={(ageGender) => patch({ ageGender })} />
        <OptionSelect label="Register" value={parts.register} options={VOICE_REGISTER} onChange={(register) => patch({ register })} />
        <OptionSelect label="Texture" value={parts.texture} options={VOICE_TEXTURE} onChange={(texture) => patch({ texture })} />
        <OptionSelect label="Emotion" value={parts.emotion} options={VOICE_EMOTION} onChange={(emotion) => patch({ emotion })} />
        <OptionSelect label="Pace" value={parts.pace} options={VOICE_PACE} onChange={(pace) => patch({ pace })} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Distinctive traits</Label>
        <div className="flex flex-wrap gap-1.5">
          {VOICE_TRAITS.map((trait) => (
            <Chip key={trait} active={parts.traits.includes(trait)} onClick={() => patch({ traits: parts.traits.includes(trait) ? parts.traits.filter((item) => item !== trait) : [...parts.traits, trait] })}>
              {trait}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Dialogue (optional)</Label>
        <Input value={parts.dialogue} onChange={(event) => patch({ dialogue: event.target.value })} placeholder="What the voice says" />
      </div>
      <p className="rounded-lg bg-muted/60 p-3 font-mono text-xs leading-relaxed">{composed}</p>
      <Button type="button" className="w-full" onClick={() => onInsert(composed)}>
        Insert voice description
      </Button>
    </div>
  );
}

function Constraints({ prompt, onApply }: { prompt: string; onApply: (header: string) => void }) {
  const active = readConstraintIds(prompt);
  const toggle = (id: ConstraintId) => onApply(composeConstraints(active.includes(id) ? active.filter((item) => item !== id) : [...active, id]));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Toggle recording constraints. They are kept as a single header line at the top of your prompt.</p>
      <div className="flex flex-wrap gap-1.5">
        {CONSTRAINT_PRESETS.map((preset) => (
          <Chip key={preset.id} active={active.includes(preset.id)} onClick={() => toggle(preset.id)}>
            {preset.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function StemTracks({ onReplace }: { onReplace: (text: string) => void }) {
  const [tracks, setTracks] = useState<StemTrack[]>([STEM_PRESETS[0], STEM_PRESETS[1], STEM_PRESETS[2], STEM_PRESETS[3]]);
  const composed = composeStemTracks(tracks);
  const has = (name: string) => tracks.some((track) => track.name === name);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">List every track you want back and give each a file name. The model returns a name and description per track.</p>
      <div className="flex flex-wrap gap-1.5">
        {STEM_PRESETS.map((preset) => (
          <Chip key={preset.name} active={has(preset.name)} onClick={() => setTracks(has(preset.name) ? tracks.filter((track) => track.name !== preset.name) : [...tracks, preset])}>
            {preset.name}
          </Chip>
        ))}
      </div>
      <div className="space-y-2">
        {tracks.map((track, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input value={track.name} className="h-8 w-36 font-mono text-xs" aria-label="Track name" onChange={(event) => setTracks(tracks.map((item, position) => (position === index ? { ...item, name: event.target.value } : item)))} />
            <Input value={track.description} className="h-8 text-xs" aria-label="Track description" placeholder="What it contains" onChange={(event) => setTracks(tracks.map((item, position) => (position === index ? { ...item, description: event.target.value } : item)))} />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setTracks(tracks.filter((_, position) => position !== index))} aria-label="Remove track">
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setTracks([...tracks, { name: "dialogue_speaker", description: "one speaker's speech only" }])}>
          <Plus /> Add track
        </Button>
      </div>
      <Textarea readOnly value={composed} className="min-h-24 font-mono text-xs" aria-label="Composed prompt" />
      <Button type="button" className="w-full" disabled={!composed} onClick={() => onReplace(composed)}>
        Use as prompt
      </Button>
    </div>
  );
}

export function PromptToolkit({ mode, prompt, open, onOpenChange, insert, append, replace, setConstraints }: PromptToolkitProps) {
  const stem = mode === "stem-separation";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Prompt toolkit</SheetTitle>
          <SheetDescription>Vocabulary and builders from the Seed Audio prompt guide. Click a phrase to insert it at your cursor.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {stem ? (
            <StemTracks onReplace={replace} />
          ) : (
            <Tabs defaultValue="voice">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="voice">Voice</TabsTrigger>
                <TabsTrigger value="sounds">Sounds</TabsTrigger>
                <TabsTrigger value="music">Music</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
              </TabsList>
              <TabsContent value="voice">
                <VoiceDesigner onInsert={append} />
              </TabsContent>
              <TabsContent value="sounds">
                <VocabularyGroups groups={SOUND_VOCABULARY} onPick={insert} />
              </TabsContent>
              <TabsContent value="music">
                <p className="mb-3 text-xs text-muted-foreground">Keep music low under dialogue. Background music is instrumental only.</p>
                <VocabularyGroups groups={MUSIC_VOCABULARY} onPick={insert} />
              </TabsContent>
              <TabsContent value="actions">
                <p className="mb-3 text-xs text-muted-foreground">Non-verbal vocalizations are inserted as angle-bracket cues, e.g. {"<soft sigh>"}.</p>
                <VocabularyGroups groups={VOCAL_ACTIONS.map((group) => ({ ...group, terms: group.terms }))} onPick={(term) => insert(`<${term}>`)} />
              </TabsContent>
              <TabsContent value="rules">
                <Constraints prompt={prompt} onApply={setConstraints} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
