// 🔖 Identity Resolver (READ-ONLY) — CC-1.2 · ממפה מחרוזת-מחבר-גולמית ל-contributor קנוני.
// עיקרון provenance_law: **אין ניחוש זהות ואין מיזוג-אליאס אוטומטי.**
//   • אין התאמה / כמה התאמות → UNKNOWN (השם המקורי נשמר, לא נבחר contributor).
//   • aliases ממוזגים אך ורק דרך contributors.merged_into (Human-Gate של צוריאל).
// ⛔ קורא-בלבד: אין WRITE, אין schema. עובד מול אינדקס-contributors שנשלף ב-getContributorsIndex().

const norm = (s) => String(s || "").trim().replace(/\s+/g, " ").toLowerCase();

// בונה אינדקס-חיפוש מרשומות contributors (id, slug, display_name, wa_names[], merged_into, vip).
// alias: מחרוזת-מנורמלת → Set(contributor id) — מזהה גם התאמה-מרובה (→ ambiguous).
export function buildWriterIndex(rows = []) {
  const byId = new Map();
  const bySlug = new Map();
  const alias = new Map();
  for (const r of rows) {
    byId.set(r.id, r);
    if (r.slug) {
      if (!bySlug.has(r.slug)) bySlug.set(r.slug, new Set());
      bySlug.get(r.slug).add(r.id);
    }
  }
  for (const r of rows) {
    const keys = [r.display_name, r.slug, ...(Array.isArray(r.wa_names) ? r.wa_names : [])];
    for (const k of keys) {
      const n = norm(k);
      if (!n) continue;
      if (!alias.has(n)) alias.set(n, new Set());
      alias.get(n).add(r.id);
    }
  }
  return { byId, bySlug, alias };
}

// עוקב merged_into עד הישות הקנונית (הגנת-מעגל). מחזיר את ה-contributor הקנוני.
function canonicalOf(id, { byId, bySlug }) {
  const seen = new Set();
  let cur = byId.get(id);
  while (cur && cur.merged_into) {
    if (seen.has(cur.id)) return null;
    seen.add(cur.id);
    // Native ContributorPage uses slugs; retain historical UUID references.
    // Never select one interpretation of a colliding pointer arbitrarily.
    const targets = new Set(bySlug?.get(cur.merged_into) || []);
    if (byId.has(cur.merged_into)) targets.add(cur.merged_into);
    if (targets.size !== 1) return null;
    const next = byId.get([...targets][0]);
    if (!next || next.active === false) return null;
    cur = next;
  }
  return cur || byId.get(id) || null;
}

// resolveWriter(raw, index) → מצב-זהות. **לא בוחר אוטומטית בעמימות.**
// state: 'matched' (התאמה אחת) · 'ambiguous' (כמה) · 'unknown' (אין/ריק).
// mergedFrom: אם ההתאמה ממוזגת — הישות-המקורית (לשמירת provenance של השם).
export function resolveWriter(raw, index) {
  const rawStr = String(raw || "").trim();
  const n = norm(rawStr);
  const empty = { state: "unknown", raw: rawStr, contributor: null, canonical: null, mergedFrom: null, candidates: [] };
  if (!n || !index || !index.alias) return empty;
  const ids = index.alias.get(n);
  if (!ids || ids.size === 0) return empty;
  if (ids.size > 1) {
    const candidates = [...ids].map((id) => index.byId.get(id)).filter(Boolean);
    return { state: "ambiguous", raw: rawStr, contributor: null, canonical: null, mergedFrom: null, candidates };
  }
  const id = [...ids][0];
  const matched = index.byId.get(id) || null;
  const canonical = canonicalOf(id, index);
  if (!canonical) return { ...empty, candidates: matched ? [matched] : [] };
  const mergedFrom = canonical && matched && canonical.id !== matched.id ? matched : null;
  return { state: "matched", raw: rawStr, contributor: matched, canonical, mergedFrom, candidates: [] };
}

// תווית-אנוש לתצוגה (לא מכריעה כלום — רק מציגה את מצב-הזהות).
export const WRITER_STATE = {
  matched: { t: "✓ מזוהה", c: "#4caf7d" },
  ambiguous: { t: "⚠️ כמה התאמות", c: "#c79a2e" },
  unknown: { t: "❔ לא-מזוהה", c: "#8a8a95" },
};
