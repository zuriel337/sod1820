import { supabase, getEntityBundle, getValueFamilies } from "../supabase.js";
import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";
import { researchObjectsToUniversalFindings } from "./researchObjectFinding.js";
import { fetchCanonicalTopicConvergenceFinding } from "./topicConvergence.js";
import { researchNumber } from "./numericResearch.js";
import { fetchCanonicalGematriaFindings } from "./canonicalGematria.js";
import { makeUniversalFinding, VALID_VERIFICATION_STATES } from "./universalFinding.js";

const NODE_FIELDS = "id,type,label,description,metadata,identity_key,is_active,created_at";
const ENTITY_TYPE_FIELDS = "type,label,parent,icon,tabs,relations,stats,route_pattern";
const RESEARCH_FIELDS = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id";
const TOPIC_FIELDS = "id,slug,title,subtitle,status,quality,meter_score,approved_at,created_at,occurred_at,numbers,highlight_numbers,image_ids,created_by";
// db_column is the join key between the canonical engine output (gematria_api keys) and the Registry.
const METHOD_FIELDS = "method_key,db_column,display_label,sub,soul,required_entitlement,version,category,sort_order,active,in_engine,scannable,execution_kind,derived_from,operator";
// Public read model for Topic/Convergence (TOPIC_CARDS_PUBLIC_READ_MODEL_PRIVACY_FIX_V1): approved rows only,
// internal keys stripped server-side. Never the raw table from a public projection.
const TOPIC_SOURCE = "topic_cards_public";
const GW_IDENTITY_PREFIX = "gw:";
const HUB_ROUTE = "/entity-hub-preview";

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

function safeLimit(value, fallback, max) {
  return Math.max(1, Math.min(Number(value) || fallback, max));
}

function isAccessDenied(error) {
  return error?.code === "42501" || /permission denied/i.test(String(error?.message || ""));
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
  if (!node?.id) return { rows: [], findings: [], access: { available: true, reason: null } };
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

  if (!queries.length) return { rows: [], findings: [], access: { available: true, reason: null } };

  try {
    const rows = dedupeRows(await Promise.all(queries)).slice(0, cap);
    return { rows, findings: researchObjectsToUniversalFindings(rows), access: { available: true, reason: null } };
  } catch (error) {
    if (isAccessDenied(error)) {
      return {
        rows: [],
        findings: [],
        access: { available: false, reason: "research_objects_not_readable_for_current_session" },
      };
    }
    throw error;
  }
}

async function topicRowsToFindings(rows) {
  const findings = (await Promise.all(
    rows.map(row => row?.slug ? fetchCanonicalTopicConvergenceFinding(row.slug) : null)
  )).filter(Boolean);
  return { rows, findings };
}

async function fetchTopicFindingsForNumber(number, { limit = 12 } = {}) {
  const cap = safeLimit(limit, 12, 40);
  const { data, error } = await supabase
    .from(TOPIC_SOURCE)
    .select(TOPIC_FIELDS)
    .contains("numbers", [number])
    .order("quality", { ascending: false, nullsFirst: false })
    .limit(cap);
  if (error) throw error;
  return topicRowsToFindings(Array.isArray(data) ? data : []);
}

// Non-number entities: approved Topic/Convergence cards that list the entity label among their
// search_terms. Bounded, public read model only, no fuzzy matching (no fabricated topic identity).
async function fetchTopicFindingsForTerm(term, { limit = 12 } = {}) {
  const label = clean(term);
  if (!label) return { rows: [], findings: [] };
  const cap = safeLimit(limit, 12, 40);
  const { data, error } = await supabase
    .from(TOPIC_SOURCE)
    .select(TOPIC_FIELDS)
    .overlaps("search_terms", [label])
    .order("quality", { ascending: false, nullsFirst: false })
    .limit(cap);
  if (error) throw error;
  return topicRowsToFindings(Array.isArray(data) ? data : []);
}

