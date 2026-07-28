// 🧹 שכבת-נרמול לממצאי-השם — display-only. Raw → Normalize → Dedupe → Rank → Render.
//
// ⛔ גבול קריטי (צוריאל): זה **לא מנוע-משמעות**. הוא עושה רק: ניקוי → זהות → איחוד → דירוג → תצוגה.
//    לא ניקוי → פרשנות. כל פרשנות (משמעות/קשר) נשארת אצל Metatron בלבד.
//
// חוקי-הנרמול (נעולים):
//  1. לא מנרמלים את ה-raw של הממצא — הטקסט המקורי נשמר תמיד (provenance[].raw).
//  2. לכל ממצא מאוחד: display_value · normalized_key · occurrences · source_engines[] · provenance[] · evidence_level.
//  3. איחוד בין-מנועים לא עיוור — רק אם שני הממצאים עברו את **אותו** כלל-נרמול שמרני (אותו normalized_key).
//  4. Top-N הוא UI בלבד; כל התוצאות המאוחדות נשארות זמינות ("הצג עוד").
//  • נרמול שמרני: מאחד רק כתיבים זהים-מהותית (רווח/מקף/גרש/ניקוד). לא מאבד הבדל אמיתי בין מילים.

const NIKUD = /[֑-ׇ]/g;      // טעמים + ניקוד
const MARKS = /[״׳'"`]/g;              // גרשיים/גרש/מרכאות
const DASHES = /[-־–—]/g;              // מקף/מקף-עברי/en/em (ל-replace בלבד)
const hasDash = (s) => /[-־–—]/.test(String(s));  // בדיקה נטולת-state (בלי דגל g)
const cleanDisplay = (s) => String(s || "").replace(/\s+/g, " ").trim();

// מפתח-נרמול שמרני יחיד — משמש גם לזהות-פנימית וגם לאיחוד בין-מנועים (אותו כלל בדיוק).
// מסיר ניקוד+גרשיים, ממיר מקף→רווח, מכווץ רווחים. זהה-מהותית → אותו מפתח.
export function normKey(s) {
  return String(s || "")
    .replace(NIKUD, "")
    .replace(MARKS, "")
    .replace(DASHES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EVRANK = { direct: 3, value_match: 2, interpretive: 1 };

// שולף ממצאי-ביטוי מכל המסלולים (רק status==='ok'), עם תווית-מנוע ורמת-ראיה. raw נשמר כפי-שהוא.
function collect(tracks, push) {
  for (const t of (tracks || [])) {
    if (!t || t.status !== "ok") continue;
    if (t.id === "milui" && Array.isArray(t.data))
      for (const pt of t.data) for (const m of (pt.matches || [])) push(m.phrase, "מילוי", "value_match", pt.milui ?? null);
    else if (t.id === "combo_gem" && Array.isArray(t.words))
      for (const w of t.words) push(w, "גימטריה", "value_match", t.value ?? null);
    else if (t.id === "anagrams" && Array.isArray(t.data))
      for (const pt of t.data) for (const a of (pt.anagrams || [])) push(a.word, "אנגרם", "direct", null);
    else if (t.id === "variants" && Array.isArray(t.data))
      for (const v of t.data) push(v.form, "וריאציית-כתיב", "direct", null);
    else if (t.id === "transforms" && Array.isArray(t.data))
      for (const tr of t.data) if ((tr.in_tanach || 0) > 0) push(tr.word, "תמורה בתנ״ך", "direct", tr.value ?? null);
  }
}

// Raw → Normalize → Dedupe → Rank. מקבל מערך-של-מערכי-מסלולים (צירוף + רכיבים) → מאחד את הכל.
// מחזיר [{ normalized_key, display_value, occurrences, source_engines[], provenance[], evidence_level, value }].
export function aggregateFindings(trackLists) {
  const map = new Map();
  const push = (raw, engine, evidence, value) => {
    const key = normKey(raw);
    if (!key) return;
    let e = map.get(key);
    if (!e) {
      e = { normalized_key: key, display_value: cleanDisplay(raw), _eng: new Map(), provenance: [], evidence_level: evidence, value: value ?? null };
      map.set(key, e);
    }
    // provenance — הטקסט המקורי לעולם לא מנורמל (raw כפי-שהתקבל מהמנוע)
    e.provenance.push({ raw: String(raw), engine, value: value ?? null });
    e._eng.set(engine, (e._eng.get(engine) || 0) + 1);
    if ((EVRANK[evidence] || 0) > (EVRANK[e.evidence_level] || 0)) e.evidence_level = evidence;
    if (e.value == null && value != null) e.value = value;
    // תצוגה קנונית: מעדיפים גרסה מרווחת (בלי מקף) — קריא יותר. לא נוגע ב-raw.
    if (!hasDash(raw) && /\s/.test(raw) && hasDash(e.display_value)) e.display_value = cleanDisplay(raw);
  };
  for (const list of (trackLists || [])) collect(list, push);

  const arr = [...map.values()].map(e => ({
    normalized_key: e.normalized_key,
    display_value: e.display_value,
    occurrences: e.provenance.length,
    source_engines: [...e._eng.entries()].map(([engine, count]) => ({ engine, count })).sort((a, b) => b.count - a.count),
    provenance: e.provenance,
    evidence_level: e.evidence_level,
    value: e.value,
  }));
  // דירוג: קודם מה שנמצא ביותר מנועים (≈קונצנזוס), אז שכיחות, אז קצר/נקי. (דירוג — לא פרשנות.)
  arr.sort((a, b) =>
    b.source_engines.length - a.source_engines.length ||
    b.occurrences - a.occurrences ||
    a.display_value.length - b.display_value.length);
  return arr;
}
