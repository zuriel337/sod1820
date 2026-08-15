// 🎞️ לכידת תמונת-כיסוי לוידאו — פריים ברזולוציה המקורית המלאה (client-side, בלי ffmpeg, בלי עומס שרת).
// כשמשטח סטורי של אור-הגאולה נטען, לכל וידאו שאין לו thumb_url:
//   1) טוענים <video crossorigin="anonymous"> מוסתר (ה-mp4 המאוחסן שולח ACAO:* → canvas לא «מזוהם»).
//   2) קופצים לשנייה ~1, מציירים ל-<canvas> בגודל videoWidth×videoHeight (הפיקסלים המקוריים — לא מוקטן).
//   3) מייצאים JPEG איכותי (0.9) ושולחים ל-Edge `capture-video-thumb` שקובע thumb_url (רק אם ריק).
// משם הכל אוטומטי: poster בנגן · Video Sitemap · OG/VideoObject · תמונת-שיתוף ממותד.
import { supabase } from "./supabase.js";

const VIDEO_RE = /\.(mp4|mov|webm|m4v)(\?|#|$)/i;
const SESSION = new Set();          // מזהים שכבר טופלו בסשן הזה (דה-דופ)
const LS_KEY = "vthumb_tried_v1";   // מזהים שכבר ניסינו (נמנע ניסיון-חוזר בכל טעינה)

function loadTried() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || "[]")); } catch { return new Set(); }
}
function markTried(id) {
  try {
    const s = loadTried(); s.add(id);
    const arr = Array.from(s).slice(-400);   // תקרה — לא לתפוח בלי סוף
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

// לכידת פריים בודד ברזולוציה מלאה → dataURL JPEG (או null בכישלון)
function grabFrame(src) {
  return new Promise((resolve) => {
    if (typeof document === "undefined") { resolve(null); return; }
    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true; v.playsInline = true; v.preload = "auto";
    let done = false;
    const finish = (val) => { if (done) return; done = true; clearTimeout(to); try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ } resolve(val); };
    const to = setTimeout(() => finish(null), 12000);
    v.addEventListener("loadeddata", () => {
      const t = Math.min(1, (v.duration || 2) * 0.1) || 0.1;   // ~1ש׳ (או 10% בסרטון קצר)
      try { v.currentTime = t; } catch { finish(null); }
    });
    v.addEventListener("seeked", () => {
      try {
        const w = v.videoWidth, h = v.videoHeight;
        if (!w || !h) { finish(null); return; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;                    // גודל מקורי מלא — פיקסלים בדיוק כמו הווידאו
        canvas.getContext("2d").drawImage(v, 0, 0, w, h);
        finish(canvas.toDataURL("image/jpeg", 0.9));
      } catch { finish(null); }
    });
    v.addEventListener("error", () => finish(null));
    v.src = src;
  });
}

// מבטיח thumb לוידאו בודד (idempotent — השרת מדלג אם כבר יש thumb)
async function ensureOne(row) {
  const id = row?.id, src = row?.image_url || "";
  if (!id || row.thumb_url || !VIDEO_RE.test(src)) return;
  if (SESSION.has(id)) return;
  SESSION.add(id);
  if (loadTried().has(id)) return;
  try {
    const b64 = await grabFrame(src);
    if (b64) await supabase.functions.invoke("capture-video-thumb", { body: { id, b64 } });
  } catch { /* לא קריטי — ננסה שוב בביקור אחר */ }
  finally { markTried(id); }
}

// נקודת-הכניסה: עוברים על שורות ולוכדים thumb לחסרים (מוגבל כדי לא לעמיס — הכי-חדשים קודם)
export function ensureVideoThumbs(rows, max = 3) {
  if (!Array.isArray(rows)) return;
  const missing = rows.filter(r => r && !r.thumb_url && VIDEO_RE.test(r.image_url || ""));
  missing.slice(0, max).forEach(ensureOne);   // סדרתי-אך-לא-חוסם; כל אחד רץ ברקע
}
