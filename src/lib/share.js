// 🔗 לוגיקת-השיתוף הקנונית היחידה (canonical_ui_components_law).
// רכיב ShareActions (ה-UI) וגם טריגרים חד-אייקוניים (Lightbox/QuickActions) משתמשים בזה —
// כך יש מקום *אחד* לקישורי-הערוצים, ל-native ולהעתקה. שינוי כאן = בכל האתר.
export const SHARE_SITE = "https://sod1820.co.il";

export const waHref = (url, text = "") => {
  const t = (text || "").trim(); const u = url || "";
  return `https://wa.me/?text=${encodeURIComponent(t && u ? `${t} ${u}` : (t || u))}`;
};
export const tgHref = (url, text = "") => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
export const fbHref = (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;

export const CHANNELS = {
  whatsapp: { label: "וואטסאפ", emoji: "💬", color: "#25d366", href: waHref },
  telegram: { label: "טלגרם", emoji: "✈️", color: "#2aabee", href: tgHref },
  facebook: { label: "פייסבוק", emoji: "📘", color: "#1877f2", href: (u) => fbHref(u) },
};

// 👑 מקום-השיתוף הקנוני (share_placement_law) — מקור-אמת יחיד להיכן חי הווידג׳ט-הצף.
// כלל-על: יש ווידג׳ט צף → אין בלוק אינליין. אין צף → שורת-שיתוף אחת. תמיד, בכל דף, אוטומטי.
// הצף (RoyalShareWidget) מוסתר בדפים שיש להם שיתוף עשיר משלהם; ShareActions עושה את ההיפך —
// מרנדר רק היכן שהצף נעדר → אף פעם אין כפילות, ואף דף חדש לא צריך להגדיר כלום.
const FLOATING_HIDE = /^\/(admin|login|profile|traffic|numbers-report|theme-preview|enter|stream|heichal|היכל|galaxy|number|code)/;
export const floatingShareShown = (pathname = "") => !FLOATING_HIDE.test(pathname || "");

export function canNativeShare() {
  return typeof navigator !== "undefined" && !!navigator.share;
}

export async function nativeShare({ title = "", url, text = "" } = {}) {
  if (!canNativeShare()) return false;
  try { await navigator.share({ title, text, url }); return true; } catch { return false; }
}

export async function copyLink(url) {
  try { await navigator.clipboard.writeText(url); return true; }
  catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      return true;
    } catch { return false; }
  }
}

// טריגר-נוחות לאייקון-בודד: native אם אפשר, אחרת העתקה. מחזיר את הערוץ שבוצע.
export async function shareOrCopy({ title = "", url, text = "" } = {}) {
  if (await nativeShare({ title, url, text })) return "native";
  return (await copyLink(url)) ? "copy" : "none";
}

// 🖼️ שיתוף-קובץ-תמונה (כרטיס-PNG מיוצר) — יכולת נבדלת משיתוף-קישור, גם היא מרוכזת כאן.
// זורק AbortError אם המשתמש ביטל (כדי שהקורא יטפל כמו קודם). מקור-אמת יחיד ל-navigator.share.
export const canShareFile = (file) => typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [file] });
export const shareImageFile = (file, { title = "", text = "" } = {}) => navigator.share({ files: [file], title, text });
