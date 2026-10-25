import {
  composeNormalizedMessageReflection,
  createSupabaseThreeCardProvider,
} from "./normalizedMessageReflection.js";
import { SYNTHESIS_STATUS } from "./researchSynthesis.js";

export const LIFE_JOURNEY_FAMILY_ANALYSIS_VERSION = "life-journey-family-analysis-v1";
const MAX_CONNECTIONS = 8;
const MAX_SHARED_VALUES = 8;

const clean = value => String(value || "").trim();
const finiteInteger = value => Number.isSafeInteger(Number(value)) ? Number(value) : null;

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function collectEvidence(research = {}) {
  const evidence = [];
  const connectionEvidenceIds = new Map();
  const valueEvidenceIds = new Map();
  const relationRows = Array.isArray(research.relationRows) && research.relationRows.length
    ? research.relationRows
    : Array.isArray(research.connections) ? research.connections : [];

  relationRows.forEach((connection, index) => {
    const id = clean(connection?.id) || `life-family-connection-${index + 1}`;
    evidence.push(Object.freeze({
      id,
      kind: "normalized_family_connection",
      independent_group_count: finiteInteger(connection?.independentGroupCount),
      engine_signal: finiteInteger(connection?.engineSignal),
    }));
  });

  (Array.isArray(research.connections) ? research.connections : []).forEach((connection, index) => {
    const ids = (Array.isArray(connection?.findingIds) ? connection.findingIds : [connection?.id]).map(clean).filter(Boolean);
    connectionEvidenceIds.set(index, ids);
  });

  const matrixMethodFindings = Array.isArray(research.methodFindings) ? research.methodFindings : [];
  matrixMethodFindings.forEach((finding, index) => {
    const value = finiteInteger(finding?.value);
    if (value == null) return;
    const id = clean(finding?.id) || `life-family-matrix-finding-${index + 1}`;
    evidence.push(Object.freeze({ id, kind: "family_numeric_finding", value }));
    const ids = valueEvidenceIds.get(value) || [];
    ids.push(id);
    valueEvidenceIds.set(value, ids);
  });

  if (!matrixMethodFindings.length) (Array.isArray(research.rows) ? research.rows : []).forEach((row, memberIndex) => {
    if (row?.state !== "ready") return;
    const findings = [
      ...(Array.isArray(row?.data?.methodFindings) ? row.data.methodFindings : []),
      ...(Array.isArray(row?.data?.crossFindings) ? row.data.crossFindings : []),
    ];
    findings.forEach((finding, findingIndex) => {
      const value = finiteInteger(finding?.value);
      if (value == null) return;
      const id = `life-family-member-${memberIndex + 1}-finding-${findingIndex + 1}`;
      evidence.push(Object.freeze({ id, kind: "family_numeric_finding", value }));
      const ids = valueEvidenceIds.get(value) || [];
      ids.push(id);
      valueEvidenceIds.set(value, ids);
    });
  });

  return Object.freeze({
    findings: Object.freeze(evidence),
    connectionEvidenceIds,
    valueEvidenceIds,
  });
}

/**
 * Produces the bounded AI input. Names, person refs, dates and places are deliberately omitted;
 * the authorized private input has already been reduced to engine-derived counts and values.
 */
