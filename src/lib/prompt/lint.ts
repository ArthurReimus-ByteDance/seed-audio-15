import type { StudioMode } from "@/lib/seed-audio/modes";
import { parseClock } from "./timecodes";

export type LintSeverity = "error" | "warning" | "tip";

export type LintFix = { label: string; apply: (prompt: string) => string };

export type LintIssue = { id: string; severity: LintSeverity; message: string; fix?: LintFix };

export type LintContext = { mode: StudioMode; clipCount: number };

const SEVERITY_ORDER: Record<LintSeverity, number> = { error: 0, warning: 1, tip: 2 };
const WORDS_PER_SECOND_LIMIT = 3.6;
const MAX_SFX_CUES = 5;

const TIMELINE_LINE = /^\s*(\d{1,2}:\d{2}(?:\.\d+)?)\s*[-–—]\s*(\d{1,2}:\d{2}(?:\.\d+)?)\s+(.*)$/;
const INLINE_RANGE = /\[(\d+(?:\.\d+)?)s?\s*:\s*(\d+(?:\.\d+)?)s?\]/g;
const SPEAKER_LINE = /^\s*(?:\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}\s+)?([A-Z][\p{L}\w .'-]{0,30}?)\s*(?:\([^)]*\))?\s*[:：]\s*\S/u;
const QUOTED_DIALOGUE = /["“][^"”\n]{3,}["”]/;
const TAG_PATTERN = /@Audio(\d+)/gi;
const MUSIC_WORDS = /\b(music|bgm|score|underscore|soundtrack)\b/i;
const SFX_OR_AMBIENCE = /\b(sfx|sound effects?|ambien(?:ce|t)|noise|reverb|room tone)\b/i;
const EXCLUSION = /\b(no|without|do not include|don't include|exclude)\b[^.\n]{0,60}\b(music|background|sound effects?|sfx|noise|ambien)/i;
const READ_ALOUD_GUARD = /(do not read|don't read|not read|speak only|only the dialogue|only speak)/i;
const PACE_WORDS = /(\bslow|\bbrisk|\bhurried|\bunhurried|\bpace\b|\bpacing|\bsteady\b|speaking rate|\bspeed\b|\bfast\b|\btempo\b|\bcalm\b|\bmeasured\b)/i;
const VOICE_WORDS = /\b(voice|tone|accent|timbre|baritone|alto|soprano)\b/i;
const MUSIC_LOW_WORDS = /(\blow[- ](?:volume|level)\b|\bquiet(?:ly)?\b|\bbeneath\b|\bunderneath\b|\bunder the (?:voice|dialogue|speech)\b|\bsecondary\b|\bunderstated\b|\bbelow the voice\b|\bwithout covering\b|\bnot cover\b|\bsoften|\bduck)/i;
const SFX_CUE = /(?:\[|【)\s*(?:sfx|sound effects?)\s*(?:\]|】)/gi;
const NEGATION = /\b(?:no|without|do not include|don't include|exclude)\b[^.\n]{0,60}/gi;
const VAGUE_TERMS = /\b(pleasant|sophisticated|nice|beautiful|good|great|amazing|lovely)\s+(voice|tone|sound|music)\b/i;

type TimelineLine = { start: number; end: number; body: string; label: string };

function parseTimelineLines(prompt: string): TimelineLine[] {
  const lines: TimelineLine[] = [];
  for (const raw of prompt.split("\n")) {
    const match = TIMELINE_LINE.exec(raw);
    if (!match) continue;
    const start = parseClock(match[1]);
    const end = parseClock(match[2]);
    if (start === null || end === null) continue;
    lines.push({ start, end, body: match[3], label: `${match[1]}-${match[2]}` });
  }
  return lines;
}

function spokenText(body: string): string | null {
  if (/^\s*[[【]/.test(body)) return null;
  const split = body.search(/[:：]/);
  if (split === -1) return null;
  const text = body.slice(split + 1).replace(/<[^>]*>/g, "").trim();
  return text.length > 0 ? text : null;
}

export function countSpeechUnits(text: string): number {
  const cjk = (text.match(/[぀-ヿ㐀-鿿가-힯]/g) ?? []).length;
  const latin = text.replace(/[぀-ヿ㐀-鿿가-힯]/g, " ").split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return latin + cjk * 0.5;
}

function hasDialogue(prompt: string, timeline: TimelineLine[]): boolean {
  if (QUOTED_DIALOGUE.test(prompt)) return true;
  if (timeline.some((line) => spokenText(line.body) !== null)) return true;
  return prompt.split("\n").some((line) => SPEAKER_LINE.test(line) && !/^\s*[[【]/.test(line));
}

function appendLine(prompt: string, line: string): string {
  const trimmed = prompt.replace(/\s+$/, "");
  return trimmed.includes(line) ? trimmed : `${trimmed}\n${line}`;
}

function tagIssues(prompt: string, context: LintContext): LintIssue[] {
  const tags = new Set([...prompt.matchAll(TAG_PATTERN)].map((match) => Number(match[1])));
  const issues: LintIssue[] = [];
  const acceptsClips = context.mode === "reference-voice" || context.mode === "video-to-audio";

  if (!acceptsClips && tags.size > 0) {
    issues.push({ id: "tags-without-clips", severity: "error", message: "This mode takes no reference audio, so @Audio tags have nothing to point at." });
    return issues;
  }
  for (const tag of [...tags].sort((a, b) => a - b)) {
    if (tag < 1 || tag > context.clipCount) {
      issues.push({ id: `tag-missing-${tag}`, severity: "error", message: `@Audio${tag} has no matching clip (you have ${context.clipCount}).` });
    }
  }
  if (acceptsClips && context.clipCount > 0) {
    if (tags.size === 0 && context.mode === "reference-voice") {
      issues.push({ id: "clips-untagged", severity: "warning", message: "Reference clips are not tagged. Mention @Audio1, @Audio2 in the script so the model knows which voice is which." });
    }
    if (tags.size > 0) {
      for (let index = 1; index <= context.clipCount; index += 1) {
        if (!tags.has(index)) issues.push({ id: `clip-unused-${index}`, severity: "warning", message: `@Audio${index} is added but never used in the script.` });
      }
    }
  }
  return issues;
}

function timelineIssues(prompt: string, timeline: TimelineLine[]): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const line of timeline) {
    if (line.end <= line.start) {
      issues.push({ id: `timeline-order-${line.label}`, severity: "error", message: `${line.label}: the end time must be after the start time.` });
    }
  }
  const spoken = timeline
    .map((line) => ({ line, text: spokenText(line.body) }))
    .filter((entry): entry is { line: TimelineLine; text: string } => entry.text !== null && entry.line.end > entry.line.start);

  for (const { line, text } of spoken) {
    const duration = line.end - line.start;
    const rate = countSpeechUnits(text) / duration;
    if (rate > WORDS_PER_SECOND_LIMIT) {
      issues.push({
        id: `timeline-rush-${line.label}`,
        severity: "warning",
        message: `${line.label}: about ${rate.toFixed(1)} words per second. The line will sound rushed; widen the window or shorten the text.`,
      });
    }
  }
  for (let index = 0; index < spoken.length; index += 1) {
    for (let other = index + 1; other < spoken.length; other += 1) {
      const a = spoken[index].line;
      const b = spoken[other].line;
      if (Math.min(a.end, b.end) - Math.max(a.start, b.start) > 0.3) {
        issues.push({ id: `timeline-overlap-${a.label}-${b.label}`, severity: "warning", message: `Dialogue at ${a.label} overlaps dialogue at ${b.label}.` });
      }
    }
  }
  for (const range of prompt.matchAll(INLINE_RANGE)) {
    if (Number(range[2]) <= Number(range[1])) {
      issues.push({ id: `inline-order-${range[0]}`, severity: "error", message: `${range[0]}: the end time must be after the start time.` });
    }
  }
  return issues;
}

export function lintPrompt(prompt: string, context: LintContext): LintIssue[] {
  if (!prompt.trim()) return [];
  const issues: LintIssue[] = [];
  const timeline = parseTimelineLines(prompt);
  const dialogue = hasDialogue(prompt, timeline);
  const speakerCount = new Set(prompt.split("\n").map((line) => SPEAKER_LINE.exec(line)?.[1]?.trim().toLowerCase()).filter(Boolean)).size;
  const usesMusic = MUSIC_WORDS.test(prompt.replace(NEGATION, " "));

  issues.push(...tagIssues(prompt, context), ...timelineIssues(prompt, timeline));

  const vague = VAGUE_TERMS.exec(prompt);
  if (vague) {
    issues.push({ id: "vague-terms", severity: "tip", message: `"${vague[0]}" is too vague to steer the model. Describe age, register, texture and pace instead.` });
  }

  if (dialogue && !usesMusic && !SFX_OR_AMBIENCE.test(prompt) && !EXCLUSION.test(prompt)) {
    issues.push({
      id: "missing-exclusions",
      severity: "tip",
      message: "Say what to leave out, otherwise the model may add music or noise.",
      fix: { label: "Add exclusion", apply: (value) => appendLine(value, "No music, sound effects, or ambient noise.") },
    });
  }

  if ((speakerCount >= 2 || timeline.length >= 2) && !READ_ALOUD_GUARD.test(prompt)) {
    issues.push({
      id: "read-aloud-labels",
      severity: "warning",
      message: "Speaker names, timecodes or directions may be read aloud.",
      fix: { label: "Add guard", apply: (value) => appendLine(value, "Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.") },
    });
  }

  if (dialogue && !PACE_WORDS.test(prompt)) {
    issues.push({ id: "missing-pace", severity: "tip", message: "Specify the speaking pace (slow, steady, hurried) and emotion for a more controlled delivery." });
  }

  if (dialogue && context.clipCount === 0 && !VOICE_WORDS.test(prompt)) {
    issues.push({ id: "missing-voice", severity: "tip", message: "Describe the voice: perceived age, register, texture and any accent." });
  }

  if (usesMusic && dialogue && !MUSIC_LOW_WORDS.test(prompt)) {
    issues.push({
      id: "music-volume",
      severity: "warning",
      message: "Music can bury the voice. Keep it low and secondary.",
      fix: { label: "Add balance", apply: (value) => appendLine(value, "Keep the music at a low volume beneath the voice so every word stays clear.") },
    });
  }

  if (!dialogue && context.mode !== "stem-separation") {
    issues.push({
      id: "no-speech-text",
      severity: "warning",
      message: "No spoken line found. The early-access API rejects prompts without the exact words to speak (music-only, effects-only and \"reproduce the video's lines\" prompts all fail). Put the line in quotes.",
    });
  }

  const sfxCues = (prompt.match(SFX_CUE) ?? []).length + timeline.filter((line) => /^\s*\[\s*(?:sound effects?|sfx)\s*\]/i.test(line.body)).length;
  if (sfxCues > MAX_SFX_CUES) {
    issues.push({ id: "sfx-count", severity: "tip", message: `${sfxCues} sound-effect cues. The guide recommends 3-5 per scene to avoid clutter.` });
  }

  if ((prompt.match(/"/g) ?? []).length % 2 === 1) {
    issues.push({ id: "unbalanced-quotes", severity: "tip", message: "Unbalanced quotation marks. Keep spoken dialogue clearly quoted." });
  }

  return issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function estimateSpeech(prompt: string): { units: number; seconds: number } | null {
  const timeline = parseTimelineLines(prompt);
  const spoken = timeline.map((line) => spokenText(line.body)).filter((text): text is string => text !== null);
  const quoted = [...prompt.matchAll(/["“]([^"”\n]{3,})["”]/g)].map((match) => match[1]);
  const sources = spoken.length > 0 ? spoken : quoted;
  if (sources.length === 0) return null;
  const units = sources.reduce((sum, text) => sum + countSpeechUnits(text), 0);
  return { units, seconds: units / 2.5 };
}
