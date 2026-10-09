const CLOCK_PATTERN = /^(\d{1,2}):(\d{2})(?:\.(\d+))?$/;
const SECONDS_PATTERN = /^(\d+(?:\.\d+)?)s?$/i;

export function parseClock(value: string): number | null {
  const text = value.trim();
  const clock = CLOCK_PATTERN.exec(text);
  if (clock) {
    const seconds = Number(clock[2]);
    if (seconds >= 60) return null;
    return Number(clock[1]) * 60 + seconds + (clock[3] ? Number(`0.${clock[3]}`) : 0);
  }
  const plain = SECONDS_PATTERN.exec(text);
  return plain ? Number(plain[1]) : null;
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function formatSeconds(totalSeconds: number): string {
  return Math.max(0, totalSeconds).toFixed(1);
}
