// src/lib/timeFlow.js — שכבת «בדיקת ציר וזמן» ל-Smart Analysis Flow.
// ⛔ לא מנוע/טבלה חדשים: ניתוח טהור מעל ה-engines הקיימים (@hebcal/core + calcGem) + DB-First לציר (READ בלבד).
// שרשרת: EXTRACT_DATES → NORMALIZE (עברי↔לועזי, בלי כפילות) → CLASSIFY (role) → LINK_DATE_TO_EVENT → DETECT_SEQUENCES.
// כל תוצאה נושאת role + why. ⛔ לא יוצר Event, לא מקרין לציר — הקרנה = Human-Gate.
import { HDate } from "@hebcal/core";
import { calcGem } from "../theme.js";

const HEB = /[א-ת]/;
const stripNikud = (s) => String(s || "").replace(/[֑-ׇ]/g, "");
const gemOnly = (s) => calcGem(String(s || "").replace(/[^א-ת]/g, ""));

// שמות-חודש עבריים → hebcal (מטפל ב-מרחשון/מר-חשון/חשון). אדר-א/ב לשנה מעוברת.
const HMONTH = {
  "תשרי": "Tishrei", "חשון": "Cheshvan", "מרחשון": "Cheshvan", "מרחשוון": "Cheshvan", "מרחשוון ": "Cheshvan",
  "כסלו": "Kislev", "טבת": "Tevet", "שבט": "Shvat", "אדר": "Adar I", "אדרא": "Adar I", "אדרב": "Adar II",
  "ניסן": "Nisan", "אייר": "Iyyar", "סיון": "Sivan", "סיוון": "Sivan", "תמוז": "Tamuz", "אב": "Av", "אלול": "Elul",
};
const MONTH_ALT = "תשרי|מרחשוון|מרחשון|מר[\\s־\\-]?חשון|חשון|כסלו|טבת|שבט|אדר['\"׳״]?\\s?[אב]?|ניסן|אייר|סיון|סיוון|תמוז|אב|אלול";
const monthKey = (raw) => {
  const t = String(raw || "").replace(/[־\-'"׳״\s]/g, "");
  if (/^מרחש/.test(t)) return "Cheshvan";
  if (/^חשו/.test(t)) return "Cheshvan";
  if (/^אדר.?ב/.test(t)) return "Adar II";
  if (/^אדר/.test(t)) return "Adar I";
  for (const k of Object.keys(HMONTH)) if (t === k.replace(/\s/g, "")) return HMONTH[k];
  return HMONTH[t] || null;
};

const iso = (dt) => (dt && !isNaN(dt) ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}` : null);

// ── EXTRACT_DATES · לועזי — DD/MM/YYYY · D.M.YY · (D.M ללא שנה = חלקי) ──
export function extractGregDates(text) {
  const t = String(text || ""); const out = []; let m;
  const re = /(?<![\d/.])(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?(?![\d/.])/g;
  while ((m = re.exec(t))) {
    const d = +m[1], mo = +m[2]; let y = m[3] ? +m[3] : null;
    if (d < 1 || d > 31 || mo < 1 || mo > 12) continue;
    if (y != null && y < 100) y = y >= 40 ? 1900 + y : 2000 + y;   // 26→2026 · 56→1956
    const dt = y != null ? new Date(y, mo - 1, d) : null;
    out.push({ raw: m[0], d, m: mo, y, iso: iso(dt), partial: y == null, kind: "greg" });
  }
  return out;
}

// ── EXTRACT_HEBREW_DATES · «ט"ז מרחשון תשפ"ז» · «כ"א מר-חשון» · «כ"ט תשרי תשפ"ד» ──
export function extractHebrewDates(text) {
  const t = stripNikud(text); const out = []; let m;
  const dayP = "([א-ת]['\"׳״]?[א-ת]?['\"׳״]?)";
  const yearP = "(?:\\s+([א-ת]{2,4}['\"׳״]?[א-ת]?))?";
  const re = new RegExp(dayP + "\\s+(" + MONTH_ALT + ")" + yearP, "g");
  while ((m = re.exec(t))) {
    const dayRaw = m[1], monRaw = m[2], yearRaw = m[3] || null;
    const day = gemOnly(dayRaw);
    if (!day || day < 1 || day > 30) continue;                    // «ט"ז»=16 · פוסל מילים שאינן יום
    const mon = monthKey(monRaw);
    let hy = yearRaw ? gemOnly(yearRaw) : null;
    if (hy != null && hy < 1000) hy += 5000;                       // תשפ"ז=787 → 5787
    let isoStr = null;
    if (mon && hy) { try { isoStr = iso(new HDate(day, mon, hy).greg()); } catch { /* ignore */ } }
    out.push({ raw: m[0].trim(), day, month: monRaw, monthKey: mon, hebYear: hy, iso: isoStr, kind: "hebrew" });
  }
  return out;
}

// ── EXTRACT_YEARS · רק מספר בהקשר-זמן (לא ערך-גימטריה): בתוך תאריך · רצף-חיצים · צמוד לאירוע/«שנה» ──
export function extractYears(text) {
  const t = String(text || ""); const seen = new Set(); const out = [];
  const push = (y, why) => { if (y >= 1200 && y <= 2100 && !seen.has(y)) { seen.add(y); out.push({ year: y, why }); } };
  let m;
  // (א) רצף-חיצים/מקפים של מספרים בטווח-שנים: «1656 → 1917 → 1938»
  const seqRe = /(\d{4})(?:\s*[→\-–—>]+\s*(\d{4})){2,}/g;
  while ((m = seqRe.exec(t))) (m[0].match(/\d{4}/g) || []).forEach(y => push(+y, "רצף-שנים בטקסט"));
  // (ב) מספר צמוד ל«שנה/בשנת» או אחריו «—/-/→» + טקסט (אירוע): «1956 — מבצע סיני» · «בשנת 1917»
  const ctxRe = /(?:ב?שנ[תה]\s+(\d{4}))|(\d{4})\s*[—\-–→]\s*[א-ת]/g;
  while ((m = ctxRe.exec(t))) push(+(m[1] || m[2]), "שנה בהקשר-אירוע/«שנה»");
  // (ג) שנה בתוך תאריך לועזי מלא
  for (const g of extractGregDates(t)) if (g.y) push(g.y, "שנה מתוך תאריך לועזי");
  return out;
}

// ── DETECT_SEQUENCES · ≥3 שנים = מועמד-רצף (לא ממציא קשר, רק מזהה רב-שנתיות) ──
// ⛔ סדר-כרונולוגי לבד ≠ משמעות. מחזיר קריטריון מפורש + פערים, כדי שהמערכת לא תציג רצף כאילו הוא בהכרח משמעותי.
// שרשרת עתידית: רצף → למה מעניין (criterion) → מקורות (roles) → מה בציר (מהרכיב) → קשר-נוסף → Human-Gate.
export function detectSequences(years) {
  const withRole = (years || []).filter(y => y.role !== "PERSONAL");
  const ys = [...new Set(withRole.map(y => y.year))].sort((a, b) => a - b);
  if (ys.length < 3) return [];
  const gaps = ys.slice(1).map((y, i) => y - ys[i]);
  const eventLinked = withRole.filter(y => y.role === "EVENT").length;
  // קריטריון גלוי: כרגע הרצף הוא co-occurrence בטקסט + סדר. אם רק חלק מקושרים-לאירוע — לסמן במפורש.
  const criterion = eventLinked >= 2
    ? `${eventLinked}/${ys.length} מהשנים מקושרות במפורש לאירוע בטקסט`
    : "כרונולוגי + הופעה-משותפת בטקסט אחד — טרם זוהה קריטריון-תוכן משותף";
  return [{
    years: ys, span: ys[ys.length - 1] - ys[0], gaps, eventLinked,
    criterion,
    contentCriterion: eventLinked >= 2,
    why: `זוהו ${ys.length} שנים (${ys[0]}–${ys[ys.length - 1]}). קריטריון: ${criterion}. ⛔ סדר-כרונולוגי ≠ משמעות — מועמד לבדיקה: מקורות → מה כבר בציר → קשר-נוסף → Human-Gate.`,
  }];
}

// ── CLASSIFY role + LINK_DATE_TO_EVENT · תפקיד-התאריך (מקור/מוזכר/אירוע/אישי/טענה) + האירוע הצמוד ──
// ⛔ הקשר = השורה בלבד (לא חלון-תווים שחוצה שורות) — כדי ש«יום הולדת» בשורה אחת לא יזליג לשנה בשורה אחרת.
const EVENT_WORDS = ["מבצע", "מלחמת", "מלחמה", "בחיר", "אסון", "פיגוע", "מבול", "הבדלח", "הבדולח", "בלפור", "רעידת", "מתקפה", "התקפ", "שחרור", "הצהר", "עצמאות", "חטוף", "טבח", "שריפ"];
const PERSONAL_WORDS = ["יום הולדת", "הולדתי", "נולד", "יום נישואי", "בר מצווה", "פטיר"];
function lineOf(text, raw) {
  const lines = String(text || "").split(/\n/);
  return lines.find(l => l.includes(raw)) || String(text || "");
}
export function classifyDate(text, raw) {
  const line = lineOf(text, raw);
  if (PERSONAL_WORDS.some(w => line.includes(w))) return { role: "PERSONAL", tag: "DATE_CLAIM", why: "צמוד לאזכור אישי (יום הולדת/אישי) — DATE_CLAIM, לא אירוע קנוני" };
  const ev = EVENT_WORDS.find(w => line.includes(w));
  if (ev) {
    const label = ((line.match(new RegExp("(" + ev + "[א-ת\\s\"'׳״]{0,24})")) || [])[1] || ev).replace(/\s+/g, " ").trim();
    return { role: "EVENT", tag: "CANDIDATE", event: label, why: `צמוד לאירוע «${label}» — מועמד-אירוע לציר (דורש אימות)` };
  }
  return { role: "MENTIONED", tag: "CANDIDATE", why: "תאריך/שנה מוזכר בטקסט — לא מקושר לאירוע מפורש" };
}

// ── NORMALIZE · עברי↔לועזי לאותו יום = אחד (בלי כפילות) ──
// כולל היסק-שנה: תאריך-עברי בלי שנה + תאריך-לועזי באותה שורה → משלימים את השנה מהלועזי ובודקים התאמה
// (כך «כא' מר חשון» + «1.11.26» → מאושר «אותו יום», בדיוק טענת-הכתב).
export function normalizePairs(gregs, hebrews, rawText = "") {
  const pairs = []; const usedH = new Set();
  const resolveHeb = (h, gYear) => {
    if (h.iso) return h.iso;
    if (h.monthKey && h.day && gYear) { try { return iso(new HDate(h.day, h.monthKey, gYear).greg()); } catch { return null; } }
    return null;
  };
  for (const g of gregs) {
    if (!g.iso) continue;
    // שנה עברית מקבילה ללועזי (להשלמת תאריך-עברי חסר-שנה): מ-HDate של הלועזי.
    let gHebYear = null; try { gHebYear = new HDate(new Date(g.y, g.m - 1, g.d)).getFullYear(); } catch { /* */ }
    for (let i = 0; i < hebrews.length; i++) {
      if (usedH.has(i)) continue;
      const h = hebrews[i]; const hIso = resolveHeb(h, gHebYear);
      const sameLine = lineOf(rawText, g.raw) === lineOf(rawText, h.raw);
      if (hIso && hIso === g.iso) {
        usedH.add(i);
        pairs.push({ iso: g.iso, greg: g.raw, hebrew: h.raw, same: true, inferred: !h.iso, why: h.iso ? "התאריך העברי והלועזי מצביעים על אותו יום — לא כפילות" : `הושלמה השנה מהתאריך הלועזי (${g.y}) → «${h.raw}» = ${g.raw}, אותו יום` });
      } else if (!h.iso && sameLine && gHebYear) {
        // אותה שורה, עברי חסר-שנה, אך לא התלכד — עדיין מציגים את ההשלמה כמועמד לבדיקה
        pairs.push({ iso: hIso, greg: g.raw, hebrew: h.raw, same: hIso === g.iso, inferred: true, why: `השלמת-שנה: «${h.raw}» בשנת ${gHebYear} → ${hIso || "?"} (הלועזי: ${g.iso}) — ${hIso === g.iso ? "מתלכד" : "לא-מתלכד, לבדיקה"}` });
      }
    }
  }
  return pairs;
}

// ── analyzeTime · מרכיב את שלב-הזמן (טהור, בלי DB). sourceDate = תאריך-הפוסט (מקור), לא מהטקסט. ──
export function analyzeTime(rawText, { sourceDate = null } = {}) {
  const gregs = extractGregDates(rawText).map(g => ({ ...g, ...classifyDate(rawText, g.raw) }));
  const hebrews = extractHebrewDates(rawText).map(h => ({ ...h, ...classifyDate(rawText, h.raw) }));
  const years = extractYears(rawText).map(y => ({ ...y, ...classifyDate(rawText, String(y.year)) }));
  const normalized = normalizePairs(gregs, hebrews, rawText);
  const sequences = detectSequences(years);
  const personal = [...gregs, ...hebrews, ...years].filter(d => d.role === "PERSONAL");
  const events = [...gregs, ...hebrews, ...years].filter(d => d.role === "EVENT");
  return { sourceDate, gregs, hebrews, years, ranges: [], normalized, sequences, personal, events };
}
