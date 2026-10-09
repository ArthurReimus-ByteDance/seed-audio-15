"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { lintPrompt } from "@/lib/prompt/lint";
import { formatClock } from "@/lib/prompt/timecodes";
import {
  buildTimelineScript,
  newRow,
  newSpeaker,
  TIMELINE_KIND_LABELS,
  timelineDuration,
  validateTimeline,
  type TimelineFormat,
  type TimelineModel,
  type TimelineRow,
  type TimelineRowKind,
  type TimelineSpeaker,
} from "@/lib/prompt/timeline";
import type { StudioMode } from "@/lib/seed-audio/modes";

type TimelineBuilderProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StudioMode;
  clipCount: number;
  onInsert: (script: string, replace: boolean) => void;
};

const KINDS = Object.keys(TIMELINE_KIND_LABELS) as TimelineRowKind[];

function initialModel(): TimelineModel {
  const speaker = { ...newSpeaker(), name: "Narrator", description: "30s female, warm, patient, soothing storyteller voice" };
  return {
    format: "structured",
    general: "",
    speakers: [speaker],
    rows: [
      { ...newRow("background", "00:00", "00:12"), text: "Cozy living room, warm acoustics, extremely quiet noise floor, close-miked." },
      { ...newRow("music", "00:00", "00:12"), text: "Soft, slow-tempo piano with gentle ambient strings, calm and reflective, kept low under the voice." },
      { ...newRow("dialogue", "00:01", "00:06"), speakerId: speaker.id, delivery: "gentle, settling in, steady pace", text: "Once upon a time, in a quiet little town by the sea." },
    ],
  };
}

