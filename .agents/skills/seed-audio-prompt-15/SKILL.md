---
name: seed-audio-prompt-15
description: Write and refine prompts for Seed Audio 1.5 (BytePlus) audio generation. Use whenever the user wants to draft, improve, debug, or structure a prompt for Seed Audio: voice-overs, multi-speaker dialogue, audiobooks, ads, character voice design, ambience and sound effects, background music, timeline or timestamp scripts, reference-audio prompts with @Audio1 tags, video dubbing prompts, or stem-separation prompts. Also use when generated audio sounds wrong (wrong pacing, unwanted music, mumbled lines, speaker confusion) and the prompt needs fixing. Covers prompt text only, not the HTTP API.
---

# Seed Audio 1.5 Prompting

The model is a text-to-audio generator, not plain TTS: the prompt describes a whole soundscape (voices, delivery, ambience, effects, music). Specific beats vague. Early access: pure BGM/music/SFX-only generation is not officially supported yet, so lead with speech-based prompts and treat sound-only prompts as experimental. Keep prompt content confidential.

## Pick a prompt style

| Style | Effort | Use for |
|-|-|-|
| Simple description | Low | Short voice-overs, a single ambience or effect |
| Audio script | Medium-high | Monologues, audiobooks, narration, ads, dialogue: control order and interplay of sounds |
| Timeline script | Medium | Exact start/end of each line, effect, and music cue |

## 1. Simple description

Structure: **audio subject + auditory characteristics + required constraints**.

Single-speaker voice-over (add a recording-constraint header when you need clean dry speech):

```
[Recording Constraints] Generate only this speaker as dry, close-miked speech. Do not include music, sound effects, ambient noise, room reverb, a second speaker, or silence at the beginning or end. Allow only natural breaths between sentences. Do not leave long pauses.
A young adult female voice, soft and youthful with a breathy quality, speaking at a steady pace in a calm, natural tone. Deliver the following continuously: "..."
```

Multi-speaker: describe each voice first, then tag each line with speaker and delivery: `Woman (exasperated, breathless): "..."`.

Reference audio: tag the clip in the prompt, e.g. `The speaker (young adult male, deep steady voice, Castilian Spanish accent, @Audio1) addresses the camera at a steady pace: "..."`.

Sound effect: `A heavy metal pipe falls onto a metal surface, a dull, low-pitched, weighty impact. Close and clear against a quiet background. No speech or music.`

Mixed ambience: `Inside a warm cafe, soft jazz piano plays quietly, indistinct distant conversation, occasional light porcelain clinks. Close-miked, naturally layered, no intelligible dialogue.`

## 2. Audio script

Structure: **opening audio and setting + sequential speech/effects/music + transitions + ending**.

Template:

```
<Use case or style>. In <setting>, first hear <opening sound>, followed by <new sound or line>. When <line, action, or sound> occurs, <another sound> enters simultaneously and <builds / fades / approaches / recedes>. End with <how speech, music, and ambience resolve>.
```

Rules:
- Say whether music and effects are continuous or brief.
- State sound-only intent explicitly: `Ambient sound and sound effects only. No speech or music.`
- Use bracketed layers for complex scenes: `【BGM】`, `【SFX】`, then `Name (@AudioN, emotion, delivery): line`.
- End with a decay instruction (`fade out naturally`, `reverb decays fully, no abrupt cutoff`) or an exact stop (`stop abruptly with no tail`).
- Reference clips are bound by order: `@Audio1`, `@Audio2`... Keep the same order in the request and name the character each belongs to.
- For video dubbing with reference video, describe setting, who speaks, and each cut; exclude sounds you do not want (`no added non-diegetic disaster music, no modern alarms`).

## 3. Timeline script

Format 1, inline ranges:

```
[0.0s:49.5s] Energetic, rhythmic electronic music plays throughout.
[0.0s:1.2s] A crisp splash at the opening. A young boy, clear youthful voice, relaxed cheerful tone: [1.9s:4.9s] "..." 
[13.4s:15.4s] The music shifts to a more intense, futuristic melody with camera shutter sounds.
```

Format 2, structured sheet:

```
[General Requirements]
<Purpose, overall style, target duration>. Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.
[Speakers]
Character A: <perceived age, vocal gender, timbre, speech traits>.
Character B: <...>.
[Timeline]
00:00-<end> [Background] <setting, continuous ambience, acoustics, distance, volume>.
00:00-<t> [Music] <style, mood, instruments, tempo, how it enters/exits>.
<start-end> [Sound Effect] <source, qualities, distance, changes>.
<start-end> Character A (<emotion, pace, pauses, emphasis>): "<dialogue>"
<start-end> [Pause] <who stops, what continues>.
<start-end> [Ending] <which sounds remain, how each layer concludes>.
```

Tips: always include the "do not read names/timecodes aloud" line; make dialogue timings fit the words (a long line in a 2 s window will rush); mark pauses explicitly; non-speech vocal actions go in angle brackets, e.g. `<soft throat clearing>`, `<soft breath>`.

## Voice design

Structure: **perceived age + vocal gender, register, texture, distinctive traits, emotional state, pace**.

Template: `A <age and gender> voice in a <register>, with a <texture> tone and <traits>. Convey <emotion or progression>, speaking at <pace and pauses>. Dialogue: "<content>"`

