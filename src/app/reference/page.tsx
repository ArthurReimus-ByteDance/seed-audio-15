import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { OUTPUT_FORMATS, RATE_LIMITS, SAMPLE_RATES, TRANSLATION_LANGUAGES } from "@/lib/seed-audio/constants";

export const metadata: Metadata = { title: "API Reference" };

const MODES = [
  ["Text to audio", "One text prompt, optionally one reference image", "reference_image", "State the exact line to speak plus emotion, pace and any music or effects. An image cannot be combined with reference audio or video."],
  ["Text + reference audio", "Text and 1-6 reference clips", "reference_audio", "Keep a stable clip order for several speakers and name each clip's character in the prompt."],
  ["Reference audio + video", "Text, up to 1 reference video, optional 1-6 clips", "reference_video, reference_audio", "Never use dubbing_video here. The video gives timing, the audio gives timbre."],
  ["Video translation", "Exactly 1 source video", "dubbing_video", "Target language is required. The source language is detected automatically (sending one is rejected) and no text prompt is allowed."],
  ["Stem separation", "Text and 1 audio file", "separate_audio", "The prompt drives the result: list the tracks wanted and ask for a name and description for each."],
];

const LIMITS = [
  ["Reference audio", "wav or mp3. 2-30 s each, up to 15 MB each, at most 6 clips, 180 s in total. A public URL or base64 (data:audio/wav;base64,...)."],
  ["Separation audio", "wav or mp3. 2-360 s, up to 90 MB, exactly 1. Prefer a URL for large files."],
  ["Image", "One image, text to audio only: jpeg, png, webp, bmp, tiff, gif, heic, heif. Ratio 0.4-2.5, 300-6000 px per side, under 10 MB. By URL or inline base64."],
  ["Video", "mp4 or mov. 480p-1080p, 4-360 s, ratio 0.4-2.5, 300-6000 px per side, 407,696-2,086,876 total pixels, 12-60 fps. Public URL up to 200 MB, or tos://bucket/prefix/file up to 1 GB."],
  ["Request body", "At most 64 MB overall. Avoid base64 for large files."],
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-4 py-2 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, index) => (
                <td key={index} className={index === 0 ? "px-4 py-2.5 font-medium whitespace-nowrap" : "px-4 py-2.5 text-muted-foreground"}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">API Reference</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Everything this app knows about Seed Audio 1.5 early access, in one place. The studio enforces these rules for you.</p>
      </header>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">Early access terms</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Tentative official release: Oct. 28. The early-access model is an intermediate version.</li>
            <li>No public release or social media exposure. A leaked key is revoked and related posts must be removed.</li>
            <li>Early-access API keys stop working after the official release. Activate Seed Audio 1.5 on ModelArk to get a permanent key.</li>
            <li>Concurrency is 2 per API key. Pricing is free during early access.</li>
            <li>Pure BGM, music or sound-effect generation is not supported during early access.</li>
          </ul>
        </CardContent>
      </Card>

      <Section title="Verified against the live API">
        <p className="text-sm text-muted-foreground">Behaviour observed in real early-access calls on Oct. 9, 2026, including where it differs from the integration guide.</p>
        <Table
          head={["Topic", "Observed behaviour"]}
          rows={[
            ["Spoken line is required", "Every prompt-based mode needs the exact words to speak, in quotes. Music-only, effects-only and \"reproduce the lines from the video\" prompts are rejected with 400."],
            ["Dubbing source language", "dubbing_config.source_language is rejected (\"must not be set\"). The source language is always auto-detected."],
            ["Reference clip length", "Enforced at 1.8-30.2 s per clip. This app applies the documented 2-30 s."],
            ["Content moderation", "Some harmless text is rejected with \"violates policy\" (for example a well-known pangram). Rephrase and retry."],
            ["Response fields", "Generated speech returns only a url. Stem separation also returns type and description, and only the tracks the model found (two, not always three)."],
            ["Usage", "final_duration_ms is the audio length. duration_ms is processing time for single tracks; for stems both are the combined length of all tracks."],
            ["Reference image", "Accepted with role reference_image, by URL or inline base64. Only one, and only with plain text prompts: combining it with audio_url or video_url returns 400. Its effect on the output is subtle and not characterised here."],
            ["Audio sources", "audio_url accepts only data:audio/*;base64, http(s):// and file:// URLs (and speaker://ID, which this app does not offer). tos:// and asset:// are rejected. Roles are reference_audio and separate_audio."],
            ["Unknown fields", "Unrecognised top-level request fields are ignored silently rather than rejected."],
            ["Concurrency", "Five simultaneous short requests all succeeded, so the documented limit of 2 per key was not enforced at test time. This app still honours 2 by default (SEED_AUDIO_MAX_CONCURRENCY)."],
            ["Output controls", "Speed 100 halves the duration, speed -50 lengthens it by about 1.8x, volume changes the level, and sample rates and formats match the request."],
            ["Timing", "Short speech takes 5-8 s. Reference voice and dubbing take 15-25 s."],
          ]}
        />
      </Section>

      <Section title="Endpoint">
        <Table
          head={["", "Details"]}
          rows={[
            ["Request", "POST https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations"],
            ["Format", "application/json with a Bearer token"],
            ["Style", "Synchronous. Long audio and video can take several minutes."],
            ["Model", "An endpoint ID (ep-...) supplied by BytePlus"],
          ]}
        />
      </Section>

      <Section title="Modes">
        <Table head={["Mode", "Input", "Roles", "Rules"]} rows={MODES} />
      </Section>

      <Section title="Input limits">
        <Table head={["Input", "Limits"]} rows={LIMITS} />
      </Section>

      <Section title="Output options">
        <Table
          head={["Field", "Values", "Default"]}
          rows={[
            ["output_format", OUTPUT_FORMATS.join(" / "), "wav"],
            ["audio_config.sample_rate", `${SAMPLE_RATES.join(" / ")} (ogg_opus: 48000 only)`, "44100 (ogg_opus: 48000)"],
            ["audio_config.speech_rate", `${RATE_LIMITS.speechRate.min} to ${RATE_LIMITS.speechRate.max} (100 = 2x, -50 = 0.5x)`, "0"],
            ["audio_config.loudness_rate", `${RATE_LIMITS.loudnessRate.min} to ${RATE_LIMITS.loudnessRate.max} (100 = 2x, -50 = 0.5x)`, "0"],
            ["audio_config.pitch_rate", `${RATE_LIMITS.pitchRate.min} to ${RATE_LIMITS.pitchRate.max}`, "0"],
          ]}
        />
      </Section>

      <Section title="Prompt styles">
        <Table
          head={["Style", "Effort", "Use it for"]}
          rows={[
            ["Simple description", "Low", "Short voice-overs and a single ambience or effect. Structure: subject + auditory characteristics + constraints."],
            ["Audio script", "Medium to high", "Monologues, audiobooks, narration and ads. Order the sounds and say how they interact."],
            ["Timeline script", "Medium", "Exact start, length and overlap of each sound. Use the Timeline builder in the studio."],
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Browse worked examples in the <Link href="/library" className="underline underline-offset-4">Prompt Library</Link>, or use the Toolkit in any studio page for vocabulary and builders.
        </p>
      </Section>

      <Section title="Video translation languages">
        <p className="text-sm text-muted-foreground">Chinese or English source into these 30 targets:</p>
        <div className="flex flex-wrap gap-1.5">
          {TRANSLATION_LANGUAGES.map((language) => (
            <span key={language.code} className="rounded-full border bg-card px-2.5 py-1 text-xs">
              {language.label} <code className="font-mono text-muted-foreground">{language.code}</code>
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
}
