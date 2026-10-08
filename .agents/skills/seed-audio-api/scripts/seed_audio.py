#!/usr/bin/env python3
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_ENDPOINT = "https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations"
OUTPUT_FORMATS = ("wav", "mp3", "pcm", "ogg_opus")
SAMPLE_RATES = (8000, 16000, 24000, 32000, 44100, 48000)
OGG_OPUS_SAMPLE_RATE = 48000
RATE_LIMITS = {
    "speech_rate": (-50, 100),
    "loudness_rate": (-50, 100),
    "pitch_rate": (-12, 12),
}
MAX_REFERENCE_AUDIOS = 6
MAX_INLINE_BYTES = 15 * 1024 * 1024
INLINE_AUDIO_FORMATS = ("wav", "mp3")
REQUEST_TIMEOUT_SECONDS = 900
REDACTED_INLINE_PREFIX = "data:"


class SeedAudioError(Exception):
    pass


def load_dotenv(path):
    env_file = Path(path)
    if not env_file.is_file():
        return
    for line in env_file.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        name, value = stripped.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip("'\""))


def audio_source(value):
    if value.startswith(("http://", "https://", "data:")):
        return value
    path = Path(value)
    if not path.is_file():
        raise SeedAudioError(f"Audio file not found: {value}")
    audio_format = path.suffix.lstrip(".").lower()
    if audio_format not in INLINE_AUDIO_FORMATS:
        raise SeedAudioError(f"Unsupported audio format '{audio_format}': use wav or mp3")
    if path.stat().st_size > MAX_INLINE_BYTES:
        raise SeedAudioError(f"{value} exceeds the 15 MB inline limit: upload it and pass a public URL")
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:audio/{audio_format};base64,{encoded}"


def video_source(value):
    if not value.startswith(("http://", "https://", "tos://")):
        raise SeedAudioError("Video must be a public http(s) URL or a tos:// URI")
    return value


def build_audio_config(sample_rate=None, speech_rate=None, loudness_rate=None, pitch_rate=None, output_format=None):
    if output_format is not None and output_format not in OUTPUT_FORMATS:
        raise SeedAudioError(f"output_format must be one of {OUTPUT_FORMATS}")
    config = {}
    if sample_rate is not None:
        if sample_rate not in SAMPLE_RATES:
            raise SeedAudioError(f"sample_rate must be one of {SAMPLE_RATES}")
        if output_format == "ogg_opus" and sample_rate != OGG_OPUS_SAMPLE_RATE:
            raise SeedAudioError("ogg_opus supports only a 48000 sample_rate")
        config["sample_rate"] = sample_rate
    rates = {"speech_rate": speech_rate, "loudness_rate": loudness_rate, "pitch_rate": pitch_rate}
    for name, value in rates.items():
        if value is None:
            continue
        low, high = RATE_LIMITS[name]
        if not low <= value <= high:
            raise SeedAudioError(f"{name} must be within [{low}, {high}]")
        config[name] = value
    return config


def with_output_options(payload, output_format, audio_config):
    if output_format:
        payload["output_format"] = output_format
    if audio_config:
        payload["audio_config"] = audio_config
    return payload


def text_item(text):
    return {"type": "text", "text": text}


def audio_item(url, role):
    return {"type": "audio_url", "audio_url": {"url": url}, "role": role}


def video_item(url, role):
    return {"type": "video_url", "video_url": {"url": url}, "role": role}


def build_generate_payload(model, prompt, reference_audios=(), reference_video=None, output_format=None, audio_config=None):
    if not prompt or not prompt.strip():
        raise SeedAudioError("A non-empty prompt is required")
    if len(reference_audios) > MAX_REFERENCE_AUDIOS:
        raise SeedAudioError(f"At most {MAX_REFERENCE_AUDIOS} reference audios are supported")
    content = [text_item(prompt)]
    content.extend(audio_item(audio_source(item), "reference_audio") for item in reference_audios)
    if reference_video:
        content.append(video_item(video_source(reference_video), "reference_video"))
    return with_output_options({"model": model, "content": content}, output_format, audio_config)


def build_translate_payload(model, video, target_language, source_language=None, glossaries=(), output_format=None, audio_config=None):
    if not target_language:
        raise SeedAudioError("target_language is required for video translation")
    dubbing_config = {"target_language": target_language}
    if source_language:
        dubbing_config["source_language"] = source_language
    if glossaries:
        dubbing_config["glossaries"] = [parse_glossary(entry) for entry in glossaries]
    payload = {
        "model": model,
        "content": [video_item(video_source(video), "dubbing_video")],
        "dubbing_config": dubbing_config,
    }
    return with_output_options(payload, output_format, audio_config)


def build_separate_payload(model, audio, prompt, output_format=None, audio_config=None):
    if not prompt or not prompt.strip():
        raise SeedAudioError("A prompt describing the tracks to separate is required")
    content = [text_item(prompt), audio_item(audio_source(audio), "separate_audio")]
    return with_output_options({"model": model, "content": content}, output_format, audio_config)


