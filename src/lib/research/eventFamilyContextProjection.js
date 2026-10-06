import { EVENT_SURFACE, EVENT_SURFACE_LIMITS, PLACEMENT } from "./eventObservationCompiler.js";
import { ACCESS_CLASS, findingAccessDecision } from "./researchResultBundle.js";

// EVENT_FAMILY_OCT7_GOLDEN_V1 — generic query-time Event Family Context projection.
//
// A family is a CONTEXT key over existing Research OS material, not a new identity:
//   canonical=false, graph_node_id=null, query_time_projection=true, minted=false.
// It owns NO store/graph/engine/registry, writes nothing, and mints no Event/candidate/node for any
// member. It composes caller-supplied bounded inputs:
//   * a root Representation (editorial hub) — its dates are representation metadata, never occurrence;
//   * lane/member descriptors — contextual membership/order only, not graph truth;
//   * optional per-member child event packs (compileEventTemporalObservation output) whose Universal
//     Findings are reused by the SAME id; a family anchor/dimension is overlaid without changing id.
// Every surface is a pure selector over the ONE composed bundle (no per-surface arrays).
// Access is source-controlled end to end: members, findings, edges, counts and summary are computed
// only from what the access descriptor allows.

export const EVENT_FAMILY_REF_PREFIX = "event_family:";
export const EVENT_FAMILY_ANCHOR_SPACE = "event_family";

// Lane kinds that can NEVER carry event chronology / historical child events, whatever the descriptor says.
export const NON_CHRONOLOGICAL_LANE_KIND = Object.freeze({
  INTERPRETIVE_NUMERIC: "interpretive_numeric",
  CROSS_TIME: "cross_time",
  DIM5_CONTINUATION: "dim5_continuation",
});
const NON_CHRONO = new Set(Object.values(NON_CHRONOLOGICAL_LANE_KIND));

const clean = (v) => (v == null ? null : String(v).trim() || null);
const postRef = (id) => `post:${id}`;

export function eventFamilyRef(key) {
  return `${EVENT_FAMILY_REF_PREFIX}${key}`;
}

const visible = (tier, accessDescriptor) =>
  findingAccessDecision({ access: { tier: clean(tier) } }, accessDescriptor, ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED).allowed;

function memberRefOf(raw) {
  const explicit = clean(raw?.source_ref);
  if (explicit) return explicit;
  const id = clean(raw?.post_id);
  return id ? postRef(id) : null;
}

function overlayFinding(finding, familyKey, laneKey, memberRef) {
  // SAME id / sourceIdentity: only the query-time projection overlay is added.
  const anchors = Array.isArray(finding.projection?.anchors) ? finding.projection.anchors : [];
  return {
    ...finding,
    projection: {
      ...finding.projection,
      anchors: [...anchors, { space: EVENT_FAMILY_ANCHOR_SPACE, id: familyKey }],
      dimensions: {
        ...(finding.projection?.dimensions ?? {}),
        familyContext: { family_key: familyKey, lane: laneKey, member_ref: memberRef, query_time: true },
      },
    },
  };
}

const hasAnchor = (f, space, id) => (f.projection?.anchors ?? []).some(a => a.space === space && String(a.id) === String(id));

/**
 * @param {object} p
 * @param {{key:string,label?:string,entity_refs?:Array<{label?:string,node_id?:string}>}} p.family
 * @param {{post_id:string|number,wp_id?:number,accessTier:string,date?:string,modified?:string,label?:string,pack?:object}} p.root
 * @param {Array<{key:string,kind:string,label?:string,ordered?:boolean,members:Array}>} p.lanes
 *        member: { post_id|source_ref, accessTier (required), label?, graph?:{post_node:boolean,event_node:boolean}, pack? }
 * @param {Array<{from:string,to:string,relation:string,lane?:string}>} [p.relations] cross-lane contextual relations (refs)
 * @param {object} [p.accessDescriptor] resolved access descriptor (public-only when absent)
 */
