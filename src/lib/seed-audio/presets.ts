import type { AudioConfig } from "./schemas";

export const CONFIG_PRESETS: { id: string; label: string; config: AudioConfig }[] = [
  { id: "studio", label: "Studio (wav, 48 kHz)", config: { outputFormat: "wav", sampleRate: 48000 } },
  { id: "web", label: "Web (mp3, 44.1 kHz)", config: { outputFormat: "mp3", sampleRate: 44100 } },
  { id: "voice", label: "Voice app (mp3, 24 kHz)", config: { outputFormat: "mp3", sampleRate: 24000 } },
  { id: "telephony", label: "Telephony (wav, 8 kHz)", config: { outputFormat: "wav", sampleRate: 8000 } },
  { id: "opus", label: "Opus (ogg, 48 kHz)", config: { outputFormat: "ogg_opus", sampleRate: 48000 } },
];

export function matchPreset(config: AudioConfig): string | null {
  const match = CONFIG_PRESETS.find((preset) => preset.config.outputFormat === config.outputFormat && preset.config.sampleRate === config.sampleRate);
  return match?.id ?? null;
}
