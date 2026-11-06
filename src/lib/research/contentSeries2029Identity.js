const clean = (value) => value == null ? "" : String(value).trim();

// Approved series identities from PLAN37 decisions DEC-SERIES-003/004/005/006.
// This is a bounded presentation contract over the existing public posts boundary,
// not a registry, taxonomy, store or publication authority. Topic/channel identities
// (for example הצופן בסרטים and אור הגאולה) intentionally do not become series here.
export const CONTENT_SERIES_2029 = Object.freeze([
  // מפת המציאות — the primary series (ZURIEL series & Home plan, 6.11.2026, stage 1). It is FIRST so every consumer
  // that reads this list in order (Home, Posts entrances, search) shows it first; the relative order of the other
  // series is unchanged. Membership is the exact tag only: no category, author, family or channel admits an item,
  // and no existing Post is assigned by this entry. families (סוד 1820, הצופן בסרטים, שבילי שפה, תכני גאולה) are a
  // reserved future split and are NOT represented here. "רמזים חזקים" stays a cross-cutting category (not a series
  // and not a hints-pane admission). decisionId stays pending until PLAN37 records the decision (a DB write that
  // needs explicit approval); nothing here writes or reads PLAN37.
  Object.freeze({
    key: "reality-map",
    label: "מפת המציאות",
    decisionId: "PENDING-PLAN37-DECISION",
    writerLabel: null,
    publisherLabel: null,
    priorityLane: "primary",
    membership: Object.freeze([
      Object.freeze({ field: "tags", value: "מפת המציאות" }),
    ]),
    exactAuthor: null,
    relationNote: "הסדרה הראשית: מחקרים, צפנים ותגליות. חברות רק מהתגית המדויקת; אינה חלונית רמזים, אינה גרף הקשרים ואינה זרם המציאות.",
    // Home sample. Shown only while approval is explicit; the quote is verbatim from the source Post (read live 6.11.2026,
    // post 5018) and is the Post's own claim, not an SOD1820 computation (English ordinal is not in the method registry).
    // It links to the source Post and does NOT make that Post a member of the series.
    teaser: Object.freeze({
      approval: Object.freeze({
        status: "approved",
        decisionRef: "ZURIEL/20261106/series-home-plan-stage1",
        scope: "שבילי שפה · בראשית באנגלית (דוגמית בית). אישור סופי של הנוסח נדרש לפני פרסום.",
      }),
      sourceRef: "posts:5018",
      sourcePost: Object.freeze({ id: 5018, slug: "chibur-bein-hasafot-mafteach-lagan", source: "ai", wp_id: 36960 }),
      sourceTitle: "שבילי שפה — חיבור בן שפות",
      highlight: "Bereshit = 86",
      text: "באנגלית מחשבים בפשטות: כל אות לפי מקומה באלף-בית — A=1, B=2, C=3 … Z=26 — ומחברים. Bereshit = 86",
      methodNote: "חישוב כפי שמופיע בפוסט המקור",
    }),
  }),
  Object.freeze({
    key: "mah-kore-habora",
    label: "מה קורה הבורא",
    decisionId: "DEC-SERIES-005",
    writerLabel: "אלון לוי",
    publisherLabel: null,
    priorityLane: "supporting_series",
    membership: Object.freeze([
      Object.freeze({ field: "tags", value: "מה קורה הבורא" }),
    ]),
    exactAuthor: "אלון לוי",
    relationNote: "אלון לוי הוא הכתב; חברות בסדרה נקבעת רק מהתגית המדויקת, לא מכל חומריו.",
  }),
  Object.freeze({
    key: "dimension-five",
    label: "מימד חמש",
    decisionId: "DEC-SERIES-003+006",
    writerLabel: null,
    publisherLabel: "בדרך לנצח",
    priorityLane: "second_ring",
    membership: Object.freeze([
      Object.freeze({ field: "categories", value: "מימד חמש" }),
    ]),
    exactAuthor: "בדרך לנצח",
    relationNote: "סדרת תודעה של בדרך לנצח; טקסט, אודיו ווידאו מותרים. פריטים של מפרסם אחר נשארים לבדיקת מיפוי.",
  }),
  Object.freeze({
    key: "sod-hashmal",
    label: "סוד החשמל",
    decisionId: "DEC-SERIES-004",
    writerLabel: null,
    publisherLabel: "סוד החשמל",
    priorityLane: "second_ring",
    membership: Object.freeze([
      Object.freeze({ field: "categories", value: "סוד החשמל" }),
      Object.freeze({ field: "tags", value: "סוד החשמל" }),
    ]),
    exactAuthor: null,
    relationNote: "מקור/מפרסם וסדרת פרסומים הם שני תפקידים מקושרים. חברות בסדרה אינה ממציאה מחבר לפריט.",
  }),
  Object.freeze({
    key: "messages-from-righteous",
    label: "מסרים מצדיקים",
    decisionId: "CONTENT-AUDIENCES-HYBRID-NOW-20261102/SERIES-01",
    writerLabel: null,
    publisherLabel: null,
    priorityLane: "second_ring",
    membership: Object.freeze([
      Object.freeze({ field: "categories", value: "מסרים מצדיקים" }),
      Object.freeze({ field: "categories", value: "רמזים מצדיקים" }),
    ]),
    // ZURIEL approved this one existing public occurrence after reviewing the
    // immutable 8f8876f7 proposal. Reading association only: no publication,
    // channel-wide classification, inferred topical approval or Follow release.
    approvedSources: Object.freeze([
      Object.freeze({
        sourceRef: "channel_updates:9d4e6b80-f52b-4461-9231-ca30f37f0db9",
        channel: "or-geula",
        publicAssetId: "25e378462b55298219e5f7562698bfa7",
        decisionRef: "ZURIEL/20261102/8f8876f7",
      }),
    ]),
    exactAuthor: null,
    relationNote: "סדרה משותפת. אור הגאולה נשאר מקור; עדכונים ממנו מצטרפים רק לאחר אישור ושיוך לפריט, לא מכוח שם הערוץ.",
  }),
]);

function postgrestValue(value) {
  return clean(value).replace(/["\\]/g, "");
}

export function contentSeriesMembershipFilter(spec) {
  return (Array.isArray(spec?.membership) ? spec.membership : [])
    .map(({ field, value }) => {
      const safeField = field === "tags" || field === "categories" ? field : null;
      const safeValue = postgrestValue(value);
      return safeField && safeValue ? `${safeField}.cs.{"${safeValue}"}` : null;
    })
    .filter(Boolean)
    .join(",");
}

export function hasExactMembership(row, spec) {
  return (Array.isArray(spec?.membership) ? spec.membership : []).some(({ field, value }) => (
    Array.isArray(row?.[field]) && row[field].includes(value)
  ));
}


export function contentSeriesByKey(key) {
  return CONTENT_SERIES_2029.find(spec => spec.key === key) || null;
}

export function contentSeriesKeysForPost(row) {
  return CONTENT_SERIES_2029.filter(spec => hasExactMembership(row, spec)
    && (!spec.exactAuthor || row?.author === spec.exactAuthor)).map(spec => spec.key);
}
