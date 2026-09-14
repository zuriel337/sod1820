// G2 2029 — cross-capability evidence lineage/dependency transport.
//
// research_strategy_layer_law v13 owns the semantics. This file owns no truth/ranking/store/graph.
// It only normalizes explicit lineage refs and groups findings that are provably dependent.

export const DEPENDENCY_RELATION = Object.freeze({
  SAME_ARTIFACT: 'same_artifact',
  SAME_OCCURRENCE: 'same_occurrence',
  SAME_WINDOW: 'same_window',
  OVERLAPS: 'overlaps',
  CONTAINS: 'contains',
  CONTAINED_BY: 'contained_by',
  ADJACENT: 'adjacent',
  SHARED_SOURCE: 'shared_source',
  SHARED_INPUT: 'shared_input',
  DERIVATION: 'derivation',
  UNKNOWN: 'unknown',
});

const VALID_RELATIONS = new Set(Object.values(DEPENDENCY_RELATION));

function clean(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function array(value) { return Array.isArray(value) ? value : []; }
function uniq(values) { return [...new Set(array(values).map(clean).filter(Boolean))]; }

export function normalizeEvidenceLineage(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError('researchDependency: lineage must be an object');
  const relation = clean(value.relation ?? value.dependency_relation ?? value.dependencyRelation);
  if (relation && !VALID_RELATIONS.has(relation)) throw new TypeError(`researchDependency: invalid relation "${relation}"`);
  return {
    relation: relation || DEPENDENCY_RELATION.UNKNOWN,
    root_input_ref: clean(value.root_input_ref ?? value.rootInputRef),
    representation_ref: clean(value.representation_ref ?? value.representationRef),
    occurrence_ref: clean(value.occurrence_ref ?? value.occurrenceRef),
    window_ref: clean(value.window_ref ?? value.windowRef),
    artifact_refs: uniq(value.artifact_refs ?? value.artifactRefs),
    source_lineage_refs: uniq(value.source_lineage_refs ?? value.sourceLineageRefs),
    parent_refs: uniq(value.parent_refs ?? value.parentRefs),
    explicit_group: clean(value.group ?? value.dependency_group ?? value.dependencyGroup),
    notes: clean(value.notes),
  };
}

function intersects(a = [], b = []) {
  const set = new Set(a);
  return b.find(x => set.has(x)) || null;
}

function spanOf(outcome) {
  const span = outcome?.lineage_span || outcome?.lineageSpan || outcome?.research_evaluation?.location?.span;
  if (!span || typeof span !== 'object') return null;
  const start = Number(span.start), end = Number(span.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start: Math.min(start, end), end: Math.max(start, end), unit: clean(span.unit) };
}

export function classifyEvidenceDependency(a, b) {
  const left = normalizeEvidenceLineage(a?.evidence_lineage ?? a?.evidenceLineage ?? a?.lineage);
  const right = normalizeEvidenceLineage(b?.evidence_lineage ?? b?.evidenceLineage ?? b?.lineage);
  if (!left || !right) return { relation: DEPENDENCY_RELATION.UNKNOWN, reason: 'lineage_not_declared' };

  if (left.explicit_group && left.explicit_group === right.explicit_group) {
    return { relation: left.relation !== DEPENDENCY_RELATION.UNKNOWN ? left.relation : right.relation, reason: 'same_explicit_dependency_group' };
  }
  if (left.occurrence_ref && left.occurrence_ref === right.occurrence_ref) return { relation: DEPENDENCY_RELATION.SAME_OCCURRENCE, reason: 'same_occurrence_ref' };
  const artifact = intersects(left.artifact_refs, right.artifact_refs);
  if (artifact) return { relation: DEPENDENCY_RELATION.SAME_ARTIFACT, reason: `shared_artifact:${artifact}` };
  if (left.window_ref && left.window_ref === right.window_ref) {
    const ls = spanOf(a), rs = spanOf(b);
    if (ls && rs && (!ls.unit || !rs.unit || ls.unit === rs.unit)) {
      if (ls.start === rs.start && ls.end === rs.end) return { relation: DEPENDENCY_RELATION.SAME_WINDOW, reason: 'same_window_same_span' };
      if (ls.start <= rs.start && ls.end >= rs.end) return { relation: DEPENDENCY_RELATION.CONTAINS, reason: 'same_window_span_contains' };
      if (rs.start <= ls.start && rs.end >= ls.end) return { relation: DEPENDENCY_RELATION.CONTAINED_BY, reason: 'same_window_span_contained_by' };
      if (Math.max(ls.start, rs.start) <= Math.min(ls.end, rs.end)) return { relation: DEPENDENCY_RELATION.OVERLAPS, reason: 'same_window_span_overlap' };
      if (ls.end + 1 === rs.start || rs.end + 1 === ls.start) return { relation: DEPENDENCY_RELATION.ADJACENT, reason: 'same_window_span_adjacent' };
    }
    return { relation: DEPENDENCY_RELATION.SAME_WINDOW, reason: 'same_window_ref' };
  }
  const source = intersects(left.source_lineage_refs, right.source_lineage_refs);
  if (source) return { relation: DEPENDENCY_RELATION.SHARED_SOURCE, reason: `shared_source:${source}` };
  if (left.root_input_ref && left.root_input_ref === right.root_input_ref) return { relation: DEPENDENCY_RELATION.SHARED_INPUT, reason: 'same_root_input' };
  if (left.representation_ref && right.parent_refs.includes(left.representation_ref)) return { relation: DEPENDENCY_RELATION.DERIVATION, reason: 'right_derived_from_left_representation' };
  if (right.representation_ref && left.parent_refs.includes(right.representation_ref)) return { relation: DEPENDENCY_RELATION.DERIVATION, reason: 'left_derived_from_right_representation' };
  return { relation: DEPENDENCY_RELATION.UNKNOWN, reason: 'no_proven_shared_lineage' };
}

const DEPENDENT_RELATIONS = new Set(Object.values(DEPENDENCY_RELATION).filter(x => x !== DEPENDENCY_RELATION.UNKNOWN));

export function composeDependencyGroups(outcomes = []) {
  const list = array(outcomes).filter(x => clean(x?.finding_id ?? x?.findingId));
  const parent = new Map(list.map(x => [clean(x.finding_id ?? x.findingId), clean(x.finding_id ?? x.findingId)]));
  const find = x => {
    let p = parent.get(x);
    while (p && p !== parent.get(p)) p = parent.get(p);
    if (p) parent.set(x, p);
    return p || x;
  };
  const union = (a, b) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  const edges = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const aId = clean(list[i].finding_id ?? list[i].findingId);
    const bId = clean(list[j].finding_id ?? list[j].findingId);
    const classified = classifyEvidenceDependency(list[i], list[j]);
    if (DEPENDENT_RELATIONS.has(classified.relation)) {
      union(aId, bId);
      edges.push({ a: aId, b: bId, ...classified });
    }
  }
  const groups = new Map();
  for (const item of list) {
    const id = clean(item.finding_id ?? item.findingId);
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(id);
  }
  const findingToGroup = new Map();
  const normalizedGroups = [...groups.values()].map((members, index) => {
    const groupId = `dep:${index + 1}`;
    members.forEach(id => findingToGroup.set(id, groupId));
    return { group_id: groupId, finding_ids: members, dependent: members.length > 1 };
  });
  return { groups: normalizedGroups, edges, finding_to_group: findingToGroup };
}

export default composeDependencyGroups;
