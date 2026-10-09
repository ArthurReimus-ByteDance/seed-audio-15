import { describe, expect, it } from "vitest";
import { appendBlock, composeConstraints, composeSpeakerLine, composeStemTracks, composeVoice, insertSnippet, readConstraintIds, setConstraintHeader } from "./compose";

describe("insertSnippet", () => {
  it("inserts at the caret with natural spacing", () => {
    expect(insertSnippet("Hello world", "soft sigh", 5, 5)).toEqual({ text: "Hello soft sigh world", caret: 15 });
  });

  it("replaces a selection and avoids doubled spaces", () => {
    expect(insertSnippet("Hello  world", "there", 6, 7).text).toBe("Hello there world");
  });

  it("handles an empty value and out-of-range selections", () => {
    expect(insertSnippet("", "A voice", 0, 0)).toEqual({ text: "A voice", caret: 7 });
    expect(insertSnippet("abc", "X", 99, 120).text).toBe("abc X");
  });

  it("does not add a space before punctuation", () => {
    expect(insertSnippet("Hello", ", again", 5, 5).text).toBe("Hello, again");
  });
});

describe("appendBlock", () => {
  it("starts a fresh prompt without leading blank lines", () => {
    expect(appendBlock("", "Block")).toBe("Block");
  });

  it("separates blocks and refuses duplicates", () => {
    expect(appendBlock("One  \n", "Two")).toBe("One\n\nTwo");
    expect(appendBlock("One\n\nTwo", "Two")).toBe("One\n\nTwo");
  });
});

describe("composeVoice", () => {
  const base = { ageGender: "", register: "", texture: "", traits: [], emotion: "", pace: "", dialogue: "" };

  it("builds the guide's template from all parts", () => {
    const text = composeVoice({
      ageGender: "elderly male voice",
      register: "deep, low-pitched",
      texture: "gritty",
      traits: ["breathy", "light vocal fry"],
      emotion: "restrained hostility",
      pace: "slow",
      dialogue: '"You came."',
    });
    expect(text).toBe('An elderly male voice in a deep, low-pitched register, with a gritty tone and breathy, light vocal fry. Convey restrained hostility, speaking at a slow pace. Dialogue: "You came."');
  });

  it("degrades gracefully with few parts", () => {
    expect(composeVoice(base)).toBe("A voice.");
    expect(composeVoice({ ...base, ageGender: "young adult female voice", pace: "brisk" })).toBe("A young adult female voice. Speak at a brisk pace.");
  });
});

describe("composeConstraints", () => {
  it("returns nothing when no preset is chosen", () => {
    expect(composeConstraints([])).toBe("");
  });

  it("joins selected presets in catalogue order under one header", () => {
    const text = composeConstraints(["no-music", "dry-speech"]);
    expect(text.startsWith("[Recording Constraints] Generate only this speaker")).toBe(true);
    expect(text).toContain("Do not include music.");
  });
});

describe("composeStemTracks", () => {
  it("lists named tracks with descriptions and normalises names", () => {
    expect(composeStemTracks([{ name: "dialogue mara", description: "Mara's speech only" }, { name: "bgm", description: "" }])).toBe(
      "Separate this audio into these tracks: dialogue_mara (Mara's speech only), bgm. Provide the name and a content description for each track.",
    );
  });

  it("returns an empty string without tracks", () => {
    expect(composeStemTracks([{ name: "  ", description: "x" }])).toBe("");
  });
});

describe("constraint header", () => {
  const header = composeConstraints(["no-music", "dry-speech"]);

  it("prepends a header to a prompt and replaces an existing one", () => {
    const withHeader = setConstraintHeader('A voice says "Hi".', header);
    expect(withHeader.split("\n")[0]).toBe(header);
    const replaced = setConstraintHeader(withHeader, composeConstraints(["no-sfx"]));
    expect(replaced.split("\n")[0]).toBe(composeConstraints(["no-sfx"]));
    expect(replaced.endsWith('A voice says "Hi".')).toBe(true);
    expect(replaced.match(/\[Recording Constraints\]/g)).toHaveLength(1);
  });

  it("removes the header when nothing is selected", () => {
    expect(setConstraintHeader(`${header}\nBody`, "")).toBe("Body");
    expect(setConstraintHeader("Body", "")).toBe("Body");
  });

  it("reads back which presets are active", () => {
    expect(readConstraintIds(`${header}\nBody`).sort()).toEqual(["dry-speech", "no-music"]);
    expect(readConstraintIds("Body")).toEqual([]);
  });
});

describe("composeSpeakerLine", () => {
  it("builds a speaker line and puts the caret where the delivery goes", () => {
    const { snippet, caretFromEnd } = composeSpeakerLine("  Emma ", "@Audio1");
    expect(snippet).toBe("Emma (@Audio1, ): ");
    expect(snippet.slice(0, snippet.length - caretFromEnd)).toBe("Emma (@Audio1, ");
    expect(snippet.slice(snippet.length - caretFromEnd)).toBe("): ");
  });
});
