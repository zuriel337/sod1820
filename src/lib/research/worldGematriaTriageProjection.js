const clean = (value) => value == null ? "" : String(value).trim();

export const WORLD_GEMATRIA_METHOD_COLUMNS = Object.freeze([
  Object.freeze({ key: "ragil", label: "רגיל" }),
  Object.freeze({ key: "misratar", label: "מסתתר" }),
  Object.freeze({ key: "miluy", label: "מילוי" }),
  Object.freeze({ key: "kadmi", label: "קדמי" }),
  Object.freeze({ key: "gadol", label: "גדול" }),
  Object.freeze({ key: "siduri", label: "סידורי" }),
  Object.freeze({ key: "atbash", label: "אתבש" }),
  Object.freeze({ key: "albam", label: "אלבם" }),
  Object.freeze({ key: "miluy_demiluy", label: "מילוי דמילוי" }),
  Object.freeze({ key: "kadmi_gadol", label: "משולש גדול" }),
  Object.freeze({ key: "ribua", label: "ריבוע" }),
  Object.freeze({ key: "ribua_gadol", label: "ריבוע גדול" }),
  Object.freeze({ key: "hakpala", label: "הכפלה" }),
  Object.freeze({ key: "hakpala_gadol", label: "הכפלה גדולה" }),
]);

// Read-only snapshot identifiers. They annotate exact phrase duplicates and the one
// publication-axis exception found on 2026-10-26; they never merge or update rows.
export const WORLD_GEMATRIA_DUPLICATE_GROUPS = Object.freeze([
  Object.freeze(["1d5b44b7-661e-4d11-a347-a292dd635740", "2a3a3c6e-b870-4b46-9b33-bbbce4d427d6"]),
  Object.freeze(["26807860-1105-467d-a515-ef4fac76608d", "65969756-78f1-4c34-8d35-04fa82e4d06f"]),
]);
export const WORLD_GEMATRIA_UNVERIFIED_PUBLISHED_IDS = Object.freeze([
  "89b7e290-419a-4825-94a0-c9261fc9c09d",
]);

export const WORLD_GEMATRIA_REVIEW_SUMMARY = Object.freeze({
  capturedAt: "2026-10-26",
  total: 15592,
  unverified: 2894,
  deterministicReady: 1514,
  outsideCleanHebrew: 1380,
  containsDigits: 1122,
  containsLatin: 4,
  outsideDigits: 1122,
  outsidePunctuation: 121,
  outsideDelta: 81,
  outsideDiacritics: 29,
  outsideMathOperators: 24,
  outsideLatinExclusive: 3,
  outsideMissingMethods: 1374,
  outsideCompleteMethods: 6,
  cleanEngineMismatches: 0,
  encryptedUnverified: 2,
  duplicateGroups: 2,
  duplicateRows: 4,
  unverifiedPublished: 1,
  unverifiedMissingTags: 2184,
});

function cleanHebrewPhrase(value) {
  return /^[א-ת]+(?: [א-ת]+)*$/u.test(clean(value));
}

