"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { OGG_OPUS_SAMPLE_RATE, OUTPUT_FORMATS, RATE_LIMITS, SAMPLE_RATES } from "@/lib/seed-audio/constants";
import { CONFIG_PRESETS, matchPreset } from "@/lib/seed-audio/presets";
import type { AudioConfig } from "@/lib/seed-audio/schemas";

type RateKey = keyof typeof RATE_LIMITS;

const DEFAULT_VALUE = "default";

function describeRate(key: RateKey, value: number): string {
  if (key === "pitchRate") return `${value > 0 ? "+" : ""}${value} st`;
  return `${(1 + value / 100).toFixed(2)}x`;
}

type AudioSettingsProps = {
  config: AudioConfig;
  error?: string;
  disabled?: boolean;
  onChange: (config: AudioConfig) => void;
};

export function AudioSettings({ config, error, disabled, onChange }: AudioSettingsProps) {
  const isOgg = config.outputFormat === "ogg_opus";
  const sampleRates = isOgg ? [OGG_OPUS_SAMPLE_RATE] : SAMPLE_RATES;

  const setFormat = (value: string) => {
    const outputFormat = value === DEFAULT_VALUE ? undefined : (value as AudioConfig["outputFormat"]);
    const sampleRate = outputFormat === "ogg_opus" && config.sampleRate !== OGG_OPUS_SAMPLE_RATE ? undefined : config.sampleRate;
    onChange({ ...config, outputFormat, sampleRate });
  };

  const setRate = (key: RateKey, value: number) => onChange({ ...config, [key]: value === 0 ? undefined : value });
  const dirty = Object.values(config).some((value) => value !== undefined);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Output settings</h3>
        <Button type="button" variant="ghost" size="xs" disabled={!dirty || disabled} onClick={() => onChange({})}>
          <RotateCcw /> Reset
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Quick preset</Label>
        <Select
          value={matchPreset(config) ?? "custom"}
          onValueChange={(id) => {
            const preset = CONFIG_PRESETS.find((candidate) => candidate.id === id);
            if (preset) onChange({ ...config, ...preset.config });
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom / default</SelectItem>
            {CONFIG_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Format</Label>
        <Select value={config.outputFormat ?? DEFAULT_VALUE} onValueChange={setFormat} disabled={disabled}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUE}>Default (wav)</SelectItem>
            {OUTPUT_FORMATS.map((format) => (
              <SelectItem key={format} value={format}>
                {format === "ogg_opus" ? "ogg (opus)" : format}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Sample rate</Label>
        <Select
          value={config.sampleRate ? String(config.sampleRate) : DEFAULT_VALUE}
          onValueChange={(value) => onChange({ ...config, sampleRate: value === DEFAULT_VALUE ? undefined : Number(value) })}
          disabled={disabled}
        >
          <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={DEFAULT_VALUE}>Default ({isOgg ? "48 kHz" : "44.1 kHz"})</SelectItem>
            {sampleRates.map((rate) => (
              <SelectItem key={rate} value={String(rate)}>
                {rate / 1000} kHz
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      {(Object.keys(RATE_LIMITS) as RateKey[]).map((key) => {
        const { min, max, label } = RATE_LIMITS[key];
        const value = config[key] ?? 0;
        return (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor={key}>{label}</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{describeRate(key, value)}</span>
            </div>
            <Slider
              id={key}
              min={min}
              max={max}
              step={1}
              value={[value]}
              disabled={disabled}
              onValueChange={([next]) => setRate(key, next)}
              onDoubleClick={() => setRate(key, 0)}
              aria-label={label}
            />
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground">Double-click a slider to reset it. Unchanged settings use the model defaults.</p>
    </div>
  );
}
