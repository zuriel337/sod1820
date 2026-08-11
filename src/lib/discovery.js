// 🎛️ Discovery Control Center — לוגיקת-קריאה טהורה (View-layer). מודול חסר-תופעות-לוואי.
// עיקרון-על (§11.0/§11.10): המנוע מגלה ומארגן; המשתמש בוחר. זהו **View על עץ-הידע הקיים**,
// לא מנוע ולא עץ חדש. כאן רק *ממירים* שורות research_objects לתבניות-החלטה + מדרגים לתצוגה.
// ⛔ לא מחשב גימטריה (הערכים כבר מאומתי-מנוע ב-engine_detail) · לא הופך Candidate לעובדה.

// סטטוסים — לעולם לא לערבב ביניהם (§11.4).
export const STATUS = {
  FACT: { key: "FACT", he: "עובדה", color: "#4caf7d", note: "אומת במנוע" },
  CROSS: { key: "CROSS", he: "הצלבה", color: "#3ea6ff", note: "נפגש בכמה שיטות" },
  DISCOVERY: { key: "DISCOVERY", he: "גילוי", color: "#c79a2e", note: "יחס שנמצא" },
  CANDIDATE: { key: "CANDIDATE", he: "מועמד", color: "#b08bd8", note: "ממתין לבדיקה" },
  HYPOTHESIS: { key: "HYPOTHESIS", he: "השערה", color: "#e0913a", note: "כיוון לא-מאומת" },
  UNKNOWN: { key: "UNKNOWN", he: "לא-ידוע", color: "#8a8a95", note: "אין עדיין די נתונים" },
};

// מיפוי-מקור לתווית-אנוש (§11.4 SOURCES).
const SOURCE_HE = {
  "discovery-engine": "מנוע הגילויים",
  "entity-combo": "מנוע הגילויים · דף-מספר",
  "research-center": "מנוע הגילויים · מרכז-מחקר",
  "active-panel": "מנוע הגילויים · מגדל-הבקרה",
  "wa-raziel": "וואטסאפ · רזיאל",
  "gallery-ocr": "OCR · גלריה",
  "wa-ocr": "OCR · וואטסאפ",
};
export const sourceLabel = (s) => SOURCE_HE[s] || s || "—";

// קובע את הסטטוס משורת research_objects — kind + אימות-מנוע + מספר-שיטות (§11.4).
export function statusOf(row, crossesCount = 0) {
  const verified = row?.engine_verified === true;
  switch (row?.kind) {
    case "fact":       return verified ? STATUS.FACT : STATUS.CANDIDATE;
    case "relation":   return verified ? (crossesCount > 1 ? STATUS.CROSS : STATUS.DISCOVERY) : STATUS.CANDIDATE;
    case "observation":return STATUS.CANDIDATE;
    case "hypothesis": return STATUS.HYPOTHESIS;
    case "question":   return STATUS.UNKNOWN;
    default:           return verified ? STATUS.DISCOVERY : STATUS.UNKNOWN;
  }
}

// מפרק engine_detail לרשימת-עובדות (phrase·method·value) + אוסף-שיטות (crosses).
// engine_detail מגיע בשתי צורות: relation → {phrase:[methods]} · fact → {phrase:{method:value,…}}.
function factsFromDetail(detail, value) {
  const facts = [], crosses = new Set();
  if (!detail || typeof detail !== "object") return { facts, crosses: [] };
  for (const [phrase, v] of Object.entries(detail)) {
    if (Array.isArray(v)) {                                   // relation: כל שיטה מגיעה ל-value
      for (const m of v) { facts.push({ phrase, method: m, value }); crosses.add(m); }
    } else if (v && typeof v === "object") {                  // fact: מפת method→value
      let matched = false;
      for (const [m, val] of Object.entries(v)) {
        if (typeof val !== "number") continue;                // דילוג על כל_הערכים/מהמאגר
        if (value != null && val === value) { facts.push({ phrase, method: m, value: val }); crosses.add(m); matched = true; }
      }
      if (!matched && typeof v["רגיל"] === "number") facts.push({ phrase, method: "רגיל", value: v["רגיל"] });
    }
  }
  return { facts, crosses: [...crosses] };
}

// שורת-פיד → תבנית-החלטה מנורמלת (§11.4). לא מפרש, לא מקבע.
export function patternFromRow(row) {
  const value = row?.value ?? null;
  const terms = Array.isArray(row?.terms) ? row.terms.filter(Boolean) : [];
  const { facts, crosses } = factsFromDetail(row?.engine_detail, value);
  const status = statusOf(row, crosses.length);
  const seed = value != null ? String(value) : (terms[0] || "—");
  const interpretation = (row?.meta && typeof row.meta === "object" && row.meta.interpretation) || null;
  return {
    id: row?.id, kind: row?.kind, seed, value, terms,
    facts, crosses,
    sources: [{ source: row?.source, ref: row?.source_ref, label: sourceLabel(row?.source) }],
    temporal: { created_at: row?.created_at || null },
    interpretation,                                           // בנפרד וברור שהיא פרשנות (§11.4)
    status,
    engineVerified: row?.engine_verified === true,
    confidence: row?.confidence ?? null,
    statement: row?.statement || "",
    raw: row,
  };
}

