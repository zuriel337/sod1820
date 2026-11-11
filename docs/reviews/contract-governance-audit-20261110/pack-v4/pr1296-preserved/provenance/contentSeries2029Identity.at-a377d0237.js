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
    // Home display (ZURIEL 8.11.2026): an EXPLICIT item count per series, no uniform cap, inside a 90-day content window. The flagship
    // is membership by exact tag, so it has no window (its strong Posts stay however old); the others show only what is newer than 90 days.
    homeDisplay: Object.freeze({ limit: 6, windowDays: null }),
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
    // Home entrances to the future content families (ZURIEL 6.11.2026). They are LINKS to the existing source-category pages
    // ("סיווג במקור"), nothing more: no membership, no selector, no field, no assignment. A family without a category is shown
    // as "coming soon" and is not a link. "רמזים חזקים" stays a cross-cutting category, not a family and not a hints pane.
    families: Object.freeze([
      Object.freeze({ key: "sod-1820", label: "סוד 1820", note: "כולל ברכת כהנים", category: "סוד 1820" }),
      Object.freeze({ key: "movies-cipher", label: "הצופן בסרטים", note: "מטריקס · משחקי הדיונון", category: "הצופן בסרטים" }),
      Object.freeze({ key: "language-paths", label: "שבילי שפה", note: "חיבור בין שפות", category: "שבילי שפה" }),
      Object.freeze({ key: "redemption", label: "תכני גאולה", note: "בקרוב", category: null }),
    ]),
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
      sourceTitle: "שבילי שפה — חיבור בין שפות",
      // The Post's own letter-tile block (class "sgx"), verbatim: caption, tiles with their values, and the stated total.
      step: "גימטריה באנגלית · A=1 … Z=26",
      tiles: Object.freeze([["B", 2], ["E", 5], ["R", 18], ["E", 5], ["S", 19], ["H", 8], ["I", 9], ["T", 20]].map(tile => Object.freeze(tile))),
      total: 86,
      highlight: "Bereshit = 86",
      text: "באנגלית מחשבים בפשטות: כל אות לפי מקומה באלף-בית — A=1, B=2, C=3 … Z=26 — ומחברים. Bereshit = 86",
      methodNote: "חישוב כפי שמופיע בפוסט המקור",
    }),
  }),
  Object.freeze({
    key: "mah-kore-habora",
    homeDisplay: Object.freeze({ limit: 3, windowDays: 90 }), // ~8 Posts in the last 90 days: a short, fresh list
    label: "מה קורה הבורא",
    decisionId: "DEC-SERIES-005",
    writerLabel: "אלון לוי",
    publisherLabel: null,
    priorityLane: "supporting_series",
    membership: Object.freeze([Object.freeze({ field: "tags", value: "מה קורה הבורא" })]),
    exactAuthor: "אלון לוי",
    relationNote: "כל הפוסטים המזוהים עם אלון לוי שייכים לסדרה, גם ללא תגית; אין לשייך פוסטים של מחברים אחרים.",
  }),
  Object.freeze({
    key: "dimension-five",
    homeDisplay: Object.freeze({ limit: 4, windowDays: 90 }), // ~27 Posts in the last 90 days: the busiest series gets the most room
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
    homeDisplay: Object.freeze({ limit: 3, windowDays: 90 }), // ~6 Posts in the last 90 days
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
    homeDisplay: Object.freeze({ limit: 2, windowDays: 90 }), // ~2 Posts in the last 90 days (80 in all): two fresh ones, the rest in the series page
    // Public name "מסרים" (PLAN37 CONTENT-AUDIENCES-HYBRID-NOW-20261102: replaces the earlier public name everywhere; the key and
    // historical source titles are unchanged). It is also the name of an existing category, which stays followable on its own.
    label: "מסרים",
    shadowedCategories: Object.freeze([]),
    decisionId: "CONTENT-AUDIENCES-HYBRID-NOW-20261102/SERIES-01",
    writerLabel: null,
    publisherLabel: null,
    priorityLane: "second_ring",
    membership: Object.freeze([
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

// Category names a series visually replaces (shown once, as the series). Default: the series label. A series whose public
// name equals a live category that must stay independently followable (מסרים) declares an empty list.
export const seriesShadowedCategories = (spec) => Array.isArray(spec?.shadowedCategories) ? spec.shadowedCategories : [spec?.label];

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
  return CONTENT_SERIES_2029.filter(spec => (
    (spec.key === "mah-kore-habora" && row?.author === "אלון לוי") ||
    (spec.key === "dimension-five" && [5003, 5004].includes(Number(row?.id))) ||
    (hasExactMembership(row, spec) && (!spec.exactAuthor || row?.author === spec.exactAuthor))
  )).map(spec => spec.key);
}
