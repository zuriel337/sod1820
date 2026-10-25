import { normalizeForCalc } from "../gematria.js";
import { aggregateFindings } from "../nameNormalize.js";
import { getNameMultiWithoutEls } from "../supabase.js";
import { fetchCanonicalGematriaFindings } from "./canonicalGematria.js";
import { nameLabTrackListsToUniversalFindings } from "./nameLabFinding.js";

export const LIFE_JOURNEY_NAME_RESEARCH_VERSION = "life-journey-name-research-v1";

const clean = value => String(value || "").trim();

const METHOD_LABELS = Object.freeze({
  ragil: "רגיל",
  miluy: "מילוי",
  misratar: "מסתתר",
  kadmi: "משולש",
  gadol: "גדול",
  siduri: "סידורי",
  atbash: "אתבש",
  albam: "אלבם",
  kadmi_gadol: "משולש גדול",
});

export function lifeJourneyGematriaMethodLabel(methodKey) {
  const key = clean(methodKey);
  return METHOD_LABELS[key] || key || "שיטה";
}

function safeTracks(document) {
  const tracks = Array.isArray(document?.tracks) ? document.tracks : [];
  const els = tracks.find(track => clean(track?.id).toLowerCase() === "els");
  const elsRan = Boolean(els?.ran) || Number(els?.count || 0) > 0 || els?.status === "ok";
  if (elsRan) {
    throw new Error("life_journey_name_research_els_boundary");
  }
  return tracks.filter(track => clean(track?.id).toLowerCase() !== "els");
}

export function projectLifeJourneyNameResearch({ name, gematriaFindings, nameDocument } = {}) {
  const rawName = clean(name);
  const normalizedName = normalizeForCalc(rawName);
  if (!rawName || !normalizedName) return null;

  const methodFindings = (Array.isArray(gematriaFindings) ? gematriaFindings : [])
    .filter(finding => finding?.kind === "gematria"
      && finding?.source?.engine === "gematria"
      && finding?.source?.adapter === "gematria-api-v1")
    .map(finding => Object.freeze({
      id: clean(finding.id),
      methodKey: clean(finding.source?.method),
      methodLabel: lifeJourneyGematriaMethodLabel(finding.source?.method),
      value: Number(finding.subject?.value),
      sourceRef: clean(finding.source?.engine),
      versionRef: clean(finding.source?.adapter),
      finding,
    }))
    .filter(row => row.id && row.methodKey && Number.isSafeInteger(row.value));

  const tracks = safeTracks(nameDocument);
  const trackLists = tracks.length ? [tracks] : [];
  const nameLabFindings = nameLabTrackListsToUniversalFindings(rawName, trackLists);
  const displayFindings = aggregateFindings(trackLists);
  const regular = methodFindings.find(row => row.methodKey === "ragil") || null;

  return Object.freeze({
    version: LIFE_JOURNEY_NAME_RESEARCH_VERSION,
    rawName,
    normalizedName,
    methodFindings: Object.freeze(methodFindings),
    regularValue: regular?.value ?? null,
    nameLabFindings: Object.freeze(nameLabFindings),
    displayFindings: Object.freeze(displayFindings),
    tracksWithResults: Number(nameDocument?.tracks_with_results || 0),
    partial: !nameDocument,
  });
}

export async function runLifeJourneyNameResearch(name, providers = {}) {
  const rawName = clean(name);
  if (!rawName) return null;
  const fetchGematria = providers.fetchGematria || fetchCanonicalGematriaFindings;
  const fetchNameLab = providers.fetchNameLab || getNameMultiWithoutEls;
  const [gematriaFindings, nameDocument] = await Promise.all([
    fetchGematria(rawName),
    fetchNameLab(rawName),
  ]);
  return projectLifeJourneyNameResearch({ name: rawName, gematriaFindings, nameDocument });
}

export default runLifeJourneyNameResearch;
