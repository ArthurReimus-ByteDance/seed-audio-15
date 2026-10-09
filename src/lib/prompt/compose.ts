import { CONSTRAINT_PRESETS, type ConstraintId } from "@/data/prompt-vocabulary";

export type Insertion = { text: string; caret: number };

export function insertSnippet(value: string, snippet: string, selectionStart: number, selectionEnd: number): Insertion {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const before = value.slice(0, start);
  const after = value.slice(end);
  const needsLead = before.length > 0 && !/\s$/.test(before) && !/^[\s,.;:!?)]/.test(snippet);
  const needsTail = after.length > 0 && !/^[\s,.;:!?]/.test(after) && !/[\s(]$/.test(snippet);
  const inserted = `${needsLead ? " " : ""}${snippet}${needsTail ? " " : ""}`;
  return { text: `${before}${inserted}${after}`, caret: before.length + inserted.length };
}

export function appendBlock(value: string, block: string): string {
  const trimmed = value.replace(/\s+$/, "");
  if (!trimmed) return block;
  return trimmed.includes(block.trim()) ? trimmed : `${trimmed}\n\n${block}`;
}

const CONSTRAINT_HEADER = /^\[Recording Constraints\][^\n]*\n?/;

export function setConstraintHeader(value: string, header: string): string {
  const rest = value.replace(CONSTRAINT_HEADER, "").replace(/^\s+/, "");
  if (!header) return rest;
  return rest ? `${header}\n${rest}` : header;
}

export function readConstraintIds(value: string): ConstraintId[] {
  const header = CONSTRAINT_HEADER.exec(value)?.[0] ?? "";
  return CONSTRAINT_PRESETS.filter((preset) => header.includes(preset.sentence)).map((preset) => preset.id);
}

const SPEAKER_LINE_TAIL = "): ";

export function composeSpeakerLine(label: string, tag: string): { snippet: string; caretFromEnd: number } {
  return { snippet: `${label.trim()} (${tag}, ${SPEAKER_LINE_TAIL}`, caretFromEnd: SPEAKER_LINE_TAIL.length };
}

export type VoiceParts = {
  ageGender: string;
  register: string;
  texture: string;
  traits: string[];
  emotion: string;
  pace: string;
  dialogue: string;
};

function withArticle(phrase: string): string {
  return /^[aeiou]/i.test(phrase) ? `An ${phrase}` : `A ${phrase}`;
}

export function composeVoice(parts: VoiceParts): string {
  const subject = parts.ageGender.trim() ? withArticle(parts.ageGender.trim()) : "A voice";
  const details: string[] = [];
  if (parts.register) details.push(`in a ${parts.register} register`);
  const tone = [parts.texture ? `${parts.texture} tone` : "", parts.traits.length > 0 ? parts.traits.join(", ") : ""].filter(Boolean).join(" and ");
  if (tone) details.push(`with a ${tone}`);
  const first = `${subject}${details.length > 0 ? ` ${details.join(", ")}` : ""}.`;
  const delivery: string[] = [];
  if (parts.emotion) delivery.push(`Convey ${parts.emotion}`);
  if (parts.pace) delivery.push(`${delivery.length > 0 ? "speaking" : "Speak"} at a ${parts.pace} pace`);
  const second = delivery.length > 0 ? ` ${delivery.join(", ")}.` : "";
  const dialogue = parts.dialogue.trim() ? ` Dialogue: "${parts.dialogue.trim().replace(/^"|"$/g, "")}"` : "";
  return `${first}${second}${dialogue}`;
}

export function composeConstraints(ids: ConstraintId[]): string {
  const sentences = CONSTRAINT_PRESETS.filter((preset) => ids.includes(preset.id)).map((preset) => preset.sentence);
  return sentences.length > 0 ? `[Recording Constraints] ${sentences.join(" ")}` : "";
}

export type StemTrack = { name: string; description: string };

export function composeStemTracks(tracks: StemTrack[]): string {
  const clean = tracks.map((track) => ({ name: track.name.trim().replace(/\s+/g, "_"), description: track.description.trim() })).filter((track) => track.name);
  if (clean.length === 0) return "";
  const list = clean.map((track) => (track.description ? `${track.name} (${track.description})` : track.name)).join(", ");
  return `Separate this audio into these tracks: ${list}. Provide the name and a content description for each track.`;
}
