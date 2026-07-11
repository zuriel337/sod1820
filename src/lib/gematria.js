import { GEM } from "../theme.js";

// ===== ליבת הגימטריה — 8 שיטות, מקור אמת יחיד (מאומת מול bidim) =====
// "התגלות": רגיל 844 · מילוי 1026 · מסתתר 1237 · קדמי 3137 · גדול 844 · סידורי 70 · אתבש 392 · אלבם 241.

export const onlyHeb = s => [...(s || "")].filter(c => GEM[c] != null);

const FINAL = { "ך": 500, "ם": 600, "ן": 700, "ף": 800, "ץ": 900 };
// 🔒 חוק gadol_equals_ragil_when_no_sofiot (נעול ב-DB): ההבדל היחיד בין שיטה «גדולה» לבסיס
// הוא ערכי הסופיות (ך=500…ץ=900). אם אין אות סופית בביטוי → הגדול שווה לרגיל בדיוק.
// אסור להציג שיטה-גדולה כממצא נפרד כשהיא זהה לרגיל. (חריג: «מילוי דמילוי גדול» נבדק על המילוי הפנימי.)
const SOFIT_FINALS = ["ך", "ם", "ן", "ף", "ץ"];
export const hasSofiot = (text) => SOFIT_FINALS.some(c => String(text || "").includes(c));
// זוגות בסיס↔גדול שמתמוטטים לזהות כשאין סופיות (מילוי-דמילוי-גדול אינו כאן — חריג).
export const GADOL_BASE = { "גדול": "רגיל", "מסתתר גדול": "מסתתר", "ריבוע גדול": "ריבוע", "משולש גדול": "קדמי", "הכפלה גדולה": "הכפלה" };
const ORD = { "א": 1, "ב": 2, "ג": 3, "ד": 4, "ה": 5, "ו": 6, "ז": 7, "ח": 8, "ט": 9, "י": 10, "כ": 11, "ך": 11, "ל": 12, "מ": 13, "ם": 13, "נ": 14, "ן": 14, "ס": 15, "ע": 16, "פ": 17, "ף": 17, "צ": 18, "ץ": 18, "ק": 19, "ר": 20, "ש": 21, "ת": 22 };
const KID = { "א": 1, "ב": 3, "ג": 6, "ד": 10, "ה": 15, "ו": 21, "ז": 28, "ח": 36, "ט": 45, "י": 55, "כ": 75, "ך": 75, "ל": 105, "מ": 145, "ם": 145, "נ": 195, "ן": 195, "ס": 255, "ע": 325, "פ": 405, "ף": 405, "צ": 495, "ץ": 495, "ק": 595, "ר": 795, "ש": 1095, "ת": 1495 };
const ATB = { "א": 400, "ב": 300, "ג": 200, "ד": 100, "ה": 90, "ו": 80, "ז": 70, "ח": 60, "ט": 50, "י": 40, "כ": 30, "ך": 30, "ל": 20, "מ": 10, "ם": 10, "נ": 9, "ן": 9, "ס": 8, "ע": 7, "פ": 6, "ף": 6, "צ": 5, "ץ": 5, "ק": 4, "ר": 3, "ש": 2, "ת": 1 };
const ALB = { "א": 30, "ב": 40, "ג": 50, "ד": 60, "ה": 70, "ו": 80, "ז": 90, "ח": 100, "ט": 200, "י": 300, "כ": 400, "ך": 400, "ל": 1, "מ": 2, "ם": 2, "נ": 3, "ן": 3, "ס": 4, "ע": 5, "פ": 6, "ף": 6, "צ": 7, "ץ": 7, "ק": 8, "ר": 9, "ש": 10, "ת": 20 };
// אותיות אחרי / אותיות לפני (חוק otiot_shift_methods — נעול ב-DB): תמורת היסט ±1 במעגל הא״ב (22 אותיות),
// סופיות מנורמלות לבסיס. «אותיות אחרי» (כל אות→הבאה) = צופן המזוזה «כוזו במוכסז כוזו» (יהוה→כוזו · אלהינו→במוכסז).
// שיטת שמעון חיימוב. הובא לקבוצת תורת הרמז VIP. דוגמה: רזיאל→שחכבמ. ערך השיטה = רגיל של המילה המוחלפת.
const SHIFT_AFTER_L  = { "א": "ב", "ב": "ג", "ג": "ד", "ד": "ה", "ה": "ו", "ו": "ז", "ז": "ח", "ח": "ט", "ט": "י", "י": "כ", "כ": "ל", "ך": "ל", "ל": "מ", "מ": "נ", "ם": "נ", "נ": "ס", "ן": "ס", "ס": "ע", "ע": "פ", "פ": "צ", "ף": "צ", "צ": "ק", "ץ": "ק", "ק": "ר", "ר": "ש", "ש": "ת", "ת": "א" };
const SHIFT_BEFORE_L = { "א": "ת", "ב": "א", "ג": "ב", "ד": "ג", "ה": "ד", "ו": "ה", "ז": "ו", "ח": "ז", "ט": "ח", "י": "ט", "כ": "י", "ך": "י", "ל": "כ", "מ": "ל", "ם": "ל", "נ": "מ", "ן": "מ", "ס": "נ", "ע": "ס", "פ": "ע", "ף": "ע", "צ": "פ", "ץ": "פ", "ק": "צ", "ר": "ק", "ש": "ר", "ת": "ש" };
const shiftVals = Lmap => Object.fromEntries(Object.keys(Lmap).map(c => [c, GEM[Lmap[c]] || 0]));
const SHIFT_AFTER = shiftVals(SHIFT_AFTER_L);   // ערך רגיל של האות שאחרי
const SHIFT_BEFORE = shiftVals(SHIFT_BEFORE_L); // ערך רגיל של האות שלפני
const MILUI = { "א": 111, "ב": 412, "ג": 83, "ד": 434, "ה": 15, "ו": 22, "ז": 67, "ח": 418, "ט": 419, "י": 20, "כ": 100, "ך": 100, "ל": 74, "מ": 80, "ם": 80, "נ": 106, "ן": 106, "ס": 120, "ע": 130, "פ": 81, "ף": 81, "צ": 104, "ץ": 104, "ק": 186, "ר": 510, "ש": 360, "ת": 416 };
// הכפלה (חוק hakpala_def — נעול): כל אות בריבוע (ערך×עצמו), ואז סכום. סופיות=רגיל. בינה=2²+10²+50²+5²=2629.
const SQR = Object.fromEntries(Object.entries(GEM).map(([c, v]) => [c, v * v]));
// הכפלה גדולה: ריבוע האותיות עם ערכי סופיות גדולים (ך=500²). מלך=40²+30²+500²=252500.
const SQR_GADOL = Object.fromEntries(Object.keys(GEM).map(c => { const v = FINAL[c] || GEM[c]; return [c, v * v]; }));
// ===== מנועי עומק (שכבה 2) — מאומתים מול חוקי DB =====
const KID_GADOL = { ...KID, "ך": 1995, "ם": 2595, "ן": 3295, "ף": 4095, "ץ": 4995 };        // משולש גדול (kadmi_gadol_def): שובו בנים שובבים=7760
const MDM = { "א": 266, "ב": 848, "ג": 257, "ד": 924, "ה": 35, "ו": 64, "ז": 193, "ח": 854, "ט": 855, "י": 476, "כ": 181, "ך": 181, "ל": 588, "מ": 160, "ם": 160, "נ": 234, "ן": 234, "ס": 300, "ע": 256, "פ": 192, "ף": 192, "צ": 558, "ץ": 558, "ק": 289, "ר": 890, "ש": 486, "ת": 458 }; // מילוי דמילוי: יהוה=610
const MDM_GADOL = { "א": 986, "ב": 848, "ג": 817, "ד": 924, "ה": 35, "ו": 64, "ז": 1493, "ח": 854, "ט": 855, "י": 476, "כ": 901, "ך": 901, "ל": 1148, "מ": 1280, "ם": 1280, "נ": 1534, "ן": 1534, "ס": 2060, "ע": 1556, "פ": 912, "ף": 912, "צ": 558, "ץ": 558, "ק": 1009, "ר": 1540, "ש": 1786, "ת": 458 }; // מילוי דמילוי גדול: ירושלים=6770

