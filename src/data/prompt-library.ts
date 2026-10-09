import type { StudioMode } from "@/lib/seed-audio/modes";

export const PROMPT_CATEGORIES = [
  "Voice-over",
  "Dialogue",
  "Scenes",
  "Timeline scripts",
  "Templates",
  "Reference voice",
  "Video",
  "Stem separation",
] as const;

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export type PromptEntry = {
  id: string;
  title: string;
  category: PromptCategory;
  modes: StudioMode[];
  description: string;
  prompt: string;
  referenceClips?: number;
};

export const PROMPT_LIBRARY: PromptEntry[] = [
  {
    id: "voiceover-clean",
    title: "Clean single-speaker voice-over",
    category: "Voice-over",
    modes: ["text-to-audio"],
    description: "Dry, close-miked speech with no music, noise or dead air.",
    prompt:
      "[Recording Constraints] Generate only this speaker as dry, close-miked speech. Do not include music, sound effects, ambient noise, room reverb, a second speaker, or silence at the beginning or end. Allow only natural breaths between sentences. Do not leave long pauses.\nA young adult female voice, soft and youthful with a breathy quality, speaking at a steady pace in a calm, natural tone. Deliver the following continuously: \"I have told you before, this is not how we handle things around here. Let me finish what I have to say, and then you can decide for yourself. There is really no need to rush any of this.\"",
  },
  {
    id: "voiceover-gentle",
    title: "Gentle narration",
    category: "Voice-over",
    modes: ["text-to-audio"],
    description: "The shortest useful prompt: voice, line, pace, music constraint.",
    prompt:
      "Read with a gentle, restrained female English voice: \"The sea surface is calm today.\" Use a slightly slow speaking rate, no background music.",
  },
  {
    id: "dialogue-rain",
    title: "Two speakers in the rain",
    category: "Dialogue",
    modes: ["text-to-audio"],
    description: "Define each voice first, then tag every line with speaker and delivery.",
    prompt:
      "A young adult English woman with a clear, bright voice and a natural British accent speaks quickly, full of genuine frustration that turns into helpless laughter. A young adult English man with a warm, textured baritone and a distinct British accent speaks with animated concern and fond, restrained humour.\nWoman (exasperated, breathless): \"I cannot believe I let you talk me into this. My hands are frozen, my hair is ruined, and I think my umbrella has given up.\"\nMan (apologetic but smiling): \"I said it might rain. I did not say the sky would take it personally.\"\nWoman (trying to stay annoyed, then laughing): \"This is not rain. This is a full betrayal.\"\nMan (softening, earnest): \"All right, I am sorry. I should have brought you somewhere warm.\"\nWoman (surprised, quieter): \"You mean that?\"\nMan (gentle, teasing): \"Aye. Though I still think you look brilliant.\"\nWoman (flustered, smiling): \"That is a terrible apology.\"\nMan (warmly): \"But it worked a little.\"",
  },
  {
    id: "scene-stone-hall",
    title: "Cinematic stone hall",
    category: "Scenes",
    modes: ["text-to-audio"],
    description: "Speech, effects and score interleaved in sequence.",
    prompt:
      "Cinematic drama. In a vast stone hall, slow footsteps are heard first, accompanied by faint armor clinks and distant dripping water. The footsteps suddenly stop. A young woman says in a low voice, \"Wait, something is coming.\" As soon as she finishes, a deep roar sounds in the distance, followed by heavy impacts that draw closer. Low strings enter and gradually build. Next comes the metallic scrape of a sword being drawn, and a middle-aged man urgently shouts, \"Get back!\" The instant his shout ends, a violent impact erupts and the music shifts into intense orchestral scoring. The impact's reverberation is mixed with falling rubble; the music then quickly fades, leaving only the characters' hurried breathing and the hall's echo before naturally dissipating.",
  },
  {
    id: "timeline-lighthouse",
    title: "Lighthouse monologue (timeline)",
    category: "Timeline scripts",
    modes: ["text-to-audio"],
    description: "Single speaker with exact pauses and an emotional shift.",
    prompt:
      "[Speakers]\nMara: 30 years old, female, low smoky alto, intimate and breathy, slightly husky texture, restrained delivery that gradually shifts from calm recollection to quiet fear.\n[Timeline]\n00:00-00:24 [Background] An abandoned coastal lighthouse at night. Distant waves break below the cliffs. Soft wind moves through a cracked window. The voice is close-miked with subtle natural reverb and an extremely quiet noise floor.\n00:00-00:24 [Music] Sparse low cello drones with faint glass harmonics. The music is tense and atmospheric, slowly increasing in intensity while remaining quiet and unobtrusive.\n00:00-00:04 Mara (quiet, reflective, breathy voice, very slow pacing): I used to think the lighthouse was warning ships away from the rocks.\n00:04-00:07 Mara (faintly amused, nostalgic, gentle downward intonation, unhurried delivery): That was the story Dad told me.\n00:07-00:12 Mara (slower, more intimate, restrained emotion, carefully measured pauses): But every night, just before midnight, the light turned toward our house.\n00:12-00:14 Mara (silent pause, holding back unease):\n00:14-00:18 Mara (uneasy but carefully controlled, slightly trembling voice, slow pacing): I never told anyone what I saw in the window.\n00:18-00:21 Mara (shaken, whispering, breath catching, leaving space between words): It looked exactly like me.\n00:21-00:23 Mara (silent pause, growing fear, no dialogue):\n00:23-00:24 Mara (quietly terrified, barely audible, fragile broken tone): And tonight... it waved back.",
  },
  {
    id: "timeline-family-story",
    title: "Three-speaker story (timeline)",
    category: "Timeline scripts",
    modes: ["text-to-audio"],
    description: "Audio drama with a continuous music bed and timed dialogue.",
    prompt:
      "Audio Book/Audio Drama\n[Speakers]\nMommy Aden: 30s female, warm, patient, soothing storyteller voice\nLily: 8 female, curious, sweet, reading carefully\nLeo: 14 male, thoughtful, steady, slightly deeper voice\n[Timeline]\n00:00-01:17 [Background] Cozy living room, warm acoustics, extremely quiet noise floor, close-miked.\n00:00-01:17 [Music] Soft, slow-tempo piano with gentle ambient strings, calm and reflective.\n00:00-00:03 Mommy Aden (gentle, settling in): <soft throat clearing> Right, so...\n00:03-00:33 Mommy Aden (calm, storytelling rhythm): We've kind of talked about this already. Satan, who was Lucifer in heaven, was one of the angels. And he used to sing very, very beautifully. But he wanted people to worship him. He got so proud, and because of that pride, he wanted to be like God. He even tried to take over. And what happened? God said, \"Get out of here,\" and cast him out of heaven.\n00:34-00:35 Lily (quietly absorbing): Okay.\n00:36-00:44 Leo (thoughtful, steady): And you know what, Mom? The Bible actually says that pride comes before a fall. That's exactly what happened to him.\n00:44-00:46 <soft paper rustling>\n00:46-00:51 Lily (reading, slightly hesitant): So, this next question is for you, Mommy Aden.",
  },
  {
    id: "template-timeline",
    title: "Timeline script template",
    category: "Templates",
    modes: ["text-to-audio"],
    description: "Fill-in structure for fine-grained control of timing.",
    prompt:
      "[General Requirements]\n<Purpose, overall style, target duration>. Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.\n[Speakers]\nCharacter A: <perceived age, vocal gender, timbre, typical speech characteristics>.\nCharacter B: <perceived age, vocal gender, timbre, typical speech characteristics>.\n[Timeline]\n00:00-<end> [Background] <setting, continuous ambient sounds, spatial acoustics, distance, volume>.\n00:00-<time> [Music] <style, mood, instruments, tempo, how the music enters or exits>.\n<start-end> [Sound Effect] <sound source, acoustic qualities, distance, changes over time>.\n<start-end> Character A (<emotion, pace, pauses, or emphasis>): \"<dialogue>\"\n<start-end> [Pause] <who stops speaking and which background sounds continue>.\n<start-end> Character B (<emotion and delivery>): \"<dialogue>\"\n<start-end> [Ending] <which sounds remain at the end and how each audio layer concludes>.",
  },
  {
    id: "template-audio-script",
    title: "Audio script template",
    category: "Templates",
    modes: ["text-to-audio"],
    description: "Sequential structure: opening, events, transitions, ending.",
    prompt:
      "<Use case or style>. In <setting>, first hear <opening sound>, followed by <a new sound or line of dialogue>. When <a line, action, or sound> occurs, <another sound> enters simultaneously and <builds, fades, approaches, or recedes>. End with <how speech, music, and ambience resolve>.",
  },
  {
    id: "template-voice-design",
    title: "Character voice design template",
    category: "Templates",
    modes: ["text-to-audio"],
    description: "Age, register, texture, traits, emotion and pace in one sentence.",
    prompt:
      "A <perceived age and voice gender> voice in a <vocal register>, with a <vocal texture> tone and <distinctive vocal traits>. Convey <emotional state or progression>, speaking at <pace and pause pattern>. Dialogue: \"<content>\"",
  },
  {
    id: "reference-presenter",
    title: "Presenter with a cloned voice",
    category: "Reference voice",
    modes: ["reference-voice"],
    description: "Tag the clip as @Audio1 and describe the delivery.",
    referenceClips: 1,
    prompt:
      "Indoor office setting, with close-miked speech and no noticeable reverb. The speaker (a young adult male with a deep, steady voice, Castilian Spanish accent, a content creator or presenter, @Audio1) addresses the camera at a steady, moderate pace in an even tone: \"Las leyes contra la sodomía o leyes 'buggery' son de hace quinientos años, pero hoy protagonizan una polémica judicial en Londres.\"",
  },
  {
    id: "reference-coffee-ad",
    title: "Coffee commercial",
    category: "Reference voice",
    modes: ["reference-voice"],
    description: "Voice-over with a low, supporting music bed.",
    referenceClips: 1,
    prompt:
      "Elegant coffee commercial. A warm, refined acoustic BGM begins with soft brushed drums, mellow upright bass, and gentle jazz guitar chords, creating a calm early-morning cafe atmosphere; the music remains understated beneath the voice and naturally fades out after the final line.\nWoman (@Audio1, natural American English accent, warm low-mid register, velvety and intimate tone, poised and quietly confident advertising delivery): \"Some mornings deserve more than just coffee. Our small-batch roasted beans bring out a smooth, chocolatey richness in every cup, with a finish that lingers beautifully. Take a moment, brew something exceptional.\"\nThe final words are delivered softly with a subtle smile as the guitar chord, bass, and brushed drums crossfade into a gentle, unhurried decay.",
  },
  {
    id: "reference-two-person",
    title: "Two-person argument",
    category: "Reference voice",
    modes: ["reference-voice"],
    description: "Two clips in a stable order, with BGM and SFX layers.",
    referenceClips: 2,
    prompt:
      "[BGM] Low cello pulses and sparse piano notes establish a tense suspense score, continuing beneath all dialogue without covering the voices.\n[SFX] A deserted parking garage at night, with continuous ventilation hum, buzzing fluorescent lights, and scattered water drips echoing against concrete.\nEmma (@Audio1, angry, sharply calling out): Ryan! Stop!\nRyan (@Audio2, irritated, snapping at her): What do you want?\nEmma (@Audio1, accusing him directly, strong and forceful): The USB drive. You took it from my desk.\nRyan (@Audio2, angry denial, raised voice): I didn't take anything!\n[SFX] Ryan walks quickly toward his car. A sustained sequence of hard, hurried footsteps echoes across the garage.\nEmma (@Audio1, loud, commanding): Don't walk away from me!\n[BGM] The suspense score swells into an unresolved cello chord. Hold the tension, then gradually fade the music and garage sounds together, allowing all reverberation to decay fully without an abrupt cutoff.",
  },
  {
    id: "video-reproduce",
    title: "Speak a line to the video's timing",
    category: "Video",
    modes: ["video-to-audio"],
    description: "Spell out the exact line. The model does not transcribe the video; it uses the video for timing and the clip for timbre.",
    referenceClips: 1,
    prompt:
      "Using the timbre of @Audio1, say: \"The sea surface is calm today.\" Align with the timing and pacing of the reference video. No music.",
  },
  {
    id: "video-ocean-liner",
    title: "Ocean liner evacuation",
    category: "Video",
    modes: ["video-to-audio"],
    description: "Scene-by-scene dubbing brief with explicit exclusions.",
    prompt:
      "Setting: A luxury ocean liner encounters a storm at night, begins to list, and initiates an emergency evacuation. Do not use added non-diegetic disaster music, modern alarms, or exaggerated disaster-film sound effects. A small string ensemble at the side rear of the dining saloon plays an elegant 1930s chamber waltz. Low guest conversation fills the room, with subtle sounds of glasses, china, silverware, tablecloths, fabric, and chairs. Wind, rain, and thunder can be heard outside the glass windows. The ship begins to vibrate slightly. A female guest notices something unusual and asks quietly, with unease, \"Did you feel that?\" A male guest replies, \"Yes, hold the table.\" The ship suddenly lists sharply, throwing the dining saloon off balance. A violinist loses balance, the bow scraping sideways across the strings, and the entire ensemble stops at once. Guests cry out. A young crew member enters quickly, tense but professionally controlled: \"Everybody up! Away from the windows!\" An old-fashioned public-address system follows, with slight speaker distortion and the broad reverberation of the dining saloon: \"Passengers in the dining saloon, proceed to the forward lounge. Follow the crew.\" The crowd begins to evacuate in an orderly manner.",
  },
  {
    id: "stem-default",
    title: "Vocals, effects and music",
    category: "Stem separation",
    modes: ["stem-separation"],
    description: "The default three-stem split with names and descriptions.",
    prompt:
      "Split this audio into separate tracks for vocals, sound effects, and background music, and provide the name and content description for each track.",
  },
  {
    id: "stem-named",
    title: "Named dialogue tracks",
    category: "Stem separation",
    modes: ["stem-separation"],
    description: "Ask for each speaker and the full mix as separate named files.",
    prompt:
      "Separate this audio into these tracks: mixed (the complete mixed audio), dialogue_mara (Mara's speech only), dialogue_john (John's speech only), sfx (sound effects only), and bgm (background music only). Provide the name and a content description for each track.",
  },
];

export function promptsForMode(mode: StudioMode): PromptEntry[] {
  return PROMPT_LIBRARY.filter((entry) => entry.modes.includes(mode));
}