function inputSignals(value) {
  const phrase = clean(value);
  const cleanHebrew = cleanHebrewPhrase(phrase);
  const containsDigits = /[0-9]/u.test(phrase);
  const containsLatin = /[A-Za-z]/u.test(phrase);
  const containsDiacritics = /\p{M}/u.test(phrase);
  const containsMathOperators = /[=+*/×÷]/u.test(phrase);
  const containsDelta = /∆/u.test(phrase);
  const containsPunctuation = /[־׳״'"“”‘’.,:;!?()[\]{}_\-–—]/u.test(phrase);
  const inputClass = cleanHebrew
    ? "clean_hebrew"
    : containsDigits
      ? "contains_digits"
      : containsLatin
        ? "contains_latin"
        : containsDiacritics
          ? "hebrew_diacritics"
          : containsMathOperators
            ? "math_expression"
            : containsPunctuation
              ? "punctuation"
              : containsDelta
                ? "delta_expression"
                : "other_or_spacing";
  return Object.freeze({
    cleanHebrew,
    containsDigits,
    containsLatin,
    containsDiacritics,
    containsMathOperators,
    containsDelta,
    containsPunctuation,
    containsOtherGlyphs: /[^א-ת ]/u.test(phrase),
    inputClass,
  });
}

function duplicateLookup(groups) {
  const lookup = new Map();
  for (const ids of groups || []) {
    const group = (Array.isArray(ids) ? ids : []).map(clean).filter(Boolean);
    for (const id of group) lookup.set(id, group);
  }
  return lookup;
}

export function projectWorldGematriaReviewRows(rows = [], {
  integrityRows = [],
  integrityAvailable = true,
  duplicateGroups = WORLD_GEMATRIA_DUPLICATE_GROUPS,
  publishedExceptionIds = WORLD_GEMATRIA_UNVERIFIED_PUBLISHED_IDS,
} = {}) {
  const mismatches = new Map();
  for (const mismatch of Array.isArray(integrityRows) ? integrityRows : []) {
    const id = clean(mismatch?.id);
    if (!id) continue;
    const list = mismatches.get(id) || [];
    list.push(Object.freeze({
      method: clean(mismatch?.method) || "שיטה לא צוינה",
      stored: mismatch?.stored ?? null,
      engine: mismatch?.engine ?? null,
    }));
    mismatches.set(id, list);
  }
  const duplicates = duplicateLookup(duplicateGroups);
  const publishedExceptions = new Set((publishedExceptionIds || []).map(clean));

  return Object.freeze((Array.isArray(rows) ? rows : []).map((row) => {
    const id = clean(row?.id);
    const signals = inputSignals(row?.phrase);
    const missingMethods = WORLD_GEMATRIA_METHOD_COLUMNS
      .filter(({ key }) => row?.[key] == null)
      .map(({ label }) => label);
    const methodMismatches = mismatches.get(id) || [];
    const integrityState = !integrityAvailable
      ? "integrity_unavailable"
      : !signals.cleanHebrew
        ? "outside_clean_hebrew"
        : missingMethods.length
          ? "missing_method_values"
          : methodMismatches.length
            ? "engine_mismatch"
            : "engine_parity_ready";
    const recommendations = {
      integrity_unavailable: "שער האימות אינו זמין; אין להסיק התאמה או לקדם את הרשומה.",
      outside_clean_hebrew: "דורש בדיקת כתיב ומקור לפני בדיקת מנוע; הביטוי מחוץ לגבול העברית הנקייה.",
      missing_method_values: "דורש השלמת ערכי השיטות השמורים לפני בדיקת התאמה מלאה.",
      engine_mismatch: "נמצאה אי־התאמה לערך המנוע; להשאיר לבדיקה ולא לפרסם כאימות.",
      engine_parity_ready: "כל 14 הערכים השמורים תואמים לשער המנוע; מוכן להחלטת אימות מבוקרת, לא לקידום אוטומטי.",
    };
    const outsideRecommendations = {
      contains_digits: "זהו ביטוי מספרי או מורכב, לא מילת מקור נקייה. להעביר לבדיקת ביטוי וחיבור למקור לפני חישוב מילוני.",
      contains_latin: "להעביר לתור שפה או תעתיק; מנוע העברית אינו מאמת רכיב לטיני.",
      hebrew_diacritics: "לשמור את הכתיב המנוקד כמקור וליצור צורת חישוב מנורמלת רק לפי חוזה השיטות.",
      math_expression: "זהו ביטוי חישובי. לפרק לאופרנדים ולפעולה מאומתת במקום לשמור כמילה אחת.",
      punctuation: "דורש בדיקת תעתיק ופיסוק מול המקור לפני נרמול; אין להסיר סימנים אוטומטית.",
      delta_expression: "זהו ביטוי הפרש Δ. להעביר למסלול יחסים מספריים ולא לאמת כמילת גימטריה.",
      other_or_spacing: "דורש בדיקת כתיב ומקור לפני בדיקת מנוע.",
    };
    const duplicateGroupIds = duplicates.get(id) || [];
    const encrypted = row?.is_encrypted === true;
    const publicationWarning = row?.is_published === true || publishedExceptions.has(id);
    return Object.freeze({
      id,
      sourceRef: id ? `gematria_words:${id}` : null,
      phrase: encrypted ? null : clean(row?.phrase) || null,
      displayPhrase: encrypted ? clean(row?.phrase_hint) || "ביטוי מוצפן" : clean(row?.phrase) || "ביטוי לא צוין",
      encrypted,
      regularValue: row?.ragil ?? null,
      category: clean(row?.category) || null,
      source: clean(row?.source) || null,
      createdAt: row?.created_at || null,
      updatedAt: row?.updated_at || null,
      nodeId: clean(row?.node_id) || null,
      tagCount: Array.isArray(row?.tags) ? row.tags.filter(Boolean).length : 0,
      unverifiedReason: clean(row?.unverified_reason) || null,
      isVerified: row?.is_verified === true,
      isPublished: row?.is_published === true,
      publicationWarning,
      inputSignals: signals,
      missingMethods: Object.freeze(missingMethods),
      mismatches: Object.freeze(methodMismatches),
      integrityState,
      duplicateGroupIds: Object.freeze(duplicateGroupIds),
      duplicateOccurrenceCount: Math.max(0, duplicateGroupIds.length - 1),
      independentSourceCount: duplicateGroupIds.length > 1 ? null : 1,
      recommendation: integrityState === "outside_clean_hebrew"
        ? outsideRecommendations[signals.inputClass]
        : recommendations[integrityState],
    });
  }));
}
