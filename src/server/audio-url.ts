import "server-only";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

export type AudioUrlPolicy = {
  hostSuffixes: string[];
  allowLocalhost: boolean;
};

export function parseAllowedAudioUrl(raw: string, policy: AudioUrlPolicy): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const hostname = url.hostname.toLowerCase();
  if (policy.allowLocalhost && LOCAL_HOSTNAMES.has(hostname)) {
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  }
  if (url.protocol !== "https:") return null;
  const matches = policy.hostSuffixes.some((suffix) =>
    suffix.startsWith(".") ? hostname.endsWith(suffix) : hostname === suffix,
  );
  return matches ? url : null;
}
