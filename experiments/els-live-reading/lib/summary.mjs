// The cross-run summary of EXP-16. Blind, planted and diagnostic runs are in separate sections and are never pooled; every table is descriptive (counts, not tests), and
// the closing section states what the pre-registration says each outcome does and does not mean.
import { enrich, plantedRecall, recallBy, runMetrics } from "./metrics.mjs";

const fmt = (value, digits = 2) => (value === null || value === undefined ? "—" : typeof value === "number" ? (Number.isInteger(value) ? String(value) : value.toFixed(digits)) : String(value));
const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const table = (head, rows) => [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
const kinds = (mix) => `R${mix.R} C${mix.C} D${mix.D} A${mix.A}`;

/** `runs`: [{ run (plan entry or {id, series, group, note}), classified, raw, response, evaluation? , planted? }] ; `reference`: the EXP-15 run in the same shape or null. */
export function renderSummary({ runs, reference, ledger, targets, priorUsd = 2.481606, chance = null }) {
  const withMetrics = (item) => { const rows = enrich(item.classified, item.raw, chance); if (item.round2) item.round2.rows = enrich(item.round2.classified, item.round2.raw, chance); return { ...item, rows, m: runMetrics(rows) }; };
  const all = [...(reference ? [{ ...reference, run: { id: "EXP-15", series: "blind", group: "story", note: "the original Columbia run (v1 prompt, occurrence marked)" } }] : []), ...runs].map(withMetrics);
  const blind = all.filter((r) => r.run.series === "blind");
  const planted = all.filter((r) => r.run.series === "planted");
  const diagnostic = all.filter((r) => r.run.series === "diagnostic");
  const out = ["# EXP-16 — בקרות לקריאת עברית חיה במטריצה: סיכום בין ריצות", ""];

  out.push("## 0. עלות בפועל (לפי usage ומחירון חי, לא חשבונית)");
  let cumulative = priorUsd;
  out.push(table(["ריצה", "סדרה", "stop_reason", "קלט", "פלט", "מהם חשיבה", "שניות", "USD", "מצטבר (כולל EXP-15)"], all.filter((r) => r.run.id !== "EXP-15").map((r) => { const usd = r.response?.cost?.usd ?? 0; cumulative += usd; return [r.run.id, r.run.series, r.response?.summary?.stop_reason, r.response?.summary?.usage?.input_tokens, r.response?.summary?.usage?.output_tokens, r.response?.summary?.usage?.output_tokens_details?.thinking_tokens, r.response?.ms ? (r.response.ms / 1000).toFixed(0) : "—", fmt(usd, 3), fmt(cumulative, 2)]; })));
  if (ledger) { const settled = Number(ledger.entries.filter((e) => !e.reserved).reduce((sum, e) => sum + (e.usd ?? 0), 0).toFixed(6)); const reserved = Number(ledger.entries.filter((e) => e.reserved).reduce((sum, e) => sum + (e.usd ?? 0), 0).toFixed(6)); out.push("", `לפי ספר ההוצאות: הוצא בפועל (כולל EXP-15) ${settled} USD מתוך תקרה כוללת של ${ledger.cap_usd}; נותר ${Number((ledger.cap_usd - settled).toFixed(6))}${reserved ? ` (מתוכו ${reserved} שמור כמקרה גרוע לקריאות שעדיין בדרך)` : ""}.`); }
  out.push("");

  const story = blind.filter((r) => r.run.group === "story");
  out.push("## 1. בקרת הסיפור (עיוורת)");
  out.push("מה נבדק: האם אותות מסוג ‘מילה ארוכה, מאומתת, קשורה לסיפור’ מופיעים באזורים אקראיים עם אותו סיפור, ובקולומביה עם סיפור שגוי, באותה מידה כמו בקולומביה עם הסיפור שלה. תיאורי בלבד (n קטן).");
  out.push(table(["ריצה", "אזור/סיפור", "הצעות", "אומתו", "ELS", "ELS 5+ אותיות", "ELS 5+ ‘קשור לסיפור’", "ELS בלתי סביר במקרה (E<1)", "מהם E<0.1", "ELS נדיר במנוע (≤3)", "טקסט רגיל", "חציון E", "שניות"], story.map((r) => [r.run.id, r.run.note, r.m.proposals, r.m.verified, r.m.els.n, r.m.els.long, r.m.els.longStoryRelated, r.m.els.unlikely, r.m.els.unlikelier, r.m.els.rare, r.m.byVerdict.plainText, fmt(r.m.els.medianExpected, 3), r.response?.ms ? (r.response.ms / 1000).toFixed(0) : "—"])));
  const random = story.filter((r) => /^S4/.test(r.run.id));
  if (random.length) out.push("", `באזורים האקראיים עם סיפור קולומביה (${random.length}): ELS 5+ ‘קשור לסיפור’ בכל אזור: ${random.map((r) => r.m.els.longStoryRelated).join(", ")}; ELS בלתי סבירים במקרה (E<1): ${random.map((r) => r.m.els.unlikely).join(", ")}.`);
  const evalRows = story.filter((r) => r.evaluation);
  if (evalRows.length) { out.push("", "יעדי ההערכה בקולומביה (נבדק רק אחרי התשובה; לא נכנס לקלט או לקוד הריצה):"); out.push(table(["ריצה", ...targets], evalRows.map((r) => [r.run.id, ...r.evaluation.map((e) => `${e.best}${e.hits.exact_verified?.length ? ` (${e.hits.exact_verified.join(",")})` : ""}`)]))); }
  out.push("");

  const nostory = blind.filter((r) => r.run.group === "nostory");
  out.push("## 2. חיפוש ללא סיפור וללא נושא (עיוור)");
  out.push("רעש = הצעות ELS שכמה מופעים שלהן צפויים במקרה בכל התורה באותו דילוג (E ≥ 1, לפי שכיחות האותיות בתורה עצמה), וקטעי טקסט רגיל מהשורות (אינם מוסתרים). ‘בלתי סביר במקרה’ = E < 1. E הוא אומדן מקרי בלבד, לא סינון: כל ההצעות מוצגות.");
  out.push(table(["ריצה", "הצעות", "אומתו", "ELS", "קצר 3–4", "5–6", "7+", "בלתי סביר במקרה (E<1)", "צפוי במקרה (E≥1) = רעש", "טקסט רגיל", "אחרי ‘המשך’ (from_finding)", "קבוצת ראשונה A", "A: ELS/רגיל", "A: 5+/E<1", "A: סוגי קו", "מחוץ ל-A: ‘מעניין’ (5+ ו-E<1)", "סוגי קו (ELS)"], nostory.map((r) => [r.run.id, r.m.proposals, r.m.verified, r.m.els.n, r.m.els.len3to4, r.m.els.len5to6, r.m.els.len7plus, r.m.els.unlikely, r.m.noise.likelyByChance, r.m.byVerdict.plainText, r.m.continuation.fromFinding, r.m.firstGroup.n, `${r.m.firstGroup.els}/${r.m.firstGroup.plain}`, `${r.m.firstGroup.long}/${r.m.firstGroup.unlikely}`, kinds(r.m.firstGroup.kinds), r.m.outsideFirstGroup.interesting, kinds(r.m.els.kinds)])));
  out.push("", "קבוצה ראשונה (tier A) היא סדר הצגה בלבד: כל ההצעות נשמרו ונבדקו. העמודה ‘מחוץ ל-A: מעניין’ מראה כמה הצעות ארוכות ונדירות נשארו מחוץ לקבוצה הראשונה, כלומר מה היה אובד אילו הוצגה רק היא.");
  out.push("");

  const listing = (r, rows) => table(["id", "טקסט", "קו", "סוג", "אומת ע\"י", "E", "מופעים במנוע", "קשור לסיפור", "tier"], rows.map((x) => [x.id, x.text, x.reading ?? "—", x.kind ?? "—", x.verdict === "verified_by_engine" ? "מנוע" : x.verdict === "verified_plain_text_only" ? "טקסט רגיל" : x.verdict === "verified_synthetic" ? "אזור נטוע" : "לא אומת", x.expected === null ? "—" : x.expected.toExponential(1), x.hits === null ? "—" : `${x.hits}${x.truncated ? "+" : ""}`, x.storyRelated ? "כן" : "לא", x.tier ?? "—"]));
  out.push("## 2א. מה המודל מצא ואימת — הקבוצה הראשונה (tier A) בכל ריצה עיוורת");
  out.push("סדר ההצגה הוא של המודל עצמו (אותה קריאה). כל ההצעות נשמרות בקבצי `controls/runs/<id>/classified-round1.json`; כאן רק A, ומתחתיה מה שלא נכנס אליה אך הוא ארוך ובלתי סביר במקרה.");
  for (const r of [...story, ...nostory]) {
    const a = r.rows.filter((x) => x.tier === "A");
    const lost = r.rows.filter((x) => x.tier !== "A" && x.isEls && x.long && x.unlikely);
    out.push("", `#### ${r.run.id} — ${r.run.note}`);
    out.push(a.length ? listing(r, a) : "(אין tier; ריצה בפרומפט v1)");
    if (lost.length) out.push("", `מחוץ לקבוצה הראשונה, ELS ארוכים ובלתי סבירים במקרה (${lost.length}):`, listing(r, lost));
  }
  out.push("");

  const cont = blind.filter((r) => r.round2);
  if (cont.length) {
    out.push("## 2ב. המשך לפני ואחרי מילים שנמצאו (סבב 2, עיוור: כרטיסים שהכלי בנה מההצעות המאומתות של המודל עצמו)");
    out.push(table(["ריצה", "הצעות סבב 2", "אומתו", "ELS", "ELS 5+", "בלתי סבירים במקרה", "תוספות (extension)", "חיתוכים (crossing)", "עלות סבב 2 (USD)"], cont.map((r) => { const m2 = runMetrics(r.round2.rows); return [r.run.id, m2.proposals, m2.verified, m2.els.n, m2.els.long, m2.els.unlikely, m2.continuation.extension, m2.continuation.crossing, fmt(r.round2.response?.cost?.usd, 3)]; })));
    for (const r of cont) { const good = r.round2.rows.filter((x) => x.verified && ((x.isEls && x.long && x.unlikely) || x.phrase)); if (good.length) out.push("", `#### ${r.run.id}: המשכים ארוכים/בלתי סבירים או חלוקות לביטוי`, listing(r, good.slice(0, 15))); }
    out.push("");
  }

  if (planted.length) {
    out.push("## 3. שחזור מילים נטועות (עיוור עם אמת ידועה)");
    const results = planted.flatMap((r) => plantedRecall(r.planted, r.classified, r.raw).map((x) => ({ run: r.run.id, ...x })));
    out.push(table(["ריצה", "מילה", "סוג קו", "כיוון", "מרחק", "סוג", "אורך", "תוצאה", "הצעה", "tier"], results.map((x) => [x.run, x.text, x.kind, x.reversed ? "−" : "+", x.distance, x.type, x.length, x.match, x.text && x.match !== "missed" ? x.id : "—", x.tier ?? "—"])));
    for (const key of ["kind", "distance", "reversed", "type"]) out.push("", `לפי ${key}: ${JSON.stringify(recallBy(results, key))}`);
    out.push("", "‘exact’ = ההצעה היא בדיוק המילה הנטועה; ‘contains’ = הצעה ארוכה שמכילה אותה; ‘overlaps’ = חפיפה חלקית; found = exact+contains; firstGroup = found והיה ב-tier A.");
    out.push("");
  }

  if (diagnostic.length) {
    out.push("## 4. בדיקות אבחון (לא עיוורות — המודל קיבל רמז; אין לצרף לתוצאות העיוורות)");
    out.push(table(["ריצה", "הרמז", "הצעות", "אומתו", "ELS", "ELS 5+", "נדיר"], diagnostic.map((r) => [r.run.id, r.run.note, r.m.proposals, r.m.verified, r.m.els.n, r.m.els.long, r.m.els.rare])));
    const evalD = diagnostic.filter((r) => r.evaluation);
    if (evalD.length) { out.push("", "יעדים (אחרי התשובה):"); out.push(table(["ריצה", ...targets], evalD.map((r) => [r.run.id, ...r.evaluation.map((e) => `${e.best}${e.hits.exact_verified?.length ? ` (${e.hits.exact_verified.join(",")})` : ""}`)]))); }
    out.push("");
  }

  out.push("## 5. מה אפשר להסיק ומה לא (נקבע מראש)");
  out.push(
    "- מספר האזורים קטן: אלה ספירות תיאוריות, לא מבחנים סטטיסטיים. אין כאן ‘מובהקות’.",
    "- אימות הוא אותיות ומיקום בלבד (ובאזור נטוע: מול האותיות של האזור עצמו). הוא אינו שיפוט על משמעות או על חריגות.",
    "- תוצאה שלילית בקולומביה (אם יימצא שהמילה שנמצאה בקולומביה ב-EXP-15 לא נשחזרת, או שבאזורים אקראיים יש הצעות דומות) בוחנת רק את השיטה והגדרות אלה: פרומפט v2, `claude-fable-5-1`, effort בינוני, קריאה בסבב אחד של אזור 33×41 עם ארבעה סוגי קווים. היא אינה סוגרת את כיוון הגילוי ואינה אומרת דבר על שיטות אחרות (למשל בחירה סמנטית מתוך מאגר מועמדים, EXP-12).",
    "- תוצאה חיובית (ההצעה חוזרת, וגם נעדרת מהבקרות) מצדיקה בדיקה נוספת בלבד, לא טענה.",
    "- בדיקות האבחון מראות אם רמז משנה את מה שהמודל מציע; הן אינן ראיה לגילוי כי הרמז נבחר לאחר שידענו מה פוספס.",
  );
  return out.join("\n");
}
