// ===== מחולל "תמונת הצלבה" — כרטיס ויראלי לחידוש הצלבה (אהיה=ודאי וכו') =====
// canvas צד-לקוח, 1080×1080, מתאים לוואטסאפ/אינסטגרם. שיתוף מקורי במובייל, וואטסאפ בדסקטופ.

import { trackShare } from "./tracking.js";
import { waHref, canShareFile, shareImageFile } from "./share.js";

const POETIC = [
  "שתי דרכים. אותו סוד.",
  "המילים האלה לא נפגשות במקרה.",
  "צירוף שאי אפשר להמציא.",
  "תראו מה מתחבא מאחורי הגימטריה.",
  "אותו מספר. שתי אמיתות.",
  "מי שמבין מספרים — מבין הכל.",
];

function fitFont(g, text, maxWidth, startPx, fontFn, minPx = 20) {
  let px = startPx;
  g.font = fontFn(px);
  while (g.measureText(text).width > maxWidth && px > minPx) { px -= 2; g.font = fontFn(px); }
  return px;
}
function divider(g, cx, y, half) {
  const grad = g.createLinearGradient(cx - half, 0, cx + half, 0);
  grad.addColorStop(0, "rgba(212,175,55,0)");
  grad.addColorStop(0.5, "rgba(212,175,55,0.7)");
  grad.addColorStop(1, "rgba(212,175,55,0)");
  g.strokeStyle = grad; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(cx - half, y); g.lineTo(cx - 22, y); g.moveTo(cx + 22, y); g.lineTo(cx + half, y); g.stroke();
  g.fillStyle = "#d4af37"; g.font = "22px 'Heebo', sans-serif"; g.textAlign = "center";
  g.fillText("✦", cx, y + 7);
}

// חילוץ שני הביטויים + השיטות מהחידוש
function crossParts(item) {
  const gp = item.gematria_pairs || {};
  const members = gp.members || gp.pairs || [];
  const p1 = members[0]?.phrase || (item.related_phrases || [])[0] || "";
  const p2 = members[1]?.phrase || (item.related_phrases || [])[1] || "";
  const methods = (item.method_tags || []).join("   ·   ");
  const headVal = members[0]?.ragil ?? (item.related_numbers || [])[0] ?? null;
  return { p1, p2, methods, headVal };
}

