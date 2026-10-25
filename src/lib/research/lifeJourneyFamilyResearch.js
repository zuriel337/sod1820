import { supabase } from "../supabase.js";
import {
  createGematriaRelationW2Executor,
  GEMATRIA_RELATION_PAIR_MODE,
} from "./gematriaRelationW2Executor.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

export const LIFE_JOURNEY_FAMILY_RESEARCH_VERSION = "life-journey-family-research-v1";
export const LIFE_JOURNEY_FAMILY_RESEARCH_MAX_MEMBERS = 12;

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

function allPairs(representations) {
  const pairs = [];
  for (let left = 0; left < representations.length; left += 1) {
    for (let right = left + 1; right < representations.length; right += 1) pairs.push([representations[left], representations[right]]);
  }
  return pairs;
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

function projectConnection(left, right, result) {
  const finding = Array.isArray(result?.findings) ? result.findings[0] : null;
  if (!finding) return null;
  const candidate = finding?.projection?.dimensions?.relation_candidate || {};
  return Object.freeze({
    id: finding.id,
    left: Object.freeze({ memberRef: left.memberRef, name: left.name }),
    right: Object.freeze({ memberRef: right.memberRef, name: right.name }),
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

export function composeLifeJourneyFamilyMessage({ representations = [], connections = [] } = {}) {
  if (representations.length < 2) return "כדי ליצור מחקר משפחתי מאוחד יש לבחור לפחות שני אנשים.";
  const strongest = connections[0] || null;
  if (!strongest) {
    return `נבדקו ${representations.length} אנשים זה מול זה, אך לא נמצאה כרגע התכנסות מנורמלת בין שמותיהם. זו תוצאה פתוחה למחקר, לא קביעה שאין קשר.`;
  }
  const normalized = Number.isSafeInteger(strongest.independentGroupCount)
    ? `לאחר נרמול התלות נשארו ${strongest.independentGroupCount} קבוצות שיטה עצמאיות`
    : "החיבור עבר נרמול תלות בין השיטות";
  return `החיבור הבולט במפה המשפחתית נמצא בין ${strongest.left.name} לבין ${strongest.right.name}; ${normalized}. בסך הכול נמצאו ${connections.length} חיבורים מחושבים בין האנשים שנבחרו.`;
}

export function createSupabaseLifeJourneyFamilyProviders(client = supabase) {
  if (!client || typeof client.rpc !== "function") throw new TypeError("lifeJourneyFamilyResearch: Supabase client with rpc() is required");
  const relationExecutor = createGematriaRelationW2Executor({
    supabase: client,
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
  });
  return Object.freeze({
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
    connections: Object.freeze([]),
    message: composeLifeJourneyFamilyMessage({ representations }),
    coverage: Object.freeze({ memberCount: representations.length, searchedPairCount: 0, connectionCount: 0, truncated: members.length > representations.length }),
  });
  const activeProviders = providers?.relationPair ? providers : createSupabaseLifeJourneyFamilyProviders();
  const pairs = allPairs(representations);
  const connections = (await mapWithConcurrency(pairs, 4, async ([left, right]) => (
    projectConnection(left, right, await activeProviders.relationPair(left, right))
  ))).filter(Boolean).sort((a, b) => connectionStrength(b) - connectionStrength(a));
  return Object.freeze({
    version: LIFE_JOURNEY_FAMILY_RESEARCH_VERSION,
    representations,
    connections: Object.freeze(connections),
    message: composeLifeJourneyFamilyMessage({ representations, connections }),
    coverage: Object.freeze({
      memberCount: representations.length,
      searchedPairCount: pairs.length,
      connectionCount: connections.length,
      truncated: members.length > representations.length,
    }),
  });
}

export default runLifeJourneyFamilyResearch;
