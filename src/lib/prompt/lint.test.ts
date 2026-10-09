import { describe, expect, it } from "vitest";
import { countSpeechUnits, estimateSpeech, lintPrompt } from "./lint";

const text = { mode: "text-to-audio", clipCount: 0 } as const;
const ids = (prompt: string, context: Parameters<typeof lintPrompt>[1] = text) => lintPrompt(prompt, context).map((issue) => issue.id);

describe("lintPrompt", () => {
  it("returns nothing for an empty prompt", () => {
    expect(lintPrompt("   ", text)).toEqual([]);
  });

  it("is quiet for a well-formed single-speaker prompt", () => {
    const prompt = 'A young adult female voice, soft and breathy, speaking at a steady pace. Deliver: "Hello and welcome back to the show." No music or sound effects.';
    expect(lintPrompt(prompt, text)).toEqual([]);
  });

  it("flags vague voice descriptors", () => {
    expect(ids('A pleasant voice says "Hello there my friend" at a steady pace. No music.')).toContain("vague-terms");
  });

  it("suggests exclusions and offers a working fix", () => {
    const prompt = 'A young adult voice at a steady pace says "Hello there my friend".';
    const issue = lintPrompt(prompt, text).find((entry) => entry.id === "missing-exclusions");
    expect(issue?.fix?.apply(prompt)).toMatch(/No music, sound effects/);
    expect(ids(issue!.fix!.apply(prompt))).not.toContain("missing-exclusions");
  });

  it("does not repeat a fix that is already applied", () => {
    const prompt = 'Voice at a steady pace says "Hello there my friend".';
    const fix = lintPrompt(prompt, text).find((entry) => entry.id === "missing-exclusions")!.fix!;
    expect(fix.apply(fix.apply(prompt))).toBe(fix.apply(prompt));
  });

  it("warns that labels may be read aloud in multi-speaker scripts", () => {
    const prompt = 'Woman (angry): "Give it back right now."\nMan (calm): "Never in a thousand years."';
    expect(ids(prompt)).toContain("read-aloud-labels");
    expect(ids(`${prompt}\nSpeak only the dialogue.`)).not.toContain("read-aloud-labels");
  });

  it("warns when music may cover dialogue and clears once balance is stated", () => {
    const loud = 'Soft jazz music plays. A man at a steady pace says "Welcome to the shop everyone".';
    expect(ids(loud)).toContain("music-volume");
    expect(ids(`${loud} The music stays low beneath the voice.`)).not.toContain("music-volume");
  });

  it("does not treat an excluded music mention as music use", () => {
    expect(ids('A voice at a steady pace says "Hello there my friend". Do not include music.')).not.toContain("music-volume");
  });

  it("warns when there is no spoken line, which the live API rejects", () => {
    expect(ids("Instrumental music only. Warm piano, slow tempo.")).toContain("no-speech-text");
    expect(ids("Ambient sound and sound effects only. Rain on a tin roof.")).toContain("no-speech-text");
    expect(ids("Fully reproduce the lines and pacing from the reference video.", { mode: "video-to-audio", clipCount: 0 })).toContain("no-speech-text");
  });

  it("does not ask for a spoken line when one is quoted or in a speaker line, or in stem separation", () => {
    expect(ids('A steady voice says "Hello there my friend". No music.')).not.toContain("no-speech-text");
    expect(ids('Woman (calm): "Hello there my friend"')).not.toContain("no-speech-text");
    expect(ids("Split this audio into vocals, effects and music.", { mode: "stem-separation", clipCount: 1 })).not.toContain("no-speech-text");
  });

  it("counts sound-effect cues beyond the recommended five", () => {
    const cues = Array.from({ length: 6 }, (_, index) => `[SFX] cue ${index}`).join("\n");
    expect(ids(`Narrator at a steady pace says "Hello there my friend"\n${cues}`)).toContain("sfx-count");
  });

  it("detects unbalanced quotes", () => {
    expect(ids('A voice at a steady pace says "Hello there. No music.')).toContain("unbalanced-quotes");
  });
});

