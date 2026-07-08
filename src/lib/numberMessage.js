import { METHODS, onlyHeb } from "./gematria.js";
import { KEY_NUMBERS } from "../theme.js";

// ===== מנוע המסרים — תמיד משהו אמיתי להגיד על מספר/שם (מפל A→F) =====
// A נגיעה בעוגן · B מילה שווה (DB) · C הד פנימי בין-שיטתי · D מבנה המספר · E נשמת האותיות · F פיוטי.
// C+D מחושבים מהמנוע בלבד (בלי מאגר) → עובדים לכל שם בעולם. fact=עובדה, remez=רמז/תחושה.

const M = Object.fromEntries(METHODS.map(m => [m.key, m.fn]));

// משמעויות עוגנים (לזיהוי מהיר במסר)
const ANCHORS = {
  21: "אהיה", 45: "אדם · מ״ה", 72: "חסד · ע״ב", 112: "יב״ק (יהוה+אלהים+אדני)",
  13: "אחד · אהבה", 26: "שם הוי״ה", 86: "אלהים", 91: "אמן (הוי״ה+אדני)",
  137: "קבלה", 248: "אברהם · רמ״ח איברים", 314: "שדי · מטטרון", 318: "אליעזר",
  358: "משיח · נחש", 424: "משיח בן דוד", 541: "ישראל", 543: "אהיה אשר אהיה",
  604: "תדר", 611: "תורה", 776: "ביאת המשיח", 1202: "עוגן", 1237: "התגלות",
  1820: "סוד השם × עמים",
};

const FINAL2BASE = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const LETTER_SOUL = {
  "א": "ראשית ואחדות", "ב": "בית וברכה", "ג": "גמילות וצמיחה", "ד": "דלת ודעת",
  "ה": "גילוי ונשימה", "ו": "חיבור והמשכה", "ז": "זיכרון וקדושה", "ח": "חיים וחום",
  "ט": "טוב גנוז", "י": "ניצוץ והתחלה", "כ": "כתר וכוח", "ל": "לימוד ושאיפה",
  "מ": "מים ומלכות", "נ": "נפש ונצח", "ס": "סוד ותמיכה", "ע": "עין ועומק",
  "פ": "פה וביטוי", "צ": "צדק וצמח", "ק": "קדושה וקו", "ר": "ראש ורוח",
  "ש": "שלהבת ושלום", "ת": "תום ותכלית",
};

const POETIC = [
  "מאחורי השם הזה מסתתר עולם.", "מספר אחד, סוד שלם.",
  "זה לא צירוף מקרים — זו שפה.", "המספרים מדברים, רק צריך להקשיב.",
  "מי שמבין מספרים — מבין הכל.",
];

const perfectRoot = n => { const r = Math.round(Math.sqrt(n)); return r > 1 && r * r === n ? r : 0; };
const digitRoot = n => { let x = n; while (x > 9) x = String(x).split("").reduce((s, d) => s + +d, 0); return x; };

// בונה את כל המסרים הזמינים, מהחזק לחלש. כל פריט: { layer, fact, text }
export function buildMessages({ term, value, isNumber, phrases = [], goldLabels } = {}) {
  const out = [];
  const seen = new Set();
  const add = (layer, fact, text) => { if (text && !seen.has(text)) { seen.add(text); out.push({ layer, fact, text }); } };

  // A — נגיעה בעוגן (הערך הראשי)
  if (ANCHORS[value]) add("A", true, `✦ נוגע ב-${value} — ${ANCHORS[value]}`);

  // C — הד פנימי: שיטה אחרת של השם פוגעת בעוגן (בלי מאגר)
  if (!isNumber && term) {
    for (const key of ["מילוי", "מסתתר", "קדמי", "אתבש", "הכפלה"]) {
      const v = M[key]?.(term);
      if (v && v !== value && ANCHORS[v]) { add("C", true, `ב${key}: ${v} — ${ANCHORS[v]}`); break; }
    }
  }

  // B — מילה שווה מהמאגר (gold-first)
  const word = phrases.find(p => goldLabels?.has?.(p.phrase)) || phrases[0];
  if (word?.phrase && word.phrase !== term) {
    add("B", true, `שווה ל«${word.phrase}»${phrases.length > 1 ? ` — ועוד ${phrases.length - 1}` : ""}.`);
  }

  // D — מבנה המספר (ריבוע / שורש) — מתמטיקה טהורה, תמיד זמין
  const root = perfectRoot(value);
  if (root) { const m = ANCHORS[root] || KEY_NUMBERS[root]; add("D", true, `= ${root} בריבוע${m ? ` (${root} = ${m})` : ""}.`); }
  const dr = digitRoot(value);
  if (KEY_NUMBERS[dr]) add("D", true, `שורש המספר ${dr} — ${KEY_NUMBERS[dr]}.`);

  // E — נשמת האות הפותחת (רמז)
  if (!isNumber && term) {
    const c0 = onlyHeb(term)[0];
    const soul = c0 && (LETTER_SOUL[FINAL2BASE[c0] || c0]);
    if (soul) add("E", false, `נפתח ב-${c0} — ${soul}.`);
  }

  // F — פיוטי (גיבוי אחרון, תמיד)
  add("F", false, POETIC[value % POETIC.length]);

  return out;
}

