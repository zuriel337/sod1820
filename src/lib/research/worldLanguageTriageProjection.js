import { getLanguageLinks } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();

export function projectWorldLanguageTriageRows(rows = []) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    const id = clean(row?.id);
    const hebrew = clean(row?.hebrew);
    const foreignWord = clean(row?.foreign_word);
    const language = clean(row?.lang) || "לא צוין";
    const relationshipType = clean(row?.relationship_type) || "לא צוין";
    const approved = clean(row?.status) === "approved";
    const humanVerified = row?.human_verified === true;
    return Object.freeze({
      id,
      sourceRef: id ? `language_links:${id}` : null,
      hebrew: hebrew || "מונח עברי לא צוין",
      foreignWord: foreignWord || "מונח לועזי לא צוין",
      language,
      relationshipType,
      gematriaHebrew: Number.isFinite(Number(row?.gematria_he)) ? Number(row.gematria_he) : null,
      method: clean(row?.method) || null,
      evidenceLevel: clean(row?.evidence_level) || null,
      translationSource: clean(row?.translation_source) || null,
      note: clean(row?.note) || null,
      status: clean(row?.status) || "לא צוין",
      approved,
      humanVerified,
      reviewedAt: row?.reviewed_at || null,
      state: approved && humanVerified ? "verified" : "needs_human_review",
      recommendation: approved && humanVerified
        ? "הקשר יכול להישאר בגשר השפה; החישוב והמשמעות ממשיכים להיות צירים נפרדים."
        : "דורש אימות אנושי של התרגום והקשר לפני הצגתו כגשר מאומת.",
    });
  });
  const byId = new Map(normalized.filter((row) => row.id).map((row) => [row.id, row]));
  const unique = [...byId.values()];
  const signatures = new Map();
  for (const row of unique) {
    const signature = [row.hebrew, row.foreignWord, row.language, row.relationshipType]
      .map((value) => clean(value).toLocaleLowerCase()).join("|");
    const ids = signatures.get(signature) || [];
    ids.push(row.id);
    signatures.set(signature, ids);
  }
  const duplicateGroups = [...signatures.values()].filter((ids) => ids.length > 1);
  unique.sort((left, right) => Number(left.humanVerified) - Number(right.humanVerified)
    || left.hebrew.localeCompare(right.hebrew, "he")
    || left.id.localeCompare(right.id));
  return Object.freeze({
    rows: Object.freeze(unique),
    counts: Object.freeze({
      total: unique.length,
      approved: unique.filter((row) => row.approved).length,
      humanVerified: unique.filter((row) => row.humanVerified).length,
      needsHumanReview: unique.filter((row) => !row.humanVerified).length,
      missingTranslationSource: unique.filter((row) => !row.translationSource).length,
      duplicateGroups: duplicateGroups.length,
    }),
    duplicateGroups: Object.freeze(duplicateGroups.map((ids) => Object.freeze(ids))),
    rules: Object.freeze({
      noIdentityGuessing: true,
      translationIsSeparateFromNumericEquality: true,
      interpretationIsSeparateFromCalculation: true,
      noAutomaticApproval: true,
    }),
  });
}

export async function fetchWorldLanguageTriageProjection({ reader = getLanguageLinks } = {}) {
  return projectWorldLanguageTriageRows(await reader(200));
}
