import { researchObjectFacetDimensions } from "./researchObjectFinding.js";

const clean = (value) => value == null ? "" : String(value).trim();

const RESEARCH_FIELDS = "id,created_at,kind,statement,terms,value,source,source_ref,contributor,engine_verified,engine_detail,status,meta,privacy_scope";
const METHOD_FIELDS = "method_key,db_column,display_label,active,in_engine,scannable,execution_kind,category,sort_order";
const DEFAULT_CORPUS_LIMIT = 10000;
const PAGE_SIZE = 1000;

export const RESEARCHER_OPERATION_FILTERS = Object.freeze([
  Object.freeze({ key: "all", label: "הכול" }),
  Object.freeze({ key: "single", label: "שוויונות" }),
  Object.freeze({ key: "multiplication", label: "הכפלות" }),
  Object.freeze({ key: "addition", label: "סכומים" }),
  Object.freeze({ key: "chain", label: "שרשראות" }),
  Object.freeze({ key: "spatial", label: "מרחבי / תלת־ממד" }),
  Object.freeze({ key: "regular", label: "גימטריה רגילה" }),
  Object.freeze({ key: "non_regular", label: "שיטות לא רגילות" }),
  Object.freeze({ key: "method_unresolved", label: "שיטה לא מקושרת" }),
  Object.freeze({ key: "unresolved", label: "לא פתור" }),
]);

function compoundOf(row) {
  return row?.engine_detail?.compound || null;
}

function finalVerificationOk(row) {
  if (row?.engine_verified === true) return true;
  const compound = compoundOf(row);
  const statuses = [
    row?.engine_detail?.reverification?.status,
    row?.engine_detail?.verification?.status,
    compound?.status,
  ].map(clean);
  return statuses.some((status) => status === "verified" || status === "ENGINE_VERIFIED_COMPOSITE");
}

export function researcherOperationTags(row) {
  const tags = new Set();
  const compound = compoundOf(row);
  const kind = clean(compound?.kind);
  const text = clean(compound?.text || compound?.raw || row?.statement);

  if (!compound && row?.engine_detail?.verification) tags.add("single");
  if (kind === "single-verification") tags.add("single");
  if (["quantity-product", "two-phrase-product", "number-product-equals-phrase"].includes(kind)) tags.add("multiplication");
  if (kind === "phrase-sum-chain") tags.add("addition");
  if (kind.includes("chain") || kind === "phrase-sum-chain") tags.add("chain");

  // Some admitted historical rows were normalized into general-chain while preserving
  // the exact parsed operation text. These tags are presentation/search facets only;
  // they do not create calculation truth or alter the canonical extraction.
  if (/[×*]/u.test(text) || /\bפעמים\b/u.test(text)) tags.add("multiplication");
  if (/[+＋]/u.test(text)) tags.add("addition");
  if (compound && !tags.has("chain") && (Array.isArray(compound.operands) || compound.operand)) tags.add("chain");

  if (!finalVerificationOk(row)) tags.add("unresolved");
  if (!tags.size) tags.add("single");
  return [...tags];
}

