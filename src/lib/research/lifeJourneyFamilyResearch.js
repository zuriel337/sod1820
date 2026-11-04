import { supabase } from "../supabase.js";
import {
  createGematriaRelationW2Executor,
  GEMATRIA_RELATION_PAIR_MODE,
} from "./gematriaRelationW2Executor.js";
import {
  compileLifeJourneyDateExpressionMatrix,
  projectLifeJourneyMethodPack,
} from "./lifeJourneyDateMatrix.js";
import { fetchNumberMethodProfile } from "./numberCoreProjection.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

export const LIFE_JOURNEY_FAMILY_RESEARCH_VERSION = "life-journey-family-research-v3";
export const LIFE_JOURNEY_FAMILY_RESEARCH_MAX_MEMBERS = 12;
export const LIFE_JOURNEY_FAMILY_RESEARCH_MAX_RELATION_PAIRS = 768;

const clean = value => String(value || "").trim();
const normalizedIdentity = value => clean(value)
  .normalize("NFKC")
  .replace(/["'״׳`]/gu, "")
  .replace(/[\s־–—-]+/gu, "")
  .toLowerCase();
const normalizedExpression = value => clean(value).normalize("NFKC").replace(/\s+/gu, " ");

function dependencyConditionApplies(condition, expressionText) {
  const value = clean(condition);
  const expression = clean(expressionText);
  const words = expression.match(/[\p{L}\p{N}]+/gu) || [];
  const noFinalLetters = !/[ךםןףץ]/u.test(expression);
  if (value === "no_final_letters") return noFinalLetters;
  if (value === "single_word_input") return words.length === 1;
  if (value === "single_word_and_no_final_letters") return words.length === 1 && noFinalLetters;
  return false;
}

/** Projection-only collapse of Registry-proven aliases/equivalences for one exact expression. */
export function normalizeLifeJourneyExpressionMethods(expression = {}) {
  const methods = Array.isArray(expression?.methods) ? expression.methods : [];
  const parent = methods.map((_, index) => index);
  const find = index => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[b] = a;
  };
  const methodIndex = new Map();
  methods.forEach((method, index) => {
    for (const identity of [method?.methodKey, method?.methodLabel]) {
      const key = normalizedIdentity(identity);
      if (key) methodIndex.set(key, index);
    }
  });
  const appliedRules = [];
  methods.forEach((method, index) => {
    for (const rule of Array.isArray(method?.dependencyRules) ? method.dependencyRules : []) {
      if (clean(rule?.type) !== "conditional_equivalence"
        || !dependencyConditionApplies(rule?.condition, expression?.text)) continue;
      const target = methodIndex.get(normalizedIdentity(rule?.to));
      if (target == null || target === index || Number(methods[target]?.value) !== Number(method?.value)) continue;
      union(index, target);
      appliedRules.push(Object.freeze({
        from: clean(method?.methodLabel || method?.methodKey),
        to: clean(methods[target]?.methodLabel || methods[target]?.methodKey),
        condition: clean(rule?.condition),
      }));
    }
  });
  const groups = new Map();
  methods.forEach((method, index) => {
    const root = find(index);
    const group = groups.get(root) || [];
    group.push(method);
    groups.set(root, group);
  });
  return Object.freeze({
    groups: Object.freeze([...groups.values()].map(group => {
      const ordered = [...group].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
        || clean(a.methodLabel).localeCompare(clean(b.methodLabel), "he"));
      const representative = ordered[0];
      return Object.freeze({
        id: `${expression.id}:method-family:${stableIdentityDigest(ordered.map(item => item.methodKey).sort().join("|"))}`,
        methodGroupKey: clean(representative?.methodKey || representative?.methodLabel),
        methodLabel: clean(representative?.methodLabel || representative?.methodKey),
        value: Number(representative?.value),
        methods: Object.freeze(ordered),
        equivalentMethodCount: ordered.length,
      });
    }).filter(group => Number.isSafeInteger(group.value))),
    appliedRules: Object.freeze(appliedRules),
    rawMethodCount: methods.length,
    effectiveMethodCount: groups.size,
  });
}