def parse_glossary(entry):
    source, separator, target = entry.partition("=")
    if not separator or not source or not target:
        raise SeedAudioError(f"Glossary entries must look like source=target, got '{entry}'")
    return {"source": source, "target": target}


def redact_payload(payload):
    if isinstance(payload, dict):
        return {key: redact_payload(value) for key, value in payload.items()}
    if isinstance(payload, list):
        return [redact_payload(item) for item in payload]
    if isinstance(payload, str) and payload.startswith(REDACTED_INLINE_PREFIX):
        return f"<inline data, {len(payload)} chars>"
    return payload


def post_json(endpoint, api_key, payload):
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise SeedAudioError(f"HTTP {error.code} from Seed Audio API: {body}") from error
    except urllib.error.URLError as error:
        raise SeedAudioError(f"Could not reach Seed Audio API: {error.reason}") from error


def download(url, destination):
    try:
        with urllib.request.urlopen(url, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            destination.write_bytes(response.read())
    except urllib.error.URLError as error:
        raise SeedAudioError(f"Could not download generated audio: {error}") from error


def save_audios(response, out_dir, stem, fetch):
    content = response.get("content")
    audios = content.get("audios") if isinstance(content, dict) else None
    if not audios:
        raise SeedAudioError(f"No audio in response: {json.dumps(response)[:500]}")
    extension = response.get("output_format") or "wav"
    out_dir.mkdir(parents=True, exist_ok=True)
    saved = []
    for index, audio in enumerate(audios):
        label = audio.get("type") or "audio"
        destination = out_dir / f"{stem}_{index}_{label}.{extension}"
        fetch(audio["url"], destination)
        saved.append({"path": str(destination), "type": audio.get("type"), "description": audio.get("description")})
    return saved


def add_output_arguments(parser):
    parser.add_argument("--format", dest="output_format", choices=OUTPUT_FORMATS)
    parser.add_argument("--sample-rate", type=int)
    parser.add_argument("--speech-rate", type=int)
    parser.add_argument("--loudness-rate", type=int)
    parser.add_argument("--pitch-rate", type=int)
    parser.add_argument("--out-dir", default="outputs")
    parser.add_argument("--stem")
    parser.add_argument("--dry-run", action="store_true")


def build_parser():
    parser = argparse.ArgumentParser(description="Seed Audio 1.5 helper")
    subcommands = parser.add_subparsers(dest="command", required=True)

    generate = subcommands.add_parser("generate", help="Text, reference audio, or reference video to audio")
    prompt_group = generate.add_mutually_exclusive_group(required=True)
    prompt_group.add_argument("--prompt")
    prompt_group.add_argument("--prompt-file")
    generate.add_argument("--reference-audio", action="append", default=[])
    generate.add_argument("--reference-video")
    add_output_arguments(generate)

    translate = subcommands.add_parser("translate", help="Video translation (dubbing)")
    translate.add_argument("--video", required=True)
    translate.add_argument("--target-language", required=True)
    translate.add_argument("--source-language")
    translate.add_argument("--glossary", action="append", default=[])
    add_output_arguments(translate)

    separate = subcommands.add_parser("separate", help="Stem separation")
    separate.add_argument("--audio", required=True)
    separate.add_argument("--prompt", default="Split this audio into separate tracks for vocals, sound effects, and background music, and provide the name and content description for each track.")
    add_output_arguments(separate)
    return parser


def build_payload(args, model):
    audio_config = build_audio_config(args.sample_rate, args.speech_rate, args.loudness_rate, args.pitch_rate, args.output_format)
    if args.command == "generate":
        prompt = Path(args.prompt_file).read_text() if args.prompt_file else args.prompt
        return build_generate_payload(model, prompt, args.reference_audio, args.reference_video, args.output_format, audio_config)
    if args.command == "translate":
        return build_translate_payload(model, args.video, args.target_language, args.source_language, args.glossary, args.output_format, audio_config)
    return build_separate_payload(model, args.audio, args.prompt, args.output_format, audio_config)


def require_env(name):
    value = os.environ.get(name)
    if not value:
        raise SeedAudioError(f"{name} is not set: add it to .env or the environment")
    return value


def run(argv):
    args = build_parser().parse_args(argv)
    load_dotenv(".env")
    model = require_env("SEED_AUDIO_MODEL")
    payload = build_payload(args, model)
    if args.dry_run:
        print(json.dumps(redact_payload(payload), indent=2, ensure_ascii=False))
        return 0
    response = post_json(os.environ.get("SEED_AUDIO_ENDPOINT", DEFAULT_ENDPOINT), require_env("SEED_AUDIO_API_KEY"), payload)
    stem = args.stem or f"seed_audio_{int(time.time())}"
    files = save_audios(response, Path(args.out_dir), stem, download)
    print(json.dumps({"id": response.get("id"), "usage": response.get("usage"), "files": files}, indent=2, ensure_ascii=False))
    return 0


def main(argv=None):
    try:
        return run(sys.argv[1:] if argv is None else argv)
    except SeedAudioError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
