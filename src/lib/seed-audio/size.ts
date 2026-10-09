export const MAX_REQUEST_BYTES = 64 * 1024 * 1024;

const SLACK_BYTES = 256 * 1024;

export function requestBodyBytes(request: unknown): number {
  return new TextEncoder().encode(JSON.stringify(request)).length;
}

export function exceedsRequestLimit(bytes: number, limit: number = MAX_REQUEST_BYTES): boolean {
  return bytes > limit + SLACK_BYTES;
}

export function describeSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