/** Separates repeated exact family expressions from cross-expression numeric intersections. */
export function classifyLifeJourneyFamilyValues(expressions = []) {
  const byValue = new Map();
  const byExpression = new Map();
  let rawMethodResultCount = 0;
  let effectiveMethodResultCount = 0;
  const appliedRuleKeys = new Set();

  for (const expression of Array.isArray(expressions) ? expressions : []) {
    const expressionKey = normalizedExpression(expression?.text);
    if (!expressionKey) continue;
    const normalized = normalizeLifeJourneyExpressionMethods(expression);
    rawMethodResultCount += normalized.rawMethodCount;
    effectiveMethodResultCount += normalized.groups.length;
    normalized.appliedRules.forEach(rule => appliedRuleKeys.add(`${rule.from} ↔ ${rule.to}`));
    const expressionEntry = byExpression.get(expressionKey) || { rows: [], memberRefs: new Set(), values: new Set(), methodGroups: new Set() };
    expressionEntry.rows.push(expression);
    expressionEntry.memberRefs.add(expression.memberRef);
    for (const group of normalized.groups) {
      expressionEntry.values.add(group.value);
      expressionEntry.methodGroups.add(`${group.value}:${normalizedIdentity(group.methodGroupKey)}`);
      const valueEntry = byValue.get(group.value) || { occurrences: [], memberRefs: new Set(), expressionKeys: new Set() };
      valueEntry.occurrences.push({ expression, expressionKey, group });
      valueEntry.memberRefs.add(expression.memberRef);
      valueEntry.expressionKeys.add(expressionKey);
      byValue.set(group.value, valueEntry);
    }
    byExpression.set(expressionKey, expressionEntry);
  }

  const sharedExpressions = [...byExpression.entries()].flatMap(([expressionKey, entry]) => {
    if (entry.memberRefs.size < 2) return [];
    const sample = entry.rows[0];
    return [Object.freeze({
      id: `life-family-shared-expression:${stableIdentityDigest(expressionKey)}`,
      expressionText: clean(sample?.text),
      memberCount: entry.memberRefs.size,
      memberRefs: Object.freeze([...entry.memberRefs].sort()),
      expressionRoles: Object.freeze([...new Set(entry.rows.map(row => clean(row?.role)).filter(Boolean))]),
      valueCount: entry.values.size,
      values: Object.freeze([...entry.values].sort((a, b) => a - b)),
      effectiveMethodGroupCount: entry.methodGroups.size,
    })];
  }).sort((a, b) => b.memberCount - a.memberCount || b.valueCount - a.valueCount || a.expressionText.localeCompare(b.expressionText, "he"));

  const convergences = [...byValue.entries()].flatMap(([value, entry]) => {
    if (entry.memberRefs.size < 2 || entry.expressionKeys.size < 2) return [];
    const repeatedExpressionCount = [...entry.expressionKeys]
      .filter(expressionKey => (byExpression.get(expressionKey)?.memberRefs.size || 0) >= 2).length;
    const evidenceKeys = new Set(entry.occurrences.map(({ expressionKey, group }) => (
      `${expressionKey}:${normalizedIdentity(group.methodGroupKey)}`
    )));
    const byMethodGroup = new Map();
    for (const occurrence of entry.occurrences) {
      const key = normalizedIdentity(occurrence.group.methodGroupKey);
      const method = byMethodGroup.get(key) || { expressionKeys: new Set(), memberRefs: new Set() };
      method.expressionKeys.add(occurrence.expressionKey);
      method.memberRefs.add(occurrence.expression.memberRef);
      byMethodGroup.set(key, method);
    }
    const sameMethod = [...byMethodGroup.values()].some(method => method.expressionKeys.size >= 2 && method.memberRefs.size >= 2);
    return [Object.freeze({
      value,
      count: entry.memberRefs.size,
      memberCount: entry.memberRefs.size,
      expressionCount: entry.occurrences.length,
      distinctExpressionCount: entry.expressionKeys.size,
      normalizedEvidenceCount: evidenceKeys.size,
      methodGroupCount: byMethodGroup.size,
      repeatedExpressionCount,
      sameMethod,
      classification: sameMethod ? "same_method_distinct_expressions" : "cross_method_distinct_expressions",
    })];
  }).sort((a, b) => b.memberCount - a.memberCount
    || b.distinctExpressionCount - a.distinctExpressionCount
    || Number(b.sameMethod) - Number(a.sameMethod)
    || b.normalizedEvidenceCount - a.normalizedEvidenceCount
    || a.value - b.value);

  return Object.freeze({
    convergences: Object.freeze(convergences),
    sharedExpressions: Object.freeze(sharedExpressions),
    normalization: Object.freeze({
      rawMethodResultCount,
      effectiveMethodResultCount,
      collapsedMethodResultCount: Math.max(0, rawMethodResultCount - effectiveMethodResultCount),
      appliedEquivalenceFamilies: Object.freeze([...appliedRuleKeys].sort((a, b) => a.localeCompare(b, "he"))),
    }),
  });
}