| Dimension | Vocabulary |
|-|-|
| Age/gender | child's, young adult, middle-aged, elderly; male, female, androgynous |
| Register | deep low-pitched; mid-to-low; mid-range; mid-to-high; high, piercing |
| Texture | deep and full-bodied; resonant; rich; light; smooth; slightly husky; raspy; gritty |
| Traits | breathy; slightly nasal; light vocal fry; subtle tremor; crisp or relaxed articulation |
| Emotion | calm, gentle, curious, hesitant, delighted, sad, tense, angry, resolute, restrained, offhand |
| Pace | slow; unhurried; normal; slightly brisk; hurried; natural pauses; gradually speeding up/slowing; slow down for key lines or sentence endings |

Archetypes: composed male narrator (30s-40s, grounded baritone, warm, calm, slow measured pace); villain (low hoarse, slightly gritty, cold and mocking, restrained hostility); soothing ad narrator (mid-20s, fresh clean warm tone, steady pace); cool reserved female lead (cold crisp, low breathy, restrained); meditation guide (slow, grounded, soft warm, sincere).

Avoid vague words such as "pleasant" or "sophisticated". Always give age range, vocal weight, emotion, and pace. Tag dramatic lines with delivery: tense, weary, mocking, breathless, steady.

## Dialogue and vocalizations

Structure: **exact dialogue + vocal actions and timing + what to read aloud**.

- Dialogue: `Says, "..."`, `Asks, "..."`, `Narration: "..."`.
- Actions: soft inhale, slow exhale, deep breath, rapid panting; soft chuckle, involuntary laugh, hearty laughter; soft sigh, sobbing, muffled crying; soft throat clearing, gasp of surprise, grunt of effort, muffled groan.
- Timing: before speaking, during speech, during a pause, after the line.
- Scope: `Speak only the quoted dialogue`, `Read both narration and dialogue`, `Do not read speaker labels or directions aloud`.
- Simple voice-over: voice, delivery, dialogue only. Detailed performance: add emphasis, emotional shifts, vocal actions. Multiple speakers: define each voice first, then per-line delivery.

## Ambience and sound effects

Structure: **setting and acoustics + source and action + texture + distance and volume + timing and change**. Not every element is needed.

- Ambience = continuous background (quiet room tone, steady rainfall, indistinct crowd murmur, distant traffic, distant waves). SFX = specific events (footsteps crunching through snow, two light metallic clinks, a lock turning, paper rustling).
- Texture: crisp, dull, sharp, soft, heavy and resonant, faint and scattered, gritty.
- Distance/volume: close and clear, distant and indistinct, muffled through a wall, approaching from a distance.
- Timing: throughout, occasional, immediately after the line, gradually intensifying, slowly fading out.
- Limit each scene to **3-5 effects**: at least one ambient sound and two action/event effects. For combat or drama add echo, tense air, or a low hum.

## Background music

Structure: **purpose and style + mood + instruments + tempo/rhythm + entry and development + volume balance and ending**.

- Purpose: dialogue underscore, opening theme, cinematic orchestral, acoustic folk, light jazz, ambient electronic.
- Mood: warm and soothing, light and upbeat, melancholic, mysterious, grand and triumphant.
- Entry: at the opening, after the dialogue, build in layers, swell, climax. Ending: below the voice, soft underscore, soften during dialogue, stop abruptly, resolve naturally, slowly fade out.
- Presets: suspense audiobook = low strings + faint wooden flute; morning ad = warm acoustic guitar, soft lo-fi; fantasy combat = deep cinematic strings + sparse drum hits; tavern = lively fiddle, light percussion; meditation = minimal airy pad, no heavy rhythm.
- **Drama and ad prompts must keep music low and secondary to the voice.**
- No strong drumbeats for narration-only content. For 15 s ads use a single instrument.
- BGM is instrumental only.

## Multiple speakers and separate tracks

For stem separation (or when asking for per-element output), list every track wanted (each speaker's dialogue, sound effects, background music, or full mix) and give each a file name, e.g. `mixed`, `dialogue_mara`, `dialogue_john`, `sfx`, `bgm`. Ask for a name and content description per track.

## Workflow

1. Identify the goal (voice-over, dialogue, ad, scene, dubbing, separation) and pick the style.
2. Fix the voices first (age, gender, register, texture, emotion, pace), then the dialogue, then sound beds, then music, then the ending.
3. Add explicit exclusions (`No music`, `No speech`, `Do not read speaker labels aloud`).
4. For timelines, check that every line fits its window.
5. Generate, listen, and change one element at a time (usually voice description or an exclusion).

## Common fixes

| Symptom | Fix |
|-|-|
| Unwanted music or noise | Add `Dry, close-miked speech. No music, sound effects, or ambient noise.` |
| Reads names, timecodes, or directions aloud | Add `Speak only the dialogue. Do not read character names, timecodes, or instructions aloud.` |
| Long gaps or dead air at start/end | Add `No silence at the beginning or end. Do not leave long pauses.` |
| Music covers the voice | State `music stays at a low volume beneath the voice, speech always clear and prominent`. |
| Flat delivery | Add emotion and pace tags per line and a vocal action. |
| Voices blend or swap | Define each voice up front with distinct age/register/texture; keep the `@AudioN` order consistent. |
| Cluttered soundscape | Cut to 3-5 effects; say which are continuous vs brief. |