// 🔒 שני ציונים נפרדים — Evidence ≠ Interestingness (§11.7). "מעניין ≠ נכון".
// ציון-אימות (0-100): כמה חזק גוף-הראיות של המנוע. תצוגה בלבד.
export function verifiedScore(p) {
  if (p.engineVerified) return Math.min(100, 74 + p.facts.length * 8 + (p.crosses.length > 1 ? 10 : 0));
  if (p.confidence != null) return Math.round(p.confidence * 0.55);   // לא-מאומת → תקרה נמוכה
  return 12;
}
// ציון-עניין/עדיפות-גילוי (0-100): כמה כדאי *להסתכל*. לא אמת ולא אמינות. תצוגה בלבד.
// pulseByValue = Map(value → {all,week,…}) מ-computePulse — הישנות-במציאות מעלה עניין (HOT≠TRUE).
export function interestScore(p, pulseByValue = null) {
  let s = 8;                                                  // בסיס-חדשנות
  if (p.crosses.length > 1) s += 30;                          // הצלבת-שיטות = הכי מעניין
  if (p.terms.length > 2) s += Math.min(20, (p.terms.length - 2) * 10);
  const pulse = pulseByValue && p.value != null ? pulseByValue.get(p.value) : null;
  if (pulse && pulse.all > 0) s += Math.min(30, pulse.all * 6);  // מתעורר-שוב-במציאות (§11.2 HOT)
  if (p.confidence != null) s += Math.round(p.confidence * 0.15);
  return Math.max(0, Math.min(100, s));
}

// דירוג 1-5 — Rank, Don't Hide (§11.6): כולן נגישות, רק מסודרות.
const TIERS = [
  { n: 1, key: "strong", he: "חזק", color: "#4caf7d" },
  { n: 2, key: "interesting", he: "מעניין", color: "#3ea6ff" },
  { n: 3, key: "possible", he: "אפשרי", color: "#c79a2e" },
  { n: 4, key: "weak", he: "חלש", color: "#b0873a" },
  { n: 5, key: "unknown", he: "לא-ידוע", color: "#8a8a95" },
];
export function rankTier(p, interest) {
  if (p.status === STATUS.UNKNOWN && !p.engineVerified && !(p.confidence > 0)) return TIERS[4];
  if (interest >= 72) return TIERS[0];
  if (interest >= 52) return TIERS[1];
  if (interest >= 34) return TIERS[2];
  if (interest >= 16) return TIERS[3];
  return TIERS[4];
}

// «למה התבנית הזו?» (§11.8) — Seed↓Methods↓Values↓Crosses↓Sources↓Temporal↓Convergence↓Discovery.
export function whyChain(p) {
  const methodsLine = [...new Set(p.facts.map(f => f.method))].join(" · ") || "—";
  const valuesLine = [...new Set(p.facts.map(f => f.value).filter(v => v != null))].join(" · ") || (p.value ?? "—");
  return [
    { k: "Seed · זרע", v: p.seed },
    { k: "Methods · שיטות", v: methodsLine },
    { k: "Values · ערכים", v: String(valuesLine) },
    { k: "Crosses · הצלבות", v: p.crosses.length > 1 ? `${p.crosses.length} שיטות נפגשות` : "אין הצלבה (שיטה יחידה)" },
    { k: "Sources · מקורות", v: p.sources.map(s => s.label).join(" · ") },
    { k: "Temporal · זמן", v: p.temporal.created_at ? new Date(p.temporal.created_at).toLocaleDateString("he-IL") : "—" },
    { k: "Convergence · התכנסות", v: p.facts.length >= 2 ? `${p.facts.length} ביטויים על אותו ערך` : "יחיד" },
    { k: "Discovery · גילוי", v: p.statement || "—" },
  ];
}

// ממיין תבניות: עניין↓, ואז אימות↓ — אבל כולן נשארות (Rank, Don't Hide).
export function rankPatterns(patterns, pulseByValue = null) {
  return patterns
    .map(p => {
      const interest = interestScore(p, pulseByValue);
      const verified = verifiedScore(p);
      return { ...p, _interest: interest, _verified: verified, _tier: rankTier(p, interest) };
    })
    .sort((a, b) => (b._interest - a._interest) || (b._verified - a._verified) ||
      (new Date(b.temporal.created_at || 0) - new Date(a.temporal.created_at || 0)));
}
