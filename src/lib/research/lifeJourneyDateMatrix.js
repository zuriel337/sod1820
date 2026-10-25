import { gregorianToHebrewDateRepresentation } from "./personalDateResearch.js";
import {
  createGematriaRelationW2Executor,
  GEMATRIA_RELATION_PAIR_MODE,
} from "./gematriaRelationW2Executor.js";
import { stableIdentityDigest } from "./researchRepresentations.js";

export const LIFE_JOURNEY_DATE_MATRIX_VERSION = "life-journey-date-matrix-v1";

const clean = value => String(value || "").trim();

const EXPRESSION_LABELS = Object.freeze({
  given_name: "שם פרטי",
  family_name: "שם משפחה",
  full_name: "שם מלא",
  hebrew_day: "יום עברי",
  hebrew_month: "חודש עברי",
  hebrew_year: "שנה עברית",
  hebrew_day_month: "יום וחודש",
  hebrew_full_date: "תאריך עברי מלא",
});

function expression(role, text, group) {
  const value = clean(text);
  if (!value) return null;
  return Object.freeze({
    id: `life-date-expression:${role}:${stableIdentityDigest(value)}`,
    role,
    label: EXPRESSION_LABELS[role] || role,
    text: value,
    group,
    accessTier: "personal",
    provenance: role.startsWith("hebrew_")
      ? "@hebcal/core → deterministic date representation"
      : "authorized Person profile",
  });
}

function hebrewDateParts(representation) {
  const tokens = clean(representation?.hebrew?.pretty).split(/\s+/u).filter(Boolean);
  if (tokens.length < 3) return null;
  const day = tokens[0];
  const year = tokens.at(-1);
  const month = tokens.slice(1, -1).join(" ");
  if (!day || !month || !year) return null;
  return Object.freeze({ day, month, year });
}

/**
 * A bounded, provenance-bearing view of the already-authorized Person profile.
 * It creates no Person/Date truth and performs no Gematria calculation.
 */
export function compileLifeJourneyDateExpressionMatrix({ firstName, surname, birthdateIso } = {}) {
  const first = clean(firstName);
  const last = clean(surname);
  const full = [first, last].filter(Boolean).join(" ");
  const representation = gregorianToHebrewDateRepresentation(birthdateIso);
  const parts = hebrewDateParts(representation);
  if (!first || !representation || !parts) return null;

  const candidates = [
    expression("given_name", first, "name"),
    expression("family_name", last, "name"),
    expression("full_name", full, "name"),
    expression("hebrew_day", parts.day, "date"),
    expression("hebrew_month", parts.month, "date"),
    expression("hebrew_year", parts.year, "date"),
    expression("hebrew_day_month", `${parts.day} ${parts.month}`, "date"),
    expression("hebrew_full_date", representation.hebrew.pretty, "date"),
  ].filter(Boolean);

  const seen = new Set();
  const expressions = candidates.filter(item => {
    if (seen.has(item.text)) return false;
    seen.add(item.text);
    return true;
  });

  return Object.freeze({
    version: LIFE_JOURNEY_DATE_MATRIX_VERSION,
    representation,
    expressions: Object.freeze(expressions),
  });
}

function numericMethodEntries(payload) {
  const source = payload?.methods && typeof payload.methods === "object" && !Array.isArray(payload.methods)
    ? payload.methods
    : payload;
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];
  return Object.entries(source).flatMap(([rawMethod, rawValue]) => {
    if (typeof rawValue !== "number" && typeof rawValue !== "string") return [];
    const methodKey = clean(rawMethod);
    const value = Number(rawValue);
    if (!methodKey || !Number.isSafeInteger(value)) return [];
    return [{ methodKey, methodLabel: methodKey.replaceAll("_", " "), value }];
  });
}

export function projectLifeJourneyMethodPack(matrixExpression, payload) {
  if (!matrixExpression?.id) return Object.freeze([]);
  return Object.freeze(numericMethodEntries(payload).map(row => Object.freeze({
    ...row,
    id: `life-date-method:${stableIdentityDigest(`${matrixExpression.id}:${row.methodKey}:${row.value}`)}`,
    expressionId: matrixExpression.id,
    expressionRole: matrixExpression.role,
    expressionLabel: matrixExpression.label,
    sourceRef: "rpc:fn_all_methods",
    versionRef: LIFE_JOURNEY_DATE_MATRIX_VERSION,
  })));
}

