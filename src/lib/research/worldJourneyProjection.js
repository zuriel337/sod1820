import { canonicalResearchPublicLabel } from "../presentation/canonicalPresentation.js";
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

function firstTargetValue(row, rootValue) {
  const highlighted = Array.isArray(row?.highlight_numbers) ? row.highlight_numbers : [];
  const numbers = Array.isArray(row?.numbers) ? row.numbers : [];
  return [...highlighted, ...numbers]
    .map(safeInt)
    .find((value) => value != null && value !== rootValue) ?? null;
}

export function projectGoldenJourney878({ topicRows = [] } = {}) {
  const rootValue = GOLDEN_WORLD_JOURNEY_878.rootValue;
  const seenTargets = new Set();
  const paths = [];

  // topicRows arrive in the canonical public Topic list order (meter_score DESC → approved_at
  // DESC → id ASC). World preserves that order; it does not compute a Journey score.
  for (const row of Array.isArray(topicRows) ? topicRows : []) {
    const targetValue = firstTargetValue(row, rootValue);
    const slug = clean(row?.slug);
    if (!slug || targetValue == null || seenTargets.has(targetValue)) continue;
    seenTargets.add(targetValue);
    paths.push(Object.freeze({
      id: `878:${slug}:${targetValue}`,
      meetingSlug: slug,
      meetingTitle: clean(row?.title) || `${canonicalResearchPublicLabel("convergence")} ${targetValue}`,
      meetingSubtitle: clean(row?.subtitle) || null,
      targetValue,
      source: "topic_cards_public",
    }));
    if (paths.length >= 5) break;
  }

  return Object.freeze({
    ...GOLDEN_WORLD_JOURNEY_878,
    title: "מסע 878",
    subtitle: "878 הוא העוגן. מכאן נפתחות התכנסויות שכבר מקשרות אותו למספרים אחרים.",
    paths: Object.freeze(paths),
    source: Object.freeze({
      meetings: "topic_cards_public:number=878",
    }),
    truthNote: "המסע מציג נתיבים קיימים; הוא אינו קובע שהמסלול הוא אמת או מסקנה.",
  });
}

export async function fetchGoldenWorldJourney878() {
  // Dynamic import keeps the pure journey projector independent from browser/Supabase transport
  // in acceptance tests. The only public source used here is topic_cards_public via its canonical
  // Topic reader. We intentionally do NOT call fn_number_journey: its internal projection remains
  // a separate Number/Journey concern until that owner explicitly publishes it for this surface.
  const { fetchTopicCardList } = await import("./topicConvergence.js");
  const topics = await fetchTopicCardList({
    number: GOLDEN_WORLD_JOURNEY_878.rootValue,
    limit: 12,
    offset: 0,
    rankByMeterScore: true,
  });

  return projectGoldenJourney878({ topicRows: topics?.rows || [] });
}
