import { isPost2029OnlyReleased } from "./publicPostBoundary.js";

const clean = (value) => value == null ? "" : String(value).trim();

// Approved series identities from PLAN37 decisions DEC-SERIES-003/004/005/006.
// This is a bounded presentation contract over the existing public posts boundary,
// not a registry, taxonomy, store or publication authority. Topic/channel identities
// (for example הצופן בסרטים and אור הגאולה) intentionally do not become series here.
export const CONTENT_SERIES_2029 = Object.freeze([
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

// Explicit Human-Gated 2029-only editorial release can admit an unattributed
// source into the Dimension Five stream without falsely assigning its creator
// or modifying the approved publisher identity of that series.
export function hasExactSeriesPublisher2029(row, spec) {
  return !spec?.exactAuthor || row?.author === spec.exactAuthor
    || (spec.key === "dimension-five" && hasExactMembership(row, spec) && isPost2029OnlyReleased(row));
}

export function contentSeriesKeysForPost(row) {
  return CONTENT_SERIES_2029.filter(spec => hasExactMembership(row, spec)
    && hasExactSeriesPublisher2029(row, spec)).map(spec => spec.key);
}
