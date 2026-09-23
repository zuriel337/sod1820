import { OPENING_COVERAGE_STATUS, OPENING_TOTAL_STATUS } from "../../lib/research/gematriaOpeningOperation.js";

// HEICHAL_GEMATRIA_OPENING_UI_WIRING_V1 -- pure view-model helpers for the Heichal 2029 opening
// projection. No Gematria math lives here: every number these helpers touch already comes off a
// gematriaOpeningOperation methodRow (canonical engine sum). This module only decides how to
// *group* and *label* that data so the honest coverage/total semantics the adapter already proved
// (see gematriaOpeningOperation.js) survive into the UI without being flattened into a fabricated
// number or a silent blank.

const TOTAL_STATUS_LABEL = Object.freeze({
  [OPENING_TOTAL_STATUS.COMPLETE]: "מלא",
  [OPENING_TOTAL_STATUS.PARTIAL]: "חלקי",
  [OPENING_TOTAL_STATUS.CONTEXT_REQUIRED]: "דורש הקשר נוסף",
  [OPENING_TOTAL_STATUS.UNAVAILABLE]: "אין למתודה הזאת חישוב זמין",
  [OPENING_TOTAL_STATUS.ACCESS_FILTERED]: "מוגבל לפי הרשאה",
  [OPENING_TOTAL_STATUS.ERROR_PARTIAL]: "שגיאת מנוע · חלקי",
});

const COVERAGE_STATUS_LABEL = Object.freeze({
  [OPENING_COVERAGE_STATUS.CONTEXT_REQUIRED]: "הקשר",
  [OPENING_COVERAGE_STATUS.UNAVAILABLE]: "—",
  [OPENING_COVERAGE_STATUS.ACCESS_FILTERED]: "מוגבל",
  [OPENING_COVERAGE_STATUS.ENGINE_ERROR]: "שגיאה",
});

export function openingTotalStatusLabel(status) {
  return TOTAL_STATUS_LABEL[status] || status || "—";
}

/**
 * Renders one fragment's honest display string. A fragment is only ever shown its real computed
 * number when coverageStatus is EXECUTED and value is non-null; every other reason (context
 * required, unavailable, access filtered, engine error, or no entry at all) renders its own
 * honest label -- never a fabricated 0 or blank standing in for "unknown".
 */
export function openingFragmentDisplay(fragmentValue) {
  const coverageStatus = fragmentValue?.coverageStatus || null;
  if (coverageStatus === OPENING_COVERAGE_STATUS.EXECUTED && fragmentValue?.value != null) {
    return { display: String(fragmentValue.value), coverageStatus };
  }
  return { display: COVERAGE_STATUS_LABEL[coverageStatus] || "—", coverageStatus };
}

/**
 * Groups a gematriaOpeningOperation result's fragments by their original word (per assignment:
 * "group prefixes by original word"), attaching the selected method row's per-fragment
 * value/coverageStatus when available. Word/fragment shells always come from the result's own
 * `words`/`fragments` -- never from the method row -- so grouping renders correctly even before a
 * method is selected or for a method whose profile came back with no entry for some fragment.
 */
export function buildOpeningWordGroups(result, methodRow) {
  const words = Array.isArray(result?.words) ? result.words : [];
  const fragments = Array.isArray(result?.fragments) ? result.fragments : [];
  const byKey = new Map(
    (methodRow?.fragmentValues || []).map((fv) => [`${fv.wordIndex}:${fv.prefixIndex}`, fv]),
  );

  return words.map((word, wordIndex) => ({
    wordIndex,
    word,
    fragments: fragments
      .filter((fragment) => fragment.wordIndex === wordIndex)
      .map((fragment) => {
        const fv = byKey.get(`${fragment.wordIndex}:${fragment.prefixIndex}`) || null;
        return {
          prefixIndex: fragment.prefixIndex,
          text: fragment.text,
          ...openingFragmentDisplay(fv),
        };
      }),
  }));
}

/** Deep-link builder for "Learn Method" -> /beit-midrash/:methodKey (App.jsx route). */
export function beitMidrashMethodHref(methodKey) {
  const key = String(methodKey ?? "").trim();
  return key ? `/beit-midrash/${encodeURIComponent(key)}` : null;
}