const sumBy = (w, map) => onlyHeb(w).reduce((s, c) => s + (map[c] || 0), 0);
const gadol = w => onlyHeb(w).reduce((s, c) => s + (FINAL[c] || GEM[c] || 0), 0);
// ריבוע (ribua_definition — נעול): סכום הרגיל של כל הקידומות ההדרגתיות, מילה-מילה.
// דוד = ד(4)+דו(10)+דוד(14) = 28. ריבוע גדול = אותו דבר בערכי סופיות. מאומת: גג=9, צוריאל=1432.
const ribuaWord = (word, val) => { let s = 0, run = 0; for (const c of onlyHeb(word)) { run += val(c); s += run; } return s; };
export const ribua = w => String(w || "").split(/\s+/).reduce((t, word) => t + ribuaWord(word, c => GEM[c] || 0), 0);
export const ribuaGadol = w => String(w || "").split(/\s+/).reduce((t, word) => t + ribuaWord(word, c => FINAL[c] || GEM[c] || 0), 0);
// מסתתר (חוק misratar_multi — נעול): כל מילה מחושבת בנפרד; הרווח שובר את הרצף.
// לעולם לא מחברים אות אחרונה של מילה לאות ראשונה של הבאה. (משיח בן דוד = 552+48+4 = 604)
export const mistater = w => String(w || "").split(/\s+/).reduce((tot, word) => {
  const L = onlyHeb(word); let s = 0;
  for (let i = 0; i < L.length - 1; i++) s += Math.abs(GEM[L[i]] - GEM[L[i + 1]]);
  return tot + s;
}, 0);

