import { describe, expect, it } from "vitest";
import { lintPrompt } from "./lint";
import { buildTimelineScript, DEFAULT_GENERAL, timelineDuration, validateTimeline, type TimelineModel, type TimelineRow } from "./timeline";
import { formatClock, parseClock } from "./timecodes";

const row = (patch: Partial<TimelineRow>): TimelineRow => ({ id: crypto.randomUUID(), kind: "dialogue", start: "00:00", end: "00:05", speakerId: "mara", delivery: "", text: "Hello", ...patch });

const model: TimelineModel = {
  format: "structured",
  general: "",
  speakers: [{ id: "mara", name: "Mara", description: "30s female, low smoky alto", clipTag: "" }],
  rows: [
    row({ kind: "dialogue", start: "00:04", end: "00:08", delivery: "faintly amused", text: "That was the story." }),
    row({ kind: "background", start: "00:00", end: "00:24", speakerId: "", text: "An abandoned lighthouse at night." }),
    row({ kind: "pause", start: "00:12", end: "00:14", speakerId: "", text: "Waves continue." }),
  ],
};

describe("timecodes", () => {
  it.each([
    ["00:07", 7],
    ["1:05", 65],
    ["7.5s", 7.5],
    ["12", 12],
    ["00:07.5", 7.5],
  ])("parses %s", (input, expected) => {
    expect(parseClock(input)).toBe(expected);
  });

  it.each(["", "abc", "00:61", "1:2"])("rejects %j", (input) => {
    expect(parseClock(input)).toBeNull();
  });

  it("formats seconds as mm:ss", () => {
    expect(formatClock(65)).toBe("01:05");
    expect(formatClock(-3)).toBe("00:00");
  });
});

describe("buildTimelineScript", () => {
  it("builds the structured format sorted by start time with the default guard", () => {
    const script = buildTimelineScript(model);
    expect(script.split("\n")).toEqual([
      "[General Requirements]",
      DEFAULT_GENERAL,
      "[Speakers]",
      "Mara: 30s female, low smoky alto.",
      "[Timeline]",
      "00:00-00:24 [Background] An abandoned lighthouse at night.",
      "00:04-00:08 Mara (faintly amused): That was the story.",
      "00:12-00:14 [Pause] Waves continue.",
    ]);
  });

  it("builds the inline format with second ranges", () => {
    const script = buildTimelineScript({ ...model, format: "inline" });
    expect(script).toContain("[0.0s:24.0s] [Background] An abandoned lighthouse at night.");
    expect(script).toContain("[4.0s:8.0s] Mara (faintly amused): That was the story.");
    expect(script.startsWith("[General]")).toBe(true);
  });

  it("includes clip tags for reference-voice speakers", () => {
    const script = buildTimelineScript({ ...model, speakers: [{ ...model.speakers[0], clipTag: "@Audio1" }] });
    expect(script).toContain("Mara (@Audio1): 30s female");
    expect(script).toContain("Mara (@Audio1, faintly amused): That was the story.");
  });

  it("produces scripts the linter has no complaints about on timing", () => {
    const issues = lintPrompt(buildTimelineScript(model), { mode: "text-to-audio", clipCount: 0 });
    expect(issues.filter((issue) => issue.id.startsWith("timeline-"))).toEqual([]);
    expect(issues.some((issue) => issue.id === "read-aloud-labels")).toBe(false);
  });

  it("reports total duration", () => {
    expect(timelineDuration(model)).toBe(24);
    expect(timelineDuration({ ...model, rows: [] })).toBe(0);
  });
});

describe("validateTimeline", () => {
  it("accepts a coherent timeline", () => {
    expect(validateTimeline(model)).toEqual([]);
  });

  it("reports bad times, missing speakers and empty text", () => {
    const bad: TimelineModel = {
      ...model,
      rows: [row({ start: "x", end: "00:05" }), row({ start: "00:06", end: "00:05" }), row({ speakerId: "", text: "Hi" }), row({ text: "  " }), row({ kind: "sfx", speakerId: "", text: "" })],
    };
    const issues = validateTimeline(bad);
    expect(issues).toHaveLength(5);
    expect(issues[0]).toMatch(/Row 1.*time/);
    expect(issues[1]).toMatch(/Row 2.*after/);
    expect(issues[2]).toMatch(/Row 3.*speaker/);
    expect(issues[3]).toMatch(/Row 4.*text/);
    expect(issues[4]).toMatch(/Row 5.*describe/);
  });
});
