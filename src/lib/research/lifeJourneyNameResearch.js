import { normalizeForCalc } from "../gematria.js";
import { supabase } from "../supabase.js";
import { fetchNumberMethodProfile } from "./numberCoreProjection.js";
import {
  createGematriaRelationW2Executor,
  GEMATRIA_RELATION_PAIR_MODE,
} from "./gematriaRelationW2Executor.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

export const LIFE_JOURNEY_NAME_RESEARCH_VERSION = "life-journey-name-research-v2";

const clean = value => String(value || "").trim();
const EXPRESSION_LABELS = Object.freeze({
  given_name: "שם פרטי",
  family_name: "שם משפחה",
  full_name: "שם מלא",
});

function inputProfile(input) {
  if (typeof input === "string") {
    const fullName = clean(input);
    const pieces = fullName.split(/\s+/u).filter(Boolean);
    return Object.freeze({ firstName: pieces.shift() || "", surname: pieces.join(" "), fullName });
  }
  const firstName = clean(input?.firstName || input?.first);
  const surname = clean(input?.surname || input?.last);
  return Object.freeze({
    firstName,
    surname,
    fullName: clean(input?.fullName || input?.name) || [firstName, surname].filter(Boolean).join(" "),
  });
}

function expression(role, text) {
  const value = clean(text);
  if (!value || !normalizeForCalc(value)) return null;
  return Object.freeze({
    id: `life-name-expression:${role}:${stableIdentityDigest(value)}`,
    role,
    label: EXPRESSION_LABELS[role],
    text: value,
    accessTier: "personal",
    provenance: "authorized Person profile",
  });
}

export function compileLifeJourneyNameExpressions(input) {
  const profile = inputProfile(input);
  if (!profile.fullName) return Object.freeze([]);
  const candidates = [
    expression("given_name", profile.firstName),
    expression("family_name", profile.surname),
    expression("full_name", profile.fullName),
  ].filter(Boolean);
  const seen = new Set();
  return Object.freeze(candidates.filter(item => {
    const normalized = normalizeForCalc(item.text);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }));
}

function projectMethodFinding(matrixExpression, row) {
  const methodKey = clean(row?.methodKey);
  const value = Number(row?.computedValue);
  if (!methodKey || !Number.isSafeInteger(value)) return null;
  return Object.freeze({
    id: `life-name-method:${stableIdentityDigest(`${matrixExpression.id}:${methodKey}:${value}`)}`,
    expressionId: matrixExpression.id,
    expressionRole: matrixExpression.role,
    expressionLabel: matrixExpression.label,
    methodKey,
    methodLabel: clean(row?.displayLabel) || methodKey,
    value,
    sortOrder: Number.isFinite(Number(row?.sortOrder)) ? Number(row.sortOrder) : null,
    sourceRef: "rpc:fn_method_profile",
    versionRef: LIFE_JOURNEY_NAME_RESEARCH_VERSION,
  });
}

function allPairs(expressions) {
  const pairs = [];
  for (let left = 0; left < expressions.length; left += 1) {
    for (let right = left + 1; right < expressions.length; right += 1) pairs.push([expressions[left], expressions[right]]);
  }
  return pairs;
}

