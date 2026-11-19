import { captureElsResearchReturn, elsResearchSnapshotMatches, elsResearchReturnLoad } from "./elsResearchReturnSnapshot.js";
import { copyElsResearchReturn } from "./elsMatrixReadingSavedResult.js";
import { isElsLexiconCandidate } from "./elsLexiconResearch.js";
import { elsOccurrenceId } from "./elsOccurrenceIdentity.js";

// A private-library projection, not a new store, scanner or verification authority.
export const ELS_SAVED_DISCOVERY = "els_discovery_v1";
export const ELS_DISCOVERY_SAVE_BYTES = 180000; // library + history fit the existing sync batch
const int = value => Number.isSafeInteger(value) && value >= 0;
const fields = (value, names) => Object.fromEntries(names.split(" ").flatMap(key => {
  const v = value?.[key];
  return typeof v === "boolean" || v === null || (typeof v === "number" && Number.isFinite(v))
    || (typeof v === "string" && v.length <= 700) ? [[key, v]] : [];
}));
const strings = value => Array.isArray(value) && value.length <= 24 && value.every(v => typeof v === "string" && v.length <= 100) ? [...value] : [];
const boxOf = geometry => geometry && ({ S: geometry.S, r0: geometry.r0, r1: geometry.r1, c0: geometry.c0, c1: geometry.c0 + geometry.cw - 1 });
const validBox = box => box && Object.values(box).every(int) && box.S >= 2 && box.r1 >= box.r0 && box.c1 >= box.c0
  && box.c1 < box.S && box.r1 - box.r0 < 256 && box.c1 - box.c0 < 129 && (box.r1 - box.r0 + 1) * (box.c1 - box.c0 + 1) <= 8192;
const sameBox = (a, b) => !!a && !!b && ["S", "r0", "r1", "c0", "c1"].every(k => a[k] === b[k]);
const timestamp = value => typeof value === "string" && value.length < 40 && Number.isFinite(Date.parse(value));
const freeze = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export function captureElsDiscoverySource(state, scanState, projection) {
  const returnSnapshot = captureElsResearchReturn(state, projection);
  const box = boxOf(scanState?.geometry);
  if (!returnSnapshot || !validBox(box)) return null;
  const origin = { term: returnSnapshot.normalizedTerm, corpus: returnSnapshot.scope, corpusId: returnSnapshot.corpusId,
    start: returnSnapshot.axis.start, skip: returnSnapshot.axis.skip, dir: returnSnapshot.axis.dir, occurrenceId: returnSnapshot.axis.occurrenceId };
  return freeze({ origin, box, rowGap: returnSnapshot.matrixProjection?.rowGap ?? 0, returnSnapshot });
}

function projectCandidate(item, data) {
  if (!isElsLexiconCandidate(item, data) || !int(item.start) || !int(item.skip) || item.skip < 1 || ![1, -1].includes(item.dir)
    || item.hitId !== `${item.skip}_${item.dir}_${item.start}` || !Array.isArray(item.positions) || item.positions.length !== item.term.length
    || item.positions.some((p, i) => !int(p) || p !== item.start + i * item.skip * item.dir
      || Math.floor(p / data.box.S) < data.box.r0 || Math.floor(p / data.box.S) > data.box.r1
      || p % data.box.S < data.box.c0 || p % data.box.S > data.box.c1)) return null;
  const saved = { ...fields(item, "term label hitId start skip dir distance orientation"), positions: [...item.positions],
    kind: item.skip === 1 ? "source" : "els", status: "CANDIDATE", lexiconSources: strings(item.lexiconSources) };
  if (data.plan.mode === "language") saved.language = { ...fields(item.language, "exactLetters relation"), segmentationVerified: false,
    tokens: item.language.tokens.map(token => fields(token, "letters baseTerm relation")) };
  return saved;
}

