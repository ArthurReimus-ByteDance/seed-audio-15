---
name: seed-audio-api
description: Call the Seed Audio 1.5 (early access) generation API on BytePlus ModelArk to turn text, reference audio, or reference video into audio, translate/dub a video, or separate an audio file into stems. Use whenever the user wants to generate speech, dialogue, voice cloning from reference audio, video dubbing, video translation, or stem separation with Seed Audio, asks about its request format, limits, output formats, roles or errors, or wants a curl or script to submit a request. For writing the prompt text itself, pair with a Seed Audio prompting skill if one is available.
---

# Seed Audio 1.5 API

Early access. Confidential: never publish outputs, keys, or details externally. Keys are temporary and invalid after the official release (tentatively Oct. 28). Concurrency is **2 per API key**. Free during early access. **Pure BGM, music, or SFX generation is not supported yet** (the model may accept the prompt, but do not promise results).

## Endpoint

| | |
|-|-|
| Request | `POST https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations` |
| Auth | `Authorization: Bearer $SEED_AUDIO_API_KEY` |
| Body | `application/json` |
| Model | `$SEED_AUDIO_MODEL` (an `ep-...` endpoint ID supplied by BytePlus) |
| Style | Synchronous: the connection stays open, long audio or video can take several minutes. Use a long client timeout (script uses 900 s). |

Credentials live in `.env` (see `.env.example`): `SEED_AUDIO_API_KEY`, `SEED_AUDIO_MODEL`, optional `SEED_AUDIO_ENDPOINT`. Never print or log the key.

## Modes

| Mode | Content items | Notes |
|-|-|-|
| Text to audio | one `text` | Prompt must state lines, language/speaker, emotion, pace, and any music or sound. |
| Text + reference audio | `text` + 1-6 `audio_url` with `role: reference_audio` | Constrains timbre/performance. For several speakers keep a stable order and map `@Audio1`, `@Audio2`... to characters in the prompt. |
| Reference audio + video | `text` + up to 1 `video_url` with `role: reference_video` + optional 1-6 reference audios | Video gives timing, audio gives timbre. Do **not** use `dubbing_video` here. |
| Video translation | one `video_url` with `role: dubbing_video` + `dubbing_config` | **No text item allowed.** `target_language` required; the source language is always auto-detected (do not send it). Optional `glossaries: [{source, target}]`. |
| Stem separation | `text` + one `audio_url` with `role: separate_audio` | The text prompt drives the result: list the tracks wanted and ask for name + description of each. |

Item shapes:

```json
{"type": "text", "text": "..."}
{"type": "audio_url", "audio_url": {"url": "https://..."}, "role": "reference_audio"}
{"type": "video_url", "video_url": {"url": "https://..."}, "role": "reference_video"}
```

Translation targets: zh, en, ja, ko, de, fr, pt-BR, th, id, vi, ms, fil, it, ru, nl, pl, tr, sv, es-ES, es-MX, ar, pt-PT, fi, da, no, cs, hu, el, ro, hi (Chinese or English source to these).

## Output options (all optional)

| Field | Values | Default |
|-|-|-|
| `output_format` | `wav` / `mp3` / `pcm` / `ogg_opus` | `wav` |
| `audio_config.sample_rate` | 8000 / 16000 / 24000 / 32000 / 44100 / 48000 (`ogg_opus`: 48000 only) | 44100 (`ogg_opus`: 48000) |
| `audio_config.speech_rate` | -50..100 (100 = 2x, -50 = 0.5x) | 0 |
| `audio_config.loudness_rate` | -50..100 (100 = 2x, -50 = 0.5x) | 0 |
| `audio_config.pitch_rate` | -12..12 | 0 |

## Input limits

| Input | Limits |
|-|-|
| Reference audio | wav/mp3, 2-30 s each, <= 15 MB each, max 6 clips, total <= 180 s. Speaker IDs share the 6-clip quota. |
| Separation audio | wav/mp3, 2-360 s, <= 90 MB, exactly 1. Prefer a URL for large files. |
| Image | 1 only; jpeg/png/webp/bmp/tiff/gif/heic/heif; ratio 0.4-2.5; 300-6000 px per side; < 10 MB. |
| Video | mp4/mov; 480p-1080p; 4-360 s; ratio 0.4-2.5; 300-6000 px per side; 407,696-2,086,876 total pixels; 12-60 fps; public URL <= 200 MB, or `tos://bucket/prefix/file` <= 1 GB (bucket must be authorised in the same account/project). |
| Request body | <= 64 MB overall. |