function projectRelation(left, right, result) {
  const finding = Array.isArray(result?.findings) ? result.findings[0] : null;
  if (!finding) return null;
  const candidate = finding?.projection?.dimensions?.relation_candidate || {};
  return Object.freeze({
    id: finding.id,
    left: Object.freeze({ id: left.id, label: left.label, text: left.text }),
    right: Object.freeze({ id: right.id, label: right.label, text: right.text }),
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

function relationStrength(row) {
  return (row.independentGroupCount ?? -1) * 100000 + (row.engineSignal ?? -1);
}

export function composeLifeJourneyNameMessage({ expressions = [], methodFindings = [], relationRows = [] } = {}) {
  if (!methodFindings.length) return "מנוע השיטות לא החזיר עדיין מספיק נתונים כדי לנסח מסר מחקרי בלי להמציא.";
  const strongest = relationRows[0] || null;
  if (strongest) {
    const normalized = Number.isSafeInteger(strongest.independentGroupCount)
      ? `לאחר נרמול התלות נשארו ${strongest.independentGroupCount} קבוצות שיטה עצמאיות`
      : "הקשר עבר נרמול תלות בין השיטות";
    return `החיבור הבולט בשם נמצא בין ${strongest.left.label} לבין ${strongest.right.label}; ${normalized}. זהו כיוון מחקר מחושב, לא קביעה על אופי או גורל.`;
  }
  if (expressions.length === 1) {
    return `השם נבדק ב־${new Set(methodFindings.map(row => row.methodKey)).size} שיטות קנוניות. כדי ליצור הצלבה פנימית נדרש גם שם משפחה נפרד.`;
  }
  return `נבדקו ${expressions.length} רכיבי שם, אך מנוע הקשרים לא החזיר כרגע התכנסות מנורמלת. זו תוצאה פתוחה למחקר, לא קביעה שאין קשר.`;
}

export function createSupabaseLifeJourneyNameProviders(client = supabase) {
  if (!client || typeof client.rpc !== "function") throw new TypeError("lifeJourneyNameResearch: Supabase client with rpc() is required");
  const relationExecutor = createGematriaRelationW2Executor({
    supabase: client,
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
  });
  return Object.freeze({
    methodProfile: item => fetchNumberMethodProfile(item.text, { client }),
    relationPair: (left, right) => relationExecutor({
      intake: {
        representations: [left, right].map(item => ({
          ref: item.id,
          kind: "expression",
          role: item.role,
          content: item.text,
          access: { tier: "personal" },
        })),
      },
    }),
  });
}

export async function runLifeJourneyNameResearch(input, providers = null) {
  const profile = inputProfile(input);
  const expressions = compileLifeJourneyNameExpressions(profile);
  if (!expressions.length) return null;
  const activeProviders = providers?.methodProfile && providers?.relationPair ? providers : createSupabaseLifeJourneyNameProviders();
  const expressionRows = await Promise.all(expressions.map(async item => {
    const profileRows = await activeProviders.methodProfile(item);
    return Object.freeze({
      ...item,
      methods: Object.freeze((Array.isArray(profileRows) ? profileRows : [])
        .map(row => projectMethodFinding(item, row))
        .filter(Boolean)
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.methodLabel.localeCompare(b.methodLabel, "he"))),
    });
  }));
  const pairs = allPairs(expressions);
  const relationRows = (await Promise.all(pairs.map(async ([left, right]) => (
    projectRelation(left, right, await activeProviders.relationPair(left, right))
  )))).filter(Boolean).sort((a, b) => relationStrength(b) - relationStrength(a));
  const methodFindings = expressionRows.flatMap(item => item.methods);
  const fullExpression = expressionRows.find(item => item.role === "full_name") || expressionRows[0];
  const regular = fullExpression?.methods.find(row => row.methodKey === "ragil" || row.methodLabel === "רגיל") || null;

  return Object.freeze({
    version: LIFE_JOURNEY_NAME_RESEARCH_VERSION,
    rawName: profile.fullName,
    normalizedName: normalizeForCalc(profile.fullName),
    expressions: Object.freeze(expressionRows),
    methodFindings: Object.freeze(methodFindings),
    regularValue: regular?.value ?? null,
    relationRows: Object.freeze(relationRows),
    message: composeLifeJourneyNameMessage({ expressions: expressionRows, methodFindings, relationRows }),
    coverage: Object.freeze({
      expressionCount: expressionRows.length,
      methodCount: new Set(methodFindings.map(row => row.methodKey)).size,
      methodValueCount: methodFindings.length,
      searchedPairCount: pairs.length,
      relationCount: relationRows.length,
      truncated: false,
    }),
    tracksWithResults: methodFindings.length,
    partial: false,
  });
}

export default runLifeJourneyNameResearch;