async function fetchMethodRegistry(methodKeys = []) {
  const keys = [...new Set((methodKeys || []).map(clean).filter(Boolean))];
  if (!keys.length) return [];
  const { data, error } = await supabase
    .from("gematria_methods")
    .select(METHOD_FIELDS)
    .in("method_key", keys)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// ── GENERIC METHOD-RESULT BRIDGE (P1_1237_HITGALUT_METHOD_BRIDGE_RECONCILIATION_V1, work_log 14d66a0e) ──
// Number → Entity and Entity → Number portability without a new relation type, store or edge:
//   • an entity's canonical gematria identity = its public gematria_words row (identity_key gw:<uuid>,
//     or the verified+published row whose phrase equals the label) — RLS-filtered, read-only;
//   • the canonical engine (gematria_api via the existing canonicalGematria adapter) produces one
//     Universal Finding per method it actually returned — nothing hardcoded per method;
//   • the Registry (gematria_methods, joined on db_column) supplies identity/semantics/governance;
//   • each engine value is linked to the EXISTING number node of that value when one exists.
// The stored gematria_words value is a real prior CLAIM for that method, so the envelope may carry
// an honest match/mismatch; a method with no stored value stays not_tested (HG-3, never fabricated).
// A bridge row is a PROJECTION LINK (Trace ≠ Finding ≠ Claim ≠ Edge) — it never writes anything.

async function fetchGematriaIdentity(node) {
  const identityKey = clean(node?.identity_key);
  const label = clean(node?.label);
  let q = supabase.from("gematria_words").select("*");
  if (identityKey.startsWith(GW_IDENTITY_PREFIX)) q = q.eq("id", identityKey.slice(GW_IDENTITY_PREFIX.length));
  else if (label) q = q.eq("phrase", label).order("is_verified", { ascending: false }).limit(1);
  else return null;
  const { data, error } = await q.maybeSingle();
  if (error) {
    if (isAccessDenied(error)) return null;
    throw error;
  }
  return data || null;
}

async function fetchRegistryByDbColumns(dbColumns = []) {
  const cols = [...new Set((dbColumns || []).map(clean).filter(Boolean))];
  if (!cols.length) return [];
  const { data, error } = await supabase
    .from("gematria_methods")
    .select(METHOD_FIELDS)
    .in("db_column", cols)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

// Bounded label lookup. PostgREST filters travel in the URL (~8 KB limit), and Hebrew labels
// URL-encode to ~9 bytes per letter, so the list is capped and chunked (never one giant .in()).
const LABEL_LOOKUP_CAP = 160;
const LABEL_LOOKUP_CHUNK = 32;
async function fetchNodesByLabels(type, labels = [], { limit = LABEL_LOOKUP_CAP } = {}) {
  const list = [...new Set((labels || []).map(clean).filter(Boolean))].slice(0, safeLimit(limit, LABEL_LOOKUP_CAP, 400));
  if (!list.length) return [];
  const chunks = [];
  for (let i = 0; i < list.length; i += LABEL_LOOKUP_CHUNK) chunks.push(list.slice(i, i + LABEL_LOOKUP_CHUNK));
  const results = await Promise.all(chunks.map(async chunk => {
    const { data, error } = await supabase
      .from("nodes")
      .select("id,type,label,identity_key,metadata")
      .eq("type", type)
      .eq("is_active", true)
      .in("label", chunk)
      .limit(chunk.length);
    if (error) throw error;
    return Array.isArray(data) ? data : [];
  }));
  return results.flat();
}
// Phrases a renderer actually shows per family (page cards show 7, controls/modal up to 18).
const SHOWN_PHRASES_PER_FAMILY = 18;

const hubHref = (type, key) => `${HUB_ROUTE}/${encodeURIComponent(type)}/${encodeURIComponent(key)}`;

/**
 * Pure. Joins canonical engine findings (kind="gematria") with the public gematria_words row, the
 * Registry (by db_column) and existing number nodes into typed projection links. Never computes a
 * value, never invents a method, never mutates its inputs.
 */
export function buildMethodResultBridge({ subjectLabel, subjectNodeId = null, gwRow = null, engineFindings = [], registryRows = [], numberNodes = [] } = {}) {
  const label = clean(subjectLabel);
  const registryByColumn = new Map((registryRows || []).filter(r => r?.db_column).map(r => [String(r.db_column), r]));
  const nodeByLabel = new Map((numberNodes || []).filter(n => n?.id && n?.label != null).map(n => [String(n.label), n]));
  const createdAt = new Date().toISOString();

  const rows = (engineFindings || [])
    .filter(f => f?.kind === "gematria" && f?.source?.method && Number.isFinite(Number(f?.subject?.value)))
    .map(f => {
      const dbColumn = String(f.source.method);
      const engineValue = Number(f.subject.value);
      const registry = registryByColumn.get(dbColumn) || null;
      const methodKey = registry?.method_key || dbColumn;
      const storedRaw = gwRow && Object.prototype.hasOwnProperty.call(gwRow, dbColumn) ? gwRow[dbColumn] : null;
      const storedValue = storedRaw == null || storedRaw === "" ? null : Number(storedRaw);
      const hasStoredClaim = storedValue != null && Number.isFinite(storedValue);
      const verificationState = hasStoredClaim ? (storedValue === engineValue ? "match" : "mismatch") : "not_tested";
      const numberNode = nodeByLabel.get(String(engineValue)) || null;
      const governed = Boolean(registry && registry.active && registry.in_engine);

      const finding = makeUniversalFinding({
        kind: "gematria",
        subject: { type: "phrase", key: f.subject.key, label: f.subject.label || label, value: engineValue, lang: "he" },
        source: { engine: "gematria", adapter: "entity-hub-method-bridge-v1", method: methodKey, sourceRef: gwRow?.id ? `gematria_words:${gwRow.id}` : null, lang: "he" },
        identity: {
          sourceIdentity: { methodKey, dbColumn, normalizedSubject: f.subject.key, value: engineValue },
          entityRef: subjectNodeId ? String(subjectNodeId) : null,
          relationRef: numberNode ? `projection:method-result:${dbColumn}→nodes:${numberNode.id}` : null,
        },
        verification: {
          claimed_expression: hasStoredClaim ? label : null,
          claimed_method: hasStoredClaim ? methodKey : null,
          claimed_value: hasStoredClaim ? storedValue : null,
          engine_method_tested: dbColumn,
          engine_result: engineValue,
          statement_lang: hasStoredClaim ? "he" : null,
          verification_state: VALID_VERIFICATION_STATES.includes(verificationState) ? verificationState : null,
        },
        evidence: {
          refs: [...(gwRow?.id ? [`gematria_words:${gwRow.id}`] : []), ...(numberNode ? [`nodes:${numberNode.id}`] : [])],
          facts: [{ type: "gematria-method-value", methodKey, dbColumn, normalizedSubject: f.subject.key, value: engineValue, storedValue: hasStoredClaim ? storedValue : null }],
        },
        provenance: { createdBy: "ENGINE:gematria", createdAt, inputRef: subjectNodeId ? `node:${subjectNodeId}` : null },
        projection: {
          relations: numberNode ? [{ type: "method-result-link", methodKey, dbColumn, value: engineValue, toNodeId: String(numberNode.id), toType: "number" }] : [],
          dimensions: { numeric: { methodKey: dbColumn, value: engineValue } },
        },
        view: { rendererHints: { role: "method-result" } },
      });

      return {
        methodKey,
        dbColumn,
        displayLabel: registry?.display_label || methodKey,
        registry,
        governed,
        engineValue,
        storedValue: hasStoredClaim ? storedValue : null,
        verificationState,
        numberNode: numberNode ? { id: String(numberNode.id), label: String(numberNode.label), identityKey: numberNode.identity_key || null } : null,
        hrefs: numberNode ? { number: `/number/${engineValue}`, hub: hubHref("number", String(engineValue)) } : null,
        sortOrder: registry?.sort_order ?? null,
        finding,
      };
    });

  return rows.sort((a, b) => {
    const ao = a.sortOrder ?? 999, bo = b.sortOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return a.methodKey.localeCompare(b.methodKey);
  });
}

// Pure. Maps the phrases shown in a number's gematria families to EXISTING entity nodes so a phrase
// chip can open the canonical entity hub instead of a label-only search. No node is ever created.
export function buildPhraseEntityLinks(entityNodes = []) {
  const out = {};
  for (const n of entityNodes || []) {
    const label = clean(n?.label);
    if (!label || !n?.id || out[label]) continue;
    out[label] = { nodeId: String(n.id), identityKey: n.identity_key || null, href: hubHref("entity", label) };
  }
  return out;
}

async function fetchMethodResultBridge(node) {
  const gwRow = await fetchGematriaIdentity(node);
  const label = clean(gwRow?.phrase) || clean(node?.label);
  if (!label) return { identity: null, results: [], engineFindings: [] };
  const engineFindings = await fetchCanonicalGematriaFindings(label);
  const columns = engineFindings.map(f => f?.source?.method).filter(Boolean);
  const [registryRows, numberNodes] = await Promise.all([
    fetchRegistryByDbColumns(columns),
    fetchNodesByLabels("number", engineFindings.map(f => f?.subject?.value)),
  ]);
  const results = buildMethodResultBridge({ subjectLabel: label, subjectNodeId: node?.id, gwRow, engineFindings, registryRows, numberNodes });
  return {
    identity: gwRow ? {
      gematriaWordId: String(gwRow.id),
      phrase: gwRow.phrase,
      verified: gwRow.is_verified === true,
      published: gwRow.is_published === true,
      nodeId: gwRow.node_id ? String(gwRow.node_id) : null,
      source: "gematria_words (public RLS: verified+published)",
    } : null,
    results,
    engineFindings,
  };
}

function enrichGematriaFamilies(families, registryRows) {
  const registry = new Map((registryRows || []).map(row => [row.method_key, row]));
  return (families || []).map(group => ({
    ...group,
    registry: registry.get(group.method) || null,
  })).sort((a, b) => {
    const ao = a.registry?.sort_order ?? 999;
    const bo = b.registry?.sort_order ?? 999;
    if (ao !== bo) return ao - bo;
    return (b.count || 0) - (a.count || 0);
  });
}


async function fetchNumberWorlds(number) {
  const { data, error } = await supabase
    .from("nodes")
    .select("id,type,label,description,metadata,identity_key")
    .eq("is_active", true)
    .eq("metadata->>value", String(number))
    .not("metadata->>world", "is", null)
    .limit(120);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const groups = new Map();
  for (const row of rows) {
    const world = clean(row?.metadata?.world) || "לא מסווג";
    if (!groups.has(world)) groups.set(world, []);
    groups.get(world).push(row);
  }
  return [...groups.entries()].map(([world, items]) => ({ world, count: items.length, items }));
}

async function fetchNumberSignatures(number) {
  const { data, error } = await supabase
    .from("nodes")
    .select("id,type,label,description,metadata,identity_key")
    .eq("type", "entity")
    .eq("is_active", true)
    .eq("metadata->>role", "signature")
    .eq("metadata->>value", String(number))
    .limit(40);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function fetchZeroScale(number) {
  const { data, error } = await supabase.rpc("fn_zero_scale", { p_value: number });
  if (error) throw error;
  return data || null;
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
    const sourceObject = source && typeof source === "object" ? source : null;
    const label = clean(sourceObject?.label ?? source);
    const ref = clean(sourceObject?.ref) || null;
    if (label) refs.set(`journey:${ref || label}`, {
      type: sourceObject?.type || "number-journey-source",
      ref,
      label,
    });
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
  const sources = Array.isArray(raw.sources)
    ? raw.sources
    : Array.isArray(raw.sources?.verses)
      ? raw.sources.verses.map((verse) => {
        const ref = clean(verse?.ref);
        const text = clean(verse?.text);
        return {
          type: "verse",
          ref: ref || null,
          label: [ref, text].filter(Boolean).join(" — "),
        };
      }).filter(source => source.label)
      : [];
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
    sources,
    sourceSummary: raw.sources && !Array.isArray(raw.sources) ? {
      count: raw.sources.count ?? sources.length,
      value: raw.sources.value ?? null,
    } : null,
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
  let publicSurface = null;
  let gematriaFamilies = [];
  let methodRegistry = [];
  let worlds = [];
  let signatures = [];
  let zeroScale = null;
  let phraseEntities = {};
  let methodBridge = { identity: null, results: [], engineFindings: [] };

  const isNumberNode = node.type === "number" && Number.isSafeInteger(Number(node.label));
  if (!isNumberNode) {
    // Entity → Number bridge (generic: any node with a canonical gematria identity).
    [methodBridge, topics] = await Promise.all([
      fetchMethodResultBridge(node),
      fetchTopicFindingsForTerm(node.label, { limit: topicLimit }),
    ]);
  }

  if (isNumberNode) {
    const number = Number(node.label);
    [topics, numberResearch, publicSurface, gematriaFamilies, worlds, signatures, zeroScale] = await Promise.all([
      fetchTopicFindingsForNumber(number, { limit: topicLimit }),
      researchNumber(number, {
        lenses: ["number_lookup", "number_dossier", "number_journey", "neighbors", "research_objects"],
        budget: { maxLenses: 5, depth: 1 },
        rpc: (name, args) => supabase.rpc(name, args),
        fetchResearchObjects: async () => ({ data: research.rows }),
        researchObjectLimit: researchLimit,
        provenance: { requestSource: "entity-hub-projection-v2", inputRef: `node:${node.id}` },
      }),
      getEntityBundle({ term: String(number), value: number, isNumber: true }),
      getValueFamilies(number, 12),
      fetchNumberWorlds(number),
      fetchNumberSignatures(number),
      fetchZeroScale(number),
    ]);
    // Number → Entity bridge: phrases already shown in the families resolve to EXISTING entity nodes
    // (bounded to the shown phrases; nothing is created). This is what makes
    // "<phrase> · <method> = <number>" clickable into the canonical entity hub.
    const shownPhrases = gematriaFamilies.flatMap(group => (group.phrases || []).slice(0, SHOWN_PHRASES_PER_FAMILY).map(item => typeof item === "string" ? item : item?.phrase || item?.label));
    const [registryRows, entityNodes] = await Promise.all([
      fetchMethodRegistry(gematriaFamilies.map(group => group.method)),
      fetchNodesByLabels("entity", shownPhrases),
    ]);
    methodRegistry = registryRows;
    gematriaFamilies = enrichGematriaFamilies(gematriaFamilies, methodRegistry);
    phraseEntities = buildPhraseEntityLinks(entityNodes);
    numberJourney = projectNumberJourney(numberResearch);
  }

  return {
    v: 3,
    identity: {
      nodeId: String(node.id),
      type: node.type,
      key: node.identity_key || String(node.id),
      label: node.label,
      definition,
      finding: entityFinding,
      hubHref: hubHref(node.type, node.identity_key && node.type !== "number" ? node.label : node.label),
      // Canonical gematria identity of a non-number entity (null when the node has none / not public).
      gematria: methodBridge.identity,
    },
    // Entity → Number typed projection links (one per engine method); empty for number nodes.
    methodBridge: {
      results: methodBridge.results,
      engineFindings: methodBridge.engineFindings,
      note: "Projection links derived from canonical gematria identity + engine + Registry. Not graph edges, not claims; match/mismatch only where a stored canonical value exists.",
    },
    graph: {
      entity: entityFinding,
      relations: relationFindings,
    },
    research: {
      rows: research.rows,
      findings: research.findings,
      humanGate: humanGateSummary(research.rows),
      access: research.access,
    },
    topics,
    surface: publicSurface,
    gematria: {
      families: gematriaFamilies,
      registry: methodRegistry,
      // Number → Entity: shown phrase → existing canonical entity node (hub href). Missing = no node yet.
      phraseEntities,
      interactionDecision: "OPEN_HUMAN_GATE",
      note: "Method identity and engine result are live; the Method Inspector renders Registry semantics + the canonical trace (Method = Dimension). Decomposition UX beyond that remains a Human-Gate decision.",
    },
    numberWorlds: worlds,
    signatures,
    zeroScale,
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

// ── UNIVERSAL_EXPLORER_V1_SLICE1_GENERIC_LIST_MODE (work_log dispatch e3097bb5) ──
// Bounded, paginated, deterministically-ordered list over node-backed entity_types (number,
// entity, event, year, word, phrase, foreign_word, language_bridge — anything that lives
// directly in `nodes`). Read-only, no truth recomputation, no per-row batch enrichment (that
// is detail-composition work for a later slice — a caller wanting the full projection for one
// item still goes through fetchEntityHubProjection). Callers are responsible for never listing
// a type with zero real nodes (verse/name/person/place/object/research/fieldmap/relationship as
// of this audit) as a facet — per the standing empty-facet rule (reality_graph_law v4), this
// function does not fabricate placeholders for such a type; it honestly returns empty rows.
const LIST_MODE_DEFAULT_LIMIT = 24;
const LIST_MODE_MAX_LIMIT = 100;

/**
 * Pure. Builds the exact, deterministic query shape for a bounded node-type list — no network,
 * so bounds-clamping, the stable compound ordering, and type pass-through/isolation are all
 * unit-testable without mocking Supabase. rangeEnd deliberately requests one extra row (limit+1)
 * so the caller can detect hasMore without a second COUNT query.
 */
export function buildEntityListQuery({ type, limit = LIST_MODE_DEFAULT_LIMIT, offset = 0, activeOnly = true } = {}) {
  const safeType = clean(type);
  // Not safeLimit()/`||` — 0 is a falsy-but-valid clamp input (Number(0) || fallback would
  // silently return the fallback instead of clamping 0 up to 1).
  const numericLimit = Number(limit);
  const cap = Math.max(1, Math.min(Number.isFinite(numericLimit) ? numericLimit : LIST_MODE_DEFAULT_LIMIT, LIST_MODE_MAX_LIMIT));
  const safeOffset = Math.max(0, Number(offset) || 0);
  return {
    type: safeType,
    activeOnly: Boolean(activeOnly),
    // [column, ascending] — created_at desc (newest first) with id asc as a stable tiebreaker,
    // so two rows sharing a timestamp never swap order or get skipped/duplicated across pages.
    order: [["created_at", false], ["id", true]],
    rangeStart: safeOffset,
    rangeEnd: safeOffset + cap,
    limit: cap,
  };
}

export async function fetchEntityListByType(params = {}) {
  const q = buildEntityListQuery(params);
  if (!q.type) return { rows: [], hasMore: false };
  let query = supabase.from("nodes").select(NODE_FIELDS).eq("type", q.type);
  if (q.activeOnly) query = query.eq("is_active", true);
  for (const [col, ascending] of q.order) query = query.order(col, { ascending });
  const { data, error } = await query.range(q.rangeStart, q.rangeEnd);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return { rows: rows.slice(0, q.limit), hasMore: rows.length > q.limit };
}

export default fetchEntityHubProjection;