// ✅ כל השיטות העבריות = tag:"hebrew" (מסורת עברית). sub=מה עושים · soul=המשמעות (הסבר-סגור).
export const METHODS = [
  { key: "רגיל", tag: "hebrew", sub: "חיבור ערכי האותיות", soul: "המהות הגלויה", fn: w => sumBy(w, GEM), map: GEM },
  { key: "מילוי", tag: "hebrew", sub: "ערך שֵם האות המלא", soul: "הפנימיות — מה שמתמלא בפנים", fn: w => sumBy(w, MILUI), map: MILUI },
  { key: "מסתתר", tag: "hebrew", sub: "הפרשים בין אותיות", soul: "מה שמסתתר בין האותיות", fn: mistater, map: null },
  { key: "קדמי", tag: "hebrew", sub: "סכום מצטבר עד האות", soul: "השורש המצטבר", fn: w => sumBy(w, KID), map: KID },
  { key: "ריבוע", tag: "hebrew", sub: "סכום הקידומות המצטברות", soul: "ההתפשטות מהאות אל השלם", fn: ribua, map: null },
  { key: "גדול", tag: "hebrew", sub: "סופיות 500–900", soul: "ההתפשטות הגדולה", fn: gadol, map: null },
  { key: "סידורי", tag: "hebrew", sub: "מיקום האות 1–22", soul: "הסדר והמיקום", fn: w => sumBy(w, ORD), map: ORD },
  { key: "אתבש", tag: "hebrew", sub: "היפוך הא״ב", soul: "המראה — הצד הנגדי", fn: w => sumBy(w, ATB), map: ATB },
  { key: "אלבם", tag: "hebrew", sub: "חצי מול חצי", soul: "בן/בת הזוג — הזיווג המשלים", fn: w => sumBy(w, ALB), map: ALB },
  { key: "אותיות אחרי", tag: "hebrew", sub: "כל אות → הבאה בא״ב (צופן המזוזה)", soul: "כוזו במוכסז — הצעד קדימה", fn: w => sumBy(w, SHIFT_AFTER), map: SHIFT_AFTER },
  { key: "אותיות לפני", tag: "hebrew", sub: "כל אות → הקודמת בא״ב", soul: "הצעד אחורה — השורש שלפני האות", fn: w => sumBy(w, SHIFT_BEFORE), map: SHIFT_BEFORE },
  { key: "מילוי בלבד", tag: "hebrew", sub: "המילוי פחות האות עצמה", soul: "הפנימיות הטהורה — הנסתר שבאות", fn: w => sumBy(w, MILUI) - sumBy(w, GEM), map: null },
  { key: "הכפלה", tag: "hebrew", sub: "כל אות בריבוע (אות×עצמה)", soul: "העוצמה הפנימית — כל אות מוכפלת בעצמה", fn: w => sumBy(w, SQR), map: null },
];
export const LETTER_COLS = METHODS.filter(m => m.map);