export function buildCrossCard(item) {
  const { p1, p2, methods, headVal } = crossParts(item);
  const S = 1080;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const g = cv.getContext("2d");
  g.direction = "rtl"; g.textAlign = "center";

  // רקע מלכותי
  const bg = g.createRadialGradient(S / 2, S * 0.40, 60, S / 2, S / 2, S * 0.85);
  bg.addColorStop(0, "#241845"); bg.addColorStop(0.5, "#120a28"); bg.addColorStop(1, "#05030d");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  const halo = g.createRadialGradient(S / 2, 540, 20, S / 2, 540, 380);
  halo.addColorStop(0, "rgba(212,175,55,0.16)"); halo.addColorStop(1, "rgba(212,175,55,0)");
  g.fillStyle = halo; g.fillRect(0, 160, S, 760);

  // מסגרת
  g.strokeStyle = "rgba(212,175,55,0.65)"; g.lineWidth = 3; g.strokeRect(36, 36, S - 72, S - 72);
  g.strokeStyle = "rgba(212,175,55,0.28)"; g.lineWidth = 1.5; g.strokeRect(52, 52, S - 104, S - 104);
  g.fillStyle = "#d4af37"; g.font = "28px 'Heebo', sans-serif";
  [[60, 78], [S - 60, 78], [60, S - 58], [S - 60, S - 58]].forEach(([x, y]) => g.fillText("✦", x, y));

  // מותג
  g.font = "44px 'Heebo', sans-serif"; g.fillText("👑", S / 2, 126);
  g.fillStyle = "#c9a227"; g.font = "700 28px 'Heebo', sans-serif";
  try { g.letterSpacing = "10px"; } catch { /* ignore */ }
  g.fillText("סוד  1820", S / 2, 178);
  try { g.letterSpacing = "0px"; } catch { /* ignore */ }

  // כותרת קטנה
  g.fillStyle = "#e8c840"; g.font = "700 38px 'Heebo', sans-serif";
  g.fillText("✦ הצלבה נדירה", S / 2, 250);
  divider(g, S / 2, 290, 300);

  // הביטוי הראשון
  const fontBig = px => `700 ${px}px 'Heebo', 'Heebo', serif`;
  fitFont(g, p1, S - 200, 60, fontBig, 26);
  g.fillStyle = "#ffe9a8"; g.fillText(p1, S / 2, 410);

  // סימן שווה
  g.fillStyle = "#c9a227"; g.font = "700 56px 'Heebo', sans-serif";
  g.fillText("=", S / 2, 500);

  // הביטוי השני
  fitFont(g, p2, S - 200, 60, fontBig, 26);
  g.fillStyle = "#ffe9a8"; g.fillText(p2, S / 2, 590);

  divider(g, S / 2, 650, 220);

  // השיטות המשותפות
  if (methods) {
    fitFont(g, methods, S - 180, 34, px => `700 ${px}px 'Heebo', sans-serif`, 18);
    g.fillStyle = "#f3ead0"; g.fillText(methods, S / 2, 712);
  }
  // הערך הראשי
  if (headVal != null) {
    g.fillStyle = "#cdb7e8"; g.font = "italic 600 30px 'Heebo', serif";
    g.fillText(`שניהם = ${headVal}`, S / 2, 766);
  }

  // שורה ויראלית
  const poetic = POETIC[(p1.length + p2.length) % POETIC.length];
  fitFont(g, poetic, S - 200, 40, px => `italic 600 ${px}px 'Heebo', 'Heebo', serif`, 20);
  g.fillStyle = "#cdb7e8"; g.fillText(poetic, S / 2, 858);

  // פוטר
  g.fillStyle = "#c9a227"; g.font = "700 28px 'Heebo', sans-serif"; g.direction = "ltr";
  g.fillText("sod1820.co.il/beit-midrash", S / 2, S - 72);

  return cv;
}

async function ensureFonts() { try { if (document.fonts?.ready) await document.fonts.ready; } catch { /* ignore */ } }

const fileName = item => `sod1820-cross-${(item.id || "x").slice(0, 8)}.png`;
function shareText(item) {
  const { p1, p2 } = crossParts(item);
  return `🤯 ${p1} = ${p2}\nהצלבת גימטריה נדירה — תראו איך:\nhttps://sod1820.co.il/beit-midrash?tab=crosses`;
}

// שיתוף חכם — תמונה במובייל, וואטסאפ בדסקטופ. מחזיר 'image' | 'link' | 'cancel'.
export async function shareCross(item) {
  await ensureFonts();
  try {
    const cv = buildCrossCard(item);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    const file = new File([blob], fileName(item), { type: "image/png" });
    if (canShareFile(file)) {
      trackShare("native", `cross/${item.id || ""}`);
      await shareImageFile(file, { title: "הצלבת גימטריה · סוד 1820", text: shareText(item) });
      return "image";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancel";
  }
  trackShare("whatsapp", `cross/${item.id || ""}`);
  window.open(waHref("", shareText(item)), "_blank", "noopener,noreferrer");
  return "link";
}

// תצוגה מקדימה — מחזיר dataURL של התמונה (לראות לפני שיתוף)
export async function crossCardDataUrl(item) {
  await ensureFonts();
  return buildCrossCard(item).toDataURL("image/png");
}

// הורדת התמונה (דסקטופ / גיבוי)
export async function downloadCrossCard(item) {
  await ensureFonts();
  buildCrossCard(item).toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName(item); a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
}
