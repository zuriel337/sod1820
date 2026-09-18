export const GOLDEN_WORLD_JOURNEY_878 = Object.freeze({
  id: "golden:878:v1",
  kind: "golden",
  rootValue: 878,
  label: "מסע 878",
});

const clean = (value) => value == null ? "" : String(value).trim();
const safeInt = (value) => {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
};

function safePublicJourneyMap(raw) {
  const map = raw?.map;
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  return Object.freeze({
    root: safeInt(map.root),
    primaryValue: safeInt(map.primary_value),
    familyValues: Object.freeze((Array.isArray(map.family_values) ? map.family_values : []).map(safeInt).filter((v) => v != null)),
    hebrewTerms: Object.freeze((Array.isArray(map.hebrew_terms) ? map.hebrew_terms : []).map(clean).filter(Boolean)),
    methods: Object.freeze((Array.isArray(map.methods) ? map.methods : []).map(clean).filter(Boolean)),
    evidenceCount: Number.isFinite(Number(map.evidence_count)) ? Number(map.evidence_count) : null,
  });
}

function firstTargetValue(row, rootValue) {
  const highlighted = Array.isArray(row?.highlight_numbers) ? row.highlight_numbers : [];
  const numbers = Array.isArray(row?.numbers) ? row.numbers : [];
  const candidate = [...highlighted, ...numbers]
    .map(safeInt)
    .find((value) => value != null && value !== rootValue);
  return candidate ?? null;
}

export function projectGoldenJourney878({
  topicRows = [],
  numberJourney = null,
} = {}) {
  const rootValue = GOLDEN_WORLD_JOURNEY_878.rootValue;
  const seenTargets = new Set();
  const paths = [];

  for (const row of Array.isArray(topicRows) ? topicRows : []) {
    const targetValue = firstTargetValue(row, rootValue);
    const slug = clean(row?.slug);
    if (!slug || targetValue == null || seenTargets.has(targetValue)) continue;
    seenTargets.add(targetValue);
    paths.push(Object.freeze({
      id: `878:${slug}:${targetValue}`,
      meetingSlug: slug,
      meetingTitle: clean(row?.title) || `מפגש ${targetValue}`,
      meetingSubtitle: clean(row?.subtitle) || null,
      targetValue,
      meterScore: Number.isFinite(Number(row?.meter_score)) ? Number(row.meter_score) : null,
      quality: Number.isFinite(Number(row?.quality)) ? Number(row.quality) : null,
      source: "topic_cards_public",
    }));
    if (paths.length >= 5) break;
  }

  return Object.freeze({
    ...GOLDEN_WORLD_JOURNEY_878,
    title: "מסע 878",
    subtitle: "878 הוא העוגן. מכאן נפתחים מפגשים שכבר מקשרים אותו למספרים אחרים.",
    paths: Object.freeze(paths),
    map: safePublicJourneyMap(numberJourney),
    source: Object.freeze({
      meetings: "topic_cards_public:number=878",
      numericMap: "fn_number_journey:public-safe-projection",
    }),
    truthNote: "המסע מציג נתיבים קיימים; הוא אינו קובע שהמסלול הוא אמת או מסקנה.",
  });
}

export async function fetchGoldenWorldJourney878() {
  const [{ supabase }, { fetchTopicCardList }] = await Promise.all([
    import("../supabase.js"),
    import("./topicConvergence.js"),
  ]);
  const [topics, journey] = await Promise.all([
    fetchTopicCardList({
      number: GOLDEN_WORLD_JOURNEY_878.rootValue,
      limit: 12,
      offset: 0,
      rankByMeterScore: true,
    }),
    supabase.rpc("fn_number_journey", { p_value: GOLDEN_WORLD_JOURNEY_878.rootValue }),
  ]);
  if (journey.error) throw journey.error;

  return projectGoldenJourney878({
    topicRows: topics?.rows || [],
    // Even an admin caller may receive internal root/branch/seed fields from this RPC.
    // projectGoldenJourney878 reads ONLY the safe derived map and discards everything else.
    numberJourney: journey.data || null,
  });
}
