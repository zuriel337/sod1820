const clean = (value) => {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
};

function factOf(finding) {
  return Array.isArray(finding?.evidence?.facts) ? finding.evidence.facts[0] : null;
}

export function nameLabDependencyGroupForFinding(finding) {
  const family = clean(finding?.projection?.dimensions?.name_lab_family) || "unknown";
  const fact = factOf(finding) || {};
  if (family === "combo_gem") {
    return `name_lab:combo_gem:value:${fact.value ?? "unknown"}`;
  }
  if (family === "milui") {
    return `name_lab:milui:part:${clean(fact.part) || "unknown"}:value:${fact.milui ?? "unknown"}`;
  }
  if (family === "transforms") {
    return `name_lab:transforms:method:${clean(fact.method) || "unknown"}:word:${clean(fact.word) || "unknown"}`;
  }
  if (family === "anagrams") {
    return `name_lab:anagrams:part:${clean(fact.part) || "unknown"}`;
  }
  if (family === "variants") {
    return "name_lab:variants";
  }
  return `name_lab:${family}`;
}

/**
 * Conservative dependency normalization.
 * A distinct group means a distinct lineage bucket, not proven statistical independence.
 */
export function normalizeNameLabDependencies(findings = []) {
  const groups = new Map();
  for (const finding of Array.isArray(findings) ? findings : []) {
    const id = clean(finding?.id);
    if (!id) continue;
    const key = nameLabDependencyGroupForFinding(finding);
    const group = groups.get(key) || { key, finding_ids: [], families: new Set() };
    group.finding_ids.push(id);
    const family = clean(finding?.projection?.dimensions?.name_lab_family);
    if (family) group.families.add(family);
    groups.set(key, group);
  }

  const normalized = [...groups.values()].map((group) => Object.freeze({
    key: group.key,
    finding_ids: Object.freeze([...new Set(group.finding_ids)]),
    families: Object.freeze([...group.families]),
    independence: "dependency_group_only_not_proven_independent",
  }));

  return Object.freeze({
    groups: Object.freeze(normalized),
    finding_count: (Array.isArray(findings) ? findings : []).length,
    dependency_group_count: normalized.length,
    independent_support_count: null,
    boundary: "dependency groups prevent double-counting; they do not prove statistical independence",
  });
}

export function dependencyGroupsForFindingIds(findings = [], findingIds = []) {
  const wanted = new Set((Array.isArray(findingIds) ? findingIds : []).map(clean).filter(Boolean));
  const map = new Map((Array.isArray(findings) ? findings : []).map((f) => [clean(f?.id), f]));
  const keys = [];
  for (const id of wanted) {
    const finding = map.get(id);
    if (finding) keys.push(nameLabDependencyGroupForFinding(finding));
  }
  return [...new Set(keys)];
}

export default normalizeNameLabDependencies;
