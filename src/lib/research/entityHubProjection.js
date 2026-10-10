import { supabase, getEntityBundle, getValueFamilies } from "../supabase.js";
import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";
import { researchObjectFacetDimensions, researchObjectsToUniversalFindings } from "./researchObjectFinding.js";
import { fetchCanonicalTopicConvergenceFinding } from "./topicConvergence.js";
import { researchNumber } from "./numericResearch.js";
import { fetchCanonicalGematriaFindings } from "./canonicalGematria.js";
import { numberAnchorToUniversalFinding } from "./numberAnchorFinding.js";
import { makeUniversalFinding, VALID_VERIFICATION_STATES } from "./universalFinding.js";
import { canonicalMediaPublicLabel } from "../presentation/canonicalPresentation.js";
import { MEDIA_RELATION_KIND, buildMediaEnvelope, dedupeMediaEnvelopes, normalizeMediaPostSlug } from "./galleryMediaEnvelope.js";
import { canonicalResearchSourceRef, researchSourceOccurrenceKey, sourceOccurrenceMethodMentions } from "./sourceBundleProjection.js";
import { normalizeResearchDisplayText } from "./researchObjectPresentation.js";
import { fetchScriptureDiscoveryForFindings } from "./scriptureDiscoveryProjection.js";
import { fetchScriptureTermDiscoveryForFindings } from "./scriptureTermDiscoveryProjection.js";
import { buildTopicSourceContext, buildGallerySourceContext, INDIA_CAPTAIN_SOURCE, isPublicSourceImage, TOPIC_SOURCE_LIMIT, TOPIC_OCCURRENCE_LIMIT } from "./topicSourceContext.js";

const NODE_FIELDS = "id,type,label,description,metadata,identity_key,is_active,created_at";
const ENTITY_TYPE_FIELDS = "type,label,parent,icon,tabs,relations,stats,route_pattern";
const RESEARCH_FIELDS = "id,created_at,kind,statement,terms,value,relates,source,source_ref,contributor,confidence,engine_verified,engine_detail,status,privacy_scope,promoted_node_id,meta";
const VIDEO_SEMANTIC_MAP_FIELDS = "id,created_at,source_ref,terms,status,privacy_scope,meta";
const CHANNEL_UPDATE_SOURCE_FIELDS = "id,text,created_at,credit,speaker,channel,status,contributor_id";
const TOPIC_FIELDS = "id,slug,title,subtitle,status,quality,meter_score,approved_at,created_at,occurred_at,numbers,highlight_numbers,image_ids,created_by";
const NUMBER_ANCHOR_FIELDS = "value,category,fact,hint,created_at,updated_at";
const WORLD_MEDIA_FIELDS = "id,gallery_id,wp_gallery_id,ordering,name,description,image_url,thumb_url,published,curator_hidden,occurred_at,created_at,image_type,space,tags,source,ocr_text,ocr_status,ocr_numbers,ocr_meta,primary_value,all_values,related_values";
const TOPIC_MEDIA_FIELDS = `${WORLD_MEDIA_FIELDS},min_tier,wp_image_id`;
// db_column is the join key between the canonical engine output (gematria_api keys) and the Registry.
const METHOD_FIELDS = "method_key,db_column,display_label,sub,soul,required_entitlement,version,category,sort_order,active,in_engine,scannable,execution_kind,derived_from,operator";
// Public read model for Topic/Convergence (TOPIC_CARDS_PUBLIC_READ_MODEL_PRIVACY_FIX_V1): approved rows only,
// internal keys stripped server-side. Never the raw table from a public projection.
const TOPIC_SOURCE = "topic_cards_public";
const GW_IDENTITY_PREFIX = "gw:";
const HUB_ROUTE = "/entity-hub-preview";
const DEFAULT_NUMBER_RESEARCH_OPTIONS = Object.freeze({ lookupWindow: { limit: 500 } });

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

function dedupeRegistryRows(rows = []) {
  const byMethod = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.method_key) byMethod.set(String(row.method_key), row);
  }
  return [...byMethod.values()];
}

async function fetchResearchFacetRegistry(rows = []) {
  const tokens = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const facets = researchObjectFacetDimensions(row);
    for (const ref of facets?.methods || []) {
      const token = clean(ref?.token);
      if (token && !tokens.includes(token)) tokens.push(token);
    }
  }
  if (!tokens.length) return { rows: [], available: true };
  try {
    const [byMethodKey, byDbColumn] = await Promise.all([
      fetchMethodRegistry(tokens),
      fetchRegistryByDbColumns(tokens),
    ]);
    return { rows: dedupeRegistryRows([...byMethodKey, ...byDbColumn]), available: true };
  } catch {
    return { rows: [], available: false };
  }
}