Audio can be passed as a public URL (anonymous access, check it opens), or base64 `data:audio/<lowercase format>;base64,...` (15 MB cap, avoid for large files). Videos must be URLs.

## Response

Stem separation returns (generation is expected to use the same `content.audios` shape; confirm against the first real response):

```json
{
  "id": "...", "model": "...",
  "content": {"audios": [{"url": "<presigned, expires in 24h>", "description": "voiceover", "type": "speaker"}]},
  "output_format": "wav", "audio_config": {"sample_rate": 44100},
  "usage": {"duration_ms": 180000, "final_duration_ms": 180000}
}
```

Audio URLs are presigned and expire (about 24 h): download promptly.

## Helper script

`scripts/seed_audio.py` (Python 3, stdlib only) builds and validates payloads, posts them, and downloads the audio to `outputs/`. Run from the project root so `.env` is found. Always `--dry-run` first to inspect the payload (inline base64 is summarised, key never shown).

```bash
python3 .agents/skills/seed-audio-api/scripts/seed_audio.py generate --prompt-file prompt.txt --format mp3 --speech-rate 10 --dry-run
python3 .agents/skills/seed-audio-api/scripts/seed_audio.py generate --prompt "Using @Audio1's voice, say 'Welcome'" --reference-audio voice.wav
python3 .agents/skills/seed-audio-api/scripts/seed_audio.py translate --video https://host/source.mp4 --target-language en --glossary "火山方舟=ModelArk"
python3 .agents/skills/seed-audio-api/scripts/seed_audio.py separate --audio https://host/mix.wav
```

Flags shared by all commands: `--format`, `--sample-rate`, `--speech-rate`, `--loudness-rate`, `--pitch-rate`, `--out-dir`, `--stem`, `--dry-run`. Errors print to stderr with exit code 1; HTTP error bodies are included.

## Raw curl

```bash
curl --location "$SEED_AUDIO_ENDPOINT" \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer $SEED_AUDIO_API_KEY" \
  --data-binary @- <<JSON
{"model": "$SEED_AUDIO_MODEL",
 "content": [{"type": "text", "text": "Read with a gentle, restrained female English voice: 'The sea surface is calm today.' Use a slightly slow speaking rate, no background music."}],
 "output_format": "wav"}
JSON
```

## Gotchas (verified against the live API, Oct. 9, 2026)

- **A spoken line is mandatory** in every prompt-based mode: put the exact words in quotes. Music-only, effects-only and "reproduce the lines from the video" prompts return 400 ("speech content ... not fully specified").
- **Do not send `source_language`** for video translation. It returns 400 ("must not be set; source language is auto-detected"). Send only `target_language` and optional `glossaries`.
- Reference clips are enforced at 1.8-30.2 s; stay within the documented 2-30 s.
- Do not add `role` to a standard reference video, and do not add any text item in video translation.
- Content moderation can reject harmless text ("violates policy"); rephrase.
- Generated speech returns only `url` per audio. Stem separation also returns `type` and `description` and only the tracks it found. `usage.final_duration_ms` is the audio length.
- **Reference image:** `{"type": "image_url", "image_url": {"url": ...}, "role": "reference_image"}`, by URL or inline base64 (verified). Only one, 300-6000 px per side, and **only with plain text prompts**: combining it with `audio_url` or `video_url` returns 400.
- Unknown top-level request fields are ignored silently, not rejected.
- **Speaker ID:** `audio_url` accepts `speaker://<id>`, `data:audio/*;base64,*`, `http(s)://` and `file://` (the API's own error text; `tos://` and `asset://` are rejected) and an unknown ID returns 404. The helper and the web app do not offer speaker IDs because no way to obtain one was found, so this is unverified with a real ID.
- **No pronunciation control (tested Oct. 9, 2026):** dubbing glossary targets are plain text. Respellings, IPA (with or without slashes) and SSML-style `<phoneme>` tags did not reliably change how a brand name was spoken; the same request varies run to run (12 blinded Spanish dubs, 3 per variant). Markup is not read aloud. Do not promise phoneme-level control.
- Do not exceed 2 concurrent requests per key; throttle batch jobs.
- Keep generated audio, reference clips, and keys out of git (`outputs/` and `.env` are ignored).
