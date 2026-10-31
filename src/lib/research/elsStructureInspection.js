import { parseElsHitKey } from "../elsJourney.js";
import { captureElsResearchReturn, elsResearchReturnLoad, elsResearchSnapshotMatches } from "./elsResearchReturnSnapshot.js";
import { extractElsVectorGeometry } from "./els2029VectorGeometry.js";
import { isElsLexiconCandidate } from "./elsLexiconResearch.js";

// Presentation adapter over canonical verified occurrence identities and the existing
// vector geometry owner. No search, lexical generation, score or new result authority.
export function inspectElsStructures(state) {
  const snapshot = captureElsResearchReturn(state);
  const width = state?.geometry?.S;
  if (!snapshot || !Number.isSafeInteger(width) || width < 2 || !Number.isSafeInteger(state.corpusLetters))
    return { ok: false, reason: "נדרשת מטריצה מאומתת עם זהות טקסט וגיאומטריה." };
  const origin = { term: snapshot.normalizedTerm, corpus: snapshot.scope, corpusId: snapshot.corpusId,
    start: snapshot.axis.start, skip: snapshot.axis.skip, dir: snapshot.axis.dir };
  const lines = [], seen = new Set();
  const add = (term, hitId, kind) => {
    const anchor = parseElsHitKey(hitId);
    const normalized = term.replace(/[^א-ת]/g, "").replace(/[ךםןףץ]/g, c => ({ך:"כ",ם:"מ",ן:"נ",ף:"פ",ץ:"צ"}[c]));
    if (!anchor || normalized.length < 2 || normalized.length > 100 || !Number.isSafeInteger(anchor.start)
      || !Number.isSafeInteger(anchor.skip) || anchor.skip < (kind === "source" ? 1 : 2)) return false;
    const id = `${normalized}:${hitId}`;
    if (seen.has(id)) return true;
    // Expand the engine-owned exact identity, not a new matching/search calculation.
    const positions = Array.from(normalized, (_, index) => anchor.start + index * anchor.skip * anchor.dir);
    if (positions.some(p => !Number.isSafeInteger(p) || p < 0 || p >= state.corpusLetters)) return false;
    seen.add(id); lines.push({ occurrenceId: id, term: normalized, hitId, dir: anchor.dir, positions, kind });
    return true;
  };
  if (!add(snapshot.normalizedTerm, snapshot.axis.hitId, "axis")) return { ok: false, reason: "זהות הציר אינה שלמה." };
  let excluded = 0;
  for (const finding of snapshot.findings) {
    for (const id of finding.shown) if (!add(finding.t, id, "els")) excluded++;
    for (const id of finding.sourceShown) if (!add(finding.t, id, "source")) excluded++;
  }
  if (lines.length > 64) return { ok: false, reason: "נבחרו יותר מ־64 מופעים. צמצמו את הסימונים לפני בדיקת המבנים; לא נבדק מדגם חלקי." };
  const geometry = extractElsVectorGeometry({ axisWidth: width, occurrences: lines });
  return { ok: true, origin, snapshot, lines, geometry, excluded, window: { ...state.geometry },
    selectionProtocol: "USER_SELECTED_VERIFIED_OCCURRENCES", modelCalls: 0, lexiconLoaded: false };
}

export function structureInspectionKey(result) {
  return result?.ok ? JSON.stringify([result.origin, result.window, result.lines.map(l => [l.occurrenceId,l.kind])]) : null;
}

export function restoreElsStructureInspection(result) {
  return result?.ok ? elsResearchReturnLoad({ origin: result.origin, returnSnapshot: result.snapshot }) : null;
}

export const ELS_DISCOVERY_GROUP_LABELS = Object.freeze({
  parallel: "קווים מקבילים", intersection: "אותיות משותפות", continuation: "המשך על אותו קו",
  motif: "מילה חוזרת", corridor: "מסדרון סביב הציר", cluster: "אשכול קרוב", transversal: "חוצה מקבילות",
});

