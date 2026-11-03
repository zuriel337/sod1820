// Representation attached to an existing private els_records row, never a new store or verifier.
import { captureElsResearchReturn, elsResearchSnapshotMatches, elsResearchReturnLoad } from './elsResearchReturnSnapshot.js';
import { isElsLexiconCandidate } from './elsLexiconResearch.js';

export const ELS_SAVED_SCAN_VERSION = 1;
export const ELS_SAVED_SCAN_MAX_BYTES = 750000;
const fields = ['plan', 'coverage', 'box', 'lexicon', 'selectionProtocol', 'axisNumericReadings', 'languageInspection'];
const itemFields = ['term', 'label', 'hitId', 'start', 'skip', 'dir', 'positions', 'kind', 'status', 'lexiconSources', 'distance', 'orientation', 'numericReadings', 'language'];
const forbidden = new Set(['__proto__', 'prototype', 'constructor', 'authorization', 'access_token', 'refresh_token', 'api_key', 'secret', 'token']);
// Bound JSON from known response roots. No matrix, transport target, auth or raw provider response.
function copy(value, depth = 0, budget = { nodes: 0 }) {
  if (++budget.nodes > 60000 || depth > 18) throw new Error('scan-too-large');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length <= 10000) return value;
  if (Array.isArray(value) && value.length <= 10000) return value.map(v => copy(v, depth + 1, budget));
  if (value && typeof value === 'object' && Object.keys(value).length <= 150) return Object.fromEntries(
    Object.entries(value).filter(([k, v]) => !forbidden.has(k.toLowerCase()) && v !== undefined)
      .map(([k, v]) => [k, copy(v, depth + 1, budget)]));
  throw new Error('scan-invalid');
}
const select = (value, keys) => Object.fromEntries(keys.filter(k => value?.[k] !== undefined).map(k => [k, copy(value[k])]));
function valid(scan) {
  const o = scan?.origin, b = scan?.data?.box, data = scan?.data;
  if (scan?.version !== ELS_SAVED_SCAN_VERSION || typeof scan.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(scan.id)
    || !Number.isFinite(scan.savedAt) || scan.savedAt < 0 || !o || !['torah', 'tanakh'].includes(o.corpus)
    || !/^[א-ת]{2,100}$/.test(o.term) || typeof o.corpusId !== 'string' || !o.corpusId || o.corpusId.length > 128
    || !Number.isSafeInteger(o.start) || o.start < 0 || !Number.isSafeInteger(o.skip) || o.skip < 2 || ![-1, 1].includes(o.dir)
    || !elsResearchSnapshotMatches(scan.returnSnapshot, o) || scan.returnSnapshot.axis.hitId !== `${o.skip}_${o.dir}_${o.start}`
    || scan.returnSnapshot.axis.start !== o.start || scan.returnSnapshot.axis.skip !== o.skip || scan.returnSnapshot.axis.dir !== o.dir
    || !data?.ok || data.pending || !data.plan || !['term', 'corpus', 'corpusId', 'start', 'skip', 'dir'].every(k => data.origin?.[k] === o[k])
    || !data.coverage || typeof data.coverage.complete !== 'boolean'
    || !b || !['S', 'r0', 'r1', 'c0', 'c1'].every(k => Number.isSafeInteger(b[k]))
    || b.S < 2 || b.r0 < 0 || b.r1 < b.r0 || b.c0 < 0 || b.c1 < b.c0 || b.c1 >= b.S
    || (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1) > 8192
    || !Array.isArray(data.items) || data.items.length > 300) return false;
  const limit = o.corpus === 'torah' ? 304805 : 1204583;
  return o.start + (o.term.length - 1) * o.skip * o.dir >= 0 && o.start + (o.term.length - 1) * o.skip * o.dir < limit
    && data.items.every(i => isElsLexiconCandidate(i, data) && i.kind === (i.skip === 1 ? 'source' : 'els')
      && Number.isSafeInteger(i.start) && Number.isSafeInteger(i.skip) && i.skip >= 1 && [-1, 1].includes(i.dir)
      && i.hitId === `${i.skip}_${i.dir}_${i.start}` && Array.isArray(i.positions) && i.positions.length === i.term.length
      && Array.isArray(i.lexiconSources) && i.lexiconSources.every(s => typeof s === 'string')
      && i.positions.every((p, n) => p === i.start + n * i.skip * i.dir && p >= 0 && p < limit
        && Math.floor(p / b.S) >= b.r0 && Math.floor(p / b.S) <= b.r1 && p % b.S >= b.c0 && p % b.S <= b.c1));
}

export function buildElsSavedScan(state, response, { id = globalThis.crypto.randomUUID(), now = Date.now() } = {}) {
  try {
    if (!response?.ok || response.pending || typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return null;
    const snapshot = captureElsResearchReturn(state);
    if (!elsResearchSnapshotMatches(snapshot, response.origin)) return null;
    const data = { ...select(response, fields), ok: true, pending: false,
      origin: select(response.origin, ['term', 'corpus', 'corpusId', 'start', 'skip', 'dir']),
      items: response.items.map(i => select(i, itemFields)), modelCalls: 0, findingMutation: false, truthPromotion: false };
    const scan = { version: ELS_SAVED_SCAN_VERSION, id, savedAt: now, origin: data.origin, returnSnapshot: copy(snapshot), data };
    if (!valid(scan) || new TextEncoder().encode(JSON.stringify(scan)).length > ELS_SAVED_SCAN_MAX_BYTES) return null;
    const ref = `els-scan:${data.origin.corpus}:${data.origin.corpusId}:${snapshot.axis.hitId}:${id}`;
    return { id: ref, ref, type: 'els', title: `סריקה: ${snapshot.term}`, link: `/code?mode=research&lexiconScan=${encodeURIComponent(ref)}`, elsLexiconScan: scan };
  } catch { return null; }
}

export function readElsSavedScan(entity) {
  try {
    if (entity?.type !== 'els' || !entity.elsLexiconScan) return null;
    const scan = copy(entity.elsLexiconScan);
    if (new TextEncoder().encode(JSON.stringify(scan)).length > ELS_SAVED_SCAN_MAX_BYTES || !valid(scan)) return null;
    // A saved candidate is never a fresh MATCH. Admission still goes through canonical load/replay.
    return scan;
  } catch { return null; }
}

export function elsSavedScanLoad(scan) {
  return valid(scan) ? elsResearchReturnLoad({ origin: scan.origin, returnSnapshot: scan.returnSnapshot }) : null;
}

export function elsSavedScanMatchesState(scan, state) {
  const b = scan?.data?.box;
  return !!b && elsResearchSnapshotMatches(captureElsResearchReturn(state), scan.origin)
    && state.geometry?.S === b.S && state.geometry.r0 === b.r0 && state.geometry.r1 === b.r1
    && state.geometry.c0 === b.c0 && state.geometry.cw === b.c1 - b.c0 + 1;
}
