// 🧹 שכבת-נרמול לממצאי-השם — display-only. Raw → Normalize → Dedupe → Rank.
// חוקי צוריאל (נעולים):
//  • לא נוגע ב-DB ולא בחישוב המנוע — שכבת-תצוגה בלבד. provenance נשמר (variants+engines) לפתיחת המקור.
//  • נרמול שמרני: מאחד רק כתיבים זהים-מהותית (רווח/מקף/גרש/ניקוד) — לא מאבד הבדל אמיתי בין מילים.
//  • הבחנה בין נרמול *בתוך* מנוע (כפילויות-כתיב) לבין איחוד *בין* מנועים (אותו ביטוי בשני מסלולים = ×N מסלולים).

const NIKUD = /[֑-ׇ]/g;      // טעמים + ניקוד
const MARKS = /[״׳'"`]/g;              // גרשיים/גרש/מרכאות
const DASHES = /[-־–—]/g;              // מקף/מקף-עברי/en/em (לרינדור-replace)
const hasDash = (s) => /[-־–—]/.test(String(s));  // בדיקה נטולת-state (בלי דגל g)
const cleanDisplay = (s) => String(s || "").replace(/\s+/g, " ").trim();

// מפתח-נרמול שמרני: מסיר ניקוד+גרשיים, ממיר מקף→רווח, מכווץ רווחים. זהה-מהותית → אותו מפתח.
export function normKey(s) {
  return String(s || "")
    .replace(NIKUD, "")
    .replace(MARKS, "")
    .replace(DASHES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EVRANK = { direct: 3, value_match: 2, interpretive: 1 };

// שולף ממצאי-ביטוי מכל המסלולים (רק status==='ok'), עם תווית-מנוע ורמת-ראיה.
function collect(tracks, push) {
  for (const t of (tracks || [])) {
    if (!t || t.status !== "ok") continue;
    if (t.id === "milui" && Array.isArray(t.data))
      for (const pt of t.data) for (const m of (pt.matches || [])) push(m.phrase, "מילוי", "value_match", pt.milui);
    else if (t.id === "anagrams" && Array.isArray(t.data))
      for (const pt of t.data) for (const a of (pt.anagrams || [])) push(a.word, "אנגרם", "direct", null);
    else if (t.id === "variants" && Array.isArray(t.data))
      for (const v of t.data) push(v.form, "וריאציית-כתיב", "direct", null);
    else if (t.id === "transforms" && Array.isArray(t.data))
      for (const tr of t.data) if ((tr.in_tanach || 0) > 0) push(tr.word, "תמורה בתנ״ך", "direct", tr.value);
  }
}

// Raw → Normalize → Dedupe → Rank. מקבל מערך-של-מערכי-מסלולים (צירוף + רכיבים) → מאחד את הכל.
// מחזיר [{key, display, variants[], engines[], evidence, occ, value}].
export function aggregateFindings(trackLists) {
  const map = new Map();
  const push = (phrase, engine, evidence, value) => {
    const key = normKey(phrase);
    if (!key) return;
    let e = map.get(key);
    if (!e) { e = { key, display: cleanDisplay(phrase), variants: new Set(), engines: new Set(), evidence, occ: 0, value: value ?? null }; map.set(key, e); }
    e.variants.add(cleanDisplay(phrase));
    e.engines.add(engine);
    e.occ += 1;
    if ((EVRANK[evidence] || 0) > (EVRANK[e.evidence] || 0)) e.evidence = evidence;
    if (e.value == null && value != null) e.value = value;
    // תצוגה קנונית: מעדיפים גרסה מרווחת (בלי מקף) על גרסה עם מקף — קריא יותר.
    if (!hasDash(phrase) && /\s/.test(phrase) && hasDash(e.display)) e.display = cleanDisplay(phrase);
  };
  for (const list of (trackLists || [])) collect(list, push);
  const arr = [...map.values()].map(e => ({ ...e, variants: [...e.variants], engines: [...e.engines] }));
  // דירוג: קודם מה שנמצא ביותר מנועים (≈קונצנזוס), אז שכיחות, אז קצר/נקי.
  arr.sort((a, b) => b.engines.length - a.engines.length || b.occ - a.occ || a.display.length - b.display.length);
  return arr;
}
