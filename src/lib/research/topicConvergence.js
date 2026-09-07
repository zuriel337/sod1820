import { supabase } from "../supabase.js";
import { makeUniversalFinding } from "./universalFinding.js";

// Canonical Topic/Convergence/Reality-Graph -> Universal Finding adapter.
//
// ONE TREE LAW: this is a READ-ONLY projection of the existing canonical graph/editorial
// sources. It does not create a second graph, does not copy topic_cards into a new store,
// does not create research_objects, and does not promote/canonicalize/publish anything.
//
// Ownership:
//   topic_cards = edited convergence source (when present)
//   nodes/edges  = canonical Reality Graph projection
//   Universal Finding = research envelope only, never storage owner
//
// Truth discipline:
//   - editorial approval is source governance, NOT epistemic stage
//   - graph presence is NOT verification of an interpretation/claim
//   - therefore stage/status/verification_state remain null here
//   - exact source-native identities and graph relation refs are preserved

const nonEmpty = (v) => String(v ?? "").trim();

// FOUNDATION_CLOSURE_BEFORE_WORLD_V1 (work_log dispatch 77ba98ae, audit 77d82836): a convergence
// node's numeric identity is stored either as metadata.numbers (array) OR metadata.value (scalar) —
// both are real, live shapes (verified: 39/219 vs 173/219 of today's convergence nodes, 0 with
// both). Neither shape is invented here; an absent/invalid value on both keys stays an honest [].
function nodeMetadataNumbers(node) {
  const arr = node?.metadata?.numbers;
  if (Array.isArray(arr)) return arr.filter(Number.isFinite);
  const scalar = node?.metadata?.value;
  return Number.isFinite(scalar) ? [scalar] : [];
}

// ── AUTHORED CONTENT BRIDGE (LEGACY_CONTENT_TO_ONE_RESEARCH_OS_BRIDGE_V1, work_log 1af998d5) ──
// topic_cards.findings is the editor/contributor-authored body of a convergence card. Until this
// pass the shared projection fetched card metadata only, so the authored content never reached
// the Universal Finding envelope (parent audit 6205ac9b). The projector below is a READ-ONLY,
// shape-accounting bridge:
//   • object shape  — hint / caveat / headline / bullets / rows / phrases / connections / posts /
//                      post / candidates / source / writer / credit / auto / writer_convergence …
//   • root-array    — {type:concept} · {n,phrase,method} · {type:post} · {type:convergence_ref}
// Every authored item becomes ONE typed evidence fact tagged claim:"source-authored" with a
// sourcePath locator (findings.<key>[i] / findings[i]). A locator is a DISPLAY position, never a
// new canonical identity (Finding id derivation is unchanged). Unknown keys/elements are kept as
// explicit `authored-unsupported` facts (field name + JSON type + raw value for authorized
// inspection) — never silently dropped, never rendered as HTML. Underscore-prefixed keys are
// INTERNAL: accounted by name only, values never projected. No method/value is ever inferred
// from a display label, and no gematria is computed here (gematria_engine_law).
// Contributor fields are ATTRIBUTION facts only — never a subject, never an entity.

export const AUTHORED_CLAIM = "source-authored";
export const TOPIC_CARD_SELECT_FIELDS =
  "id,slug,title,subtitle,numbers,highlight_numbers,status,quality,meter_score,created_at,approved_at,node_id," +
  "findings,created_by,search_terms,image_ids,occurred_at";

const ATTRIBUTION_KEYS = Object.freeze(["source", "writer", "credit", "curator"]);
const FLAG_KEYS = Object.freeze(["auto", "writer_convergence", "curated"]);

const jsonType = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const text = (v) => (v == null ? null : (typeof v === "string" ? v.trim() : String(v).trim()) || null);
const finiteOrNull = (v) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const asArray = (v) => (Array.isArray(v) ? v : []);
const isObj = (v) => Boolean(v && typeof v === "object" && !Array.isArray(v));

