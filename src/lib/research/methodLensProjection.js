import { getNumberLookup, getRelationCandidate } from "../supabase.js";
import { canonicalMethodPublicLabel } from "../presentation/canonicalPresentation.js";

const clean = (value) => value == null ? "" : String(value).trim();
const norm = (value) => clean(value).replace(/[\s"'״׳’‘\-_/]/g, "");

function sameMethod(rowMethod, methodKey) {
  const a = norm(rowMethod);
  const b = norm(methodKey);
  return Boolean(a && b && a === b);
}

function finite(value) {
  return value == null || !Number.isFinite(Number(value)) ? null : Number(value);
}

function relationShape(relation) {
  if (!relation || typeof relation !== "object") {
    return {
      status: "unclassified",
      rawIndependentGroupCount: null,
      effectiveIndependentGroupCount: null,
      dependentExpressionGroupCount: null,
      methods: [],
      noiseFlags: [],
      sameWordMultiset: false,
      sameLetterMultiset: false,
      minRarity: null,
      priority: null,
      confidence: null,
    };
  }

  const parts = relation.engine_signal_components || {};
  const dep = relation.expression_dependency || {};
  const evidence = Array.isArray(relation.engine_evidence) ? relation.engine_evidence : [];
  const raw = finite(parts.raw_independent_group_count);
  const effective = finite(parts.effective_independent_group_count);
  const dependent = finite(parts.dependent_expression_group_count);
  const sameWord = dep.same_word_multiset === true;
  const sameLetters = dep.same_letter_multiset === true;

  let status = "unclassified";
  if (effective != null && effective > 0) status = "independent";
  else if ((raw != null && raw > 0) || (dependent != null && dependent > 0) || sameWord || sameLetters) status = "dependent";

  return {
    status,
    hasDependencyCollapse: raw != null && effective != null && effective < raw,
    rawIndependentGroupCount: raw,
    effectiveIndependentGroupCount: effective,
    dependentExpressionGroupCount: dependent,
    methods: evidence.map((item) => ({
      methodKey: clean(item?.method),
      label: canonicalMethodPublicLabel({
        method_key: item?.method,
        display_label: item?.method,
      }),
      value: finite(item?.value),
      group: clean(item?.group_repr) || null,
      normalizedRarity: finite(item?.normalized_rarity),
      expressionDependency: clean(item?.expression_dependency) || null,
    })).filter((item) => item.methodKey),
    noiseFlags: Array.isArray(relation.noise_flags) ? relation.noise_flags.map(clean).filter(Boolean) : [],
    sameWordMultiset: sameWord,
    sameLetterMultiset: sameLetters,
    minRarity: finite(parts.min_rarity),
    priority: clean(relation.research_priority) || null,
    confidence: clean(relation.confidence) || null,
  };
}

function sortItems(a, b) {
  if (a.current !== b.current) return a.current ? -1 : 1;
  const ae = a.relation.effectiveIndependentGroupCount ?? -1;
  const be = b.relation.effectiveIndependentGroupCount ?? -1;
  if (ae !== be) return be - ae;
  const ar = a.relation.minRarity ?? Number.POSITIVE_INFINITY;
  const br = b.relation.minRarity ?? Number.POSITIVE_INFINITY;
  if (ar !== br) return ar - br;
  const al = Number.isFinite(Number(a.leadRank)) ? Number(a.leadRank) : 999999;
  const bl = Number.isFinite(Number(b.leadRank)) ? Number(b.leadRank) : 999999;
  if (al !== bl) return al - bl;
  return a.phrase.localeCompare(b.phrase, "he");
}

export async function fetchMethodLensProjection({
  expression,
  methodKey,
  value,
  enrichLimit = 28,
} = {}) {
  const phrase = clean(expression);
  const key = clean(methodKey);
  const numericValue = finite(value);
  if (!phrase || !key || numericValue == null) {
    return Object.freeze({
      expression: phrase,
      methodKey: key,
      methodLabel: canonicalMethodPublicLabel(key),
      value: numericValue,
      rawMatchCount: 0,
      effectiveIndependentCount: 0,
      dependentCount: 0,
      counts: Object.freeze({ raw: 0, visible: 0, independentVisible: 0, dependent: 0 }),
      items: Object.freeze([]),
      boundary: Object.freeze({ aiUsed: false, evidenceFirst: true, lazySelectionOnly: true }),
    });
  }

  const lookup = await getNumberLookup(numericValue);
  const seen = new Set();
  const matches = [];

  for (const row of Array.isArray(lookup) ? lookup : []) {
    const rowPhrase = clean(row?.phrase);
    if (!rowPhrase || !sameMethod(row?.method, key)) continue;
    if (row?.is_verified !== true || row?.method_governed === false || row?.method_active === false) continue;
    if (seen.has(rowPhrase)) continue;
    seen.add(rowPhrase);
    matches.push({
      phrase: rowPhrase,
      value: finite(row?.value) ?? numericValue,
      methodKey: key,
      methodLabel: canonicalMethodPublicLabel({ method_key: key, display_label: row?.method }),
      current: rowPhrase === phrase,
      source: clean(row?.source) || null,
      category: clean(row?.category) || null,
      leadRank: Number.isFinite(Number(row?.lead_rank)) ? Number(row.lead_rank) : null,
      provenance: clean(row?.provenance) || null,
      relation: relationShape(null),
    });
  }

  const enrichable = matches.filter((item) => !item.current).slice(0, Math.max(0, Number(enrichLimit) || 0));
  const relationResults = await Promise.allSettled(
    enrichable.map((item) => getRelationCandidate(phrase, item.phrase))
  );
  const relationByPhrase = new Map();

  relationResults.forEach((result, index) => {
    if (result.status !== "fulfilled") return;
    relationByPhrase.set(enrichable[index].phrase, relationShape(result.value));
  });

  const items = matches.map((item) => ({
    ...item,
    relation: item.current
      ? {
          ...relationShape(null),
          status: "current",
          effectiveIndependentGroupCount: 0,
        }
      : relationByPhrase.get(item.phrase) || relationShape(null),
  })).sort(sortItems);

  const independent = items.filter((item) => item.relation.status === "independent" && !item.current).length;
  const dependent = items.filter((item) => item.relation.status === "dependent" && !item.current).length;

  return Object.freeze({
    expression: phrase,
    methodKey: key,
    methodLabel: canonicalMethodPublicLabel(key),
    value: numericValue,
    rawMatchCount: items.filter((item) => !item.current).length,
    effectiveIndependentCount: independent,
    dependentCount: dependent,
    counts: Object.freeze({
      raw: items.filter((item) => !item.current).length,
      visible: items.length,
      independentVisible: independent,
      dependent,
    }),
    items: Object.freeze(items.map((item) => Object.freeze(item))),
    boundary: Object.freeze({
      aiUsed: false,
      evidenceFirst: true,
      normalizationSource: "fn_relation_candidate",
      lookupSource: "fn_number_lookup",
      lazySelectionOnly: true,
      summaryNeverReplacesEvidence: true,
    }),
  });
}