export function compileLifeJourneyFamilyRepresentations(members = []) {
  const rows = (Array.isArray(members) ? members : []).slice(0, LIFE_JOURNEY_FAMILY_RESEARCH_MAX_MEMBERS).flatMap(member => {
    const memberRef = clean(member?.memberRef || member?.source_ref);
    const name = clean(member?.fullName || member?.name);
    if (!memberRef || !name) return [];
    return [Object.freeze({
      id: `life-family-name:${stableIdentityDigest(memberRef)}`,
      memberRef,
      name,
      role: "family_member_name",
      kind: "expression",
      accessTier: "personal",
      provenance: "authorized Person family profile",
    })];
  });
  return Object.freeze(rows);
}

function fallbackNameExpressions({ memberRef, name, firstName, surname }) {
  const first = clean(firstName) || clean(name).split(/\s+/u)[0] || "";
  const last = clean(surname) || clean(name).split(/\s+/u).slice(1).join(" ");
  const candidates = [
    { role: "given_name", label: "שם פרטי", text: first, group: "name" },
    { role: "family_name", label: "שם משפחה", text: last, group: "name" },
    { role: "full_name", label: "שם מלא", text: clean(name), group: "name" },
  ].filter(item => item.text);
  const seen = new Set();
  return candidates.filter(item => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  }).map(item => ({
    ...item,
    id: `life-family-expression:${stableIdentityDigest(`${memberRef}:${item.role}:${item.text}`)}`,
    accessTier: "personal",
    provenance: "authorized Person family profile",
  }));
}

/** Reuses the existing single-person date expression compiler; this is an adapter, not an engine. */
export function compileLifeJourneyFamilyExpressionMatrix(members = []) {
  return Object.freeze((Array.isArray(members) ? members : [])
    .slice(0, LIFE_JOURNEY_FAMILY_RESEARCH_MAX_MEMBERS)
    .flatMap(member => {
      const memberRef = clean(member?.memberRef || member?.source_ref);
      const name = clean(member?.fullName || member?.name);
      if (!memberRef || !name) return [];
      const pieces = name.split(/\s+/u).filter(Boolean);
      const firstName = clean(member?.firstName || member?.first) || pieces.shift() || "";
      const surname = clean(member?.surname || member?.last) || pieces.join(" ");
      let compiled = null;
      if (clean(member?.birthdate || member?.birthdateIso)) {
        try {
          compiled = compileLifeJourneyDateExpressionMatrix({
            firstName,
            surname,
            birthdateIso: clean(member?.birthdate || member?.birthdateIso),
          });
        } catch { /* Invalid historical dates fall back to the authorized name expressions. */ }
      }
      const sourceExpressions = compiled?.expressions?.length
        ? compiled.expressions
        : fallbackNameExpressions({ memberRef, name, firstName, surname });
      return sourceExpressions.map(item => Object.freeze({
        ...item,
        id: `life-family-expression:${stableIdentityDigest(`${memberRef}:${item.role}:${item.text}`)}`,
        memberRef,
        name,
        accessTier: "personal",
      }));
    }));
}

function allPairs(representations) {
  const pairs = [];
  for (let left = 0; left < representations.length; left += 1) {
    for (let right = left + 1; right < representations.length; right += 1) pairs.push([representations[left], representations[right]]);
  }
  return pairs;
}

