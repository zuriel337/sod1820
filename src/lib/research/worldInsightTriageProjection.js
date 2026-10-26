const clean = (value) => value == null ? "" : String(value).trim();
const LOCATOR_LIKE = /^(?:post:\d+|wp_id:\d+|wp\d+|\/|https?:\/\/|discovery:|matrix-|root:)/i;

export const WORLD_INSIGHT_DUPLICATE_GROUPS = Object.freeze([
  Object.freeze(["14489c9d-b132-416b-aef5-5c35b4617183", "c68bc9d0-a0e7-416e-b59e-6cd19824c0d7"]),
]);

export const WORLD_INSIGHT_REVIEW_SUMMARY = Object.freeze({
  capturedAt: "2026-10-26",
  total: 315,
  active: 293,
  inactive: 22,
  missingSourceRef: 235,
  locatorLikeSourceRef: 16,
  descriptiveSourceRef: 64,
  missingEvidence: 186,
  verified: 122,
  notVerified: 193,
  structurallyReady: 2,
  duplicateGroups: 1,
  duplicateRows: 2,
});

function duplicateLookup(groups) {
  const lookup = new Map();
  for (const ids of groups || []) {
    const group = (Array.isArray(ids) ? ids : []).map(clean).filter(Boolean);
    for (const id of group) lookup.set(id, group);
  }
  return lookup;
}

function sourceLocatorState(value) {
  const ref = clean(value);
  if (!ref) return "missing";
  if (LOCATOR_LIKE.test(ref)) return "locator_like";
  return "descriptive_only";
}

function safeSourceHref(value) {
  const ref = clean(value);
  if (/^https:\/\/[^\s]+$/i.test(ref)) return ref;
  if (/^\/[\p{L}\p{N}%_./-]+$/u.test(ref)) return ref;
  return null;
}

export function projectWorldInsightReviewRows(rows = [], { duplicateGroups = WORLD_INSIGHT_DUPLICATE_GROUPS } = {}) {
  const duplicates = duplicateLookup(duplicateGroups);
  return Object.freeze((Array.isArray(rows) ? rows : []).map((row) => {
    const id = clean(row?.id);
    const locatorState = sourceLocatorState(row?.source_ref);
    const evidenceLevel = row?.evidence_level == null ? null : Number(row.evidence_level);
    const active = row?.is_active === true;
    const verified = row?.verified === true;
    const sourceReady = locatorState === "locator_like";
    const structurallyReady = active && verified && evidenceLevel != null && sourceReady;
    const duplicateGroupIds = duplicates.get(id) || [];
    let state = "ready_for_connection_review";
    if (!active) state = "inactive";
    else if (!sourceReady) state = locatorState === "missing" ? "missing_source" : "descriptive_source";
    else if (evidenceLevel == null) state = "missing_evidence";
    else if (!verified) state = "not_verified";
    const recommendations = {
      inactive: "להשאיר מחוץ לעדשה הפעילה עד להחלטת ממשל מפורשת.",
      missing_source: "דורש קישור למקור מדויק לפני הצגה כממצא מבוסס.",
      descriptive_source: "תיאור המקור נשמר, אך דרוש locator מדויק שניתן לפתוח.",
      missing_evidence: "דורש רמת ראיות נפרדת; מקור קיים אינו מחליף הערכת ראיות.",
      not_verified: "דורש בדיקת אימות; פעילות ורמת ראיות אינן אימות.",
      ready_for_connection_review: "שלם מבחינה מבנית ומוכן לבדיקת חיבור מבוקרת; אין קידום אוטומטי לעץ.",
    };
    return Object.freeze({
      id,
      sourceRef: id ? `insights:${id}` : null,
      title: clean(row?.title) || "תובנה ללא כותרת",
      summary: clean(row?.body).slice(0, 600) || null,
      sourceType: clean(row?.source_type) || null,
      storedSourceRef: clean(row?.source_ref) || null,
      sourceHref: safeSourceHref(row?.source_ref),
      sourceLocatorState: locatorState,
      active,
      verified,
      evidenceLevel: Number.isFinite(evidenceLevel) ? evidenceLevel : null,
      proofPresent: Boolean(clean(row?.proof)),
      proofMethod: clean(row?.proof_method) || null,
      space: clean(row?.space) || null,
      category: clean(row?.category) || null,
      relatedNumbers: Object.freeze(Array.isArray(row?.related_numbers) ? row.related_numbers.filter(Number.isFinite) : []),
      relatedPhrasesCount: Array.isArray(row?.related_phrases) ? row.related_phrases.filter(Boolean).length : 0,
      tagCount: Array.isArray(row?.tags) ? row.tags.filter(Boolean).length : 0,
      createdAt: row?.created_at || null,
      updatedAt: row?.updated_at || null,
      state,
      structurallyReady,
      duplicateGroupIds: Object.freeze(duplicateGroupIds),
      duplicateOccurrenceCount: Math.max(0, duplicateGroupIds.length - 1),
      recommendation: recommendations[state],
    });
  }));
}