export function composeEventFamilyContext({ family, root, lanes = [], relations = [], accessDescriptor = null } = {}) {
  const key = clean(family?.key);
  if (!key) throw new TypeError("eventFamilyContextProjection: family key is required");
  const ref = eventFamilyRef(key);
  const ok = (tier) => visible(tier, accessDescriptor);

  const members = [];
  const findingsById = new Map();
  const findingMember = new Map();
  const seenRefs = new Set();

  const admit = (raw, laneKey, laneKind, order, isRoot) => {
    const mref = memberRefOf(raw);
    if (!mref || seenRefs.has(mref) || !ok(raw?.accessTier)) return null;
    seenRefs.add(mref);
    const pack = raw.pack?.bundle ? raw.pack : null;
    const m = {
      ref: mref,
      kind: "source_representation",
      label: clean(raw.label),
      lane: laneKey,
      lane_kind: laneKind,
      order,
      is_root: isRoot,
      // Context member only: never an Event/candidate identity, never auto-created.
      canonical: false,
      minted_event_identity: false,
      event_ref: pack?.event?.ref ?? null,
      graph: {
        post_node: raw.graph?.post_node === true,
        event_node: raw.graph?.event_node === true,
        // Gap is input reality: reported, never a suppression and never a write.
        gap: !(raw.graph?.post_node === true && raw.graph?.event_node === true),
      },
      chronology_eligible: !isRoot && !NON_CHRONO.has(laneKind),
      historical_child_event: false,
      finding_ids: [],
      _pack: pack,
      _raw: raw,
    };
    if (pack) {
      for (const f of pack.bundle.findings ?? []) {
        if (!findingAccessDecision(f, accessDescriptor, ACCESS_CLASS.SOURCE_ACCESS_CONTROLLED).allowed) continue;
        if (findingsById.has(f.id)) continue;
        findingsById.set(f.id, overlayFinding(f, key, laneKey, mref));
        findingMember.set(f.id, mref);
        m.finding_ids.push(f.id);
      }
    }
    members.push(m);
    return m;
  };

  const rootMember = root ? admit(root, "ROOT", "root", 0, true) : null;
  const laneOut = [];
  const edges = [];
  for (const lane of Array.isArray(lanes) ? lanes : []) {
    const lkey = clean(lane?.key);
    if (!lkey) continue;
    const kind = clean(lane.kind) || lkey.toLowerCase();
    const admitted = [];
    (lane.members ?? []).forEach((raw, i) => {
      const m = admit(raw, lkey, kind, i + 1, false);
      if (m) admitted.push(m);
    });
    // Contextual order edges only between visible neighbours (no bridging over a hidden member).
    if (lane.ordered === true) {
      const all = (lane.members ?? []).map(memberRefOf);
      for (let i = 0; i + 1 < all.length; i++) {
        const a = admitted.find(m => m.ref === all[i]);
        const b = admitted.find(m => m.ref === all[i + 1]);
        if (a && b) edges.push({ from: a.ref, to: b.ref, relation: "lane_order", lane: lkey, graph_truth: false, implies_chronology: false });
      }
    }
    laneOut.push({ key: lkey, kind, label: clean(lane.label), chronology_eligible: !NON_CHRONO.has(kind), member_refs: admitted.map(m => m.ref), member_count: admitted.length });
  }
  const refSet = new Set(members.map(m => m.ref));
  for (const r of Array.isArray(relations) ? relations : []) {
    const from = clean(r?.from), to = clean(r?.to), relation = clean(r?.relation);
    if (!from || !to || !relation || !refSet.has(from) || !refSet.has(to)) continue;
    edges.push({ from, to, relation, lane: clean(r.lane), graph_truth: false, implies_chronology: false });
  }

  // Chronology: ONLY explicit occurrence sources on chronology-eligible members. Root/published/modified
  // dates are representation metadata and are never read here.
  const chronology = [];
  const occurrenceEvidence = [];
  for (const m of members) {
    const p = m._pack;
    if (!p) continue;
    const ev = p.event;
    if (m.chronology_eligible && ev?.occurred_at && ev?.occurred_at_source_ref) {
      chronology.push({ axis: "occurred_at", at: ev.occurred_at, source_ref: ev.occurred_at_source_ref, member_ref: m.ref, lane: m.lane });
    }
    // Source occurrence evidence (clock claims + unresolved conflict) from the existing temporal semantics.
    const t = p.temporal;
    if (t && (m.chronology_eligible || m.is_root)) {
      const ids = new Set(m.finding_ids);
      const obs = (t.observations ?? []).filter(o => ids.has(o.finding_id));
      if (obs.length) {
        occurrenceEvidence.push({
          member_ref: m.ref,
          lane: m.lane,
          observations: obs,
          representations: (t.representations ?? []).filter(r => ids.has(r.finding_id)),
          conflict_finding_id: t.conflict_finding_id && ids.has(t.conflict_finding_id) ? t.conflict_finding_id : null,
          conflict_state: t.conflict_finding_id && ids.has(t.conflict_finding_id) ? t.conflict_state : null,
        });
      }
    }
  }

  const findings = [...findingsById.values()];
  const publicMembers = members.map(({ _pack, _raw, ...rest }) => rest);
  const rootRep = rootMember
    ? {
        ref: rootMember.ref,
        role: "editorial_hub_representation",
        wp_id: root.wp_id ?? null,
        // Representation metadata only; never an occurrence date.
        representation_dates: { published_at: clean(root.date), modified_at: clean(root.modified), axis: "representation", is_occurrence: false },
      }
    : null;

  return {
    family: {
      key,
      ref,
      label: clean(family.label) || key,
      canonical: false,
      graph_node_id: null,
      query_time_projection: true,
      minted: false,
      entity_refs: (family.entity_refs ?? []).map(e => ({ label: clean(e.label), node_id: clean(e.node_id), reused: true })),
    },
    root: rootRep,
    lanes: laneOut,
    members: publicMembers,
    edges,
    chronology,
    occurrence_evidence: occurrenceEvidence,
    findings,
    finding_member: Object.fromEntries(findingMember),
    counts: { members: publicMembers.length, findings: findings.length, lanes: laneOut.length },
    invariants: {
      family_is_not_event_post_or_graph_node: true,
      no_event_identity_minted_for_members: true,
      lane_membership_is_contextual_not_graph_truth: true,
      published_modified_never_occurrence: true,
      interpretive_cross_time_dim5_never_chronology: true,
      findings_reused_by_same_id: true,
      access_filtered_before_counts_edges_summary: true,
      writes_nothing: true,
    },
  };
}