function postRefFact(p, sourcePath, index) {
  if (!isObj(p)) return { type: "authored-unsupported", claim: AUTHORED_CLAIM, field: "posts", valueType: jsonType(p), raw: p, sourcePath, index };
  return {
    type: "authored-post-ref", claim: AUTHORED_CLAIM, sourcePath, index,
    slug: text(p.slug), title: text(p.title), wpId: finiteOrNull(p.wp_id), postId: finiteOrNull(p.id),
  };
}

function projectObjectFindings(f, root, out) {
  const keys = Object.keys(f);
  for (const key of keys) {
    const path = `${root}.${key}`;
    const val = f[key];
    if (key.startsWith("_")) {
      // Internal marker — name only. Values (may hold audit accounts/notes) never enter the envelope.
      out.internalKeys.push(key);
      if (key === "_do_not_publish" && val === true) out.flags.doNotPublish = true;
      if (key === "_research_draft" && val === true) out.flags.researchDraft = true;
      continue;
    }
    if (ATTRIBUTION_KEYS.includes(key) && (typeof val === "string" || typeof val === "number")) {
      out.facts.push({ type: "authored-attribution", claim: AUTHORED_CLAIM, field: key, text: text(val), sourcePath: path });
      continue;
    }
    if (FLAG_KEYS.includes(key) && typeof val === "boolean") {
      out.facts.push({ type: "authored-flag", claim: AUTHORED_CLAIM, field: key, value: val, sourcePath: path });
      if (key === "auto") out.flags.auto = val;
      if (key === "writer_convergence") out.flags.writerConvergence = val;
      if (key === "curated") out.flags.curated = val;
      continue;
    }
    switch (key) {
      case "headline":
      case "hint":
      case "caveat": {
        const t = typeof val === "string" ? text(val) : null;
        if (t) out.facts.push({ type: `authored-${key}`, claim: AUTHORED_CLAIM, text: t, sourcePath: path });
        else out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val });
        break;
      }
      case "phrases":
      case "candidates": {
        if (!Array.isArray(val)) { out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val }); break; }
        const type = key === "phrases" ? "authored-phrase" : "authored-candidate";
        val.forEach((p, i) => {
          const t = typeof p === "string" ? text(p) : null;
          if (t) out.facts.push({ type, claim: AUTHORED_CLAIM, text: t, index: i, sourcePath: `${path}[${i}]` });
          else out.unsupported.push({ field: key, valueType: jsonType(p), sourcePath: `${path}[${i}]`, raw: p, index: i });
        });
        break;
      }
      case "bullets": {
        if (!Array.isArray(val)) { out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val }); break; }
        val.forEach((b, i) => {
          const p = `${path}[${i}]`;
          if (typeof b === "string") { const t = text(b); if (t) out.facts.push({ type: "authored-bullet", claim: AUTHORED_CLAIM, text: t, imageId: null, index: i, sourcePath: p }); return; }
          if (isObj(b) && (typeof b.t === "string" || b.img != null)) {
            out.facts.push({ type: "authored-bullet", claim: AUTHORED_CLAIM, text: text(b.t) || "", imageId: b.img == null ? null : String(b.img), index: i, sourcePath: p });
            return;
          }
          out.unsupported.push({ field: key, valueType: jsonType(b), sourcePath: p, raw: b, index: i });
        });
        break;
      }
      case "rows": {
        if (!Array.isArray(val)) { out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val }); break; }
        val.forEach((r, i) => {
          const p = `${path}[${i}]`;
          if (isObj(r)) {
            // convergence_display_law shape {p,v,note}. `v` is the AUTHOR'S claimed value; the method
            // (if any) lives verbatim in `note`. Nothing is recomputed or resolved here.
            out.facts.push({ type: "authored-row", claim: AUTHORED_CLAIM, phrase: text(r.p), value: finiteOrNull(r.v), valueRaw: r.v ?? null, note: text(r.note), index: i, sourcePath: p });
          } else if (typeof r === "string" && text(r)) {
            out.facts.push({ type: "authored-row", claim: AUTHORED_CLAIM, phrase: text(r), value: null, valueRaw: null, note: null, index: i, sourcePath: p });
          } else out.unsupported.push({ field: key, valueType: jsonType(r), sourcePath: p, raw: r, index: i });
        });
        break;
      }
      case "connections": {
        if (!Array.isArray(val)) { out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val }); break; }
        val.forEach((c, i) => {
          const p = `${path}[${i}]`;
          if (isObj(c)) {
            out.facts.push({
              type: "authored-connection", claim: AUTHORED_CLAIM, number: finiteOrNull(c.number), numberRaw: c.number ?? null,
              links: asArray(c.links).map(text).filter(Boolean), note: text(c.note), index: i, sourcePath: p,
            });
          } else out.unsupported.push({ field: key, valueType: jsonType(c), sourcePath: p, raw: c, index: i });
        });
        break;
      }
      case "posts": {
        if (!Array.isArray(val)) { out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val }); break; }
        val.forEach((p, i) => {
          const fact = postRefFact(p, `${path}[${i}]`, i);
          if (fact.type === "authored-post-ref") out.facts.push(fact);
          else out.unsupported.push({ field: key, valueType: jsonType(p), sourcePath: `${path}[${i}]`, raw: p, index: i });
        });
        break;
      }
      case "post": {
        if (isObj(val)) out.facts.push(postRefFact(val, path, null));
        else out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val });
        break;
      }
      default:
        out.unsupported.push({ field: key, valueType: jsonType(val), sourcePath: path, raw: val });
    }
  }
}

