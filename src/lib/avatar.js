// 🎭 מחולל-אווטאר זמני — SVG מקומי (בלי CDN/שירות חיצוני, תואם CSP). דטרמיניסטי לכל שם:
// גרדיאנט צבעוני ייחודי + האות הראשונה. מי שרוצה תמונה אמיתית שם avatar_url (גובר).
// שימוש: <img src={avatar_url || genAvatar(display_name)} />.

const STORAGE_PUBLIC = "/storage/v1/object/public/";
const STORAGE_RENDER = "/storage/v1/render/image/public/";

// A small, cacheable rendition of a public Supabase Storage image for avatar slots (36-104 px).
// The stored object is served "private, no-cache" and some avatars are multi-megabyte animated GIFs (3.7 MB on /community).
// The render endpoint keeps the animation (animated WebP, or GIF for clients without WebP) at a fraction of the weight and the result is cacheable.
// resize=contain keeps the whole image (no-crop law); the slot's own object-fit crops for display exactly as before.
// Anything that is not a public object of Supabase Storage over https (local assets, other hosts, already-transformed URLs) is returned untouched.
export function avatarThumb(value, size = 160, quality = 70) {
  if (typeof value !== "string") return value;
  let url;
  try { url = new URL(value); } catch { return value; }
  if (url.protocol !== "https:" || !/\.supabase\.co$/i.test(url.hostname) || !url.pathname.startsWith(STORAGE_PUBLIC)) return value;
  url.pathname = STORAGE_RENDER + url.pathname.slice(STORAGE_PUBLIC.length);
  url.searchParams.set("width", String(size));
  url.searchParams.set("height", String(size));
  url.searchParams.set("resize", "contain");
  url.searchParams.set("quality", String(quality));
  return url.href;
}

// Display only an explicit image URL returned by an authorized identity reader.
// Never derive an image from a name/email or allow executable/local URL schemes.
// With { size } a public storage image is returned as its small rendition (see avatarThumb); without it the validated URL is returned as is.
export function displayAvatarUrl(value, { size } = {}) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return size ? avatarThumb(url.href, size) : url.href;
  } catch { return null; }
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

const escapeXml = (c) => c.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[m]));

// 🎨 צבע-כתב דטרמיניסטי — אותו גוון של האווטאר. מחזיר פלטת-בועה (בהיר/כהה) לחלון-הצ'אט,
//    כדי שכל כתב יקבל צבע-זהות משלו (avatar ↔ בועות ↔ כותרת מסונכרנים).
export function writerHue(seed) {
  return hash(String(seed || "?").trim() || "?") % 360;
}

// A local visual fallback, never an inferred person/photo or a profile write.
// Light colorful surfaces and dark initials retain contrast for every hue.
export function writerAvatarStyle(seed) {
  const h = writerHue(seed), next = (h + 24) % 360;
  return {
    "--user-badge-fallback-start": `hsl(${h}, 80%, 91%)`,
    "--user-badge-fallback-end": `hsl(${next}, 65%, 79%)`,
    "--user-badge-fallback-ink": `hsl(${h}, 72%, 14%)`,
    "--user-badge-fallback-ring": `hsl(${h}, 60%, 50%)`,
  };
}
export function writerColor(seed) {
  const h = writerHue(seed);
  return {
    hue: h,
    accent: `hsl(${h}, 60%, 45%)`,        // כותרת/אקסנט
    bubbleLight: `hsl(${h}, 72%, 92%)`,   // רקע-בועה במצב יום
    inkLight: `hsl(${h}, 55%, 24%)`,      // טקסט-בועה יום
    bubbleDark: `hsl(${h}, 38%, 20%)`,    // רקע-בועה במצב לילה
    inkDark: `hsl(${h}, 55%, 88%)`,       // טקסט-בועה לילה
  };
}

// מחזיר data-URI של אווטאר עגול עם גרדיאנט + אות ראשונה. seed = שם/סלאג.
export function genAvatar(seed, size = 96) {
  const s = String(seed || "?").trim() || "?";
  const h = hash(s);
  const hue = h % 360;
  const hue2 = (hue + 45) % 360;
  const ch = escapeXml([...s][0] || "?");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},66%,54%)"/>` +
    `<stop offset="1" stop-color="hsl(${hue2},70%,40%)"/></linearGradient></defs>` +
    `<rect width="96" height="96" rx="48" fill="url(#g)"/>` +
    `<text x="48" y="63" font-family="Heebo,Arial,sans-serif" font-size="44" font-weight="800" fill="#fff" text-anchor="middle">${ch}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
