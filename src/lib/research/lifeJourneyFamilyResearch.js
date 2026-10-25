import { supabase } from "../supabase.js";
import {
  createGematriaRelationW2Executor,
  GEMATRIA_RELATION_PAIR_MODE,
} from "./gematriaRelationW2Executor.js";
import {
  compileLifeJourneyDateExpressionMatrix,
  projectLifeJourneyMethodPack,
} from "./lifeJourneyDateMatrix.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

export const LIFE_JOURNEY_FAMILY_RESEARCH_VERSION = "life-journey-family-research-v2";
export const LIFE_JOURNEY_FAMILY_RESEARCH_MAX_MEMBERS = 12;
export const LIFE_JOURNEY_FAMILY_RESEARCH_MAX_RELATION_PAIRS = 768;

const clean = value => String(value || "").trim();

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

function sharedFamilyMethodValues(expressions) {
  const values = new Map();
  for (const expression of expressions) {
    for (const method of Array.isArray(expression?.methods) ? expression.methods : []) {
      const value = Number(method?.value);
      if (!Number.isSafeInteger(value)) continue;
      const entry = values.get(value) || { members: new Set(), expressions: new Set() };
      entry.members.add(expression.memberRef);
      entry.expressions.add(expression.id);
      values.set(value, entry);
    }
  }
  return Object.freeze([...values.entries()]
    .filter(([, entry]) => entry.members.size >= 2)
    .map(([value, entry]) => Object.freeze({ value, count: entry.members.size, expressionCount: entry.expressions.size }))
    .sort((a, b) => b.count - a.count || b.expressionCount - a.expressionCount || a.value - b.value));
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
  return Object.freeze({
    methodPack: async matrixExpression => {
      const { data, error } = await client.rpc("fn_all_methods", { p_word: matrixExpression.text });
      if (error) throw error;
      return projectLifeJourneyMethodPack(matrixExpression, data);
    },
    relationPair: (left, right) => relationExecutor({
      intake: {
        representations: [left, right].map(item => ({
          ref: item.id,
          kind: item.kind,
          role: item.role,
          content: item.name,
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
  const candidatePairs = possiblePairs.filter(([left, right]) => hasSharedNumericBasis(left, right));
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
  const truncated = members.length > representations.length || candidatePairs.length > searchedPairs.length;
  return Object.freeze({
    version: LIFE_JOURNEY_FAMILY_RESEARCH_VERSION,
    representations,
    expressions: Object.freeze(expressionRows),
    methodFindings,
    relationRows: Object.freeze(relationRows),
    connections,
    sharedValues: sharedFamilyMethodValues(expressionRows),
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
