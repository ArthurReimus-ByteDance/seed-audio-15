export type VocabularyGroup = { id: string; label: string; terms: string[] };

export const VOICE_AGE_GENDER = ["child's voice", "young adult female voice", "young adult male voice", "middle-aged female voice", "middle-aged male voice", "elderly female voice", "elderly male voice", "androgynous voice"];
export const VOICE_REGISTER = ["deep, low-pitched", "mid-to-low pitched", "mid-range", "mid-to-high pitched", "high pitched, piercing"];
export const VOICE_TEXTURE = ["deep and full-bodied", "resonant", "rich", "light", "smooth", "slightly husky", "raspy", "gritty"];
export const VOICE_TRAITS = ["breathy", "slightly nasal", "light vocal fry", "a subtle vocal tremor", "crisp articulation", "relaxed articulation"];
export const VOICE_EMOTION = ["calm", "gentle", "curious", "hesitant", "delighted", "sad", "tense", "angry", "resolute", "restrained", "offhand"];
export const VOICE_PACE = ["slow", "unhurried", "normal pace", "slightly brisk", "hurried", "natural pauses", "gradually speeding up", "gradually slowing down", "slowing at sentence endings"];

export const VOICE_ARCHETYPES: { label: string; ageGender: string; register: string; texture: string; traits: string[]; emotion: string; pace: string }[] = [
  { label: "Audiobook narrator", ageGender: "middle-aged male voice", register: "deep, low-pitched", texture: "deep and full-bodied", traits: ["relaxed articulation"], emotion: "calm", pace: "slow" },
  { label: "Villain", ageGender: "middle-aged male voice", register: "deep, low-pitched", texture: "gritty", traits: ["light vocal fry"], emotion: "restrained", pace: "unhurried" },
  { label: "Soothing ad narrator", ageGender: "young adult female voice", register: "mid-range", texture: "smooth", traits: ["crisp articulation"], emotion: "gentle", pace: "normal pace" },
  { label: "Cool reserved lead", ageGender: "young adult female voice", register: "mid-to-low pitched", texture: "light", traits: ["breathy"], emotion: "restrained", pace: "unhurried" },
  { label: "Meditation guide", ageGender: "middle-aged female voice", register: "mid-to-low pitched", texture: "rich", traits: ["relaxed articulation"], emotion: "calm", pace: "slow" },
];

export const VOCAL_ACTIONS: VocabularyGroup[] = [
  { id: "breath", label: "Breathing", terms: ["soft inhale", "slow exhale", "deep breath", "rapid panting"] },
  { id: "laugh", label: "Laughter", terms: ["soft chuckle", "involuntary laugh", "hearty laughter"] },
  { id: "sad", label: "Sighs and crying", terms: ["soft sigh", "sobbing", "muffled crying"] },
  { id: "other", label: "Other", terms: ["soft throat clearing", "gasp of surprise", "grunt of effort", "muffled groan of pain"] },
];

export const SOUND_VOCABULARY: VocabularyGroup[] = [
  { id: "setting", label: "Setting and acoustics", terms: ["a small enclosed room", "an open outdoor space", "a vast hall", "subtle reverb", "long reverberation", "close-miked", "extremely quiet noise floor"] },
  { id: "ambience", label: "Ambience", terms: ["quiet room tone", "soft wind ambience", "steady rainfall", "indistinct crowd murmur", "distant street traffic", "sparse bird calls in the distance", "distant rumbling thunder", "distant ocean waves"] },
  { id: "sfx", label: "Sound effects", terms: ["soft footsteps crunching through snow", "subtle clothing rustle", "water droplets hitting the floor", "two light metallic clinks", "a sudden crackle as a log is added to the fire", "gentle paper rustling", "the sound of a lock turning"] },
  { id: "texture", label: "Texture", terms: ["crisp", "dull", "sharp", "soft", "heavy and resonant", "faint and scattered", "gritty"] },
  { id: "distance", label: "Distance and volume", terms: ["close and clear", "distant and indistinct", "faint", "prominent", "muffled through a wall", "approaching from a distance"] },
  { id: "timing", label: "Timing and change", terms: ["throughout the scene", "occasional", "immediately after the line", "gradually intensifying", "slowly fading out"] },
];

export const MUSIC_VOCABULARY: VocabularyGroup[] = [
  { id: "purpose", label: "Purpose and style", terms: ["dialogue underscore", "opening theme", "cinematic orchestral", "acoustic folk", "light jazz", "ambient electronic"] },
  { id: "mood", label: "Mood", terms: ["warm and soothing", "light and upbeat", "melancholic and nostalgic", "mysterious and unsettling", "grand and triumphant"] },
  { id: "instruments", label: "Instruments", terms: ["piano lead", "a string bed", "brass accents", "light percussion", "sustained synth pads", "instrumental only"] },
  { id: "tempo", label: "Tempo and rhythm", terms: ["slow", "moderate", "fast", "a steady pulse", "free rhythm", "around 72 BPM", "4/4 time"] },
  { id: "entry", label: "Entry and development", terms: ["enters at the opening", "enters after the dialogue", "builds in layers", "gradually swells", "rises to a climax"] },
  { id: "balance", label: "Balance and ending", terms: ["below the voice", "a soft underscore", "softens during dialogue", "stops abruptly", "resolves naturally", "slowly fades out"] },
];

export type ConstraintId = "dry-speech" | "no-music" | "no-sfx" | "only-dialogue" | "no-silence" | "short-pauses" | "music-low" | "single-speaker";

export const CONSTRAINT_PRESETS: { id: ConstraintId; label: string; sentence: string }[] = [
  { id: "dry-speech", label: "Dry, close-miked speech", sentence: "Generate only this speaker as dry, close-miked speech." },
  { id: "single-speaker", label: "Single speaker only", sentence: "Do not include a second speaker." },
  { id: "no-music", label: "No music", sentence: "Do not include music." },
  { id: "no-sfx", label: "No effects or noise", sentence: "Do not include sound effects, ambient noise, or room reverb." },
  { id: "only-dialogue", label: "Speak only the dialogue", sentence: "Speak only the dialogue. Do not read character names, timecodes, or instructions aloud." },
  { id: "no-silence", label: "No leading or trailing silence", sentence: "Do not leave silence at the beginning or end." },
  { id: "short-pauses", label: "Natural breaths, short pauses", sentence: "Allow only natural breaths between sentences. Do not leave long pauses." },
  { id: "music-low", label: "Music low under the voice", sentence: "Keep the music at a low volume beneath the voice, secondary to the speech, so every word stays clear." },
];

export const STEM_PRESETS: { name: string; description: string }[] = [
  { name: "mixed", description: "the complete mixed audio" },
  { name: "vocals", description: "all speech and singing" },
  { name: "sfx", description: "sound effects only" },
  { name: "bgm", description: "background music only" },
  { name: "ambience", description: "ambient background sound only" },
];