function pushToken(out, seen, kind, label, value = null, method = null) {
  const text = clean(label);
  if (!text && value == null) return;
  const key = `${kind}:${text}:${value ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(Object.freeze({
    kind,
    label: text || String(value),
    value: value == null ? null : Number(value),
    method: clean(method) || null,
  }));
}

export function researcherRowTokens(row) {
  const out = [];
  const seen = new Set();
  const compound = compoundOf(row);
  const operands = Array.isArray(compound?.operands)
    ? compound.operands
    : compound?.operand ? [compound.operand] : [];

  for (const operand of operands) {
    if (operand?.phrase) pushToken(out, seen, "phrase", operand.phrase, operand.value, operand.method);
    if (Number.isFinite(Number(operand?.value))) pushToken(out, seen, "number", String(operand.value), operand.value, operand.method);
  }

  const verification = row?.engine_detail?.verification || null;
  if (verification?.phrase) pushToken(out, seen, "phrase", verification.phrase, verification.computed ?? verification.claimed, verification.method);
  if (Number.isFinite(Number(verification?.computed ?? verification?.claimed))) {
    const n = Number(verification?.computed ?? verification?.claimed);
    pushToken(out, seen, "number", String(n), n, verification?.method);
  }

  for (const term of Array.isArray(row?.terms) ? row.terms : []) {
    const t = clean(term);
    if (!t || /[=×+]/u.test(t)) continue;
    pushToken(out, seen, /^\d+$/.test(t) ? "number" : "phrase", t, /^\d+$/.test(t) ? Number(t) : null, null);
  }

  if (Number.isFinite(Number(row?.value))) pushToken(out, seen, "number", String(row.value), row.value, null);
  return out;
}

function isRegularMethod(method) {
  return clean(method?.methodKey) === "רגיל" || clean(method?.dbColumn).toLowerCase() === "ragil";
}

function methodFacetState(facets) {
  const canonicalMethods = Array.isArray(facets?.canonicalMethods) ? facets.canonicalMethods : [];
  const methodRefs = Array.isArray(facets?.methods) ? facets.methods : [];
  const resolvedTokens = new Set(canonicalMethods.flatMap((method) => (
    Array.isArray(method?.refs) ? method.refs.map((ref) => clean(ref?.token)).filter(Boolean) : []
  )));
  return {
    canonicalMethods,
    methodRefs,
    hasRegular: canonicalMethods.some(isRegularMethod),
    hasNonRegular: canonicalMethods.some((method) => !isRegularMethod(method)),
    hasUnresolved: methodRefs.some((ref) => !resolvedTokens.has(clean(ref?.token))),
  };
}

export function normalizeResearcherCorpusRow(row, { registryRows = [] } = {}) {
  const operationTags = researcherOperationTags(row);
  const tokens = researcherRowTokens(row);
  const compound = compoundOf(row);
  const verification = row?.engine_detail?.verification || null;
  const researchFacets = researchObjectFacetDimensions(row, { registryRows });
  const methods = methodFacetState(researchFacets);
  if (researchFacets?.spatial) operationTags.push("spatial");
  if (methods.hasRegular) operationTags.push("regular");
  if (methods.hasNonRegular) operationTags.push("non_regular");
  if (methods.hasUnresolved) operationTags.push("method_unresolved");
  return Object.freeze({
    id: String(row?.id || ""),
    statement: clean(row?.statement) || "ממצא מחקר",
    value: Number.isFinite(Number(row?.value)) ? Number(row.value) : null,
    kind: clean(row?.kind) || "observation",
    status: clean(row?.status) || null,
    privacyScope: clean(row?.privacy_scope) || null,
    source: clean(row?.source) || null,
    sourceRef: clean(row?.source_ref) || null,
    contributor: clean(row?.contributor) || null,
    createdAt: row?.created_at || null,
    engineVerified: row?.engine_verified === true,
    operationKind: clean(compound?.kind) || (verification ? "single-verification" : "other"),
    operationTags: Object.freeze([...new Set(operationTags)]),
    tokens: Object.freeze(tokens),
    canonicalMethods: Object.freeze(methods.canonicalMethods.map((method) => Object.freeze({
      methodKey: clean(method?.methodKey),
      dbColumn: clean(method?.dbColumn) || null,
      displayLabel: clean(method?.displayLabel) || clean(method?.methodKey),
    }))),
    unresolvedMethodRefs: Object.freeze(methods.methodRefs
      .filter((ref) => !methods.canonicalMethods.some((method) => (
        Array.isArray(method?.refs) && method.refs.some((resolved) => clean(resolved?.token) === clean(ref?.token))
      )))
      .map((ref) => Object.freeze({ token: clean(ref?.token), basis: clean(ref?.basis) || null }))),
    spatial: researchFacets?.spatial ? Object.freeze({ ...researchFacets.spatial }) : null,
    spatialFamily: researchFacets?.family ? Object.freeze({ ...researchFacets.family }) : null,
    researchFacets,
  });
}

export function filterResearcherCorpus(rows, { query = "", operation = "all" } = {}) {
  const q = clean(query).toLocaleLowerCase("he");
  return (rows || []).filter((row) => {
    if (operation && operation !== "all" && !row.operationTags.includes(operation)) return false;
    if (!q) return true;
    const haystack = [
      row.statement,
      row.value,
      row.operationKind,
      row.source,
      row.sourceRef,
      ...(row.canonicalMethods || []).flatMap((method) => [method.methodKey, method.displayLabel, method.dbColumn]),
      ...(row.unresolvedMethodRefs || []).flatMap((method) => [method.token, method.basis]),
      row.spatial?.role,
      row.spatial?.cluster,
      row.spatial?.mediaClass,
      row.spatialFamily?.key,
      row.spatialFamily?.cluster,
      row.spatialFamily?.role,
      row.spatialFamily?.classification,
      ...(row.tokens || []).flatMap((token) => [token.label, token.value, token.method]),
    ].filter(v => v != null).join(" ").toLocaleLowerCase("he");
    return haystack.includes(q);
  });
}

export function researcherCorpusCounts(rows) {
  const counts = {
    all: rows?.length || 0,
    single: 0,
    multiplication: 0,
    addition: 0,
    chain: 0,
    spatial: 0,
    regular: 0,
    non_regular: 0,
    method_unresolved: 0,
    unresolved: 0,
  };
  for (const row of rows || []) {
    for (const tag of row.operationTags || []) {
      if (Object.prototype.hasOwnProperty.call(counts, tag)) counts[tag] += 1;
    }
  }
  return Object.freeze(counts);
}

function countedRows(map) {
  return Object.freeze([...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "he"))
    .map((item) => Object.freeze(item)));
}

export function researcherCorpusIndex(rows) {
  const methods = new Map();
  const spatialClusters = new Map();
  let methodTaggedRows = 0;
  let spatialRows = 0;
  let spatialWithoutMethod = 0;
  let spatialWithoutSourceRef = 0;
  let unresolvedMethodRows = 0;

  for (const row of rows || []) {
    if (row.canonicalMethods?.length) methodTaggedRows += 1;
    if (row.unresolvedMethodRefs?.length) unresolvedMethodRows += 1;
    for (const method of row.canonicalMethods || []) {
      const key = method.methodKey;
      const current = methods.get(key) || {
        key,
        label: method.displayLabel || key,
        dbColumn: method.dbColumn || null,
        regular: isRegularMethod(method),
        count: 0,
      };
      current.count += 1;
      methods.set(key, current);
    }
    if (row.spatial) {
      spatialRows += 1;
      if (!row.canonicalMethods?.length) spatialWithoutMethod += 1;
      if (!row.sourceRef) spatialWithoutSourceRef += 1;
      const key = clean(row.spatialFamily?.key) || clean(row.spatial?.cluster) || "spatial:unclustered";
      const label = clean(row.spatial?.cluster) || clean(row.spatialFamily?.cluster) || "מרחבי · ללא אשכול";
      const current = spatialClusters.get(key) || { key, label, count: 0 };
      current.count += 1;
      spatialClusters.set(key, current);
    }
  }

  return Object.freeze({
    methods: countedRows(methods),
    spatialClusters: countedRows(spatialClusters),
    coverage: Object.freeze({
      rows: rows?.length || 0,
      methodTaggedRows,
      spatialRows,
    }),
    islands: Object.freeze({
      unresolvedMethodRows,
      spatialWithoutMethod,
      spatialWithoutSourceRef,
    }),
  });
}

async function fetchPagedResearchRows(supabase, contributorName, { limit = DEFAULT_CORPUS_LIMIT } = {}) {
  const maxRows = Math.max(1, Math.min(Number(limit) || DEFAULT_CORPUS_LIMIT, DEFAULT_CORPUS_LIMIT));
  const rows = [];
  let total = null;

  while (rows.length < maxRows) {
    const from = rows.length;
    const to = Math.min(from + PAGE_SIZE, maxRows) - 1;
    const { data, error, count } = await supabase
      .from("research_objects")
      .select(RESEARCH_FIELDS, { count: "exact" })
      .eq("contributor", contributorName)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    if (Number.isFinite(Number(count))) total = Number(count);
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (!page.length || page.length < (to - from + 1) || (total != null && rows.length >= total)) break;
  }

  return {
    rows: rows.slice(0, maxRows),
    total: total ?? rows.length,
    truncated: total != null ? rows.length < total : rows.length >= maxRows,
  };
}

export async function fetchResearcherCorpusBySlugWithClient(supabase, slug, { limit = DEFAULT_CORPUS_LIMIT } = {}) {
  const safeSlug = clean(slug);
  if (!safeSlug) return {
    contributor: null,
    rows: [],
    counts: researcherCorpusCounts([]),
    index: researcherCorpusIndex([]),
    coverage: Object.freeze({ loaded: 0, total: 0, truncated: false }),
  };

  const { data: contributor, error: contributorError } = await supabase
    .from("contributors")
    .select("id,slug,display_name,kind,role,specialty,specialty_label,active,locked,dossier_settings,wa_names")
    .eq("slug", safeSlug)
    .maybeSingle();
  if (contributorError) throw contributorError;
  if (!contributor) return {
    contributor: null,
    rows: [],
    counts: researcherCorpusCounts([]),
    index: researcherCorpusIndex([]),
    coverage: Object.freeze({ loaded: 0, total: 0, truncated: false }),
  };

  const [corpus, registryResult] = await Promise.all([
    fetchPagedResearchRows(supabase, contributor.display_name, { limit }),
    supabase
      .from("gematria_methods")
      .select(METHOD_FIELDS)
      .order("sort_order", { ascending: true, nullsFirst: false }),
  ]);
  if (registryResult.error) throw registryResult.error;

  const registryRows = Array.isArray(registryResult.data) ? registryResult.data : [];
  const rows = corpus.rows.map((row) => normalizeResearcherCorpusRow(row, { registryRows }));
  return Object.freeze({
    contributor: Object.freeze(contributor),
    rows: Object.freeze(rows),
    counts: researcherCorpusCounts(rows),
    index: researcherCorpusIndex(rows),
    coverage: Object.freeze({ loaded: rows.length, total: corpus.total, truncated: corpus.truncated }),
  });
}

export async function fetchResearcherCorpusBySlug(slug, options = {}) {
  const { supabase } = await import("../supabase.js");
  return fetchResearcherCorpusBySlugWithClient(supabase, slug, options);
}