export function TimelineBuilder({ open, onOpenChange, mode, clipCount, onInsert }: TimelineBuilderProps) {
  const [model, setModel] = useState<TimelineModel>(initialModel);
  const issues = useMemo(() => validateTimeline(model), [model]);
  const script = useMemo(() => buildTimelineScript(model), [model]);
  const lint = useMemo(() => lintPrompt(script, { mode, clipCount }).filter((issue) => issue.severity !== "tip"), [script, mode, clipCount]);
  const tags = Array.from({ length: clipCount }, (_, index) => `@Audio${index + 1}`);

  const patchRow = (id: string, change: Partial<TimelineRow>) => setModel((previous) => ({ ...previous, rows: previous.rows.map((row) => (row.id === id ? { ...row, ...change } : row)) }));
  const patchSpeaker = (id: string, change: Partial<TimelineSpeaker>) => setModel((previous) => ({ ...previous, speakers: previous.speakers.map((speaker) => (speaker.id === id ? { ...speaker, ...change } : speaker)) }));

  const addRow = (kind: TimelineRowKind) =>
    setModel((previous) => {
      const last = Math.max(0, ...previous.rows.map((row) => timelineDuration({ ...previous, rows: [row] })));
      return { ...previous, rows: [...previous.rows, { ...newRow(kind, formatClock(last), formatClock(last + 4)), speakerId: kind === "dialogue" ? (previous.speakers[0]?.id ?? "") : "" }] };
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Timeline script builder</DialogTitle>
          <DialogDescription>Control exactly when each voice, sound and music cue starts and ends. Total length: {formatClock(timelineDuration(model))}.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[62vh] grid-cols-[minmax(0,1fr)] gap-6 overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="min-w-0 space-y-6">
            <div className="flex items-center justify-between gap-3">
              <Tabs value={model.format} onValueChange={(format) => setModel({ ...model, format: format as TimelineFormat })}>
                <TabsList>
                  <TabsTrigger value="structured">Structured sheet</TabsTrigger>
                  <TabsTrigger value="inline">Inline [0.0s:1.2s]</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timeline-general" className="text-xs">General requirements</Label>
              <Textarea id="timeline-general" value={model.general} rows={2} placeholder="Purpose, style, target duration. Leave blank for the default read-aloud guard." onChange={(event) => setModel({ ...model, general: event.target.value })} />
            </div>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Speakers</h4>
                <Button type="button" variant="outline" size="sm" onClick={() => setModel({ ...model, speakers: [...model.speakers, newSpeaker()] })}>
                  <Plus /> Add speaker
                </Button>
              </div>
              {model.speakers.map((speaker) => (
                <div key={speaker.id} className="flex flex-wrap items-center gap-2">
                  <Input value={speaker.name} placeholder="Name" className="h-8 w-28 shrink-0" onChange={(event) => patchSpeaker(speaker.id, { name: event.target.value })} aria-label="Speaker name" />
                  <Input value={speaker.description} placeholder="Age, gender, timbre, speech traits" className="h-8 min-w-40 flex-1" onChange={(event) => patchSpeaker(speaker.id, { description: event.target.value })} aria-label="Speaker voice" />
                  {tags.length > 0 ? (
                    <Select value={speaker.clipTag || "none"} onValueChange={(value) => patchSpeaker(speaker.id, { clipTag: value === "none" ? "" : value })}>
                      <SelectTrigger size="sm" className="w-24" aria-label="Reference clip">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No clip</SelectItem>
                        {tags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span />
                  )}
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setModel({ ...model, speakers: model.speakers.filter((item) => item.id !== speaker.id), rows: model.rows.map((row) => (row.speakerId === speaker.id ? { ...row, speakerId: "" } : row)) })} aria-label="Remove speaker">
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Timeline</h4>
                <Select value="add" onValueChange={(kind) => kind !== "add" && addRow(kind as TimelineRowKind)}>
                  <SelectTrigger size="sm" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add a row...</SelectItem>
                    {KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {TIMELINE_KIND_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {model.rows.map((row) => (
                <div key={row.id} className="space-y-2 rounded-xl border p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={row.kind} onValueChange={(kind) => patchRow(row.id, { kind: kind as TimelineRowKind })}>
                      <SelectTrigger size="sm" className="w-36" aria-label="Row type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KINDS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {TIMELINE_KIND_LABELS[kind]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input value={row.start} className="h-8 w-20 text-center font-mono text-xs" aria-label="Start time" onChange={(event) => patchRow(row.id, { start: event.target.value })} />
                    <span className="text-muted-foreground">to</span>
                    <Input value={row.end} className="h-8 w-20 text-center font-mono text-xs" aria-label="End time" onChange={(event) => patchRow(row.id, { end: event.target.value })} />
                    {row.kind === "dialogue" ? (
                      <Select value={row.speakerId || "none"} onValueChange={(value) => patchRow(row.id, { speakerId: value === "none" ? "" : value })}>
                        <SelectTrigger size="sm" className="w-32" aria-label="Speaker">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Speaker...</SelectItem>
                          {model.speakers.map((speaker) => (
                            <SelectItem key={speaker.id} value={speaker.id}>
                              {speaker.name || "Unnamed"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    <Button type="button" variant="ghost" size="icon-sm" className="ml-auto" onClick={() => setModel({ ...model, rows: model.rows.filter((item) => item.id !== row.id) })} aria-label="Remove row">
                      <Trash2 />
                    </Button>
                  </div>
                  {row.kind === "dialogue" ? <Input value={row.delivery} placeholder="Delivery: emotion, pace, pauses, emphasis" className="h-8 text-xs" onChange={(event) => patchRow(row.id, { delivery: event.target.value })} aria-label="Delivery" /> : null}
                  <Input
                    value={row.text}
                    placeholder={row.kind === "dialogue" ? "What is said" : row.kind === "pause" ? "Who stops and what continues (optional)" : "Describe the sound, distance and volume"}
                    className="h-8 text-xs"
                    onChange={(event) => patchRow(row.id, { text: event.target.value })}
                    aria-label="Text"
                  />
                </div>
              ))}
            </section>
          </div>

          <aside className="space-y-3">
            <h4 className="text-sm font-medium">Generated script</h4>
            <pre className="max-h-80 overflow-auto rounded-xl bg-muted/60 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{script}</pre>
            {issues.length > 0 ? (
              <ul className="space-y-1 text-xs text-destructive" aria-label="Timeline problems">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
            {lint.length > 0 ? (
              <ul className="space-y-1 text-xs text-warning" aria-label="Prompt guide warnings">
                {lint.map((issue) => (
                  <li key={issue.id}>{issue.message}</li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="outline" disabled={issues.length > 0} onClick={() => onInsert(script, false)}>
            Append to prompt
          </Button>
          <Button type="button" disabled={issues.length > 0} onClick={() => onInsert(script, true)}>
            Replace prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
