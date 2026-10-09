export const STUDIO_MODES = [
  "text-to-audio",
  "reference-voice",
  "video-to-audio",
  "video-translation",
  "stem-separation",
] as const;

export type StudioMode = (typeof STUDIO_MODES)[number];

export type ModeDefinition = {
  id: StudioMode;
  title: string;
  navLabel: string;
  description: string;
  promptLabel: string;
  promptPlaceholder: string;
  usesPrompt: boolean;
  referenceAudio: "none" | "optional" | "required";
  referenceVideo: "none" | "optional" | "required";
  singleAudio: boolean;
  referenceImage: boolean;
};

export const MODE_DEFINITIONS: Record<StudioMode, ModeDefinition> = {
  "text-to-audio": {
    id: "text-to-audio",
    title: "Text to Audio",
    navLabel: "Text to Audio",
    description: "Describe the voices, lines, ambience and music. Seed Audio turns the script into a finished soundscape.",
    promptLabel: "Prompt",
    promptPlaceholder:
      "A young adult female voice, soft and breathy, speaking at a steady pace in a calm tone. Deliver: \"The sea surface is calm today.\" No music.",
    usesPrompt: true,
    referenceAudio: "none",
    referenceVideo: "none",
    singleAudio: false,
    referenceImage: true,
  },
  "reference-voice": {
    id: "reference-voice",
    title: "Reference Voice",
    navLabel: "Reference Voice",
    description: "Upload 1 to 6 reference clips to steer timbre and performance, then tag them as @Audio1, @Audio2 in your script.",
    promptLabel: "Script",
    promptPlaceholder:
      "The speaker (young adult male, deep steady voice, @Audio1) addresses the camera at a moderate pace: \"Welcome to BytePlus console.\"",
    usesPrompt: true,
    referenceAudio: "required",
    referenceVideo: "none",
    singleAudio: false,
    referenceImage: false,
  },
  "video-to-audio": {
    id: "video-to-audio",
    title: "Video to Audio",
    navLabel: "Video to Audio",
    description: "Use a reference video for timing, optionally with reference audio for timbre. Write the exact line to speak: the model does not transcribe the video.",
    promptLabel: "Instructions",
    promptPlaceholder:
      "A gentle female voice says: \"The sea surface is calm today.\" Match the timing and pacing of the reference video. No music.",
    usesPrompt: true,
    referenceAudio: "optional",
    referenceVideo: "required",
    singleAudio: false,
    referenceImage: false,
  },
  "video-translation": {
    id: "video-translation",
    title: "Video Dubbing",
    navLabel: "Video Dubbing",
    description: "Translate and dub a source video into 30 languages. Dubbing accepts no text prompt.",
    promptLabel: "",
    promptPlaceholder: "",
    usesPrompt: false,
    referenceAudio: "none",
    referenceVideo: "required",
    singleAudio: false,
    referenceImage: false,
  },
  "stem-separation": {
    id: "stem-separation",
    title: "Stem Separation",
    navLabel: "Stem Separation",
    description: "Split a mix into vocals, sound effects and background music, each returned with a name and description.",
    promptLabel: "Tracks to extract",
    promptPlaceholder: "Split this audio into separate tracks for vocals, sound effects, and background music.",
    usesPrompt: true,
    referenceAudio: "required",
    referenceVideo: "none",
    singleAudio: true,
    referenceImage: false,
  },
};

export function isStudioMode(value: string): value is StudioMode {
  return (STUDIO_MODES as readonly string[]).includes(value);
}