// Restore structural discovery as a projection of the EXISTING bounded scan.
// No letters/dictionary/search here. Engine-provided positions remain candidates
// until the existing exact-load verifier admits the selected occurrences.
export function groupElsLexiconDiscoveries(state, result, settings = {}) {
  const snapshot = captureElsResearchReturn(state), box = result?.box;
  const empty = reason => ({ groups: [], ok: false, reason });
  if (!result?.ok || result.pending || !elsResearchSnapshotMatches(snapshot, result.origin)
    || !box || !Object.values(box).every(Number.isSafeInteger) || box.S < 2
    || !Number.isSafeInteger(state.corpusLetters) || !Array.isArray(result.items) || result.items.length > 300)
    return empty("המופע או חלון הסריקה אינם שלמים.");
  const axisPositions = Array.from(snapshot.normalizedTerm, (_, i) => snapshot.axis.start + i * snapshot.axis.skip * snapshot.axis.dir);
  const axis = { occurrenceId: "axis", term: snapshot.normalizedTerm, positions: axisPositions, dir: snapshot.axis.dir, kind: "axis" };
  const candidates = [], ids = new Set();
  const axisCells = new Set(axisPositions);
  let excluded = 0;
  for (const item of result.items) {
    const positions = item?.positions, id = `${item?.term}:${item?.hitId}`;
    if (!isElsLexiconCandidate(item, result) || !Number.isSafeInteger(item.start) || !Number.isSafeInteger(item.skip)
      || item.skip < 1 || ![-1, 1].includes(item.dir) || item.hitId !== `${item.skip}_${item.dir}_${item.start}`
      || !Array.isArray(positions) || positions.length !== item.term.length
      || positions.some((p, i) => p !== item.start + i * item.skip * item.dir || p < 0 || p >= state.corpusLetters
        || Math.floor(p / box.S) < box.r0 || Math.floor(p / box.S) > box.r1 || p % box.S < box.c0 || p % box.S > box.c1)) {
      excluded++; continue;
    }
    if (ids.has(id) || positions.every(p => axisCells.has(p))) continue;
    ids.add(id); candidates.push({ ...item, occurrenceId: id });
  }
  const occurrences = [axis, ...candidates], byId = new Map(occurrences.map(item => [item.occurrenceId, item]));
  const geometry = extractElsVectorGeometry({ axisWidth: box.S, occurrences });
  const cellSets = new Map(occurrences.map(item => [item.occurrenceId, new Set(item.positions)]));
  const groups = new Map(), maxMembers = 8, maxGroups = 240;
  const minMembers = Number.isSafeInteger(settings.minMembers) ? Math.max(2, Math.min(6, settings.minMembers)) : 2;
  const distanceCache = new Map();
  const distance = (a, b) => {
    const key = [a.occurrenceId, b.occurrenceId].sort().join("|");
    if (distanceCache.has(key)) return distanceCache.get(key);
    let value = Infinity;
    for (const p of a.positions) for (const q of b.positions)
      value = Math.min(value, Math.abs(Math.floor(p / box.S) - Math.floor(q / box.S)) + Math.abs(p % box.S - q % box.S));
    distanceCache.set(key, value); return value;
  };
  const axisDistance = new Map(occurrences.map(item => [item.occurrenceId, distance(item, axis)]));
  const contains = (a, b) => b.positions.every(p => cellSets.get(a.occurrenceId).has(p));
  // Nested fragments never inflate a group or become independent confirmations.
  const add = (type, memberIds, reason, requiredIds = []) => {
    let members = [...new Set(memberIds)].map(id => byId.get(id)).filter(Boolean);
    members = members.filter(member => !members.some(other => other !== member && contains(other, member)
      && (other.positions.length > member.positions.length || other.occurrenceId < member.occurrenceId)));
    if (members.length < minMembers || !members.some(item => item !== axis)) return;
    members.sort((a, b) => Number(requiredIds.includes(b.occurrenceId)) - Number(requiredIds.includes(a.occurrenceId))
      || axisDistance.get(a.occurrenceId) - axisDistance.get(b.occurrenceId) || a.occurrenceId.localeCompare(b.occurrenceId));
    const totalMembers = members.length; members = members.slice(0, maxMembers);
    const id = members.map(m => m.occurrenceId).sort().join("|");
    const prior = groups.get(id);
    if (prior) {
      prior.totalMembers = Math.max(prior.totalMembers, totalMembers);
      prior.membersTruncated ||= totalMembers > maxMembers;
      if (!prior.types.includes(type)) { prior.types.push(type); prior.reasons.push(reason); }
      return;
    }
    groups.set(id, { id, types: [type], reasons: [reason], memberIds: members.map(m => m.occurrenceId),
      items: members.filter(m => m !== axis).map(m => result.items.find(i => `${i.term}:${i.hitId}` === m.occurrenceId)),
      includesAxis: members.includes(axis), totalMembers, membersTruncated: totalMembers > maxMembers,
      distance: Math.min(...members.filter(m => m !== axis).map(m => axisDistance.get(m.occurrenceId))),
      status: "CANDIDATE", truthPromotion: false });
  };
  const parallelEdges = new Map();
  for (const relation of geometry.relations) {
    const a = byId.get(relation.a), b = byId.get(relation.b);
    if (relation.latticeOffset > 0 && relation.support.count >= 2 && relation.support.constantGap === true
      && distance(a, b) <= 8) {
      add("parallel", [relation.a, relation.b], `מקבילות עם ${relation.support.count} נקודות תמיכה; היסט סריג ${relation.latticeOffset}.`);
      for (const [from, to] of [[relation.a, relation.b], [relation.b, relation.a]]) {
        if (!parallelEdges.has(from)) parallelEdges.set(from, new Set());
        parallelEdges.get(from).add(to);
      }
    }
    if (relation.latticeOffset === 0 && !a.positions.some(p => cellSets.get(b.occurrenceId).has(p)) && distance(a, b) <= 3)
      add("continuation", [relation.a, relation.b], "שני מופעים נפרדים על אותו קו, במרחק עד 3 תאים; לא ביטוי מאוחד שאומת.");
  }
  for (const intersection of geometry.intersections)
    add("intersection", [intersection.a, intersection.b], `${intersection.positions.length} אותיות באותם מיקומים בטקסט.`);
  // A family requires pairwise supported parallels, not a chain of merely nearby lines.
  for (const [seed, neighbours] of parallelEdges) {
    const family = [seed];
    for (const next of neighbours) if (family.every(id => parallelEdges.get(id)?.has(next))) family.push(next);
    if (family.length > 2) add("parallel", family, "משפחת מקבילות: לכל זוג כיוון משותף ותמיכה גיאומטרית; לא אישורים עצמאיים.");
  }
  const byTerm = new Map();
  for (const item of candidates) {
    if (!byTerm.has(item.term)) byTerm.set(item.term, []);
    byTerm.get(item.term).push(item.occurrenceId);
  }
  for (const members of byTerm.values()) if (members.length > 1)
    add("motif", members, "אותה מילה במופעים נפרדים בחלון; החזרה אינה הוכחת משמעות או עצמאות.");
  // Compact clusters: every pair is nearby (not an unbounded connected chain).
  for (const seed of candidates) {
    const members = [seed];
    for (const next of candidates) if (next !== seed && members.length < maxMembers
      && members.every(member => !contains(member, next) && !contains(next, member) && distance(member, next) <= 4)) members.push(next);
    if (members.length >= 3) add("cluster", members.map(m => m.occurrenceId), "לפחות שלושה מופעים; המרחק הקרוב ביותר בין כל זוג הוא עד 4 תאים.");
  }
  // A corridor uses the actual parallel-axis normal interval and overlapping row
  // span, not raw skip equality. Every included cell must be inside that corridor.
  const axisLine = geometry.lines.find(l => l.occurrenceId === "axis");
  if (axisLine?.primitiveVector?.[0] === 1 && axisLine.primitiveVector[1] === 0) {
    const col = axisPositions[0] % box.S, loRow = Math.min(...axisPositions.map(p => Math.floor(p / box.S))), hiRow = Math.max(...axisPositions.map(p => Math.floor(p / box.S)));
    for (const id of parallelEdges.get("axis") || []) {
      const boundary = byId.get(id), edge = boundary.positions[0] % box.S;
      if (Math.abs(col - edge) > 8) continue; // no cyclic wrap across a cropped box
      const inside = candidates.filter(item => item !== boundary && item.positions.every(p =>
        p % box.S > Math.min(col, edge) && p % box.S < Math.max(col, edge) && Math.floor(p / box.S) >= loRow && Math.floor(p / box.S) <= hiRow));
      if (inside.length) add("corridor", ["axis", id, ...inside.map(i => i.occurrenceId)], "ציר וגבול מקביל, עם מופעים שכל אותיותיהם ביניהם ובטווח שורות הציר.", ["axis", id]);
    }
  }
  for (const crossing of geometry.transversals) {
    const crossed = crossing.crossedMembers;
    // Require two genuinely separate supported parallel members, not two slices of one line.
    for (let i = 0; i < crossed.length; i++) for (let j = i + 1; j < crossed.length; j++)
      if (parallelEdges.get(crossed[i])?.has(crossed[j]))
        add("transversal", [crossing.occurrenceId, crossed[i], crossed[j]], "מופע החוצה באותיות משותפות שתי מקבילות נפרדות.");
  }
  // Fixed presentation hierarchy, not a strength score: exact structures precede
  // proximity-only clusters so a dense dictionary cannot bury the relationships.
  const typeOrder = ["transversal", "corridor", "motif", "parallel", "intersection", "continuation", "cluster"];
  const order = group => Math.min(...group.types.map(type => typeOrder.indexOf(type)));
  const ordered = [...groups.values()].sort((a, b) => order(a) - order(b) || a.distance - b.distance
    || b.items.length - a.items.length || a.id.localeCompare(b.id));
  const typeCounts = Object.fromEntries(typeOrder.map(type => [type, ordered.filter(group => group.types.includes(type)).length]));
  // A display cap must not turn a populated family into a misleading zero.
  // Reserve a bounded sample for every family, then fill remaining slots in the
  // same fixed order. This allocates display slots, never fabricates findings.
  const selectedIds = new Set(), perType = Math.floor(maxGroups / typeOrder.length);
  for (const type of typeOrder) {
    let count = 0;
    for (const group of ordered) if (group.types.includes(type)) {
      selectedIds.add(group.id);
      if (++count >= perType) break;
    }
  }
  for (const group of ordered) { if (selectedIds.size >= maxGroups) break; selectedIds.add(group.id); }
  return { ok: true, groups: ordered.filter(group => selectedIds.has(group.id)), totalGroups: ordered.length, typeCounts, truncated: ordered.length > maxGroups,
    candidates: candidates.length, excluded, maxGroups, maxMembers, pairCount: occurrences.length * (occurrences.length - 1) / 2,
    selectionProtocol: "EXPLORATORY_DISCOVERY", modelCalls: 0, projectionOnly: true };
}
