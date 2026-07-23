// 🎭 מחולל-אווטאר זמני — SVG מקומי (בלי CDN/שירות חיצוני, תואם CSP). דטרמיניסטי לכל שם:
// גרדיאנט צבעוני ייחודי + האות הראשונה. מי שרוצה תמונה אמיתית שם avatar_url (גובר).
// שימוש: <img src={avatar_url || genAvatar(display_name)} />.

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