export function buildLifeJourneyFamilyAnalysisFacts(research = {}) {
  const rows = Array.isArray(research.rows) ? research.rows : [];
  const connections = Array.isArray(research.connections) ? research.connections : [];
  const relationRows = Array.isArray(research.relationRows) ? research.relationRows : connections;
  const sharedValues = Array.isArray(research.sharedValues) ? research.sharedValues : [];
  const lines = [
    "מפת מחקר משפחתית פרטית — הקלט עבר אנונימיזציה לפני הפרשנות.",
    `אנשים שנבדקו: ${rows.length}.`,
    `ביטויי שם ותאריך שנבדקו: ${finiteInteger(research?.coverage?.expressionCount) ?? 0}.`,
    `זוגות שנבדקו: ${finiteInteger(research?.coverage?.searchedPairCount) ?? 0}.`,
    `חיבורי ביטויים מנורמלים שנמצאו: ${relationRows.length}.`,
    `זוגות אנשים עם חיבור: ${connections.length}.`,
  ];
  connections.slice(0, MAX_CONNECTIONS).forEach((connection, index) => {
    lines.push(`- זוג אנשים ${index + 1}: ביטוי שמאל=${clean(connection?.left?.expressionRole) || "לא זמין"}; ביטוי ימין=${clean(connection?.right?.expressionRole) || "לא זמין"}; קבוצות שיטה עצמאיות=${finiteInteger(connection?.independentGroupCount) ?? "לא זמין"}; חיבורי ביטויים בזוג=${finiteInteger(connection?.expressionConnectionCount) ?? 1}.`);
  });
  sharedValues.slice(0, MAX_SHARED_VALUES).forEach(item => {
    lines.push(`- ערך משותף ${finiteInteger(item?.value) ?? "לא זמין"}: הופיע אצל ${finiteInteger(item?.count) ?? 0} אנשים.`);
  });
  lines.push("נסח מסר מחקרי זהיר מתוך העובדות בלבד. אין להסיק גורל, אישיות, נבואה או אמת משפחתית.");
  return lines.join("\n");
}

function analysisClaims(research, evidence) {
  const claims = [];
  (Array.isArray(research.connections) ? research.connections : []).slice(0, MAX_CONNECTIONS).forEach((connection, index) => {
    const left = clean(connection?.left?.name) || `אדם ${index + 1}`;
    const right = clean(connection?.right?.name) || `אדם ${index + 2}`;
    const groups = finiteInteger(connection?.independentGroupCount);
    claims.push({
      id: `life-family-analysis-connection-${index + 1}`,
      text: `${left} ו־${right}: ${groups == null ? "נמצא חיבור מנוע שעבר נרמול תלות" : `נמצאו ${groups} קבוצות שיטה עצמאיות לאחר נרמול`}.`,
      role: "engine_finding_summary",
      support: { finding_ids: evidence.connectionEvidenceIds.get(index) || [] },
    });
  });

  (Array.isArray(research.sharedValues) ? research.sharedValues : []).slice(0, MAX_SHARED_VALUES).forEach((item, index) => {
    const value = finiteInteger(item?.value);
    const count = finiteInteger(item?.count);
    if (value == null) return;
    claims.push({
      id: `life-family-analysis-shared-${index + 1}`,
      text: `הערך ${value} הופיע בתוצאות של ${count ?? 0} אנשים שנבחרו. זו חזרה מחושבת, לא פרשנות על המשפחה.`,
      role: "engine_finding_summary",
      support: { finding_ids: evidence.valueEvidenceIds.get(value) || [] },
    });
  });

  if (!claims.length) {
    claims.push({
      id: "life-family-analysis-coverage",
      text: `המחקר בדק ${finiteInteger(research?.coverage?.searchedPairCount) ?? 0} זוגות ולא העלה כרגע חיבור מנורמל להצגה.`,
      role: "coverage_summary",
      support: { finding_ids: [] },
    });
  }
  return claims;
}

function normalizeAiMessage(raw) {
  if (typeof raw === "string") return clean(raw);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return clean(raw.message || raw.analysis || raw.text);
}