export async function fetchResearchObjectsForEntity(node, { limit = 40, locale = "he" } = {}) {
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
    const methodRegistry = await fetchResearchFacetRegistry(rows);
    return {
      rows,
      findings: researchObjectsToUniversalFindings(rows, { locale, methodRegistry: methodRegistry.rows }),
      methodRegistryRows: methodRegistry.rows,
      methodRegistryAccess: { available: methodRegistry.available },
      access: { available: true, reason: null },
    };
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


/**
 * Narrow RLS-backed reader for the existing VIDEO_REPRESENTATION_MAP rows.
 * Same research_objects owner, no new store/registry and no access widening.
 * This avoids contextual video retrieval competing with unrelated research rows
 * inside the generic per-entity page limit.
 */

const CHANNEL_UPDATE_SOURCE_RE = /^channel_updates:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function channelUpdateIdFromResearchSourceRef(sourceRef) {
  const canonical = researchSourceOccurrenceKey(sourceRef);
  const match = canonical?.match(CHANNEL_UPDATE_SOURCE_RE);
  return match?.[1]?.toLowerCase() || null;
}

/**
 * RLS-backed Source Occurrence reader for research rows.
 * No source text is copied into research_objects and no attribution is inferred:
 * channel_updates remains the source owner. This reader is intended for authorized
 * inspection surfaces; callers must keep public/admin boundaries intact.
 */
export async function fetchResearchSourceOccurrences(rows = [], { limit = 120 } = {}) {
  const refs = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const canonical = researchSourceOccurrenceKey(row?.source_ref);
    const id = channelUpdateIdFromResearchSourceRef(row?.source_ref);
    if (canonical && id && !refs.has(id)) refs.set(id, canonical);
  }
  const cap = safeLimit(limit, 120, 240);
  const ids = [...refs.keys()].slice(0, cap);
  if (!ids.length) {
    return { occurrences: {}, methodRegistryRows: [], access: { available: true, reason: null }, truncated: false };
  }

  try {
    const chunks = [];
    for (let i = 0; i < ids.length; i += 40) chunks.push(ids.slice(i, i + 40));
    const results = await Promise.all(chunks.map(async (chunk) => {
      const { data, error } = await supabase
        .from("channel_updates")
        .select(CHANNEL_UPDATE_SOURCE_FIELDS)
        .in("id", chunk)
        .limit(chunk.length);
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    }));

    const sourceRows = results.flat();
    const seeded = sourceRows.map((row) => ({
      row,
      mentions: sourceOccurrenceMethodMentions(row?.text),
    }));
    const methodKeys = [...new Set(seeded
      .flatMap((item) => item.mentions)
      .map((mention) => clean(mention?.methodKey))
      .filter(Boolean))];

    let registryRows = [];
    try {
      registryRows = methodKeys.length ? await fetchMethodRegistry(methodKeys) : [];
    } catch {
      // Source wording must remain inspectable even if Registry lookup is unavailable.
      registryRows = [];
    }

    const occurrences = {};
    for (const { row } of seeded) {
      const id = clean(row?.id).toLowerCase();
      if (!id) continue;
      const ref = refs.get(id) || `channel_updates:${id}`;
      const originalText = row?.text == null ? null : String(row.text);
      occurrences[ref] = {
        contributorId: clean(row?.contributor_id) || null,
        contributorName: clean(row?.credit) || clean(row?.speaker) || null,
        channel: clean(row?.channel) || null,
        status: clean(row?.status) || null,
        createdAt: clean(row?.created_at) || null,
        originalText,
        displayTextNormalized: normalizeResearchDisplayText(originalText),
        methodMentions: sourceOccurrenceMethodMentions(originalText, { registryRows }),
      };
    }

    return {
      occurrences,
      methodRegistryRows: registryRows,
      access: { available: true, reason: null },
      truncated: refs.size > ids.length,
    };
  } catch (error) {
    if (isAccessDenied(error)) {
      return {
        occurrences: {},
        methodRegistryRows: [],
        access: { available: false, reason: "research_source_occurrences_not_readable_for_current_session" },
        truncated: false,
      };
    }
    throw error;
  }
}