function crossPersonPairs(expressions) {
  return allPairs(expressions).filter(([left, right]) => left.memberRef !== right.memberRef);
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function projectExpressionConnection(left, right, result) {
  const finding = Array.isArray(result?.findings) ? result.findings[0] : null;
  if (!finding) return null;
  const candidate = finding?.projection?.dimensions?.relation_candidate || {};
  return Object.freeze({
    id: finding.id,
    left: Object.freeze({ memberRef: left.memberRef, name: left.name, expressionRole: left.role, expressionLabel: left.label, expressionText: left.text }),
    right: Object.freeze({ memberRef: right.memberRef, name: right.name, expressionRole: right.role, expressionLabel: right.label, expressionText: right.text }),
    engineSignal: Number.isFinite(Number(candidate.engine_signal)) ? Number(candidate.engine_signal) : null,
    independentGroupCount: Number.isFinite(Number(candidate.effective_independent_group_count))
      ? Number(candidate.effective_independent_group_count)
      : null,
    rawGroupCount: Number.isFinite(Number(candidate.raw_independent_group_count))
      ? Number(candidate.raw_independent_group_count)
      : null,
    finding,
  });
}

function connectionStrength(row) {
  return (row.independentGroupCount ?? -1) * 100000 + (row.engineSignal ?? -1);
}

function hasSharedNumericBasis(left, right) {
  const leftValues = new Set((Array.isArray(left?.methods) ? left.methods : []).map(row => Number(row?.value)).filter(Number.isSafeInteger));
  return (Array.isArray(right?.methods) ? right.methods : []).some(row => leftValues.has(Number(row?.value)));
}

function groupPersonConnections(rows) {
  const groups = new Map();
  for (const row of rows) {
    const refs = [row.left.memberRef, row.right.memberRef].sort();
    const key = refs.join("|");
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }
  return Object.freeze([...groups.entries()].map(([key, group]) => {
    const strongest = [...group].sort((a, b) => connectionStrength(b) - connectionStrength(a))[0];
    return Object.freeze({
      ...strongest,
      id: `life-family-person-pair:${stableIdentityDigest(key)}`,
      expressionConnectionCount: group.length,
      findingIds: Object.freeze(group.map(row => row.id)),
    });
  }).sort((a, b) => connectionStrength(b) - connectionStrength(a)));
}

export function composeLifeJourneyFamilyMessage({ representations = [], expressions = [], connections = [] } = {}) {
  if (representations.length < 2) return "כדי ליצור מחקר משפחתי מאוחד יש לבחור לפחות שני אנשים.";
  const strongest = connections[0] || null;
  if (!strongest) {
    return `נבדקו ${representations.length} אנשים זה מול זה, אך לא נמצאה כרגע התכנסות מנורמלת בין שמותיהם. זו תוצאה פתוחה למחקר, לא קביעה שאין קשר.`;
  }
  const normalized = Number.isSafeInteger(strongest.independentGroupCount)
    ? `לאחר נרמול התלות נשארו ${strongest.independentGroupCount} קבוצות שיטה עצמאיות`
    : "החיבור עבר נרמול תלות בין השיטות";
  return `החיבור הבולט במפה המשפחתית נמצא בין ${strongest.left.name} (${strongest.left.expressionLabel}) לבין ${strongest.right.name} (${strongest.right.expressionLabel}); ${normalized}. בסך הכול נבדקו ${expressions.length} ביטויי שם ותאריך ונמצאו ${connections.length} זוגות אנשים עם חיבור מחושב.`;
}

export function createSupabaseLifeJourneyFamilyProviders(client = supabase) {
  if (!client || typeof client.rpc !== "function") throw new TypeError("lifeJourneyFamilyResearch: Supabase client with rpc() is required");
  const relationExecutor = createGematriaRelationW2Executor({
    supabase: client,
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
  });
  let registryPromise = null;
  const readRegistry = () => {
    if (!registryPromise) registryPromise = client
      .from("gematria_methods")
      .select("method_key,db_column,display_label,category,sub,soul,sort_order,mathematical_family,execution_kind,operator,derived_from,source_of_truth,dependency_rules,dependency_version")
      .eq("active", true)
      .eq("in_engine", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) throw error;
        return Array.isArray(data) ? data : [];
      });
    return registryPromise;
  };
  return Object.freeze({
    methodPack: async matrixExpression => {
      const registryRows = await readRegistry();
      const profile = await fetchNumberMethodProfile(matrixExpression.text, { client, registryRows });
      return projectLifeJourneyMethodPack(matrixExpression, profile);
    },
    relationPair: (left, right) => relationExecutor({
      intake: {
        representations: [left, right].map(item => ({
          ref: item.id,
          kind: item.kind,
          role: item.role,
          content: item.text,
          access: { tier: "personal" },
        })),
      },
    }),
  });
}

