import { getPublicResearchClient } from "./researchViewMode.js";
import { contributorSourceLocator } from "./worldContributorSourceLocator.js";

const ZVI_SOURCE_SLUG = "tzvi-opoc";

export const ZVI_MULTI_VALUE_SPECS = Object.freeze([
  Object.freeze({
    id: "06c22b3f-9988-460b-9888-516015e20e68",
    rank: 9,
    title: "1563 · שני ביטויים, יעד מספר עדיין חסר",
    values: Object.freeze([1563]),
    connectedValues: Object.freeze([]),
    groupKind: "missing_target",
    reason: "החישובים אומתו, אך אין כרגע יעד מספר 1563 קיים בעץ. לכן הממצא נשאר חזק ודורש בדיקה, בלי יצירת יעד מדומה.",
  }),
  Object.freeze({
    id: "38ac8d16-9bee-4292-97c6-b02b0eee8cf6",
    rank: 45,
    title: "86 · 18 · 68 — שלוש טענות באותה רשומה",
    values: Object.freeze([86, 18, 68]),
    connectedValues: Object.freeze([86, 18, 68]),
    groupKind: "split_required",
    reason: "כל אטום חישובי אומת, אבל הרשומה מכילה שלושה יעדים שונים. היא אינה מוצמדת בכוח למספר יחיד.",
  }),
  Object.freeze({
    id: "67350db7-c72c-4e60-9a22-9b98f7aace6c",
    rank: 74,
    title: "1372 · 686 — שתי טענות באותה רשומה",
    values: Object.freeze([1372, 686]),
    connectedValues: Object.freeze([1372, 686]),
    groupKind: "split_required",
    reason: "שני החישובים אומתו, אך לכל אחד יעד מספר אחר. נדרש פיצול לפני חיבור קנוני לעץ.",
  }),
  Object.freeze({
    id: "d20f0e7b-6abb-4a1b-89e7-0dddcac5697f",
    rank: 146,
    title: "משפחת 580 — גרעין משותף עם שורה ייחודית",
    values: Object.freeze([580]),
    connectedValues: Object.freeze([580]),
    groupKind: "partial_overlap",
    reason: "הערכים אומתו, אך קיימת חפיפה חלקית עם ממצא אחר וגם תוכן ייחודי. יש לפצל בלי למחוק מקור או תוכן.",
  }),
  Object.freeze({
    id: "e9b915dd-4f08-4021-82e8-09fa7054a7a6",
    rank: 160,
    title: "271 · 276 — שתי טענות באותה רשומה",
    values: Object.freeze([271, 276]),
    connectedValues: Object.freeze([271, 276]),
    groupKind: "split_required",
    reason: "שני החישובים אומתו, אך הרשומה הרב־ערכית אינה יעד עץ יחיד. נדרש פיצול לפני חיבור.",
  }),
]);

const SPEC_BY_ID = new Map(ZVI_MULTI_VALUE_SPECS.map((item) => [item.id, item]));

export function buildZviMultiValueWorldProjection(rows = []) {
  const cards = (Array.isArray(rows) ? rows : [])
    .filter((row) => SPEC_BY_ID.has(String(row?.id || "")))
    .filter((row) => String(row?.privacy_scope || "").trim() === "public")
    .map((row) => {
      const spec = SPEC_BY_ID.get(String(row.id));
      return {
        id: String(row.id),
        rank: spec.rank,
        title: spec.title,
        statement: String(row.statement || "").trim(),
        terms: Array.isArray(row.terms) ? row.terms : [],
        values: [...spec.values],
        targets: spec.connectedValues.map((value) => ({ value, href: `/2029/number/${value}` })),
        groupKind: spec.groupKind,
        source: contributorSourceLocator(row.source_ref, { slug: ZVI_SOURCE_SLUG }),
        review: {
          connectionStrength: "חזק",
          recommendation: "דורש בדיקה",
          evidenceQuality: row.engine_verified === true ? "אימות מנוע מפורש" : "אין נתון",
          publicationState: String(row.status || "").trim() || "אין נתון",
          privacyState: "public",
          independentSourceCount: null,
          occurrenceCount: row.source_ref ? 1 : 0,
          reason: spec.reason,
        },
      };
    })
    .sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id));

  return {
    id: "zvi-multi-value-world-v1",
    title: "ממצאי צבי חזקים שממתינים לפיצול או ליעד",
    description: "החישוב עבר, אבל רשומה רב־ערכית אינה מוצמדת למספר יחיד. כל יעד קיים נפתח בנפרד; מקור חסר נשאר מסומן.",
    cards,
    counts: {
      findings: cards.length,
      exactSourceOccurrences: cards.reduce((sum, card) => sum + card.review.occurrenceCount, 0),
      independentSources: null,
      missingTargets: cards.filter((card) => card.groupKind === "missing_target").length,
      splitRequired: cards.filter((card) => card.groupKind !== "missing_target").length,
    },
    rules: {
      occurrencesAreNotIndependentSources: true,
      noSingleTargetForMultiValueRecord: true,
      noDeletionOrMerge: true,
    },
  };
}

export async function fetchZviMultiValueWorldProjection({ publicClient = getPublicResearchClient } = {}) {
  try {
    const client = publicClient();
    const { data, error } = await client
      .from("world_contributor_research_v1")
      .select("id,statement,terms,value,source_ref,contributor,engine_verified,status,privacy_scope")
      .in("id", ZVI_MULTI_VALUE_SPECS.map((item) => item.id));
    if (error) throw error;
    return { ...buildZviMultiValueWorldProjection(data), access: { available: true, reader: "public_rls" } };
  } catch (_) {
    return {
      ...buildZviMultiValueWorldProjection([]),
      counts: { findings: null, exactSourceOccurrences: null, independentSources: null, missingTargets: null, splitRequired: null },
      access: { available: false, reader: "public_rls" },
    };
  }
}