function projectRun(run, recovering = false) {
  const { source, data } = run || {};
  if (!source || !data?.ok || data.pending || !timestamp(run.startedAt) || !timestamp(run.endedAt)
    || Date.parse(run.endedAt) < Date.parse(run.startedAt) || typeof run.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(run.id)) return null;
  const origin = fields(source.origin, "term corpus corpusId start skip dir occurrenceId");
  if (!/^[א-ת]{2,100}$/.test(origin.term) || !["torah", "tanakh"].includes(origin.corpus) || typeof origin.corpusId !== "string" || !origin.corpusId
    || !int(origin.start) || !int(origin.skip) || origin.skip < 2 || ![1, -1].includes(origin.dir)
    || ["term", "corpus", "corpusId", "start", "skip", "dir"].some(k => data.origin?.[k] !== origin[k])) return null;
  const occurrenceId = elsOccurrenceId(origin);
  if (!occurrenceId || (origin.occurrenceId != null && origin.occurrenceId !== occurrenceId)) return null;
  origin.occurrenceId = occurrenceId;
  const box = fields(source.box, "S r0 r1 c0 c1");
  const rowGap = source.rowGap;
  if (!validBox(box) || !sameBox(box, data.box) || !int(rowGap) || rowGap > 4 || box.S * (rowGap + 1) !== origin.skip) return null;
  let returnSnapshot = copyElsResearchReturn(source.returnSnapshot, origin);
  if (!returnSnapshot && !recovering) return null;
  const folded = returnSnapshot?.matrixProjection;
  if (returnSnapshot && (folded ? folded.rowGap !== rowGap || !sameBox(box, { S: folded.width, ...folded }) : rowGap !== 0)) {
    if (!recovering) return null;
    returnSnapshot = null;
  }
  const plan = fields(data.plan, "mode minLength maxLength maxDistance minMembers shortTokenRadius shortTokenEligible");
  if (![undefined, "words", "language"].includes(plan.mode) || ![plan.minLength, plan.maxLength, plan.maxDistance, plan.minMembers].every(int)
    || plan.minLength < 3 || plan.maxLength < plan.minLength || plan.maxLength > (plan.mode === "language" ? 16 : 10)
    || plan.maxDistance > 120 || plan.minMembers < 2 || plan.minMembers > 6) return null;
  const coverage = fields(data.coverage, "stop complete completedRays totalRays remainingRays windows axisFragments outsidePlan invalid shortTokenExcluded els source maxWindows maxResults maxWallMs minLength maxLength directions elapsedMs");
  if (typeof coverage.complete !== "boolean" || typeof coverage.stop !== "string" || !int(coverage.completedRays) || !int(coverage.totalRays)
    || coverage.completedRays > coverage.totalRays || (coverage.complete && (coverage.stop !== "COMPLETE" || coverage.completedRays !== coverage.totalRays || plan.mode === "language"))) return null;
  coverage.resultLimits = fields(data.coverage?.resultLimits, "els source");
  const lexicon = { ...fields(data.lexicon, "contract matchingAlgorithm entryCount tanakhEntryCount coreEntryCount coreFingerprint"), sources: strings(data.lexicon?.sources),
    asset: fields(data.lexicon?.asset, "path sha256 encodedBytes loadTrigger cachePolicy requestCount downloadMs totalLoadMs") };
  if (!Array.isArray(data.items) || data.items.length > 6000) return null;
  const items = data.items.map(item => projectCandidate(item, { plan, box }));
  if (items.some(item => !item)) return null; // never silently lose a candidate
  return { id: run.id, startedAt: run.startedAt, endedAt: run.endedAt,
    source: { origin, box, rowGap, returnSnapshot },
    data: { ok: true, pending: false, origin, box, plan, coverage, lexicon, items, continuation: null,
      selectionProtocol: "EXPLORATORY_DISCOVERY", modelCalls: 0, findingMutation: false, truthPromotion: false, savedSnapshot: true,
      rawInspectionSaved: false } };
}

function build(run) {
  const projected = projectRun(run);
  if (!projected) return { ok: false, reason: "invalid" };
  const id = `els-discovery:${projected.id}`;
  const entity = { id, ref: id, type: "els_discovery", contract: ELS_SAVED_DISCOVERY,
    title: `גילוי ${projected.data.plan.mode === "language" ? "ביטויים" : "מילים"} · ${projected.source.returnSnapshot.term}`,
    link: `/code?mode=research&discovery=${encodeURIComponent(id)}`, scan: projected };
  if (new TextEncoder().encode(JSON.stringify(entity)).length > ELS_DISCOVERY_SAVE_BYTES) return { ok: false, reason: "too-large" };
  return { ok: true, entity };
}

export function buildSavedElsDiscovery(run) {
  try { return build(run); } catch { return { ok: false, reason: "invalid" }; }
}

export function readSavedElsDiscovery(entity) {
  try {
    if (entity?.type !== "els_discovery" || entity.contract !== ELS_SAVED_DISCOVERY
      || new TextEncoder().encode(JSON.stringify(entity)).length > ELS_DISCOVERY_SAVE_BYTES) return null;
    const scan = projectRun(entity.scan, true);
    if (!scan || entity.id !== `els-discovery:${scan.id}`) return null;
    return { id: entity.id, title: typeof entity.title === "string" ? entity.title.slice(0, 200) : "גילוי שמור", scan };
  } catch { return null; }
}

export function elsSavedDiscoveryMatches(scan, state) {
  try { return elsResearchSnapshotMatches(captureElsResearchReturn(state), scan.source.origin) && sameBox(boxOf(state.geometry), scan.source.box); }
  catch { return false; }
}

export function elsDiscoveryResponseMatches(source, response) {
  try { return elsResearchSnapshotMatches(source?.returnSnapshot, response?.origin) && sameBox(source?.box, response?.box); }
  catch { return false; }
}

export const elsSavedDiscoveryReturn = scan => elsResearchReturnLoad(scan?.source);
