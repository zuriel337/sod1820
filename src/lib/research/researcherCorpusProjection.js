import { supabase } from "../supabase.js";

const clean = (value) => value == null ? "" : String(value).trim();

export const RESEARCHER_OPERATION_FILTERS = Object.freeze([
  Object.freeze({ key: "all", label: "הכול" }),
  Object.freeze({ key: "single", label: "שוויונות" }),
  Object.freeze({ key: "multiplication", label: "הכפלות" }),
  Object.freeze({ key: "addition", label: "סכומים" }),
  Object.freeze({ key: "chain", label: "שרשראות" }),
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

export function normalizeResearcherCorpusRow(row) {
  const operationTags = researcherOperationTags(row);
  const tokens = researcherRowTokens(row);
  const compound = compoundOf(row);
  const verification = row?.engine_detail?.verification || null;
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
    operationTags: Object.freeze(operationTags),
    tokens: Object.freeze(tokens),
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
      ...row.tokens.flatMap((token) => [token.label, token.value, token.method]),
    ].filter(v => v != null).join(" ").toLocaleLowerCase("he");
    return haystack.includes(q);
  });
}

export function researcherCorpusCounts(rows) {
  const counts = { all: rows?.length || 0, single: 0, multiplication: 0, addition: 0, chain: 0, unresolved: 0 };
  for (const row of rows || []) {
    for (const tag of row.operationTags || []) {
      if (Object.prototype.hasOwnProperty.call(counts, tag)) counts[tag] += 1;
    }
  }
  return Object.freeze(counts);
}

export async function fetchResearcherCorpusBySlug(slug, { limit = 1000 } = {}) {
  const safeSlug = clean(slug);
  if (!safeSlug) return { contributor: null, rows: [], counts: researcherCorpusCounts([]) };

  const { data: contributor, error: contributorError } = await supabase
    .from("contributors")
    .select("id,slug,display_name,kind,role,specialty,specialty_label,active,locked,dossier_settings,wa_names")
    .eq("slug", safeSlug)
    .maybeSingle();
  if (contributorError) throw contributorError;
  if (!contributor) return { contributor: null, rows: [], counts: researcherCorpusCounts([]) };

  const { data, error } = await supabase
    .from("research_objects")
    .select("id,created_at,kind,statement,terms,value,source,source_ref,contributor,engine_verified,engine_detail,status,meta,privacy_scope")
    .eq("contributor", contributor.display_name)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(Number(limit) || 1000, 1000)));
  if (error) throw error;

  const rows = (data || []).map(normalizeResearcherCorpusRow);
  return Object.freeze({
    contributor: Object.freeze(contributor),
    rows: Object.freeze(rows),
    counts: researcherCorpusCounts(rows),
  });
}