describe("reference tags", () => {
  const reference = (clipCount: number) => ({ mode: "reference-voice", clipCount }) as const;

  it("errors on tags beyond the number of clips", () => {
    const issues = lintPrompt('Woman (@Audio1) says "Hi there friend" and Man (@Audio3) replies.', reference(2));
    expect(issues.find((issue) => issue.id === "tag-missing-3")?.severity).toBe("error");
  });

  it("warns when clips are untagged or unused", () => {
    expect(ids('Say "Welcome to the console" at a steady pace', reference(1))).toContain("clips-untagged");
    expect(ids('Woman (@Audio1) says "Welcome to the console" at a steady pace', reference(2))).toContain("clip-unused-2");
  });

  it("errors when tags are used in a mode without reference audio", () => {
    expect(ids('Woman (@Audio1) says "Hi there friend"', text)).toContain("tags-without-clips");
    expect(ids("Split @Audio1", { mode: "stem-separation", clipCount: 1 })).toContain("tags-without-clips");
  });

  it("is happy with matching tags", () => {
    const prompt = 'Woman (@Audio1, warm, steady pace) says "Welcome to the console." Man (@Audio2) replies "Thanks".';
    expect(lintPrompt(prompt, reference(2)).filter((issue) => issue.severity === "error")).toEqual([]);
  });
});

describe("timeline checks", () => {
  const header = "Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.\nNo music.\n";

  it("flags lines that cannot be spoken in their window", () => {
    const prompt = `${header}00:00-00:02 Mara (steady pace, a calm voice): ${"word ".repeat(18)}\n00:02-00:08 Mara (steady): Fine.`;
    expect(ids(prompt)).toContain("timeline-rush-00:00-00:02");
  });

  it("accepts a comfortable speaking rate", () => {
    const prompt = `${header}00:00-00:05 Mara (steady pace, a calm voice): I used to think the lighthouse was warning ships.\n00:06-00:09 Mara (steady): That was the story.`;
    expect(ids(prompt).filter((id) => id.startsWith("timeline-"))).toEqual([]);
  });

  it("errors when the end is not after the start", () => {
    expect(ids(`${header}00:05-00:05 Mara (steady): Hello there.\n00:09-00:07 Mara (steady): Again please.`)).toEqual(expect.arrayContaining(["timeline-order-00:05-00:05", "timeline-order-00:09-00:07"]));
  });

  it("warns about overlapping dialogue but not about overlapping background layers", () => {
    const overlap = `${header}00:00-00:05 Ann (steady): One two three four.\n00:03-00:08 Bob (steady): Five six seven eight.`;
    expect(ids(overlap).some((id) => id.startsWith("timeline-overlap"))).toBe(true);
    const layers = `${header}00:00-00:20 [Background] Rain.\n00:00-00:20 [Music] Piano.\n00:00-00:05 Ann (steady): One two three four.`;
    expect(ids(layers).some((id) => id.startsWith("timeline-overlap"))).toBe(false);
  });

  it("validates inline second ranges", () => {
    expect(ids("[3.0s:1.0s] A splash. A boy at a steady pace says \"Hello there my friend\". No music.")).toContain("inline-order-[3.0s:1.0s]");
  });
});

describe("speech estimation", () => {
  it("counts latin words and halves CJK characters", () => {
    expect(countSpeechUnits("one two three")).toBe(3);
    expect(countSpeechUnits("你好世界")).toBe(2);
    expect(countSpeechUnits("")).toBe(0);
  });

  it("estimates from quoted dialogue", () => {
    const estimate = estimateSpeech('Say "one two three four five" and also "six seven eight nine ten"');
    expect(estimate?.units).toBe(10);
    expect(estimate?.seconds).toBeCloseTo(4);
  });

  it("prefers timeline dialogue and returns null without speech", () => {
    expect(estimateSpeech("00:00-00:05 Mara (steady): one two three four\n00:00-00:20 [Music] Piano with many words here")?.units).toBe(4);
    expect(estimateSpeech("A cafe ambience with no speech")).toBeNull();
  });
});
