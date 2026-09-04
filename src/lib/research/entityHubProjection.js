import { supabase } from "../supabase.js";
import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";
import { researchObjectsToUniversalFindings } from "./researchObjectFinding.js";
import { fetchCanonicalTopicConvergenceFinding } from "./topicConvergence.js";
import { researchNumber } from "./numericResearch.js";

const NODE_FIELDS = "id,type,label,description,metadata,identity_key,is_active,created_at";
const ENTITY_TYPE_FIELDS = "type,label,parent,icon,tabs,relations,stats,route_pattern";
const RESEARCH_FIELDS = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id";
const TOPIC_FIELDS = "slug,status,quality,meter_score,approved_at,created_at";

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

function safeLimit(value, fallback, max) {
  return Math.max(1, Math.min(Number(value) || fallback, max));
}

function dedupeRows(rows) {
  const byId = new Map();
  for (const row of rows.flat()) {
    if (row?.id) byId.set(String(row.id), row);
  }
  return [...byId.values()].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

export async function fetchEntityTypeDefinition(type) {
  const key = clean(type);
  if (!key) return null;
  const { data, error } = await supabase
    .from("entity_types")
    .select(ENTITY_TYPE_FIELDS)
    .eq("type", key)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function resolveEntityHubNode({ nodeId = null, type = null, key = null } = {}) {
  const exactNodeId = clean(nodeId);
  if (exactNodeId) {
    const { data, error } = await supabase
      .from("nodes")
      .select(NODE_FIELDS)
      .eq("id", exactNodeId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  const entityType = clean(type);
  const entityKey = clean(key);
  if (!entityType || !entityKey) return null;

  const { data: identityHit, error: identityError } = await supabase
    .from("nodes")
    .select(NODE_FIELDS)
    .eq("type", entityType)
    .eq("identity_key", entityKey)
    .limit(1);
  if (identityError) throw identityError;
  if (identityHit?.[0]) return identityHit[0];

  const { data: labelHit, error: labelError } = await supabase
    .from("nodes")
    .select(NODE_FIELDS)
    .eq("type", entityType)
    .eq("label", entityKey)
    .limit(1);
  if (labelError) throw labelError;
  return labelHit?.[0] || null;
}

async function runResearchQuery(builder, limit) {
  const { data, error } = await builder
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchResearchObjectsForEntity(node, { limit = 40 } = {}) {
  if (!node?.id) return { rows: [], findings: [] };
  const cap = safeLimit(limit, 40, 120);
  const label = clean(node.label);
  const identityKey = clean(node.identity_key);
  const terms = [...new Set([label, identityKey].filter(Boolean))];
  const queries = [];

  if (node.type === "number" && Number.isSafeInteger(Number(label))) {
    const value = Number(label);
    queries.push(runResearchQuery(supabase.from("research_objects").select(RESEARCH_FIELDS).eq("value", value), cap));
    queries.push(runResearchQuery(supabase.from("research_objects").select(RESEARCH_FIELDS).contains("terms", [String(value)]), cap));
    queries.push(runResearchQuery(supabase.from("research_objects").select(RESEARCH_FIELDS).contains("relates", [String(value)]), cap));
  }

  for (const term of terms) {
    queries.push(runResearchQuery(supabase.from("research_objects").select(RESEARCH_FIELDS).contains("terms", [term]), cap));
    queries.push(runResearchQuery(supabase.from("research_objects").select(RESEARCH_FIELDS).contains("relates", [term]), cap));
  }

  if (!queries.length) return { rows: [], findings: [] };
  const rows = dedupeRows(await Promise.all(queries)).slice(0, cap);
  return { rows, findings: researchObjectsToUniversalFindings(rows) };
}

async function fetchTopicFindingsForNumber(number, { limit = 12 } = {}) {
  const cap = safeLimit(limit, 12, 40);
  const { data, error } = await supabase
    .from("topic_cards")
    .select(TOPIC_FIELDS)
    .eq("status", "approved")
    .contains("numbers", [number])
    .order("quality", { ascending: false, nullsFirst: false })
    .limit(cap);
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const findings = (await Promise.all(
    rows.map(row => row?.slug ? fetchCanonicalTopicConvergenceFinding(row.slug) : null)
  )).filter(Boolean);
  return { rows, findings };
}

function humanGateSummary(rows) {
  const status = { candidate: 0, approved: 0, canonical: 0, rejected: 0, other: 0 };
  const access = { private: 0, family_shared: 0, public_candidate: 0, other: 0 };
  for (const row of rows || []) {
    if (Object.hasOwn(status, row?.status)) status[row.status] += 1;
    else status.other += 1;
    if (Object.hasOwn(access, row?.privacy_scope)) access[row.privacy_scope] += 1;
    else access.other += 1;
  }
  return { status, access, total: (rows || []).length };
}

function sourceProjection(researchFindings, numberJourney) {
  const refs = new Map();
  for (const finding of researchFindings || []) {
    const sourceRef = clean(finding?.source?.sourceRef);
    if (sourceRef) refs.set(sourceRef, { type: "research-source", ref: sourceRef, label: sourceRef });
  }
  for (const source of Array.isArray(numberJourney?.sources) ? numberJourney.sources : []) {
    const label = clean(source);
    if (label) refs.set(`journey:${label}`, { type: "number-journey-source", ref: null, label });
  }
  return [...refs.values()];
}

function timelineProjection(graphFindings, researchFindings) {
  return [...(graphFindings || []), ...(researchFindings || [])]
    .map(finding => ({
      id: finding?.id || null,
      kind: finding?.kind || null,
      label: finding?.subject?.label || "",
      at: finding?.provenance?.createdAt || null,
      status: finding?.status ?? null,
      access: finding?.access?.tier ?? null,
    }))
    .filter(item => item.at)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

function projectNumberJourney(numberResearch) {
  const lens = numberResearch?.per_lens?.number_journey;
  if (lens?.status !== "ok" || !lens?.data) return null;
  const raw = lens.data;
  const seed = raw.seed || null;
  return {
    source: "fn_number_journey",
    seed: seed ? {
      ...seed,
      governance: {
        status: seed.status ?? null,
        decidedBy: seed.decided_by ?? null,
        decidedAt: seed.decided_at ?? null,
        scope: "seed/editorial-content-only",
      },
    } : null,
    root: raw.root || null,
    branches: Array.isArray(raw.branches) ? raw.branches : [],
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    liveComputedMap: raw.map ? {
      ...raw.map,
      governance: {
        status: null,
        scope: "live-computed",
        note: "Computed at read time; never inherit the journey seed approval state.",
      },
    } : null,
  };
}

/**
 * Universal Entity Hub projection.
 *
 * Owns no truth and performs no writes. It composes existing canonical readers into one
 * entity-centered read model. Type-specific behavior is additive; the generic core remains
 * node-id + entity_types + Universal Finding adapters.
 */
export async function fetchEntityHubProjection({
  nodeId = null,
  type = null,
  key = null,
  relationLimit = 100,
  researchLimit = 40,
  topicLimit = 12,
} = {}) {
  const node = await resolveEntityHubNode({ nodeId, type, key });
  if (!node) return null;

  const [definition, graphFindings, research] = await Promise.all([
    fetchEntityTypeDefinition(node.type),
    fetchCanonicalGraphEntityFindings(node.id, { relationLimit: safeLimit(relationLimit, 100, 200) }),
    fetchResearchObjectsForEntity(node, { limit: researchLimit }),
  ]);

  const entityFinding = graphFindings.find(finding => finding?.kind === "graph-entity") || null;
  const relationFindings = graphFindings.filter(finding => finding?.kind === "graph-relation");
  let topics = { rows: [], findings: [] };
  let numberResearch = null;
  let numberJourney = null;

  if (node.type === "number" && Number.isSafeInteger(Number(node.label))) {
    const number = Number(node.label);
    [topics, numberResearch] = await Promise.all([
      fetchTopicFindingsForNumber(number, { limit: topicLimit }),
      researchNumber(number, {
        lenses: ["number_lookup", "number_dossier", "number_journey", "neighbors", "research_objects"],
        budget: { maxLenses: 5, depth: 1 },
        rpc: (name, args) => supabase.rpc(name, args),
        fetchResearchObjects: async () => ({ data: research.rows }),
        researchObjectLimit: researchLimit,
        provenance: { requestSource: "entity-hub-projection-v1", inputRef: `node:${node.id}` },
      }),
    ]);
    numberJourney = projectNumberJourney(numberResearch);
  }

  return {
    v: 1,
    identity: {
      nodeId: String(node.id),
      type: node.type,
      key: node.identity_key || String(node.id),
      label: node.label,
      definition,
      finding: entityFinding,
    },
    graph: {
      entity: entityFinding,
      relations: relationFindings,
    },
    research: {
      rows: research.rows,
      findings: research.findings,
      humanGate: humanGateSummary(research.rows),
    },
    topics,
    journeys: {
      numberKnowledgeJourney: numberJourney,
      researchPaths: [],
      note: "Universal Research/Discovery Path identity is intentionally unresolved; no path is fabricated here.",
    },
    sources: sourceProjection(research.findings, numberJourney),
    timeline: timelineProjection(graphFindings, research.findings),
    lenses: {
      declared: Array.isArray(definition?.tabs) ? definition.tabs : [],
      numberResearch,
    },
    truthLifecycle: {
      automaticCanonicalPromotion: false,
      automaticPublication: false,
      humanGateRequired: true,
    },
  };
}

export default fetchEntityHubProjection;