// שם-תצוגה חיצוני בלבד (לא המפתח הפנימי): קדמי מוצג גם כ"משולש". המפתח "קדמי" נשאר ללוגיקה/DB.
export const methodLabel = (key) => (key === "קדמי" ? "קדמי · משולש" : key);

// מסתתר גדול (mistater_gadol_def): הפרשים מילה-מילה על ערכי גדול (סופיות 500-900). מלך=480
const gv = c => FINAL[c] || GEM[c] || 0;
export const mistaterGadol = w => String(w || "").split(/\s+/).reduce((tot, word) => {
  const L = onlyHeb(word); let s = 0;
  for (let i = 0; i < L.length - 1; i++) s += Math.abs(gv(L[i]) - gv(L[i + 1]));
  return tot + s;
}, 0);

// 4 מנועי העומק (שכבה 2) — לתצוגה במגירת המספר. כולם אומתו מול דוגמאות נעולות.
export const DEPTH_METHODS = [
  { key: "משולש גדול", tag: "hebrew", soul: "קדמי גדול — הסופיות בסדר המורחב", fn: w => sumBy(w, KID_GADOL) },
  { key: "מסתתר גדול", tag: "hebrew", soul: "ההפרשים על ערכי גדול", fn: mistaterGadol },
  { key: "מילוי דמילוי", tag: "hebrew", soul: "מילוי המילוי — הפנימיות העמוקה", fn: w => sumBy(w, MDM) },
  { key: "מילוי דמילוי גדול", tag: "hebrew", soul: "מילוי דמילוי בסופיות גדול", fn: w => sumBy(w, MDM_GADOL) },
  { key: "הכפלה גדולה", tag: "hebrew", soul: "הכפלה בסופיות גדול (ך=500²)", fn: w => sumBy(w, SQR_GADOL) },
  { key: "ריבוע גדול", tag: "hebrew", soul: "ריבוע הקידומות בסופיות גדול", fn: ribuaGadol },
];

export { GEM };

// ===== פירוט אות-אות לשיטה נבחרת (לתצוגת "ראה את האותיות" במחשבון) =====
// צפני החלפה — האות שאליה כל אות הופכת (אתב"ש / אלב"ם), כדי להראות אותיות על המסך.
const ATBASH_L = { "א":"ת","ב":"ש","ג":"ר","ד":"ק","ה":"צ","ו":"פ","ז":"ע","ח":"ס","ט":"נ","י":"מ","כ":"ל","ל":"כ","מ":"י","נ":"ט","ס":"ח","ע":"ז","פ":"ו","צ":"ה","ק":"ד","ר":"ג","ש":"ב","ת":"א","ך":"ל","ם":"י","ן":"ט","ף":"ו","ץ":"ה" };
const ALBAM_L  = { "א":"ל","ב":"מ","ג":"נ","ד":"ס","ה":"ע","ו":"פ","ז":"צ","ח":"ק","ט":"ר","י":"ש","כ":"ת","ל":"א","מ":"ב","נ":"ג","ס":"ד","ע":"ה","פ":"ו","צ":"ז","ק":"ח","ר":"ט","ש":"י","ת":"כ","ך":"ת","ם":"ב","ן":"ג","ף":"ו","ץ":"ז" };
const LMAP = { "רגיל": GEM, "מילוי": MILUI, "קדמי": KID, "סידורי": ORD, "אתבש": ATB, "אלבם": ALB, "הכפלה": SQR, "הכפלה גדולה": SQR_GADOL, "משולש גדול": KID_GADOL, "מילוי דמילוי": MDM, "מילוי דמילוי גדול": MDM_GADOL };

