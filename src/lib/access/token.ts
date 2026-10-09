export const ACCESS_COOKIE = "studio-access";
const SALT = "seed-audio-studio:v1";

async function digest(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export async function accessToken(code: string): Promise<string> {
  return toHex(await digest(`${SALT}:${code}`));
}

export function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let difference = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function isValidCode(candidate: string, code: string): Promise<boolean> {
  return constantTimeEqual(await accessToken(candidate), await accessToken(code));
}

export async function hasValidSession(cookieValue: string | undefined, code: string): Promise<boolean> {
  if (!cookieValue) return false;
  return constantTimeEqual(cookieValue, await accessToken(code));
}