export async function runLifeJourneyFamilyAnalysis({
  research,
  aiAnalysisProvider,
  tarotProvider,
  now = () => new Date().toISOString(),
} = {}) {
  if (!research || research.state !== "ready") {
    throw new TypeError("lifeJourneyFamilyAnalysis: completed family research is required");
  }
  if (typeof aiAnalysisProvider !== "function") {
    throw new TypeError("lifeJourneyFamilyAnalysis: aiAnalysisProvider is required");
  }
  if (typeof tarotProvider !== "function") {
    throw new TypeError("lifeJourneyFamilyAnalysis: tarotProvider is required");
  }

  const evidence = collectEvidence(research);
  const bundle = Object.freeze({
    contract_version: 1,
    query: Object.freeze({ raw_input: "family-research-map" }),
    findings: evidence.findings,
  });
  const facts = buildLifeJourneyFamilyAnalysisFacts(research);
  const rawMessage = await aiAnalysisProvider({
    kind: "life_journey_family",
    subject: "מפת מחקר משפחתית",
    facts,
    operation: "normalized_reflection",
  });
  const message = normalizeAiMessage(rawMessage)
    || clean(research.message)
    || "המפה המשפחתית נבדקה, אך אין עדיין מספיק תוצאות כדי לנסח מסר נוסף.";
  const frozenAt = now();
  const result = await composeNormalizedMessageReflection({
    bundle,
    trackLists: [],
    frozenAt,
    synthesizer: async () => ({
      status: SYNTHESIS_STATUS.COMPOSED,
      message,
      claims: analysisClaims(research, evidence),
      motifs: [],
      freeze: {
        frozen: true,
        frozen_at: frozenAt,
        policy_version: LIFE_JOURNEY_FAMILY_ANALYSIS_VERSION,
      },
      provenance: {
        source_refs: ["life_journey_family_research"],
        version_refs: [LIFE_JOURNEY_FAMILY_ANALYSIS_VERSION],
      },
    }),
    tarotProvider,
  });

  return Object.freeze({
    version: LIFE_JOURNEY_FAMILY_ANALYSIS_VERSION,
    status: "ready",
    message: result.message,
    claims: freezeRows(result.synthesis.claims.map(claim => ({
      id: claim.id,
      text: claim.text,
      role: claim.role,
    }))),
    strongestConnections: freezeRows((Array.isArray(research.connections) ? research.connections : []).slice(0, 3).map(connection => ({
      id: clean(connection?.id),
      leftName: clean(connection?.left?.name),
      rightName: clean(connection?.right?.name),
      independentGroupCount: finiteInteger(connection?.independentGroupCount),
    }))),
    sharedValues: freezeRows((Array.isArray(research.sharedValues) ? research.sharedValues : []).slice(0, MAX_SHARED_VALUES).map(item => ({
      value: finiteInteger(item?.value),
      count: finiteInteger(item?.count),
    })).filter(item => item.value != null)),
    coverage: Object.freeze({
      memberCount: finiteInteger(research?.coverage?.memberCount) ?? research.rows.length,
      expressionCount: finiteInteger(research?.coverage?.expressionCount) ?? 0,
      searchedPairCount: finiteInteger(research?.coverage?.searchedPairCount) ?? 0,
      relationCount: finiteInteger(research?.coverage?.relationCount) ?? 0,
      connectionCount: finiteInteger(research?.coverage?.connectionCount) ?? 0,
    }),
    boundaries: Object.freeze({
      message_frozen_before_internal_reflection: true,
      internal_reflection_not_exposed: true,
      internal_reflection_evidence_weight: 0,
      names_not_sent_to_interpreter: true,
      no_els: true,
      not_family_truth: true,
    }),
  });
}

export function createLifeJourneyFamilyAnalysisProviders({ getAiAnalysis, supabase } = {}) {
  if (typeof getAiAnalysis !== "function") {
    throw new TypeError("lifeJourneyFamilyAnalysis: getAiAnalysis is required");
  }
  return Object.freeze({
    aiAnalysisProvider: args => getAiAnalysis({
      ...args,
      fast: false,
      long: true,
      surface: "research:life-journey-family-analysis",
      persistAnalysis: false,
    }),
    tarotProvider: createSupabaseThreeCardProvider(supabase),
  });
}

export default runLifeJourneyFamilyAnalysis;
