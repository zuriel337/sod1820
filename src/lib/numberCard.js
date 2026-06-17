import { C, calcGem } from "../theme.js";
import { KEY_NUMBERS } from "../theme.js";

// ===== מחולל "תמונת מספר" — מייצר תמונה ממותגת לכל מספר עם טקסט ויראלי בתוכה =====
// צד-לקוח בלבד (canvas), ללא תלות חיצונית. מתאים לשיתוף בוואטסאפ/אינסטגרם (1080×1080).

const POETIC = [
  "מה שנראה מקרי — נכתב מראש.",
  "כל מספר הוא אות, כל אות היא רמז, וכל רמז — דלת.",
  "המספרים מדברים. מי שמקשיב — שומע.",
  "המספר שרודף אחריך? אולי הוא לוחש לך משהו.",
  "מאחורי כל מספר מסתתר עולם שלם.",
  "צירוף מקרים זה שם של אדם שלא מאמין.",
  "השם יתברך חתם את עולמו במספרים.",
];

// טקסט משמעותי למספר: משמעות-מפתח אם יש, אחרת המילים השוות מהגרף
export function numberMeaning(value, phrases = []) {
  const meaning = KEY_NUMBERS[value] || null;
  const words = (phrases || []).map(p => p.phrase).filter(Boolean).slice(0, 4);
  const poetic = POETIC[value % POETIC.length];
  return { meaning, words, poetic };
}

const cardFileName = value => `sod1820-${value}.png`;

function wrapLines(g, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (g.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// בונה את הקנבס של תמונת המספר
export function buildNumberCard(value, phrases = []) {
  const { meaning, words, poetic } = numberMeaning(value, phrases);
  const S = 1080;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const g = cv.getContext("2d");
  g.direction = "rtl";

  // רקע מלכותי כהה
  const bg = g.createRadialGradient(S / 2, S * 0.42, 80, S / 2, S / 2, S * 0.8);
  bg.addColorStop(0, "#1a1206");
  bg.addColorStop(1, "#070500");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);

  // מסגרת זהב
  g.strokeStyle = "rgba(212,175,55,0.55)"; g.lineWidth = 3;
  g.strokeRect(34, 34, S - 68, S - 68);
  g.strokeStyle = "rgba(212,175,55,0.22)"; g.lineWidth = 1.5;
  g.strokeRect(50, 50, S - 100, S - 100);

  g.textAlign = "center";

  // כותרת עליונה
  g.fillStyle = "#9a7818";
  g.font = "700 30px 'Heebo', sans-serif";
  try { g.letterSpacing = "10px"; } catch { /* ignore */ }
  g.fillText("✦  ס ו ד   1 8 2 0  ✦", S / 2, 132);
  try { g.letterSpacing = "0px"; } catch { /* ignore */ }

  g.fillStyle = "#e8c840";
  g.font = "700 40px 'Heebo', sans-serif";
  g.fillText("המספר שמסתתר סביבך", S / 2, 205);

  // המספר הענק (זהב), מותאם לרוחב
  let numSize = 300;
  g.font = `800 ${numSize}px 'Courier New', monospace`;
  const maxNumW = S - 220;
  while (g.measureText(String(value)).width > maxNumW && numSize > 90) {
    numSize -= 12; g.font = `800 ${numSize}px 'Courier New', monospace`;
  }
  const grad = g.createLinearGradient(0, 300, 0, 300 + numSize);
  grad.addColorStop(0, "#f6e27a"); grad.addColorStop(1, "#d4af37");
  g.fillStyle = grad;
  g.shadowColor = "rgba(212,175,55,0.5)"; g.shadowBlur = 50;
  g.fillText(String(value), S / 2, 300 + numSize * 0.72);
  g.shadowBlur = 0;

  let y = 300 + numSize + 70;

  // משמעות / מילים שוות
  g.fillStyle = "#f6e27a";
  g.font = "700 50px 'Frank Ruhl Libre', 'Heebo', serif";
  if (meaning) {
    for (const ln of wrapLines(g, meaning, S - 180)) { g.fillText(ln, S / 2, y); y += 62; }
  } else if (words.length) {
    g.fillText(`${value} = ${words.join(" · ")}`, S / 2, y); y += 62;
  } else {
    g.fillText("מספר נסתר", S / 2, y); y += 62;
  }

  // אם יש גם משמעות וגם מילים — נוסיף את המילים בשורה משנית
  if (meaning && words.length) {
    g.fillStyle = "#cfc9d6";
    g.font = "400 34px 'Heebo', sans-serif";
    const wline = wrapLines(g, words.join("  ·  "), S - 200);
    for (const ln of wline.slice(0, 2)) { g.fillText(ln, S / 2, y); y += 46; }
  }

  // שורה ויראלית פואטית
  y = Math.max(y + 26, 880);
  g.fillStyle = "#bdb6c4";
  g.font = "italic 400 40px 'Frank Ruhl Libre', 'Heebo', serif";
  for (const ln of wrapLines(g, poetic, S - 200)) { g.fillText(ln, S / 2, y); y += 54; }

  // פוטר — קישור
  g.fillStyle = "#9a7818";
  g.font = "700 30px 'Heebo', sans-serif";
  g.direction = "ltr";
  g.fillText(`sod1820.co.il/number/${value}`, S / 2, S - 70);

  return cv;
}

async function ensureFonts() {
  try { if (document.fonts?.ready) await document.fonts.ready; } catch { /* ignore */ }
}

// הורדת תמונת המספר
export async function downloadNumberCard(value, phrases) {
  await ensureFonts();
  buildNumberCard(value, phrases).toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = cardFileName(value); a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
}

// שיתוף תמונת המספר — שיתוף מקורי במובייל, הורדה בדסקטופ. מחזיר true בהצלחה.
export async function shareNumberCard(value, phrases) {
  await ensureFonts();
  try {
    const cv = buildNumberCard(value, phrases);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    const file = new File([blob], cardFileName(value), { type: "image/png" });
    const text = `מה מסתתר במספר ${value}? ✨ גלו בסוד 1820:\nhttps://sod1820.co.il/number/${value}`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `המספר ${value} · סוד 1820`, text });
      return true;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = cardFileName(value); a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch (e) {
    if (e && e.name === "AbortError") return false;
    alert("יצירת התמונה נכשלה — נסו שוב.");
    return false;
  }
}
