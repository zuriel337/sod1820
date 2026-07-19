// 🔗 לוגיקת-השיתוף הקנונית היחידה (canonical_ui_components_law).
// רכיב ShareActions (ה-UI) וגם טריגרים חד-אייקוניים (Lightbox/QuickActions) משתמשים בזה —
// כך יש מקום *אחד* לקישורי-הערוצים, ל-native ולהעתקה. שינוי כאן = בכל האתר.
export const SHARE_SITE = "https://sod1820.co.il";

const enc = encodeURIComponent;
export const waHref = (url, text = "") => {
  const t = (text || "").trim(); const u = url || "";
  return `https://wa.me/?text=${enc(t && u ? `${t} ${u}` : (t || u))}`;
};
export const tgHref = (url, text = "") => `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
export const fbHref = (url) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
export const xHref = (url, text = "") => `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`;
export const emailHref = (url, text = "") => `mailto:?subject=${enc(text || "SOD1820")}&body=${enc((text ? text + "\n" : "") + url)}`;

// אייקוני-מותג (simple-icons) — מרונדרים בצבע לבן על רקע-המותג. מקור-אמת יחיד לשני הרכיבים.
const SVG = {
  whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  telegram: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  email: "M1.5 5.25A2.25 2.25 0 0 1 3.75 3h16.5a2.25 2.25 0 0 1 2.25 2.25v.443l-10.5 6.3-10.5-6.3V5.25Zm0 2.19V18.75A2.25 2.25 0 0 0 3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V7.44l-9.964 5.978a1.5 1.5 0 0 1-1.572 0L1.5 7.44Z",
};

// 👑 מקור-אמת יחיד לערוצי-השיתוף (canonical_ui_components_law) — גם הלשונית הצפה (RoyalShareWidget)
// וגם השורה האינליין (ShareActions) קוראים מכאן. עריכה/הוספה/הסרה כאן → מתעדכן **בכל האתר**, בכל הדפים.
// כל ערוץ: label · emoji (לשורה) · svg (לצף) · brand (רקע-מותג) · href(url,text).
export const CHANNELS = {
  whatsapp: { label: "וואטסאפ", emoji: "💬", svg: SVG.whatsapp, brand: "linear-gradient(135deg,#25d366,#0e8a3c)", href: waHref },
  telegram: { label: "טלגרם", emoji: "✈️", svg: SVG.telegram, brand: "linear-gradient(135deg,#37aee2,#1c84c6)", href: tgHref },
  facebook: { label: "פייסבוק", emoji: "📘", svg: SVG.facebook, brand: "linear-gradient(135deg,#1877f2,#0a52b8)", href: (u) => fbHref(u) },
  x:        { label: "X", emoji: "✖️", svg: SVG.x, brand: "linear-gradient(135deg,#26262b,#000)", href: xHref },
  email:    { label: "אימייל", emoji: "✉️", svg: SVG.email, brand: "linear-gradient(135deg,#b8901f,#7d5e10)", href: emailHref },
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