// מחזיר תיאור אות-אות לשיטה: cipher (אות→אות), diff (מסתתר), value (אות=ערך). null אם אין.
export function methodLetters(key, word) {
  const Ls = onlyHeb(word);
  if (!Ls.length) return null;
  if (key === "אתבש") return { type: "cipher", word: Ls.map(c => ATBASH_L[c] || "").join(""), segs: Ls.map(c => ({ from: c, to: ATBASH_L[c] || "?", val: ATB[c] || 0 })) };
  if (key === "אלבם") return { type: "cipher", word: Ls.map(c => ALBAM_L[c] || "").join(""), segs: Ls.map(c => ({ from: c, to: ALBAM_L[c] || "?", val: ALB[c] || 0 })) };
  if (key === "אותיות אחרי") return { type: "cipher", word: Ls.map(c => SHIFT_AFTER_L[c] || "").join(""), segs: Ls.map(c => ({ from: c, to: SHIFT_AFTER_L[c] || "?", val: SHIFT_AFTER[c] || 0 })) };
  if (key === "אותיות לפני") return { type: "cipher", word: Ls.map(c => SHIFT_BEFORE_L[c] || "").join(""), segs: Ls.map(c => ({ from: c, to: SHIFT_BEFORE_L[c] || "?", val: SHIFT_BEFORE[c] || 0 })) };
  if (key === "מסתתר" || key === "מסתתר גדול") {
    const vf = key === "מסתתר גדול" ? (c => FINAL[c] || GEM[c] || 0) : (c => GEM[c] || 0);
    const segs = [];
    for (let i = 0; i < Ls.length - 1; i++) segs.push({ label: `|${Ls[i]}−${Ls[i + 1]}|`, val: Math.abs(vf(Ls[i]) - vf(Ls[i + 1])) });
    return { type: "diff", segs };
  }
  if (key === "גדול") return { type: "value", segs: Ls.map(c => ({ ch: c, val: FINAL[c] || GEM[c] || 0 })) };
  if (key === "מילוי בלבד") return { type: "value", segs: Ls.map(c => ({ ch: c, val: (MILUI[c] || 0) - (GEM[c] || 0) })) };
  if (key === "ריבוע" || key === "ריבוע גדול") {
    const vf = key === "ריבוע גדול" ? (c => FINAL[c] || GEM[c] || 0) : (c => GEM[c] || 0);
    let run = 0;
    return { type: "value", segs: Ls.map(c => { run += vf(c); return { ch: c, val: run }; }) };
  }
  const map = LMAP[key];
  if (map) return { type: "value", segs: Ls.map(c => ({ ch: c, val: map[c] ?? 0 })) };
  return null;
}

// ===== המרת מספר לאותיות עבריות (גימטריה) — עם אותיות סופיות (מנצפ״ך) ל-500–900 =====
// 542 → מב״ך (ך=500) · 683 → פג״ם (ם=600) · 231 → רל״א. הסופית באה בסוף (כמו במילה).
const NUM_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const NUM_TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const NUM_HUND_BASE = ["", "ק", "ר", "ש", "ת"];          // 100–400 (רגיל, בהתחלה)
const NUM_HUND_FINAL = { 5: "ך", 6: "ם", 7: "ן", 8: "ף", 9: "ץ" }; // 500–900 (סופית, בסוף)
function hebTensUnits(r) {
  if (r === 15) return "טו";          // ט״ו — לא יה (שם ה')
  if (r === 16) return "טז";          // ט״ז — לא יו
  return (NUM_TENS[Math.floor(r / 10)] || "") + (NUM_ONES[r % 10] || "");
}
function hebUnder1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  if (h >= 5) return hebTensUnits(r) + NUM_HUND_FINAL[h];   // 500–900: הסופית בסוף → מבך / פגם
  return (NUM_HUND_BASE[h] || "") + hebTensUnits(r);        // 100–400: ההמאה בהתחלה → שנח / רלא
}
function gershayim(s) {
  if (!s) return s;
  if (s.length === 1) return s + "׳";
  return s.slice(0, -1) + "״" + s.slice(-1);
}
// מספר → ראשי-תיבות עבריים. מעל מיליון מחזיר מחרוזת ריקה (לא מציגים אותיות).
export function hebrewNumeral(num) {
  const n = Number(num);
  if (!n || n < 1 || n >= 1000000) return "";
  const parts = [];
  let rest = n;
  if (rest >= 1000) { parts.push(gershayim(hebUnder1000(Math.floor(rest / 1000)))); rest %= 1000; }
  if (rest > 0) parts.push(gershayim(hebUnder1000(rest)));
  return parts.join(" ");
}