function memberOf(bundle, memberRef) {
  return bundle.members.find(m => m.ref === memberRef) ?? null;
}

function limitFor(surface, limit) {
  const n = Number(limit);
  if (Number.isInteger(n) && n > 0) return n;
  return EVENT_SURFACE_LIMITS[surface] ?? EVENT_SURFACE_LIMITS.default;
}

function outwardFor(bundle, ref) {
  return bundle.edges.filter(e => e.from === ref || e.to === ref).map(e => ({ ...e, other: e.from === ref ? e.to : e.from, direction: e.from === ref ? "out" : "in" }));
}

const findingRef = (f) => ({ id: f.id, kind: f.kind, label: f.subject?.label ?? null, source_identity: f.identity?.sourceIdentity ?? null });

/** Same family context key + exact lane / outward connections for any visible member (Post92/149/5112/233...). */
export function selectEventFamilyForMember(bundle, memberRef) {
  const m = bundle ? memberOf(bundle, memberRef) : null;
  if (!m) return null;
  return {
    family_key: bundle.family.key,
    family_ref: bundle.family.ref,
    family_canonical: false,
    member_ref: m.ref,
    lane: m.lane,
    lane_kind: m.lane_kind,
    order: m.order,
    is_root: m.is_root,
    chronology_eligible: m.chronology_eligible,
    historical_child_event: false,
    graph: m.graph,
    outward: outwardFor(bundle, m.ref),
    finding_ids: m.finding_ids,
    root_ref: bundle.root?.ref ?? null,
  };
}