function projectArrayFindings(arr, root, out) {
  arr.forEach((el, i) => {
    const path = `${root}[${i}]`;
    if (!isObj(el)) { out.unsupported.push({ field: null, elementType: null, valueType: jsonType(el), sourcePath: path, raw: el, index: i }); return; }
    const t = text(el.type);
    const known = new Set(["type", "title", "text", "n", "phrase", "method", "note", "hint", "id", "slug", "node"]);
    const extra = Object.fromEntries(Object.entries(el).filter(([k]) => !known.has(k)));
    const extraKeys = Object.keys(extra);
    if (t === "post") { out.facts.push({ ...postRefFact(el, path, i), extraKeys }); return; }
    if (t === "convergence_ref") {
      out.facts.push({ type: "authored-convergence-ref", claim: AUTHORED_CLAIM, nodeId: text(el.node), slug: text(el.slug), title: text(el.title), note: text(el.note), index: i, sourcePath: path, extraKeys });
      return;
    }
    if (el.n != null || el.phrase != null) {
      // Authored numeric claim. `method` is the author's label carried VERBATIM (may be composite like
      // "מסתתר/רגיל"); it is never resolved against the Registry and the value is never recomputed.
      out.facts.push({
        type: "authored-numeric-claim", claim: AUTHORED_CLAIM, value: finiteOrNull(el.n), valueRaw: el.n ?? null, phrase: text(el.phrase),
        methodLabel: text(el.method), note: text(el.note), title: text(el.title), hint: text(el.hint), elementType: t, index: i, sourcePath: path, extraKeys,
      });
      return;
    }
    if (t === "concept" || (el.text != null && el.title != null)) {
      out.facts.push({ type: "authored-concept", claim: AUTHORED_CLAIM, title: text(el.title), text: text(el.text), hint: text(el.hint), elementType: t, index: i, sourcePath: path, extraKeys });
      return;
    }
    out.unsupported.push({ field: null, elementType: t, valueType: "object", sourcePath: path, raw: el, index: i });
  });
}

/**
 * Pure, read-only projection of topic_cards.findings into typed authored facts.
 * Returns { shape, facts, unsupported, internalKeys, flags, counts }. Never throws on unknown
 * shapes, never mutates its input, never computes gematria, never resolves a method label.
 */