// המסר הראשי (הטוב ביותר הזמין)
export function topMessage(args) { return buildMessages(args)[0]?.text || ""; }

// ===== buildStory — «טביעת-אצבע» ל-fold העליון של דף-המספר (story-top) =====
// עיקרון-על (דרישת צוריאל): טקסט **אמיתי וייחודי לכל מספר**, לא תבנית שמחליפה רק את המספר.
// «נמצא בצומת של…» = רשימה **דינמית** שמשתנה לפי מה שבאמת קיים במספר — הביטויים האמיתיים
// (קישורי-פנים) + הספירות האמיתיות (N ביטויים · N גלריות · N מקורות…). כל דף מקבל טביעת-אצבע.
// טהור (בלי React/DB/effects). phrases=[{phrase,ragil}] gold-first; counts={words,galleries,posts,events,topics,insights}.
export function buildStory({ term, value, isNumber, phrases = [], goldLabels, counts = {} } = {}) {
  // משמעות ערוכה (רק למספרי-מפתח; לרוב אין — ואז הביטויים לבדם נושאים את הייחודיות)
  const meaning = (ANCHORS[value] ? ANCHORS[value].split(" · ")[0] : (KEY_NUMBERS[value] || "")).trim();

  // ביטויים-מובילים אמיתיים — הליבה הייחודית. gold-first, מסונן מהמונח וגם מהמשמעות (למנוע כפילות).
  const clean = phrases.filter(p => p?.phrase && p.phrase !== term && p.phrase !== meaning);
  const golds = clean.filter(p => goldLabels?.has?.(p.phrase));
  const rest = clean.filter(p => !goldLabels?.has?.(p.phrase));
  const leads = [...golds, ...rest].slice(0, 3).map(p => p.phrase);

  // ספירות-הצומת הדינמיות — רק מה שקיים (>0). מספרים אמיתיים = טביעת-אצבע ייחודית.
  const facets = [
    counts.words     && `${counts.words} ביטויים`,
    counts.galleries && `${counts.galleries} גלריות`,
    counts.posts     && `${counts.posts} מקורות`,
    counts.events    && `${counts.events} אירועים`,
    counts.topics    && `${counts.topics} התכנסויות`,
    counts.insights  && `${counts.insights} גילויים ותובנות`,
  ].filter(Boolean);

  const items = [...leads, ...facets];
  let sentence;
  if (meaning && items.length) sentence = `${value} — ${meaning}. נמצא בצומת של: ${items.join(" · ")}.`;
  else if (items.length)       sentence = `${value} נמצא בצומת של: ${items.join(" · ")}.`;
  else if (meaning)            sentence = `${value} — ${meaning}.`;
  else                         sentence = `${value} — מספר חי במערכת.`;

  // תיאור-SEO ייחודי — משמעות + ביטויים אמיתיים + טביעת-האצבע
  let seo = (meaning || leads.length)
    ? `${value}${meaning ? ` — ${meaning}` : ""}${leads.length ? ` · ${leads.join(" · ")}` : ""}${facets.length ? ` · ${facets.join(" · ")}` : ""} — גימטריה ומילים שוות`
    : `המספר ${value} — גימטריה, מילים שוות, גלריות וקשרים`;
  if (seo.length > 158) { seo = seo.slice(0, 158); const c = seo.lastIndexOf(" "); if (c > 95) seo = seo.slice(0, c); seo += "…"; }

  return { meaning, leads, facets, sentence, seoDescription: seo, ok: !!(meaning || items.length) };
}