export function createSupabaseLifeJourneyDateMatrixProviders(supabase) {
  if (!supabase || typeof supabase.rpc !== "function") {
    throw new TypeError("lifeJourneyDateMatrix: Supabase client with rpc() is required");
  }
  const relationExecutor = createGematriaRelationW2Executor({
    supabase,
    pairMode: GEMATRIA_RELATION_PAIR_MODE.INTAKE_DIRECT_PAIR,
  });

  return Object.freeze({
    methodPack: async matrixExpression => {
      const { data, error } = await supabase.rpc("fn_all_methods", { p_word: matrixExpression.text });
      if (error) throw error;
      return projectLifeJourneyMethodPack(matrixExpression, data);
    },
    relationPair: async (left, right) => relationExecutor({
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

function allPairs(expressions) {
  const pairs = [];
  for (let i = 0; i < expressions.length; i += 1) {
    for (let j = i + 1; j < expressions.length; j += 1) {
      pairs.push([expressions[i], expressions[j]]);
    }
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

function relationRow(left, right, result) {
  const finding = Array.isArray(result?.findings) ? result.findings[0] : null;
  if (!finding) return null;
  const candidate = finding?.projection?.dimensions?.relation_candidate || {};
  return Object.freeze({
    id: finding.id,
    left: Object.freeze({ id: left.id, role: left.role, label: left.label, text: left.text }),
    right: Object.freeze({ id: right.id, role: right.role, label: right.label, text: right.text }),
    engineSignal: Number.isFinite(Number(candidate.engine_signal)) ? Number(candidate.engine_signal) : null,
    independentGroupCount: Number.isFinite(Number(candidate.effective_independent_group_count))
      ? Number(candidate.effective_independent_group_count)
      : null,
    rawGroupCount: Number.isFinite(Number(candidate.raw_independent_group_count))
      ? Number(candidate.raw_independent_group_count)
      : null,
    noiseFlags: Array.isArray(candidate.noise_flags) ? Object.freeze(candidate.noise_flags.map(String)) : Object.freeze([]),
    finding,
  });
}

function relationStrength(row) {
  return (row.independentGroupCount ?? -1) * 100000 + (row.engineSignal ?? -1);
}

export function composeLifeJourneyDateMatrixMessage({ expressions = [], relationRows = [], methodRows = [] } = {}) {
  if (!expressions.length || !methodRows.length) {
    return "עדיין אין מספיק תוצאות מנוע כדי להרכיב מסר מחקרי בלי להמציא.";
  }
  const strongest = relationRows[0] || null;
  if (!strongest) {
    return `נבדקו ${expressions.length} ביטויים מתוך השם והתאריך, אך לא נמצאה ביניהם כרגע התכנסות מהותית במנוע הקשרים. זו תוצאה פתוחה למחקר, לא קביעה שאין קשר.`;
  }
  const normalized = Number.isSafeInteger(strongest.independentGroupCount)
    ? ` לאחר נרמול התלות נשארו ${strongest.independentGroupCount} קבוצות שיטה עצמאיות`
    : " לאחר נרמול התלות בין השיטות";
  return `החיבור הבולט כרגע נמצא בין ${strongest.left.label} לבין ${strongest.right.label}.${normalized}. בסך הכול נמצאו ${relationRows.length} חיבורים מחושבים במטריצה; הם מצביעים על כיוון לבדיקה ואינם קובעים אופי, גורל או אמת אישית.`;
}

export async function runLifeJourneyDateMatrixResearch({
  firstName,
  surname = null,
  birthdateIso,
  providers,
} = {}) {
  if (typeof providers?.methodPack !== "function" || typeof providers?.relationPair !== "function") {
    throw new TypeError("lifeJourneyDateMatrix: canonical methodPack and relationPair providers are required");
  }
  const matrix = compileLifeJourneyDateExpressionMatrix({ firstName, surname, birthdateIso });
  if (!matrix) return null;

  const packs = await mapWithConcurrency(matrix.expressions, 4, async item => ({
    ...item,
    methods: Object.freeze(await providers.methodPack(item)),
  }));
  const pairs = allPairs(matrix.expressions);
  const relationResults = await mapWithConcurrency(pairs, 4, async ([left, right]) => ({
    left,
    right,
    result: await providers.relationPair(left, right),
  }));
  const relationRows = relationResults
    .map(({ left, right, result }) => relationRow(left, right, result))
    .filter(Boolean)
    .sort((a, b) => relationStrength(b) - relationStrength(a));
  const methodRows = packs.flatMap(item => item.methods);
  const uniqueMethods = new Set(methodRows.map(row => row.methodKey));

  return Object.freeze({
    version: LIFE_JOURNEY_DATE_MATRIX_VERSION,
    representation: matrix.representation,
    expressions: Object.freeze(packs),
    relationRows: Object.freeze(relationRows),
    message: composeLifeJourneyDateMatrixMessage({ expressions: packs, relationRows, methodRows }),
    coverage: Object.freeze({
      expressionCount: packs.length,
      methodCount: uniqueMethods.size,
      methodValueCount: methodRows.length,
      searchedPairCount: pairs.length,
      relationCount: relationRows.length,
      truncated: false,
    }),
  });
}

export default runLifeJourneyDateMatrixResearch;