export function projectTopicCardContent(findings, { root = "findings" } = {}) {
  const out = {
    shape: "empty",
    facts: [],
    unsupported: [],
    internalKeys: [],
    flags: { doNotPublish: false, researchDraft: false, auto: null, writerConvergence: null, curated: null },
    counts: { supported: 0, unsupported: 0, internal: 0 },
  };
  if (findings == null) return out;
  if (Array.isArray(findings)) { out.shape = findings.length ? "array" : "empty"; projectArrayFindings(findings, root, out); }
  else if (isObj(findings)) { out.shape = Object.keys(findings).length ? "object" : "empty"; projectObjectFindings(findings, root, out); }
  else { out.shape = "unknown"; out.unsupported.push({ field: null, valueType: jsonType(findings), sourcePath: root, raw: findings }); }
  out.counts.supported = out.facts.filter(f => f.type !== "authored-attribution" && f.type !== "authored-flag").length;
  out.counts.unsupported = out.unsupported.length;
  out.counts.internal = out.internalKeys.length;
  return out;
}

// Canonical section order for renderers. Postgres jsonb does not preserve object key order, so
// object-shape sections use this fixed order (mirrors the legacy /topic layout); root-array facts
// keep their true source order inside their sections via `index`.
export const AUTHORED_SECTION_ORDER = Object.freeze([
  "headline", "hint", "concepts", "numericClaims", "rows", "phrases", "bullets",
  "connections", "candidates", "convergenceRefs", "posts", "caveat",
]);

const SECTION_OF = Object.freeze({
  "authored-headline": "headline",
  "authored-hint": "hint",
  "authored-concept": "concepts",
  "authored-numeric-claim": "numericClaims",
  "authored-row": "rows",
  "authored-phrase": "phrases",
  "authored-bullet": "bullets",
  "authored-connection": "connections",
  "authored-candidate": "candidates",
  "authored-convergence-ref": "convergenceRefs",
  "authored-post-ref": "posts",
  "authored-caveat": "caveat",
});

/**
 * Groups a Universal Finding's authored facts into ordered sections for any renderer
 * (legacy /topic, P1 Entity Hub, Research Viewer). Pure; returns null if the finding carries
 * no authored-content summary (e.g. produced before this bridge or by another adapter).
 */
export function topicConvergenceContentSections(finding) {
  const facts = asArray(finding?.evidence?.facts);
  const summary = facts.find(f => f?.type === "authored-content-summary") || null;
  if (!summary) return null;
  const sections = Object.fromEntries(AUTHORED_SECTION_ORDER.map(k => [k, []]));
  const attribution = [];
  const flags = [];
  for (const f of facts) {
    if (f?.claim !== AUTHORED_CLAIM) continue;
    if (f.type === "authored-attribution") { attribution.push(f); continue; }
    if (f.type === "authored-flag") { flags.push(f); continue; }
    const s = SECTION_OF[f.type];
    if (s) sections[s].push(f);
  }
  for (const k of AUTHORED_SECTION_ORDER) sections[k].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const source = facts.find(f => f?.type === "topic-card-source") || null;
  return {
    shape: summary.shape,
    order: AUTHORED_SECTION_ORDER.filter(k => sections[k].length),
    sections,
    attribution,
    flags: summary.flags,
    unsupported: asArray(summary.unsupported),
    internalKeys: asArray(summary.internalKeys),
    counts: summary.counts,
    createdBy: source?.created_by ?? null,
    isEmpty: !AUTHORED_SECTION_ORDER.some(k => sections[k].length),
  };
}

function graphRelationRef(edge) {
  const id = nonEmpty(edge?.id);
  return id ? `edge:${id}` : null;
}

function targetIndex(targets) {
  return Object.fromEntries((Array.isArray(targets) ? targets : [])
    .filter(t => t?.id)
    .map(t => [String(t.id), t]));
}

