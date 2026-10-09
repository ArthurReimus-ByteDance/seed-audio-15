import { formatClock, formatSeconds, parseClock } from "./timecodes";

export type TimelineRowKind = "background" | "music" | "sfx" | "dialogue" | "pause" | "ending";

export const TIMELINE_KIND_LABELS: Record<TimelineRowKind, string> = {
  background: "Background",
  music: "Music",
  sfx: "Sound effect",
  dialogue: "Dialogue",
  pause: "Pause",
  ending: "Ending",
};

const KIND_TAGS: Partial<Record<TimelineRowKind, string>> = {
  background: "[Background]",
  music: "[Music]",
  sfx: "[Sound Effect]",
  pause: "[Pause]",
  ending: "[Ending]",
};

export type TimelineSpeaker = { id: string; name: string; description: string; clipTag: string };

export type TimelineRow = {
  id: string;
  kind: TimelineRowKind;
  start: string;
  end: string;
  speakerId: string;
  delivery: string;
  text: string;
};

export type TimelineFormat = "structured" | "inline";

export type TimelineModel = {
  format: TimelineFormat;
  general: string;
  speakers: TimelineSpeaker[];
  rows: TimelineRow[];
};

export const DEFAULT_GENERAL = "Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.";

export function newRow(kind: TimelineRowKind, start = "00:00", end = "00:05"): TimelineRow {
  return { id: crypto.randomUUID(), kind, start, end, speakerId: "", delivery: "", text: "" };
}

export function newSpeaker(): TimelineSpeaker {
  return { id: crypto.randomUUID(), name: "", description: "", clipTag: "" };
}

export function validateTimeline(model: TimelineModel): string[] {
  const issues: string[] = [];
  model.rows.forEach((row, index) => {
    const label = `Row ${index + 1}`;
    const start = parseClock(row.start);
    const end = parseClock(row.end);
    if (start === null || end === null) issues.push(`${label}: use a time like 00:07 or 7.5s.`);
    else if (end <= start) issues.push(`${label}: the end must be after the start.`);
    if (row.kind === "dialogue" && !row.speakerId) issues.push(`${label}: choose a speaker.`);
    if (row.kind === "dialogue" && !row.text.trim()) issues.push(`${label}: dialogue needs text.`);
    if (row.kind !== "dialogue" && row.kind !== "pause" && !row.text.trim()) issues.push(`${label}: describe the sound.`);
  });
  return issues;
}

function rowBody(row: TimelineRow, speakers: TimelineSpeaker[]): string {
  if (row.kind === "dialogue") {
    const speaker = speakers.find((candidate) => candidate.id === row.speakerId);
    const name = speaker?.name.trim() || "Speaker";
    const tag = speaker?.clipTag ? `${speaker.clipTag}, ` : "";
    const delivery = row.delivery.trim();
    const bracket = tag || delivery ? ` (${tag}${delivery})` : "";
    return `${name}${bracket}: ${row.text.trim()}`;
  }
  const tag = KIND_TAGS[row.kind] ?? "";
  return `${tag} ${row.text.trim()}`.trim();
}

function rowRange(row: TimelineRow, format: TimelineFormat): string {
  const start = parseClock(row.start) ?? 0;
  const end = parseClock(row.end) ?? start;
  return format === "inline" ? `[${formatSeconds(start)}s:${formatSeconds(end)}s]` : `${formatClock(start)}-${formatClock(end)}`;
}

export function buildTimelineScript(model: TimelineModel): string {
  const general = model.general.trim() || DEFAULT_GENERAL;
  const rows = [...model.rows].sort((a, b) => (parseClock(a.start) ?? 0) - (parseClock(b.start) ?? 0));
  const lines = rows.map((row) => `${rowRange(row, model.format)} ${rowBody(row, model.speakers)}`);

  if (model.format === "inline") return [`[General] ${general}`, ...lines].join("\n");

  const speakerLines = model.speakers
    .filter((speaker) => speaker.name.trim())
    .map((speaker) => `${speaker.name.trim()}${speaker.clipTag ? ` (${speaker.clipTag})` : ""}: ${speaker.description.trim() || "describe the voice"}.`);
  const sections = ["[General Requirements]", general];
  if (speakerLines.length > 0) sections.push("[Speakers]", ...speakerLines);
  sections.push("[Timeline]", ...lines);
  return sections.join("\n");
}

export function timelineDuration(model: TimelineModel): number {
  return model.rows.reduce((max, row) => Math.max(max, parseClock(row.end) ?? 0), 0);
}