// שמות האותיות במילוי (תואם למפת MILUI — רגיל של התוצאה = ערך המילוי)
const MILUI_NAMES = { "א": "אלף", "ב": "בית", "ג": "גימל", "ד": "דלת", "ה": "הי", "ו": "ויו", "ז": "זין", "ח": "חית", "ט": "טית", "י": "יוד", "כ": "כף", "ך": "כף", "ל": "למד", "מ": "מם", "ם": "מם", "נ": "נון", "ן": "נון", "ס": "סמך", "ע": "עין", "פ": "פא", "ף": "פא", "צ": "צדי", "ץ": "צדי", "ק": "קוף", "ר": "ריש", "ש": "שין", "ת": "תיו" };
// "תוצאת" השיטה כטקסט להזנה חוזרת למחשבון: אתבש/אלבם=אותיות מוצפנות · מילוי=שמות מלאים · אחר=הביטוי עצמו
export function methodResultText(key, word) {
  const Ls = onlyHeb(word);
  if (!Ls.length) return "";
  if (key === "אתבש") return Ls.map(c => ATBASH_L[c] || "").join("");
  if (key === "אלבם") return Ls.map(c => ALBAM_L[c] || "").join("");
  if (key === "אותיות אחרי") return Ls.map(c => SHIFT_AFTER_L[c] || "").join("");
  if (key === "אותיות לפני") return Ls.map(c => SHIFT_BEFORE_L[c] || "").join("");
  if (key === "מילוי") return miluiTextV(word, MILUI_VAR_DEFAULT);
  if (key === "מילוי דמילוי") return miluiDemiluyTextV(word, MILUI_VAR_DEFAULT);
  return Ls.join("");
}

// ===== וריאנטים של מילוי — איות חלופי לאותיות ה/ו/ת (משפיע על הערך והטקסט) =====
export const MILUI_VAR_OPTS = { "ה": ["הי", "הא", "הה"], "ו": ["ויו", "ואו", "וו"], "ת": ["תיו", "תאו", "תו"] };
export const MILUI_VAR_DEFAULT = { "ה": "הי", "ו": "ויו", "ת": "תיו" };
const RSUM = s => [...String(s || "")].reduce((t, ch) => t + (GEM[ch] || 0), 0);
function miluiNameV(c, variants) {
  if (variants && MILUI_VAR_OPTS[c]) return variants[c] || MILUI_NAMES[c] || "";
  return MILUI_NAMES[c] || "";
}
export function miluiTextV(word, variants) { return onlyHeb(word).map(c => miluiNameV(c, variants)).join(" "); }
export function miluiValueV(word, variants) { return onlyHeb(word).reduce((t, c) => t + RSUM(miluiNameV(c, variants)), 0); }
export function miluiDemiluyTextV(word, variants) {
  const lvl1 = onlyHeb(word).map(c => miluiNameV(c, variants)).join("");
  return onlyHeb(lvl1).map(c => miluiNameV(c, variants)).join(" ");
}
export function miluiDemiluyValueV(word, variants) {
  const lvl1 = onlyHeb(word).map(c => miluiNameV(c, variants)).join("");
  return onlyHeb(lvl1).reduce((t, c) => t + RSUM(miluiNameV(c, variants)), 0);
}
// פירוט אות→שם(ערך) למילוי עם וריאנט (לשורת האותיות)
export function miluiLettersV(word, variants, demiluy = false) {
  const Ls = onlyHeb(word);
  if (!Ls.length) return null;
  if (!demiluy) return { type: "milui", segs: Ls.map(c => ({ from: c, name: miluiNameV(c, variants), val: RSUM(miluiNameV(c, variants)) })) };
  return { type: "milui", segs: Ls.map(c => { const nm = miluiNameV(c, variants); const deep = onlyHeb(nm).map(x => miluiNameV(x, variants)).join(""); return { from: c, name: deep, val: RSUM(deep) }; }) };
}