export function topicConvergenceToUniversalFinding(
  { card = null, node = null, edges = [], targets = [] } = {},
  { createdAt = null } = {},
) {
  const cardId = nonEmpty(card?.id);
  const nodeId = nonEmpty(node?.id || card?.node_id);
  const slug = nonEmpty(card?.slug || node?.metadata?.slug);
  const label = nonEmpty(card?.title || node?.label);

  // A convergence must have a source-native identity from at least one canonical owner.
  if ((!cardId && !nodeId) || !label) return null;

  // If a graph node is supplied, refuse to reinterpret an unrelated node type as convergence.
  if (node && node.type !== "convergence") return null;

  const sourceIdentity = cardId
    ? { owner: "topic_cards", id: cardId }
    : { owner: "nodes", id: nodeId };

  const sourceRef = cardId ? `topic_cards:${cardId}` : `nodes:${nodeId}`;
  const byTarget = targetIndex(targets);
  const relationFacts = (Array.isArray(edges) ? edges : []).flatMap((edge) => {
    if (!edge?.id || !edge?.to_node || !edge?.relation_type) return [];
    const target = byTarget[String(edge.to_node)] || null;
    return [{
      type: "graph-relation",
      edge_id: String(edge.id),
      relation_type: String(edge.relation_type),
      from_node: String(edge.from_node || nodeId || "") || null,
      to_node: String(edge.to_node),
      target_type: target?.type || null,
      target_label: target?.label || null,
    }];
  });

  const relationRefs = (Array.isArray(edges) ? edges : [])
    .map(graphRelationRef)
    .filter(Boolean);

  const numbers = Array.isArray(card?.numbers)
    ? card.numbers.filter(Number.isFinite)
    : nodeMetadataNumbers(node);

  // Authored content bridge — only when the card row actually carries `findings`. A card fetched
  // without that column (older callers) projects exactly as before: no summary, no content facts.
  const content = card && Object.prototype.hasOwnProperty.call(card, "findings")
    ? projectTopicCardContent(card.findings)
    : null;
  const contentFacts = content ? [
    ...content.facts,
    {
      type: "authored-content-summary",
      shape: content.shape,
      counts: content.counts,
      flags: content.flags,
      internalKeys: content.internalKeys,
      unsupported: content.unsupported,
    },
  ] : [];
  const contentRefs = content
    ? content.facts.filter(f => f.type === "authored-convergence-ref" && f.nodeId).map(f => `nodes:${f.nodeId}`)
    : [];

  return makeUniversalFinding({
    kind: "convergence",
    // Projection adapter does not own epistemic/governance state.
    stage: null,
    status: null,
    subject: {
      type: "convergence",
      // Already source-native (slug/nodeId/cardId), never derived from the display label —
      // stays stable regardless of subject.lang (Multilingual Identity Foundation Closure
      // contract §C).
      key: slug || nodeId || cardId,
      label,
      // topic_cards.title is Hebrew-only today (single column, no lang field yet — see
      // contract Gate 5). Declared explicitly so a future multilingual title does not
      // silently default this to the wrong language.
      lang: "he",
      value: null,
    },
    source: {
      engine: null,
      adapter: "topic-convergence-v1",
      sourceRef,
      method: null,
      corpus: null,
      lang: "he",
    },
    identity: {
      sourceIdentity,
      occurrence: null,
      entityRef: nodeId ? `node:${nodeId}` : null,
      relationRef: null,
    },
    // Graph/editorial projection does not itself perform a claim-vs-engine test.
    // Missing stays honestly unknown under truth_axes_foundation_law PR3.
    verification: { verification_state: null },
    evidence: {
      refs: [sourceRef, ...(nodeId ? [`nodes:${nodeId}`] : []), ...relationRefs, ...contentRefs],
      facts: [
        ...(cardId ? [{
          type: "topic-card-source",
          card_id: cardId,
          slug: slug || null,
          editorial_status: card?.status ?? null,
          quality: card?.quality ?? null,
          meter_score: card?.meter_score ?? null,
          approved_at: card?.approved_at ?? null,
          // Attribution only (research_intake_foundation_contract §6.1/§6.7): who authored the card,
          // never the subject of its findings and never an auto-created entity.
          created_by: card?.created_by ?? null,
          occurred_at: card?.occurred_at ?? null,
          image_ids: Array.isArray(card?.image_ids) ? card.image_ids.map(String) : [],
          search_terms: Array.isArray(card?.search_terms) ? card.search_terms.map(String) : [],
        }] : []),
        ...(nodeId ? [{
          type: "convergence-node",
          node_id: nodeId,
          active: node?.is_active ?? null,
          weight: node?.weight ?? null,
        }] : []),
        ...relationFacts,
        ...contentFacts,
      ],
      score: card?.meter_score ?? null,
      confidence: null,
    },
    access: {
      tier: null,
      // Represents a SOURCE-OWNED marker only (truth_axes PR1): the author flagged the body
      // "do not publish". It is not a publication decision and does not change access truth.
      reason: content?.flags?.doNotPublish ? "source-flag:_do_not_publish" : null,
    },
    provenance: {
      createdBy: "ADAPTER:topic-convergence-v1",
      createdAt: createdAt || new Date().toISOString(),
      inputRef: sourceRef,
      parentFindingIds: [],
    },
    projection: {
      anchors: numbers.map(value => ({ type: "number", value })),
      relations: relationFacts.map(f => ({
        ref: `edge:${f.edge_id}`,
        relation_type: f.relation_type,
        target: f.target_label || f.to_node,
      })),
      dimensions: {
        graph: {
          node_id: nodeId || null,
          slug: slug || null,
          source_owner: cardId ? "topic_cards" : "nodes",
          source_status: card?.status ?? null,
        },
      },
    },
    view: { rendererHints: { role: "convergence" } },
  });
}

