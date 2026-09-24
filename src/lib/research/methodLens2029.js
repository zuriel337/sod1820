const clean = (value) => value == null ? "" : String(value).trim();

function normalizedPhrase(value) {
  return clean(value)
    .replace(/[\u05F3\u05F4"'’‘״׳]/g, "")
    .replace(/\s+/g, " ");
}

function relationMeta(payload) {
  const relation = payload && typeof payload === "object" ? payload : {};
  const components = relation.engine_signal_components || {};
  const dependency = relation.expression_dependency || {};
  const rawGroups = Number.isFinite(Number(components.raw_independent_group_count))
    ? Number(components.raw_independent_group_count) : null;
  const effectiveGroups = Number.isFinite(Number(components.effective_independent_group_count))
    ? Number(components.effective_independent_group_count) : null;
  const dependent = Boolean(
    dependency.same_word_multiset
    || dependency.same_letter_multiset
    || (rawGroups != null && effectiveGroups != null && effectiveGroups < rawGroups)
  );
  return {
    relationKind: clean(relation.relation_kind) || null,
    confidence: clean(relation.confidence) || null,
    researchPriority: clean(relation.research_priority) || null,
    engineSignal: Number.isFinite(Number(relation.engine_signal)) ? Number(relation.engine_signal) : null,
    rawIndependentGroups: rawGroups,
    effectiveIndependentGroups: effectiveGroups,
    sameWordMultiset: dependency.same_word_multiset === true,
    sameLetterMultiset: dependency.same_letter_multiset === true,
    dependent,
    evidence: Array.isArray(relation.engine_evidence) ? relation.engine_evidence : [],
  };
}

export async function fetchMethodLens2029(selection, { limit = 36 } = {}) {
  const expression = clean(selection?.expression);
  const methodKey = clean(selection?.methodKey);
  const dbColumn = clean(selection?.dbColumn);
  const value = Number(selection?.resultValue);
  if (!expression || !methodKey || !dbColumn || !Number.isFinite(value)) {
    return { available: false, reason: "missing_method_projection", items: [], counts: { raw: 0, visible: 0, dependent: 0 } };
  }

  const { supabase } = await import("../supabase.js");
  const cap = Math.max(1, Math.min(Number(limit) || 36, 80));
  const { data, error } = await supabase
    .from("gematria_words")
    .select("phrase,lead_rank,is_verified,category,source,world")
    .eq(dbColumn, value)
    .eq("is_verified", true)
    .limit(cap);
  if (error) throw error;

  const rawRows = (Array.isArray(data) ? data : [])
    .filter((row) => clean(row?.phrase) && clean(row.phrase) !== expression);
  const deduped = [];
  const seen = new Set();
  for (const row of rawRows) {
    const key = normalizedPhrase(row.phrase);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  const enriched = await Promise.all(deduped.map(async (row) => {
    let relation = null;
    try {
      const { data: relationData, error: relationError } = await supabase.rpc("fn_relation_candidate", {
        p_entity_a: expression,
        p_entity_b: clean(row.phrase),
      });
      if (!relationError) relation = relationData;
    } catch {
      relation = null;
    }
    return {
      phrase: clean(row.phrase),
      value,
      methodKey,
      leadRank: Number.isFinite(Number(row?.lead_rank)) ? Number(row.lead_rank) : null,
      category: clean(row?.category) || null,
      source: clean(row?.source) || null,
      world: clean(row?.world) || null,
      verified: row?.is_verified === true,
      relation: relationMeta(relation),
    };
  }));

  enriched.sort((a, b) => (
    Number(a.relation.dependent) - Number(b.relation.dependent)
    || (b.relation.effectiveIndependentGroups ?? -1) - (a.relation.effectiveIndependentGroups ?? -1)
    || (b.relation.engineSignal ?? -1) - (a.relation.engineSignal ?? -1)
    || (a.leadRank ?? 999999) - (b.leadRank ?? 999999)
    || a.phrase.localeCompare(b.phrase, "he")
  ));

  const dependent = enriched.filter((item) => item.relation.dependent).length;
  return {
    available: true,
    selection: { expression, methodKey, dbColumn, value },
    items: enriched,
    counts: {
      raw: rawRows.length,
      visible: enriched.length,
      dependent,
      independentVisible: enriched.length - dependent,
    },
    source: "gematria_words verified reverse lookup + fn_relation_candidate",
  };
}

export function methodLensDeterministicNote(item) {
  const relation = item?.relation || {};
  if (relation.sameWordMultiset) return "אותן מילים/סדר שונה — תלות מנורמלת";
  if (relation.sameLetterMultiset) return "אותו מאגר אותיות — תלות מנורמלת";
  if (relation.effectiveIndependentGroups > 1) return relation.effectiveIndependentGroups + " משפחות שיטה עצמאיות";
  if (relation.dependent) return "קשר תלוי — מוצג לשקיפות";
  return "התאמה מאומתת בשיטה";
}
