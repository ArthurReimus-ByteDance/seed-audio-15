import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type HostPolicy = { allowLocalhost: boolean };

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

function ipv4IsPrivate(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function mappedIpv4(address: string): string | null {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(address);
  if (!hex) return null;
  const high = parseInt(hex[1], 16);
  const low = parseInt(hex[2], 16);
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

export function isPrivateAddress(raw: string): boolean {
  const address = raw.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const kind = isIP(address);
  if (kind === 4) return ipv4IsPrivate(address);
  if (kind === 6) {
    if (address === "::" || address === "::1") return true;
    const mapped = mappedIpv4(address);
    if (mapped) return ipv4IsPrivate(mapped);
    const first = parseInt(address.split(":")[0] || "0", 16);
    return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
  }
  return true;
}

const LOCAL_NAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function checkUrlShape(url: URL, policy: HostPolicy): void {
  if (url.username || url.password) throw new UnsafeUrlError("URLs with credentials are not allowed");
  const local = policy.allowLocalhost && LOCAL_NAMES.has(url.hostname.toLowerCase());
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new UnsafeUrlError("Only public https video URLs can be combined");
  }
}

export async function assertPublicHost(hostname: string, policy: HostPolicy): Promise<void> {
  const name = hostname.toLowerCase();
  if (policy.allowLocalhost && LOCAL_NAMES.has(name)) return;
  if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".internal") || name.endsWith(".local")) {
    throw new UnsafeUrlError("That host is not allowed");
  }
  const literal = name.replace(/^\[|\]$/g, "");
  const addresses = isIP(literal) ? [literal] : (await lookup(name, { all: true }).catch(() => [])).map((entry) => entry.address);
  if (addresses.length === 0) throw new UnsafeUrlError("The video host could not be resolved");
  if (addresses.some(isPrivateAddress)) throw new UnsafeUrlError("That host is not allowed");
}