// Read-only canonical fetch path. Approved topic_cards are the edited source; the linked
// convergence node/edges are the graph projection. No writes occur in this function.
export async function fetchCanonicalTopicConvergenceFinding(slug) {
  const cleanSlug = nonEmpty(slug);
  if (!cleanSlug) return null;

  // Public read model (view topic_cards_public: approved & not _do_not_publish, internal keys
  // stripped server-side — TOPIC_CARDS_PUBLIC_READ_MODEL_PRIVACY_FIX_V1, work_log bf236317).
  // The projection semantics below are unchanged; only the source surface moved.
  const { data: card, error: cardError } = await supabase
    .from("topic_cards_public")
    .select(TOPIC_CARD_SELECT_FIELDS)
    .eq("slug", cleanSlug)
    .maybeSingle();
  if (cardError) throw cardError;
  if (!card) return null;

  let node = null;
  let edges = [];
  let targets = [];

  if (card.node_id) {
    const { data: nodeRow, error: nodeError } = await supabase
      .from("nodes")
      .select("id,type,label,description,metadata,is_active,weight,created_at")
      .eq("id", card.node_id)
      .eq("type", "convergence")
      .maybeSingle();
    if (nodeError) throw nodeError;
    node = nodeRow || null;

    if (node) {
      const { data: edgeRows, error: edgeError } = await supabase
        .from("edges")
        .select("id,from_node,to_node,relation_type,metadata,created_at")
        .eq("from_node", node.id);
      if (edgeError) throw edgeError;
      edges = edgeRows || [];

      const targetIds = [...new Set(edges.map(e => e.to_node).filter(Boolean))];
      if (targetIds.length) {
        const { data: targetRows, error: targetError } = await supabase
          .from("nodes")
          .select("id,type,label,metadata,is_active")
          .in("id", targetIds);
        if (targetError) throw targetError;
        targets = targetRows || [];
      }
    }
  }

  return topicConvergenceToUniversalFinding({ card, node, edges, targets });
}

