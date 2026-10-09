import importlib.util
import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

SCRIPT_PATH = Path(__file__).resolve().parent.parent / ".agents/skills/seed-audio-api/scripts/seed_audio.py"
spec = importlib.util.spec_from_file_location("seed_audio", SCRIPT_PATH)
seed_audio = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed_audio)

MODEL = "ep-test"


class AudioConfigTests(unittest.TestCase):
    def test_empty_config_when_nothing_given(self):
        self.assertEqual(seed_audio.build_audio_config(), {})

    def test_accepts_boundary_values(self):
        config = seed_audio.build_audio_config(44100, -50, 100, 12)
        self.assertEqual(config, {"sample_rate": 44100, "speech_rate": -50, "loudness_rate": 100, "pitch_rate": 12})

    def test_rejects_out_of_range_rates(self):
        for kwargs in ({"speech_rate": 101}, {"loudness_rate": -51}, {"pitch_rate": 13}, {"pitch_rate": -13}):
            with self.subTest(kwargs=kwargs), self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.build_audio_config(**kwargs)

    def test_rejects_unsupported_sample_rate_and_format(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.build_audio_config(sample_rate=22050)
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.build_audio_config(output_format="flac")

    def test_ogg_opus_requires_48000(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.build_audio_config(sample_rate=44100, output_format="ogg_opus")
        self.assertEqual(seed_audio.build_audio_config(sample_rate=48000, output_format="ogg_opus"), {"sample_rate": 48000})


class GeneratePayloadTests(unittest.TestCase):
    def test_text_only(self):
        payload = seed_audio.build_generate_payload(MODEL, "Hello")
        self.assertEqual(payload, {"model": MODEL, "content": [{"type": "text", "text": "Hello"}]})

    def test_reference_audio_url_and_video_roles(self):
        payload = seed_audio.build_generate_payload(
            MODEL, "Dub it", ["https://x.test/a.wav"], "https://x.test/v.mp4", "mp3", {"sample_rate": 24000}
        )
        roles = [item.get("role") for item in payload["content"]]
        self.assertEqual(roles, [None, "reference_audio", "reference_video"])
        self.assertEqual(payload["output_format"], "mp3")
        self.assertEqual(payload["audio_config"], {"sample_rate": 24000})

    def test_rejects_blank_prompt(self):
        for prompt in ("", "   ", None):
            with self.subTest(prompt=prompt), self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.build_generate_payload(MODEL, prompt)

    def test_rejects_more_than_six_reference_audios(self):
        urls = [f"https://x.test/{index}.wav" for index in range(7)]
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.build_generate_payload(MODEL, "Hi", urls)

    def test_accepts_exactly_six_reference_audios(self):
        urls = [f"https://x.test/{index}.wav" for index in range(6)]
        payload = seed_audio.build_generate_payload(MODEL, "Hi", urls)
        self.assertEqual(len(payload["content"]), 7)

    def test_rejects_local_reference_video(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.build_generate_payload(MODEL, "Hi", reference_video="clip.mp4")

    def test_accepts_tos_video(self):
        payload = seed_audio.build_generate_payload(MODEL, "Hi", reference_video="tos://bucket/p/v.mp4")
        self.assertEqual(payload["content"][1]["video_url"]["url"], "tos://bucket/p/v.mp4")


class ReferenceImageTests(unittest.TestCase):
    def test_adds_a_reference_image_item_with_its_role(self):
        payload = seed_audio.build_generate_payload(MODEL, "Hi", reference_image="https://x.test/i.png")
        self.assertEqual(payload["content"][1], {"type": "image_url", "image_url": {"url": "https://x.test/i.png"}, "role": "reference_image"})

    def test_rejects_combining_with_audio_or_video(self):
        for kwargs in ({"reference_audios": ["https://x.test/a.wav"]}, {"reference_video": "https://x.test/v.mp4"}):
            with self.subTest(kwargs=kwargs), self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.build_generate_payload(MODEL, "Hi", reference_image="https://x.test/i.png", **kwargs)

    def test_local_images_become_data_uris_and_bad_ones_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            good = Path(directory) / "pic.JPG"
            good.write_bytes(b"x")
            self.assertTrue(seed_audio.image_source(str(good)).startswith("data:image/jpeg;base64,"))
            bad = Path(directory) / "pic.svg"
            bad.write_bytes(b"x")
            with self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.image_source(str(bad))
            with self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.image_source(str(Path(directory) / "missing.png"))


class AudioSourceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)

    def write(self, name, size):
        path = Path(self.directory.name) / name
        path.write_bytes(b"a" * size)
        return str(path)

    def test_local_wav_becomes_lowercase_data_uri(self):
        result = seed_audio.audio_source(self.write("voice.WAV", 4))
        self.assertTrue(result.startswith("data:audio/wav;base64,"))

    def test_rejects_missing_file(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.audio_source(str(Path(self.directory.name) / "missing.wav"))

    def test_rejects_unsupported_extension(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.audio_source(self.write("voice.flac", 4))

    def test_rejects_oversized_inline_file(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.audio_source(self.write("big.mp3", seed_audio.MAX_INLINE_BYTES + 1))

    def test_urls_and_data_uris_pass_through(self):
        for value in ("https://x.test/a.wav", "data:audio/wav;base64,AAAA"):
            self.assertEqual(seed_audio.audio_source(value), value)


class TranslatePayloadTests(unittest.TestCase):
    def test_has_no_text_and_uses_dubbing_role(self):
        payload = seed_audio.build_translate_payload(MODEL, "https://x.test/s.mp4", "en")
        self.assertEqual([item["type"] for item in payload["content"]], ["video_url"])
        self.assertEqual(payload["content"][0]["role"], "dubbing_video")
        self.assertEqual(payload["dubbing_config"], {"target_language": "en"})

    def test_glossaries_are_sent_and_source_language_never_is(self):
        payload = seed_audio.build_translate_payload(MODEL, "https://x.test/s.mp4", "en", ["火山方舟=ModelArk"])
        self.assertEqual(payload["dubbing_config"]["glossaries"], [{"source": "火山方舟", "target": "ModelArk"}])
        self.assertNotIn("source_language", payload["dubbing_config"])

    def test_requires_target_language(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.build_translate_payload(MODEL, "https://x.test/s.mp4", "")

    def test_rejects_malformed_glossary(self):
        for entry in ("nosep", "=target", "source="):
            with self.subTest(entry=entry), self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.parse_glossary(entry)


class SeparatePayloadTests(unittest.TestCase):
    def test_uses_separate_audio_role(self):
        payload = seed_audio.build_separate_payload(MODEL, "https://x.test/a.wav", "Split it")
        self.assertEqual(payload["content"][1]["role"], "separate_audio")
        self.assertEqual(payload["content"][0]["text"], "Split it")

    def test_requires_prompt(self):
        with self.assertRaises(seed_audio.SeedAudioError):
            seed_audio.build_separate_payload(MODEL, "https://x.test/a.wav", " ")


class RedactionTests(unittest.TestCase):
    def test_inline_data_is_summarised(self):
        payload = {"content": [{"audio_url": {"url": "data:audio/wav;base64," + "A" * 100}}]}
        redacted = seed_audio.redact_payload(payload)
        self.assertIn("inline data", redacted["content"][0]["audio_url"]["url"])
        self.assertNotIn("AAAA", json.dumps(redacted))


class SaveAudiosTests(unittest.TestCase):
    def test_saves_each_track_with_type_and_extension(self):
        response = {
            "content": {"audios": [
                {"url": "https://x.test/1", "type": "speaker", "description": "voiceover"},
                {"url": "https://x.test/2", "type": "bgm", "description": "bgm"},
            ]},
            "output_format": "mp3",
        }
        fetched = []
        with tempfile.TemporaryDirectory() as directory:
            saved = seed_audio.save_audios(response, Path(directory) / "nested", "run", lambda url, dest: fetched.append((url, dest)))
        self.assertEqual([Path(item["path"]).name for item in saved], ["run_0_speaker.mp3", "run_1_bgm.mp3"])
        self.assertEqual([url for url, _ in fetched], ["https://x.test/1", "https://x.test/2"])

    def test_defaults_to_wav_and_audio_label(self):
        with tempfile.TemporaryDirectory() as directory:
            saved = seed_audio.save_audios({"content": {"audios": [{"url": "https://x.test/1"}]}}, Path(directory), "run", lambda url, dest: None)
        self.assertEqual(Path(saved[0]["path"]).name, "run_0_audio.wav")

    def test_raises_when_no_audio(self):
        for response in ({}, {"content": {}}, {"content": {"audios": []}}, {"content": "text"}):
            with self.subTest(response=response), self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.save_audios(response, Path("unused"), "run", lambda url, dest: None)


class PostJsonTests(unittest.TestCase):
    def test_http_error_includes_status_and_body(self):
        error = urllib.error.HTTPError("https://x.test", 429, "Too Many", {}, io.BytesIO(b'{"error":"concurrency"}'))
        with mock.patch.object(seed_audio.urllib.request, "urlopen", side_effect=error):
            with self.assertRaises(seed_audio.SeedAudioError) as context:
                seed_audio.post_json("https://x.test", "key", {})
        self.assertIn("429", str(context.exception))
        self.assertIn("concurrency", str(context.exception))

    def test_network_failure_is_reported(self):
        with mock.patch.object(seed_audio.urllib.request, "urlopen", side_effect=urllib.error.URLError("down")):
            with self.assertRaises(seed_audio.SeedAudioError):
                seed_audio.post_json("https://x.test", "key", {})

    def test_sends_bearer_header_and_returns_json(self):
        fake_response = mock.MagicMock()
        fake_response.__enter__.return_value.read.return_value = b'{"id": "abc"}'
        with mock.patch.object(seed_audio.urllib.request, "urlopen", return_value=fake_response) as urlopen:
            result = seed_audio.post_json("https://x.test", "secret", {"a": 1})
        request = urlopen.call_args.args[0]
        self.assertEqual(request.get_header("Authorization"), "Bearer secret")
        self.assertEqual(result, {"id": "abc"})


class DotenvTests(unittest.TestCase):
    def test_does_not_override_existing_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            env_file = Path(directory) / ".env"
            env_file.write_text("# note\nSEED_TEST_A=from_file\nSEED_TEST_B='quoted'\n\nbroken line\n")
            with mock.patch.dict(os.environ, {"SEED_TEST_A": "from_env"}, clear=False):
                os.environ.pop("SEED_TEST_B", None)
                seed_audio.load_dotenv(env_file)
                self.assertEqual(os.environ["SEED_TEST_A"], "from_env")
                self.assertEqual(os.environ["SEED_TEST_B"], "quoted")
                os.environ.pop("SEED_TEST_B", None)

    def test_missing_file_is_ignored(self):
        seed_audio.load_dotenv("does-not-exist.env")


class CommandLineTests(unittest.TestCase):
    def run_main(self, argv, env):
        with mock.patch.dict(os.environ, env, clear=True), mock.patch.object(seed_audio, "load_dotenv"):
            stdout, stderr = io.StringIO(), io.StringIO()
            with mock.patch("sys.stdout", stdout), mock.patch("sys.stderr", stderr):
                code = seed_audio.main(argv)
        return code, stdout.getvalue(), stderr.getvalue()

    def test_dry_run_prints_payload_without_api_key(self):
        code, stdout, _ = self.run_main(["generate", "--prompt", "Hi", "--speech-rate", "10", "--dry-run"], {"SEED_AUDIO_MODEL": MODEL})
        self.assertEqual(code, 0)
        payload = json.loads(stdout)
        self.assertEqual(payload["audio_config"], {"speech_rate": 10})
        self.assertEqual(payload["model"], MODEL)

    def test_missing_model_fails_cleanly(self):
        code, _, stderr = self.run_main(["generate", "--prompt", "Hi", "--dry-run"], {})
        self.assertEqual(code, 1)
        self.assertIn("SEED_AUDIO_MODEL", stderr)

    def test_missing_api_key_fails_before_request(self):
        code, _, stderr = self.run_main(["generate", "--prompt", "Hi"], {"SEED_AUDIO_MODEL": MODEL})
        self.assertEqual(code, 1)
        self.assertIn("SEED_AUDIO_API_KEY", stderr)

    def test_invalid_rate_reports_error(self):
        code, _, stderr = self.run_main(["generate", "--prompt", "Hi", "--pitch-rate", "99", "--dry-run"], {"SEED_AUDIO_MODEL": MODEL})
        self.assertEqual(code, 1)
        self.assertIn("pitch_rate", stderr)

    def test_full_generate_flow_saves_audio_and_never_prints_key(self):
        response = {"id": "r1", "content": {"audios": [{"url": "https://x.test/a", "type": "speaker"}]}, "usage": {"duration_ms": 1}}
        env = {"SEED_AUDIO_MODEL": MODEL, "SEED_AUDIO_API_KEY": "super-secret"}
        with tempfile.TemporaryDirectory() as directory:
            with mock.patch.object(seed_audio, "post_json", return_value=response), mock.patch.object(
                seed_audio, "download", side_effect=lambda url, dest: dest.write_bytes(b"x")
            ):
                code, stdout, stderr = self.run_main(["generate", "--prompt", "Hi", "--out-dir", directory, "--stem", "t"], env)
            self.assertEqual(code, 0)
            self.assertTrue((Path(directory) / "t_0_speaker.wav").exists())
        self.assertNotIn("super-secret", stdout + stderr)


if __name__ == "__main__":
    unittest.main()