export async function runLifeJourneyFamilyResearch({ members = [], providers = null } = {}) {
  const representations = compileLifeJourneyFamilyRepresentations(members);
  if (representations.length < 2) return Object.freeze({
    version: LIFE_JOURNEY_FAMILY_RESEARCH_VERSION,
    representations,
    expressions: Object.freeze([]),
    methodFindings: Object.freeze([]),
    relationRows: Object.freeze([]),
    connections: Object.freeze([]),
    sharedValues: Object.freeze([]),
    sharedExpressions: Object.freeze([]),
    methodNormalization: Object.freeze({
      rawMethodResultCount: 0,
      effectiveMethodResultCount: 0,
      collapsedMethodResultCount: 0,
      appliedEquivalenceFamilies: Object.freeze([]),
    }),
    message: composeLifeJourneyFamilyMessage({ representations }),
    coverage: Object.freeze({ memberCount: representations.length, expressionCount: 0, methodValueCount: 0, possiblePairCount: 0, candidatePairCount: 0, searchedPairCount: 0, relationCount: 0, connectionCount: 0, truncated: members.length > representations.length }),
  });
  const activeProviders = providers?.relationPair && providers?.methodPack
    ? providers
    : createSupabaseLifeJourneyFamilyProviders();
  const expressions = compileLifeJourneyFamilyExpressionMatrix(members);
  const expressionRows = await mapWithConcurrency(expressions, 6, async item => Object.freeze({
    ...item,
    methods: Object.freeze(await activeProviders.methodPack(item)),
  }));
  const possiblePairs = crossPersonPairs(expressionRows);
  const candidatePairs = possiblePairs.filter(([left, right]) => (
    normalizedExpression(left.text) !== normalizedExpression(right.text)
    && hasSharedNumericBasis(left, right)
  ));
  const searchedPairs = candidatePairs.slice(0, LIFE_JOURNEY_FAMILY_RESEARCH_MAX_RELATION_PAIRS);
  const relationRows = (await mapWithConcurrency(searchedPairs, 6, async ([left, right]) => (
    projectExpressionConnection(left, right, await activeProviders.relationPair(left, right))
  ))).filter(Boolean).sort((a, b) => connectionStrength(b) - connectionStrength(a));
  const connections = groupPersonConnections(relationRows);
  const methodFindings = Object.freeze(expressionRows.flatMap(item => item.methods.map(method => Object.freeze({
    ...method,
    memberRef: item.memberRef,
    expressionRole: item.role,
    expressionLabel: item.label,
  }))));
  const valueProjection = classifyLifeJourneyFamilyValues(expressionRows);
  const truncated = members.length > representations.length || candidatePairs.length > searchedPairs.length;
  return Object.freeze({
    version: LIFE_JOURNEY_FAMILY_RESEARCH_VERSION,
    representations,
    expressions: Object.freeze(expressionRows),
    methodFindings,
    relationRows: Object.freeze(relationRows),
    connections,
    sharedValues: valueProjection.convergences,
    sharedExpressions: valueProjection.sharedExpressions,
    methodNormalization: valueProjection.normalization,
    message: composeLifeJourneyFamilyMessage({ representations, expressions: expressionRows, connections }),
    coverage: Object.freeze({
      memberCount: representations.length,
      expressionCount: expressionRows.length,
      methodValueCount: methodFindings.length,
      possiblePairCount: possiblePairs.length,
      candidatePairCount: candidatePairs.length,
      searchedPairCount: searchedPairs.length,
      relationCount: relationRows.length,
      connectionCount: connections.length,
      truncated,
    }),
  });
}

export default runLifeJourneyFamilyResearch;