/**
 * ONE selector over the composed family bundle. Surfaces never get their own arrays; each reads the same
 * findings (by id) through its own anchor/axis. Bounded, with truncation reported.
 */
export function selectEventFamilyContext(bundle, surface, { number = null, memberRef = null, limit = null } = {}) {
  if (!bundle?.family || !Object.values(EVENT_SURFACE).includes(surface)) return null;
  const all = bundle.findings;
  let pool;
  if (surface === EVENT_SURFACE.NUMBER) pool = all.filter(f => number != null && hasAnchor(f, "number", number));
  else if (surface === EVENT_SURFACE.POST) {
    const ids = new Set(memberRef ? (memberOf(bundle, memberRef)?.finding_ids ?? []) : []);
    pool = all.filter(f => ids.has(f.id));
  } else if (surface === EVENT_SURFACE.TIMELINE || surface === EVENT_SURFACE.DATE_EVENT) {
    const chrono = new Set(bundle.members.filter(m => m.chronology_eligible || m.is_root).map(m => m.ref));
    pool = all.filter(f => chrono.has(bundle.finding_member[f.id]));
  } else pool = all.filter(f => hasAnchor(f, EVENT_FAMILY_ANCHOR_SPACE, bundle.family.key));

  const max = limitFor(surface, limit);
  const shown = pool.slice(0, max);
  const base = {
    surface,
    family_key: bundle.family.key,
    family_ref: bundle.family.ref,
    family_canonical: false,
    graph_node_id: null,
    query_time_projection: true,
    finding_ids: shown.map(f => f.id),
    findings: shown.map(findingRef),
    total_count: pool.length,
    returned_count: shown.length,
    truncated: shown.length < pool.length,
    placement: surface === EVENT_SURFACE.CONTEXT_RAIL ? PLACEMENT : undefined,
  };
  if (surface === EVENT_SURFACE.POST && memberRef) base.member = selectEventFamilyForMember(bundle, memberRef);
  if (surface === EVENT_SURFACE.TIMELINE || surface === EVENT_SURFACE.DATE_EVENT) {
    // Only chronology-eligible lanes with explicit occurrence sources; representation dates are separate.
    base.entries = bundle.chronology.slice(0, max);
    base.occurrence_evidence = bundle.occurrence_evidence;
    base.representation_dates = bundle.root?.representation_dates ?? null;
    base.cross_time = bundle.members
      .filter(m => m.lane_kind === NON_CHRONOLOGICAL_LANE_KIND.CROSS_TIME)
      .map(m => ({ member_ref: m.ref, historical_child_event: false }));
  }
  if (surface === EVENT_SURFACE.CONTEXT_RAIL || surface === EVENT_SURFACE.WORLD) {
    const mMax = max;
    const ms = bundle.members.slice(0, mMax);
    base.members = ms.map(m => ({ ref: m.ref, lane: m.lane, order: m.order, label: m.label }));
    base.member_total = bundle.members.length;
    base.member_returned = ms.length;
    base.member_truncated = ms.length < bundle.members.length;
    base.lanes = bundle.lanes.map(l => ({ key: l.key, kind: l.kind, member_count: l.member_count }));
  }
  if (surface === EVENT_SURFACE.WORLD) {
    const groups = {};
    for (const f of shown) (groups[f.projection?.dimensions?.eventMemberType ?? "other"] ||= []).push(f.id);
    base.depth_groups = groups;
    base.edges = bundle.edges;
  }
  if (surface === EVENT_SURFACE.RAZIEL) {
    base.raziel = { consumes: "event_family_context_bundle", read_only: true, can_invent: false, can_canonicalize: false };
  }
  if (surface === EVENT_SURFACE.FOLLOW) {
    base.recommendation = {
      subject_ref: bundle.family.ref,
      subscription_funnel: "existing_semantics",
      auto_follow: false,
      requires_explicit_user_action: true,
      new_resolver_identity: false,
    };
  }
  return base;
}

export default composeEventFamilyContext;
