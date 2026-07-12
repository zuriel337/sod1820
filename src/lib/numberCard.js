import { C, calcGem } from "../theme.js";
import { KEY_NUMBERS } from "../theme.js";
import { trackShare } from "./tracking.js";
import { signalAiBehavior } from "./supabase.js";

// ===== מחולל "תמונת מספר" — מייצר תמונה ממותגת לכל מספר עם טקסט ויראלי בתוכה =====
// צד-לקוח בלבד (canvas), ללא תלות חיצונית. מתאים לשיתוף בוואטסאפ/אינסטגרם (1080×1080).

const POETIC = [
  "מספר אחד. סוד שלם.",
  "המספרים מדברים. רק צריך להקשיב.",
  "רגע — תראו מה יוצא מהמספר הזה.",
  "מאחורי מספר אחד מסתתר עולם.",
  "זה לא צירוף מקרים. זו שפה.",
  "המספר הזה לא סתם הגיע אליך.",
  "מי שמבין מספרים — מבין הכל.",
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

// מקטין גופן עד שהטקסט נכנס לרוחב נתון — לשורה אחת תמיד
function fitFont(g, text, maxW, startPx, fontTpl, minPx = 20) {
  let px = startPx; g.font = fontTpl(px);
  while (g.measureText(text).width > maxW && px > minPx) { px -= 2; g.font = fontTpl(px); }
  return px;
}

// בונה את הקנבס של תמונת המספר — עיצוב מלכותי (סגול-זהב), שורה אחת לגימטריה
export function buildNumberCard(value, phrases = []) {
  const { meaning, words, poetic } = numberMeaning(value, phrases);
  const gemLine = words.length ? words.join("   ·   ") : (meaning || "מרכז ההתכנסות");
  const S = 1080;
  const cv = document.createElement("canvas");
  cv.width = S; cv.height = S;
  const g = cv.getContext("2d");
  g.direction = "rtl"; g.textAlign = "center";

  // רקע מלכותי — סגול-נייבי עמוק אל שחור
  const bg = g.createRadialGradient(S / 2, S * 0.40, 60, S / 2, S / 2, S * 0.85);
  bg.addColorStop(0, "#241845");
  bg.addColorStop(0.5, "#120a28");
  bg.addColorStop(1, "#05030d");
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // הילה זהובה עדינה מאחורי המספר
  const halo = g.createRadialGradient(S / 2, 540, 20, S / 2, 540, 360);
  halo.addColorStop(0, "rgba(212,175,55,0.18)");
  halo.addColorStop(1, "rgba(212,175,55,0)");
  g.fillStyle = halo; g.fillRect(0, 180, S, 720);

  // מסגרת זהב כפולה + עיטורי פינה
  g.strokeStyle = "rgba(212,175,55,0.65)"; g.lineWidth = 3;
  g.strokeRect(36, 36, S - 72, S - 72);
  g.strokeStyle = "rgba(212,175,55,0.28)"; g.lineWidth = 1.5;
  g.strokeRect(52, 52, S - 104, S - 104);
  g.fillStyle = "#d4af37"; g.font = "28px 'Heebo', sans-serif";
  [[60, 78], [S - 60, 78], [60, S - 58], [S - 60, S - 58]].forEach(([x, y]) => g.fillText("✦", x, y));

  // כתר + מותג (עיצוב חדש) + תיקון 1820: בלי רווחי ספרות (אחרת bidi הופך ל-0281)
  g.font = "46px 'Heebo', sans-serif"; g.fillText("👑", S / 2, 128);
  g.fillStyle = "#c9a227"; g.font = "700 30px 'Heebo', sans-serif";
  try { g.letterSpacing = "12px"; } catch { /* ignore */ }
  g.fillText("סוד  1820", S / 2, 182);
  try { g.letterSpacing = "0px"; } catch { /* ignore */ }

  // כותרת
  g.fillStyle = "#e8c840"; g.font = "700 44px 'Heebo', sans-serif";
  g.fillText("מה המספר הזה יודע עליך?", S / 2, 252);

  // מפריד מעוטר
  drawDivider(g, S / 2, 292, 300);

  // המספר הענק — זהב בהיר וברור (צל רך, לא מטשטש)
  const fontNum = px => `800 ${px}px 'Heebo', serif`;
  const numPx = fitFont(g, String(value), S - 240, 330, fontNum, 110);
  g.save();
  g.shadowColor = "rgba(212,175,55,0.55)"; g.shadowBlur = 26; g.shadowOffsetY = 2;
  g.fillStyle = "#ffe9a8";
  g.fillText(String(value), S / 2, 560 + numPx * 0.06);
  g.restore();

  // קו גימטריה — תמיד שורה אחת (מתכווץ אוטומטית), קרם בהיר וברור
  const fontGem = px => `700 ${px}px 'Heebo', 'Heebo', serif`;
  fitFont(g, gemLine, S - 150, 58, fontGem, 22);
  g.fillStyle = "#f3ead0";
  g.fillText(gemLine, S / 2, 730);

  // מפריד
  drawDivider(g, S / 2, 800, 220);

  // שורה ויראלית — שורה אחת
  const fontPo = px => `italic 600 ${px}px 'Heebo', 'Heebo', serif`;
  fitFont(g, poetic, S - 170, 44, fontPo, 22);
  g.fillStyle = "#cdb7e8";
  g.fillText(poetic, S / 2, 880);

  // פוטר
  g.fillStyle = "#c9a227"; g.font = "700 30px 'Heebo', sans-serif"; g.direction = "ltr";
  g.fillText(`sod1820.co.il/number/${value}`, S / 2, S - 72);

  return cv;
}

// קו מפריד מלכותי — זהב דועך עם ✦ במרכז
function drawDivider(g, cx, y, half) {
  const grad = g.createLinearGradient(cx - half, 0, cx + half, 0);
  grad.addColorStop(0, "rgba(212,175,55,0)");
  grad.addColorStop(0.5, "rgba(212,175,55,0.7)");
  grad.addColorStop(1, "rgba(212,175,55,0)");
  g.strokeStyle = grad; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(cx - half, y); g.lineTo(cx - 22, y); g.moveTo(cx + 22, y); g.lineTo(cx + half, y); g.stroke();
  g.fillStyle = "#d4af37"; g.font = "22px 'Heebo', sans-serif"; g.textAlign = "center";
  g.fillText("✦", cx, y + 7);
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

const shareText = value => `🤯 תראו מה מסתתר במספר ${value} — מה הוא יודע עליכם?\nhttps://sod1820.co.il/number/${value}`;

// שיתוף תמונת המספר — שיתוף מקורי במובייל, הורדה בדסקטופ. מחזיר true בהצלחה.
export async function shareNumberCard(value, phrases) {
  await ensureFonts();
  try {
    const cv = buildNumberCard(value, phrases);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    const file = new File([blob], cardFileName(value), { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      trackShare("native", `number/${value}`);
      await navigator.share({ files: [file], title: `המספר ${value} · סוד 1820`, text: shareText(value) });
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

// שיתוף "חכם" — מייצר תמונה אוטומטית ומשתף אותה (מובייל). בדסקטופ (אין שיתוף קבצים) →
// נופל לשיתוף וואטסאפ של הקישור, שם תצוגת ה-OG ממילא מציגה את תמונת המספר שנוצרת בשרת.
export async function shareNumberSmart(value, phrases) {
  await ensureFonts();
  signalAiBehavior("share");   // 🧪 ai_style_learning_law — שיתוף אחרי ניתוח טרי = אות-איכות שקט
  try {
    const cv = buildNumberCard(value, phrases);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    const file = new File([blob], cardFileName(value), { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      trackShare("native", `number/${value}`);
      await navigator.share({ files: [file], title: `המספר ${value} · סוד 1820`, text: shareText(value) });
      return "image";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancel";
  }
  // דסקטופ / אין שיתוף קבצים → וואטסאפ עם הקישור (תצוגת ה-OG מציגה תמונה)
  trackShare("whatsapp", `number/${value}`);
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText(value))}`, "_blank", "noopener,noreferrer");
  return "link";
}

// ✨ שיתוף מסע — כיתוב ממותג שמספר על ההתכנסות (כל התחנות → מספר אחד). מזמין את הצופה
// לגלות את המספר שלו. תיוג ?src=journey למדידה (מי הגיע דרך שיתוף-מסע). מתעד slug=journey/<root>
// כדי שדשבורד הניהול יראה «מי שיתף מסע». התמונה = כרטיס-המספר הקיים (כרטיס-מסע מעוצב = בהמשך).
const journeyShareText = (root, meaning) =>
  `✨ יצאתי למסע בעץ המספרים של סוד1820.\nעברתי בין ביטויים שנראים שונים לגמרי — וכולם התכנסו אל מספר אחד: ${root}${meaning ? ` · ${meaning}` : ""}.\nגם לכם יש מספר שמחכה. גלו את שלכם 👇\nhttps://sod1820.co.il/number/${root}?src=journey`;

export async function shareJourney(root, phrases, meaning) {
  await ensureFonts();
  const text = journeyShareText(root, meaning);
  try {
    const cv = buildNumberCard(root, phrases);
    const blob = await new Promise(res => cv.toBlob(res, "image/png"));
    const file = new File([blob], cardFileName(root), { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      trackShare("native", `journey/${root}`);
      await navigator.share({ files: [file], title: `המסע אל ${root} · סוד 1820`, text });
      return "image";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancel";
  }
  trackShare("whatsapp", `journey/${root}`);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  return "link";
}
