// Pure core of the community link preview (Open Graph). No network here: the Edge function does the I/O, this file
// only decides what is allowed and what text/image may be returned. Unit-tested.

const clean = (v) => (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();

// IPv4/IPv6 addresses that must never be fetched (loopback, private, link-local, metadata, CGNAT, multicast, reserved).
export function isPublicIp(ip) {
  const value = String(ip || "").trim().toLowerCase();
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if ([1, 2, 3, 4].some((i) => Number(v4[i]) > 255)) return false;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || (b === 0 && Number(v4[3]) === 0) || (b === 0 && Number(v4[3]) === 2))) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a === 198 && b === 51 && Number(v4[3]) === 100) return false;
    if (a === 203 && b === 0 && Number(v4[3]) === 113) return false;
    return true;
  }
  if (value.includes(":")) {
    if (value === "::" || value === "::1") return false;
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
    if (mapped) return isPublicIp(mapped[1]);
    if (/^(fc|fd)/.test(value)) return false;            // unique local
    if (/^fe[89ab]/.test(value)) return false;           // link-local
    if (/^ff/.test(value)) return false;                 // multicast
    if (/^(2001:db8|2001:0db8)/.test(value)) return false; // documentation
    return true;
  }
  return false;
}

// Only an https URL on the default port, with a real DNS name (no IP literal, no credentials, no localhost-like names).
export function parsePublicHttpsUrl(raw) {
  let url;
  try { url = new URL(String(raw || "").trim()); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash.length > 200) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || /^\d+(?:\.\d+){3}$/.test(host) || host.startsWith("[") || /^[0-9a-f:]+$/i.test(host)) return null;
  if (/(^|\.)(localhost|local|internal|intranet|lan|home|corp|test|invalid|example)$/.test(host) || host.endsWith(".onion")) return null;
  if (url.href.length > 2048) return null;
  return url;
}

const decode = (s) => String(s || "")
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&#(\d{1,6});/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return ""; } })
  .replace(/&#x([0-9a-f]{1,6});/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ""; } });

function metaMap(html) {
  const out = new Map();
  for (const tag of String(html).slice(0, 262144).matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = {};
    for (const a of tag[0].matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attrs[a[1].toLowerCase()] = a[3] ?? a[4] ?? "";
    const key = clean(attrs.property || attrs.name).toLowerCase();
    if (key && attrs.content != null && !out.has(key)) out.set(key, decode(attrs.content));
  }
  return out;
}

// Text is data: tags stripped, length-bounded. The image is only ever a public https URL (resolved against the page).
export function parseOpenGraph(html, pageUrl) {
  const meta = metaMap(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html).slice(0, 262144));
  const strip = (v, max) => clean(decode(v).replace(/<[^>]*>/g, "")).slice(0, max);
  const title = strip(meta.get("og:title") || meta.get("twitter:title") || (titleTag && titleTag[1]) || "", 160);
  const description = strip(meta.get("og:description") || meta.get("twitter:description") || meta.get("description") || "", 300);
  const siteName = strip(meta.get("og:site_name") || "", 80);
  let image = null;
  const rawImage = meta.get("og:image:secure_url") || meta.get("og:image") || meta.get("twitter:image") || "";
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl);
      image = parsePublicHttpsUrl(resolved.href)?.href || null;
    } catch { image = null; }
  }
  if (!title && !description && !image) return null;
  return { title, description, siteName, image, url: String(pageUrl) };
}