// ── UNIVERSAL_EXPLORER_V1_SLICE1_GENERIC_LIST_MODE (work_log dispatch e3097bb5) ──
// Bounded, paginated, deterministically-ordered list of approved Topic/Convergence cards for a
// facet list view. Deliberately narrower than TOPIC_CARD_SELECT_FIELDS: no `findings` body, no
// per-row graph/node/edge composition — a list card needs identity + ranking signals only. Full
// authored-content + graph composition (topicConvergenceToUniversalFinding) stays a per-item,
// on-open concern for a later slice, so this never does the N+1 a naive "Finding per row" list
// would cause. topic_cards_public already filters to approved & not-_do_not_publish server-side.
const TOPIC_LIST_FIELDS = "id,slug,title,subtitle,numbers,highlight_numbers,quality,meter_score,approved_at,occurred_at";
const TOPIC_LIST_DEFAULT_LIMIT = 24;
const TOPIC_LIST_MAX_LIMIT = 100;

// GPT challenge 165a9e59 correction (2): finite, non-negative, INTEGER normalization — the prior
// `Math.max(0, Number(offset) || 0)` let Infinity and fractional values reach .range() unchanged
// (Infinity is truthy and passes `|| 0`; a fractional value like 2.7 was never truncated).
function normalizeNonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  const finite = Number.isFinite(n) ? n : fallback;
  return Math.max(0, Math.trunc(finite));
}
function normalizeLimit(value, fallback, max) {
  // normalizeNonNegativeInt() already substitutes `fallback` for non-finite input — no `||`
  // here, since a legitimately-normalized 0 must stay 0 going into the max(1, ...) clamp below,
  // not get silently replaced by the fallback again (0 is falsy in JS).
  return Math.max(1, Math.min(normalizeNonNegativeInt(value, fallback), max));
}

/**
 * Pure. Builds the exact, deterministic query shape for a bounded Topic/Convergence list — no
 * network, so bounds-clamping and the stable compound ordering are unit-testable in isolation.
 * rangeEnd deliberately requests one extra row (limit+1) so the caller can detect hasMore
 * without a second COUNT query.
 *
 * rankByMeterScore (UNIVERSAL_EXPLORER_V1_SLICE5_RANKING_V1, work_log dispatch correction
 * 764b3b9b): default false preserves this function's original Slice-1 order exactly, unchanged,
 * for any existing caller. When true, prepends the existing public-safe meter_score DESC signal
 * ahead of the SAME proven approved_at DESC + id ASC tiebreak — display-order only, never a second
 * reader. This is the single canonical topic-list query shape; the Explorer's ranked topic facet
 * calls this function (via fetchTopicCardList) with rankByMeterScore:true rather than forking a
 * parallel reader (the fork was corrected out per independent audit AFTER 6050377d).
 */
export function buildTopicListQuery({ limit = TOPIC_LIST_DEFAULT_LIMIT, offset = 0, rankByMeterScore = false } = {}) {
  const cap = normalizeLimit(limit, TOPIC_LIST_DEFAULT_LIMIT, TOPIC_LIST_MAX_LIMIT);
  const safeOffset = normalizeNonNegativeInt(offset, 0);
  const order = rankByMeterScore
    ? [["meter_score", false], ["approved_at", false], ["id", true]]
    : [["approved_at", false], ["id", true]];
  return {
    // [column, ascending] — most-recently-approved first, id asc as a stable tiebreaker
    // (meter_score DESC prepended when rankByMeterScore is requested).
    order,
    rangeStart: safeOffset,
    rangeEnd: safeOffset + cap,
    limit: cap,
  };
}

export async function fetchTopicCardList(params = {}) {
  const q = buildTopicListQuery(params);
  let query = supabase.from("topic_cards_public").select(TOPIC_LIST_FIELDS);
  for (const [col, ascending] of q.order) query = query.order(col, { ascending, nullsFirst: false });
  const { data, error } = await query.range(q.rangeStart, q.rangeEnd);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return { rows: rows.slice(0, q.limit), hasMore: rows.length > q.limit };
}
