export type RemoteImageFetchResult =
  | { ok: true; bytes: Uint8Array; source_host: string }
  | { ok: false; status: number; error: string };

const EXACT_HOSTS = new Set([
  "raw.githubusercontent.com",
  "dropbox.com",
  "www.dropbox.com",
  "drive.google.com",
  "files.openai.com",
  "images.openai.com",
]);

const HOST_SUFFIXES = [
  ".githubusercontent.com",
  ".dropbox.com",
  ".dropboxusercontent.com",
  ".googleusercontent.com",
  ".oaiusercontent.com",
  ".blob.core.windows.net",
];

function normalizeHost(hostname: string) {
  return hostname.toLowerCase().replace(/\.$/, "");
}

export function remoteHostAllowed(hostname: string) {
  const host = normalizeHost(hostname);
  return EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

function checkedUrl(raw: string, base?: URL): URL | null {
  let u: URL;
  try { u = base ? new URL(raw, base) : new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password) return null;
  if (u.port && u.port !== "443") return null;
  if (!remoteHostAllowed(u.hostname)) return null;
  return u;
}

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6) {
    const sig = String.fromCharCode(...bytes.slice(0, 6));
    if (sig === "GIF87a" || sig === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

async function readCapped(body: ReadableStream<Uint8Array> | null, maxBytes: number): Promise<Uint8Array | null> {
  if (!body) return null;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel("too large"); } catch { /* ignore */ }
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}

export async function fetchRemoteImage(rawUrl: string, expectedMime: string, maxBytes: number): Promise<RemoteImageFetchResult> {
  let current = checkedUrl(rawUrl);
  if (!current) return { ok: false, status: 403, error: "remote url is not an allowed HTTPS media host" };

  for (let hop = 0; hop <= 4; hop++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const r = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "Accept": expectedMime },
      });

      if ([301, 302, 303, 307, 308].includes(r.status)) {
        const location = r.headers.get("location");
        if (!location) return { ok: false, status: 502, error: "remote redirect missing location" };
        const next = checkedUrl(location, current);
        if (!next) return { ok: false, status: 403, error: "remote redirect host is not allowed" };
        current = next;
        continue;
      }

      if (!r.ok) return { ok: false, status: 502, error: `remote source returned ${r.status}` };

      const declaredLength = Number(r.headers.get("content-length") || "0");
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        return { ok: false, status: 413, error: "remote payload exceeds ticket size" };
      }

      const declaredType = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (declaredType && declaredType !== "application/octet-stream" && declaredType !== expectedMime) {
        return { ok: false, status: 415, error: "remote content-type does not match ticket mime" };
      }

      const bytes = await readCapped(r.body, maxBytes);
      if (!bytes) return { ok: false, status: 413, error: "remote payload exceeds ticket size" };
      if (bytes.byteLength === 0) return { ok: false, status: 502, error: "remote payload is empty" };

      const sniffed = sniffImageMime(bytes);
      if (sniffed !== expectedMime) return { ok: false, status: 415, error: "remote bytes do not match ticket mime" };

      return { ok: true, bytes, source_host: normalizeHost(current.hostname) };
    } catch {
      return controller.signal.aborted
        ? { ok: false, status: 504, error: "remote fetch timed out" }
        : { ok: false, status: 502, error: "remote fetch failed" };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { ok: false, status: 508, error: "too many remote redirects" };
}