export async function fetchVideoSemanticMapsForEntity(node, { limit = 24 } = {}) {
  if (!node?.id) return { rows: [], access: { available: true, reason: null } };
  const cap = safeLimit(limit, 24, 60);
  const label = clean(node.label);
  const identityKey = clean(node.identity_key);
  const terms = [...new Set([label, identityKey].filter(Boolean))];
  const queries = [];
  const mapOnly = (builder) => builder.contains("meta", { layer: "VIDEO_REPRESENTATION_MAP" });

  if (node.type === "number" && Number.isSafeInteger(Number(label))) {
    queries.push(runResearchQuery(
      mapOnly(supabase.from("research_objects").select(VIDEO_SEMANTIC_MAP_FIELDS).contains("terms", [String(Number(label))])),
      cap
    ));
  }

  for (const term of terms) {
    queries.push(runResearchQuery(
      mapOnly(supabase.from("research_objects").select(VIDEO_SEMANTIC_MAP_FIELDS).contains("terms", [term])),
      cap
    ));
  }

  if (!queries.length) return { rows: [], access: { available: true, reason: null } };

  try {
    const rows = dedupeRows(await Promise.all(queries)).slice(0, cap);
    return { rows, access: { available: true, reason: null } };
  } catch (error) {
    if (isAccessDenied(error)) {
      return { rows: [], access: { available: false, reason: "video_semantic_maps_not_readable_for_current_session" } };
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

export async function fetchMethodRegistry(methodKeys = []) {
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

// 2029 Anchor Profile projection. This intentionally does NOT revive the legacy Number-page
// getNumberAnchor() client path. World/Entity Hub reads the existing curated row directly and
// immediately converts it through the governed Universal Finding adapter, preserving the v8
// boundary: current curated context != engine truth != canonical/publication state.
async function fetchNumberAnchorProfile(number) {
  const { data, error } = await supabase
    .from("number_anchors")
    .select(NUMBER_ANCHOR_FIELDS)
    .eq("value", number)
    .maybeSingle();
  if (error) {
    if (isAccessDenied(error)) {
      return {
        row: null,
        finding: null,
        access: { available: false, reason: "number_anchor_not_readable_for_current_session" },
      };
    }
    throw error;
  }
  const row = data || null;
  return {
    row,
    finding: row ? numberAnchorToUniversalFinding(row) : null,
    access: { available: true, reason: null },
  };
}

function mediaRelationPriority(type) {
  if (type === "contains") return 0;
  if (type === "related" || type === "converges_on") return 1;
  if (type === "mentions") return 2;
  return 3;
}

async function fetchWorldMediaProjection(relationFindings, { limit = 8 } = {}) {
  const cap = safeLimit(limit, 8, 16);
  const candidates = new Map();

  for (const finding of relationFindings || []) {
    const relation = finding?.projection?.relations?.[0] || null;
    if (!relation) continue;
    for (const endpoint of [relation.from, relation.to]) {
      if (!endpoint?.id || !["image", "media"].includes(endpoint.type)) continue;
      const id = String(endpoint.id);
      const current = candidates.get(id);
      const next = {
        nodeId: id,
        relationType: relation.relationType || "related",
      };
      if (!current || mediaRelationPriority(next.relationType) < mediaRelationPriority(current.relationType)) {
        candidates.set(id, next);
      }
    }
  }

  const nodeIds = [...candidates.keys()].slice(0, 40);
  if (!nodeIds.length) return { items: [], access: { available: true, reason: null } };

  let mediaNodes = [];
  try {
    const { data, error } = await supabase
      .from("nodes")
      .select("id,type,label,metadata,created_at")
      .in("id", nodeIds)
      .in("type", ["image", "media"])
      .eq("is_active", true);
    if (error) throw error;
    mediaNodes = Array.isArray(data) ? data : [];
  } catch (error) {
    if (isAccessDenied(error)) {
      return { items: [], access: { available: false, reason: "media_graph_nodes_not_readable_for_current_session" } };
    }
    throw error;
  }

  const galleryIds = [...new Set(mediaNodes
    .map((node) => clean(node?.metadata?.gallery_image_id))
    .filter((value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)))];
  if (!galleryIds.length) return { items: [], access: { available: true, reason: null } };

  let galleryRows = [];
  try {
    const { data, error } = await supabase
      .from("gallery_images")
      .select(WORLD_MEDIA_FIELDS)
      .in("id", galleryIds)
      .eq("published", 1)
      .or("curator_hidden.is.null,curator_hidden.eq.false");
    if (error) throw error;
    galleryRows = Array.isArray(data) ? data : [];
  } catch (error) {
    if (isAccessDenied(error)) {
      return { items: [], access: { available: false, reason: "gallery_media_not_readable_for_current_session" } };
    }
    throw error;
  }

  const galleryById = new Map(galleryRows.map((row) => [String(row.id), row]));
  const built = mediaNodes.flatMap((node) => {
    const galleryId = clean(node?.metadata?.gallery_image_id);
    const row = galleryId ? galleryById.get(galleryId) : null;
    // Defense in depth: public media remains published + non-hidden even if a future reader
    // changes the server-side query. Representation availability never broadens publication.
    if (!row?.image_url || row.published !== 1 || row.curator_hidden === true) return [];
    const relationType = candidates.get(String(node.id))?.relationType || "related";
    const envelope = buildMediaEnvelope({
      row,
      node,
      relationType,
      label: canonicalMediaPublicLabel({ name: row.name, label: node.label, description: row.description }),
    });
    return envelope ? [envelope] : [];
  });
  // Contextual sort first, then dedupe by stable media identity (best relation wins).
  const items = built;
  items.sort((a, b) => (
    // Relation directness is the existing contextual projection reason. After that, use
    // temporal/stable identity only. Legacy gallery importance is intentionally NOT a
    // World ranking signal and cannot change public media order.
    mediaRelationPriority(a.relationType) - mediaRelationPriority(b.relationType)
    || String(b.occurredAt || b.createdAt || "").localeCompare(String(a.occurredAt || a.createdAt || ""))
    || a.galleryImageId.localeCompare(b.galleryImageId)
  ));

  const unique = dedupeMediaEnvelopes(items);
  return {
    items: unique.slice(0, cap),
    totalEligible: unique.length,
    access: { available: true, reason: null },
    note: "Direct Reality Graph adjacency supplies projection reason; published non-hidden gallery_images supplies the media representation. Presentation order is contextual only, never truth rank.",
  };
}

// Graph media for a bounded set of numbers ALREADY present in the research context. Reuses the
// canonical path only: resolveEntityHubNode (number node) -> fetchCanonicalGraphEntityFindings ->
// fetchWorldMediaProjection. No node/edge is created and no Post->Image edge is implied: the
// context numbers are the graph anchors, the media keeps relationKind=reality_graph.
export async function fetchGraphMediaForNumbers({ numbers = [], limit = 12, perNumberLimit = 8 } = {}) {
  const cap = safeLimit(limit, 12, 24);
  const list = [...new Set((Array.isArray(numbers) ? numbers : []).filter((n) => Number.isSafeInteger(n) && n > 0))].slice(0, 8);
  if (!list.length) return { items: [], access: { available: true, reason: null } };
  const results = await Promise.all(list.map(async (n) => {
    const node = await resolveEntityHubNode({ type: "number", key: String(n) });
    if (!node?.id) return { items: [], access: { available: true, reason: null } };
    const findings = await fetchCanonicalGraphEntityFindings(node.id, { relationLimit: 80 });
    const relations = findings.filter((finding) => finding?.kind === "graph-relation");
    return fetchWorldMediaProjection(relations, { limit: perNumberLimit });
  }));
  const merged = results.flatMap((r) => r.items || []);
  merged.sort((a, b) => (
    mediaRelationPriority(a.relationType) - mediaRelationPriority(b.relationType)
    || String(b.occurredAt || b.createdAt || "").localeCompare(String(a.occurredAt || a.createdAt || ""))
    || a.galleryImageId.localeCompare(b.galleryImageId)
  ));
  const items = dedupeMediaEnvelopes(merged);
  const denied = results.find((r) => r.access && r.access.available === false);
  return {
    items: items.slice(0, cap),
    totalEligible: items.length,
    access: denied ? denied.access : { available: true, reason: null },
    note: "Graph adjacency of context numbers via the canonical graph finding path; order is contextual only, never truth rank.",
  };
}

// Contextual media adapter for the EXACT stored post relation gallery_images.ocr_meta.post_slug.
// Admitted as relationKind=source_metadata (NOT reality_graph): no node/edge is read as proof
// or created. Same published + non-hidden gate as graph media; public-safe for any viewer.
// Graph-derived media (optional graphMedia from fetchWorldMediaProjection) is merged and deduped
// by stable mediaId, graph relation winning on collision.
export async function fetchPostContextMedia({ postSlug, graphMedia = [], numbers = [], limit = 12 } = {}) {
  const slug = normalizeMediaPostSlug(postSlug);
  const cap = safeLimit(limit, 12, 24);
  // Graph media from existing context numbers (explicit graphMedia, if given, wins first).
  let graphItems = Array.isArray(graphMedia) ? graphMedia : [];
  let graphAccess = { available: true, reason: null };
  if (Array.isArray(numbers) && numbers.length) {
    try {
      const viaNumbers = await fetchGraphMediaForNumbers({ numbers, limit: cap });
      graphItems = dedupeMediaEnvelopes([...graphItems, ...viaNumbers.items]);
      if (viaNumbers.access) graphAccess = viaNumbers.access;
    } catch (error) {
      // A graph read failure must not hide exact source_metadata media; with no slug there is nothing else to show.
      if (!slug) throw error;
    }
  }
  graphMedia = graphItems;
  // source_metadata is ADDITIVE: only an exact valid slug adds it; without one the graph result stands.
  if (!slug) {
    const only = dedupeMediaEnvelopes(graphMedia);
    return {
      items: only.slice(0, cap),
      totalEligible: only.length,
      access: graphAccess,
      note: "graph-derived media only (no valid post slug); no source_metadata lookup, no fuzzy matching.",
    };
  }
  // Stored slugs may be raw or percent-encoded; match both exact forms (no fuzzy matching).
  const variants = [...new Set([slug, encodeURIComponent(slug)])];
  let rows = [];
  try {
    const { data, error } = await supabase
      .from("gallery_images")
      .select(WORLD_MEDIA_FIELDS)
      .in("ocr_meta->>post_slug", variants)
      .eq("published", 1)
      .or("curator_hidden.is.null,curator_hidden.eq.false")
      .limit(cap);
    if (error) throw error;
    rows = Array.isArray(data) ? data : [];
  } catch (error) {
    if (isAccessDenied(error)) {
      return { items: dedupeMediaEnvelopes(graphMedia).slice(0, cap), access: { available: false, reason: "gallery_media_not_readable_for_current_session" } };
    }
    throw error;
  }
  const metaItems = rows.flatMap((row) => {
    if (!row?.image_url || row.published !== 1 || row.curator_hidden === true) return [];
    if (normalizeMediaPostSlug(row?.ocr_meta?.post_slug) !== slug) return [];
    const envelope = buildMediaEnvelope({
      row,
      relationType: "post_metadata",
      relationKind: MEDIA_RELATION_KIND.SOURCE_METADATA,
      postSlug: slug,
      label: canonicalMediaPublicLabel({ name: row.name, description: row.description }),
    });
    return envelope ? [envelope] : [];
  });
  const items = dedupeMediaEnvelopes([...(graphMedia || []), ...metaItems]);
  return {
    items: items.slice(0, cap),
    totalEligible: items.length,
    access: graphAccess.available === false ? graphAccess : { available: true, reason: null },
    note: "source_metadata context relation (ocr_meta.post_slug) is distinct from reality_graph adjacency; no edge/node is created. Order is contextual only.",
  };
}

// Existing public Topic memberships, then exact-object historical appearances. All reads are
// bounded; numeric similarity never seeds a query. Gallery SELECT RLS does not filter hidden,
// unpublished or entitled rows, so this reader applies AND rechecks all three public gates.
export async function fetchTopicSourceContext({ topicSlug, client = supabase } = {}) {
  const slug = normalizeMediaPostSlug(topicSlug);
  if (!slug) return null;
  const { data: topic, error: topicError } = await client.from(TOPIC_SOURCE)
    .select("id,slug,title,status,node_id,image_ids").eq("slug", slug).eq("status", "approved").maybeSingle();
  if (topicError) throw topicError;
  if (!topic || topic.status !== "approved" || topic.slug !== slug) return null;

  const ids = [...new Set(Array.isArray(topic.image_ids) ? topic.image_ids.slice(0, TOPIC_SOURCE_LIMIT) : [])];
  const publicImages = (query) => query.eq("published", 1).eq("min_tier", 0)
    .or("curator_hidden.is.null,curator_hidden.eq.false");
  const { data: selectedRows, error: imageError } = ids.length
    ? await publicImages(client.from("gallery_images").select(TOPIC_MEDIA_FIELDS).in("id", ids)).limit(TOPIC_SOURCE_LIMIT)
    : { data: [] };
  if (imageError) throw imageError;
  const images = (selectedRows || []).filter(isPublicSourceImage);
  const urls = [...new Set(images.map((row) => row.image_url))];
  const [appearances, postResult] = await Promise.all([
    urls.length
      ? publicImages(client.from("gallery_images").select(TOPIC_MEDIA_FIELDS, { count: "exact" }).in("image_url", urls))
        .order("gallery_id").order("ordering").order("id").limit(TOPIC_OCCURRENCE_LIMIT)
      : Promise.resolve({ data: [], count: 0 }),
    slug === INDIA_CAPTAIN_SOURCE.topicSlug
      ? client.from("posts").select("id,slug,title,content,tags,author,authors,date,modified")
        .eq("id", INDIA_CAPTAIN_SOURCE.postId).eq("slug", INDIA_CAPTAIN_SOURCE.postSlug).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (appearances.error) throw appearances.error;
  const occurrences = (appearances.data || []).filter(isPublicSourceImage);
  const galleryIds = [...new Set([...images, ...occurrences].map((row) => row.gallery_id).filter(Boolean))];
  const { data: galleries, error: galleryError } = galleryIds.length
    ? await client.from("galleries").select("id,wp_gallery_id,name").in("id", galleryIds).limit(TOPIC_OCCURRENCE_LIMIT + TOPIC_SOURCE_LIMIT)
    : { data: [] };
  if (galleryError) throw galleryError;
  const projection = buildTopicSourceContext({
    topic, images, occurrences, galleries: galleries || [], post: postResult.error ? null : postResult.data,
    occurrencesTruncated: appearances.count > TOPIC_OCCURRENCE_LIMIT,
  });
  if (projection && postResult.error) projection.coverage.captain = "source_read_failed";
  return projection;
}

// Exact-source public read, bounded before querying. No OCR/numeric search, admission or tagging.
export async function fetchGallerySourceContext({ imageIds = [], client = supabase } = {}) {
  const ids = [...new Set(imageIds.filter((id) => /^[a-f0-9-]{36}$/i.test(id)))].slice(0, 12);
  if (!ids.length) return { items: [], occurrencesTruncated: false };
  const admitted = (query) => query.eq("published", 1).eq("min_tier", 0).or("curator_hidden.is.null,curator_hidden.eq.false");
  const selected = await admitted(client.from("gallery_images").select(TOPIC_MEDIA_FIELDS).in("id", ids)).limit(12);
  if (selected.error) throw selected.error;
  const images = (selected.data || []).filter(isPublicSourceImage);
  const urls = [...new Set(images.map((row) => row.image_url))];
  const appearances = urls.length ? await admitted(client.from("gallery_images").select(TOPIC_MEDIA_FIELDS, { count: "exact" }).in("image_url", urls))
    .order("gallery_id").order("ordering").order("id").limit(TOPIC_OCCURRENCE_LIMIT) : { data: [], count: 0 };
  if (appearances.error) throw appearances.error;
  const occurrences = (appearances.data || []).filter(isPublicSourceImage);
  const galleryIds = [...new Set([...images, ...occurrences].map((row) => row.gallery_id).filter(Boolean))];
  const galleries = galleryIds.length ? await client.from("galleries").select("id,wp_gallery_id,name").in("id", galleryIds).limit(TOPIC_OCCURRENCE_LIMIT) : { data: [] };
  if (galleries.error) throw galleries.error;
  return { items: buildGallerySourceContext({ images, occurrences, galleries: galleries.data || [] }),
    occurrencesTruncated: appearances.count > TOPIC_OCCURRENCE_LIMIT };
}

export async function fetchPublicWorldPostSource({ postId, client = supabase } = {}) {
  if (!Number.isSafeInteger(postId)) return null;
  const result = await client.from("posts").select("id,slug,title,content,tags,source,home_hidden,author,authors,date,modified")
    .eq("id", postId).maybeSingle();
  if (result.error) throw result.error;
  const { postRowToWorldUpdate } = await import("./worldDiscoveryStream.js");
  return postRowToWorldUpdate(result.data) ? result.data : null;
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
    const humanLabel = clean(finding?.view?.rendererHints?.presentation?.sourceLabel);
    if (sourceRef) refs.set(sourceRef, {
      type: "research-source",
      ref: sourceRef,
      label: humanLabel || sourceRef,
    });
  }
  for (const source of Array.isArray(numberJourney?.sources) ? numberJourney.sources : []) {
    const sourceObject = source && typeof source === "object" ? source : null;
    const label = clean(sourceObject?.label ?? source);
    const ref = clean(sourceObject?.ref) || null;
    if (label) refs.set(`journey:${ref || label}`, {
      type: sourceObject?.type || "number-journey-source",
      ref,
      label,
      text: clean(sourceObject?.text) || null,
      value: Number.isFinite(Number(sourceObject?.value)) ? Number(sourceObject.value) : null,
      matchKind: clean(sourceObject?.matchKind) || null,
    });
  }
  return [...refs.values()];
}

function timelineProjection(graphFindings, researchFindings) {
  return [...(graphFindings || []), ...(researchFindings || [])]
    .map(finding => ({
      id: finding?.id || null,
      kind: finding?.kind || null,
      type: finding?.subject?.type || null,
      label: finding?.subject?.label || "",
      at: finding?.provenance?.createdAt || null,
      status: finding?.status ?? null,
      access: finding?.access?.tier ?? null,
      relation: finding?.kind === "graph-relation"
        ? (finding?.projection?.relations?.[0] || null)
        : null,
      // Pass-through only: an href already projected on a related endpoint (post with stored slug).
      href: finding?.kind === "graph-relation"
        ? (finding?.projection?.relations?.[0]?.to?.href
          || finding?.projection?.relations?.[0]?.from?.href
          || null)
        : null,
      sourceRef: finding?.source?.sourceRef || null,
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
          text: text || null,
          value: Number.isFinite(Number(raw?.sources?.value)) ? Number(raw.sources.value) : null,
          matchKind: "verse_gematria",
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
  locale = "he",
  relationLimit = 100,
  researchLimit = 40,
  topicLimit = 12,
  numberResearchLenses = null,
  numberLookupLimit = 500,
  includeMedia = true,
  includeScriptureDiscovery = true,
  includeScriptureTermDiscovery = true,
  topicSourceSlug = null,
} = {}) {
  const node = await resolveEntityHubNode({ nodeId, type, key });
  if (!node) return null;

  const [definition, graphFindings, research, topicSources] = await Promise.all([
    fetchEntityTypeDefinition(node.type),
    fetchCanonicalGraphEntityFindings(node.id, { relationLimit: safeLimit(relationLimit, 100, 200) }),
    fetchResearchObjectsForEntity(node, { limit: researchLimit, locale }),
    topicSourceSlug ? fetchTopicSourceContext({ topicSlug: topicSourceSlug })
      .catch(() => ({ items: [], access: { available: false, reason: "topic_sources_unavailable" } })) : Promise.resolve(null),
  ]);

  const entityFinding = graphFindings.find(finding => finding?.kind === "graph-entity") || null;
  const relationFindings = graphFindings.filter(finding => finding?.kind === "graph-relation");
  const media = includeMedia
    ? await fetchWorldMediaProjection(relationFindings, { limit: 8 })
    : { items: [], access: { available: true, reason: "deferred_by_projection_profile" } };
  let topics = { rows: [], findings: [] };
  let numberResearch = null;
  let numberJourney = null;
  let publicSurface = null;
  let gematriaFamilies = [];
  let methodRegistry = [];
  let worlds = [];
  let signatures = [];
  let zeroScale = null;
  let anchorProfile = { row: null, finding: null, access: { available: true, reason: null } };
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
    [topics, numberResearch, publicSurface, gematriaFamilies, worlds, signatures, zeroScale, anchorProfile] = await Promise.all([
      fetchTopicFindingsForNumber(number, { limit: topicLimit }),
      researchNumber(number, {
        lenses: Array.isArray(numberResearchLenses) && numberResearchLenses.length
          ? numberResearchLenses
          : ["number_lookup", "number_dossier", "number_journey", "neighbors", "research_objects"],
        budget: { maxLenses: Math.max(1, Math.min(
          5,
          Array.isArray(numberResearchLenses) && numberResearchLenses.length ? numberResearchLenses.length : 5,
        )), depth: 1 },
        rpc: (name, args) => supabase.rpc(name, args),
        fetchResearchObjects: async () => ({ data: research.rows }),
        researchObjectLimit: researchLimit,
        // World deep view must be able to show the complete canonical reverse-lookup source
        // population. Numeric Research still owns the bounded/source-exhaustive contract and caps
        // this at 500 rows; World does not implement a parallel lookup or ordering rule.
        lookupWindow: numberLookupLimit === 500
          ? DEFAULT_NUMBER_RESEARCH_OPTIONS.lookupWindow
          : { limit: safeLimit(numberLookupLimit, 500, 500) },
        provenance: { requestSource: "entity-hub-projection-v2", inputRef: `node:${node.id}` },
      }),
      getEntityBundle({ term: String(number), value: number, isNumber: true }),
      getValueFamilies(number, 12),
      fetchNumberWorlds(number),
      fetchNumberSignatures(number),
      fetchZeroScale(number),
      fetchNumberAnchorProfile(number),
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

  // Generic Research Finding → Scripture discovery is a bounded read-only projection.
  // Number nodes already expose the same-value verse path through numberJourney, so do not
  // issue a duplicate verse lookup there. Same-value verses are discovery leads only.
  const [scriptureDiscovery, scriptureTermDiscovery] = !isNumberNode
    ? await Promise.all([
        includeScriptureDiscovery
          ? fetchScriptureDiscoveryForFindings(research.findings, { maxSeeds: 3, verseLimit: 6 })
          : Promise.resolve(null),
        includeScriptureTermDiscovery
          ? fetchScriptureTermDiscoveryForFindings(research.findings, { maxGroups: 2, maxTerms: 2, resultLimit: 6, proximityGap: 6 })
          : Promise.resolve(null),
      ])
    : [null, null];

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
    media,
    // Opt-in Topic composition only; Number/Posts/World retain their existing query profile.
    sourceContext: topicSources?.topicNodeId && topicSources.topicNodeId !== String(node.id) ? null : topicSources,
    research: {
      rows: research.rows,
      findings: research.findings,
      scriptureDiscovery,
      scriptureTermDiscovery,
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
    anchorProfile,
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

// GPT challenge 165a9e59 correction (1): the public Explorer-facing fetch path must not let an
// arbitrary type value through — `nodes` also holds non-facet families (rule=311, post=306,
// image=2476, contribution=24, ...) that a stray/future caller must never be able to list as if
// they were Explorer content. This allowlist is the v1 populated-facet set confirmed live in
// audit 77d82836 (node-backed, non-empty entity_types); it is enforced only in the fetch
// function below, not in the pure builder, which stays generic (buildEntityListQuery is also
// used directly by unit tests that intentionally probe out-of-allowlist/empty type inputs).
// Exported (Slice 2, work_log dispatch 0b70e0f9) so the Explorer facet registry imports this
// SAME array rather than hand-duplicating it — the two can then never drift out of sync.
export const EXPLORER_LIST_MODE_TYPES = Object.freeze([
  "number", "entity", "event", "year", "word", "phrase", "foreign_word", "language_bridge",
]);

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

// UNIVERSAL_EXPLORER_V1_SLICE7_SEARCH_COMPOSITION: strips Postgres LIKE wildcard/control chars
// (%,_) so free-text `q` can never be interpreted as a wildcard/operator injection when wrapped
// in our own `%term%` — same discipline as researchViewerProjection.searchResearchViewerGraphEntities's
// existing bounded label search, which this reuses rather than forking a second search reader.
function normalizeSearchTerm(value) {
  const cleaned = clean(value).replace(/[%_]/g, "").trim();
  return cleaned || null;
}

/**
 * Pure. Builds the exact, deterministic query shape for a bounded node-type list — no network,
 * so bounds-clamping, the stable compound ordering, and type pass-through/isolation are all
 * unit-testable without mocking Supabase. rangeEnd deliberately requests one extra row (limit+1)
 * so the caller can detect hasMore without a second COUNT query. Intentionally generic (any
 * type string, activeOnly togglable) — the v1 populated-facet allowlist + forced activeOnly=true
 * live in fetchEntityListByType below, the actual public read path, not here.
 *
 * `search` (Slice 7): a normalized, trimmed, wildcard-stripped label term, or null when `q` is
 * empty/whitespace-only — an absent search never changes the query shape below, so the no-query
 * read path stays byte-identical to pre-Slice-7 behavior.
 */
export function buildEntityListQuery({ type, limit = LIST_MODE_DEFAULT_LIMIT, offset = 0, activeOnly = true, q = null } = {}) {
  const safeType = clean(type);
  const cap = normalizeLimit(limit, LIST_MODE_DEFAULT_LIMIT, LIST_MODE_MAX_LIMIT);
  const safeOffset = normalizeNonNegativeInt(offset, 0);
  return {
    type: safeType,
    activeOnly: Boolean(activeOnly),
    search: normalizeSearchTerm(q),
    // [column, ascending] — created_at desc (newest first) with id asc as a stable tiebreaker,
    // so two rows sharing a timestamp never swap order or get skipped/duplicated across pages.
    order: [["created_at", false], ["id", true]],
    rangeStart: safeOffset,
    rangeEnd: safeOffset + cap,
    limit: cap,
  };
}

/**
 * Pure. Resolves the Explorer-facing list params: enforces the v1 populated-facet allowlist and
 * forces activeOnly=true unconditionally regardless of caller input. Returns null for a
 * disallowed/unsupported/empty type — fetchEntityListByType short-circuits to an empty result
 * for such a type without ever touching the network, and this decision is unit-testable in
 * isolation from that network call.
 */
export function resolveExplorerListParams(params = {}) {
  const requestedType = clean(params?.type);
  if (!EXPLORER_LIST_MODE_TYPES.includes(requestedType)) return null;
  return { ...params, type: requestedType, activeOnly: true };
}

/**
 * Public Explorer-facing list reader. Enforces the v1 populated-facet allowlist and forces
 * activeOnly=true unconditionally — a caller-supplied type outside the allowlist, or an
 * unsupported/empty type, returns an empty result deterministically; it never silently
 * broadens to another node family or leaks inactive nodes.
 *
 * Slice 7: `q` (optional) narrows the SAME bounded query with a source-side `.ilike("label")`
 * BEFORE `.range()` — search always constrains the candidate set at the reader, never a
 * whole-page-then-client-filter. Empty/whitespace `q` leaves the query byte-identical to
 * pre-Slice-7 behavior (no extra filter is ever attached).
 */
export async function fetchEntityListByType(params = {}) {
  const resolved = resolveExplorerListParams(params);
  if (!resolved) return { rows: [], hasMore: false };
  const q = buildEntityListQuery(resolved);
  let query = supabase.from("nodes").select(NODE_FIELDS).eq("type", q.type).eq("is_active", true);
  if (q.search) query = query.ilike("label", `%${q.search}%`);
  for (const [col, ascending] of q.order) query = query.order(col, { ascending });
  const { data, error } = await query.range(q.rangeStart, q.rangeEnd);
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return { rows: rows.slice(0, q.limit), hasMore: rows.length > q.limit };
}

export default fetchEntityHubProjection;
