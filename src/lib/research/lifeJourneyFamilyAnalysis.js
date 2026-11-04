import {
  composeNormalizedMessageReflection,
  createSupabaseThreeCardProvider,
} from "./normalizedMessageReflection.js";
import { SYNTHESIS_STATUS } from "./researchSynthesis.js";
import { buildLifeJourneySynthesisPack } from "./lifeJourneySynthesisPack.js";

export const LIFE_JOURNEY_FAMILY_ANALYSIS_VERSION = "life-journey-family-analysis-v3";
const MAX_CONNECTIONS = 8;
const MAX_SHARED_VALUES = 8;

const clean = value => String(value || "").trim();
const finiteInteger = value => Number.isSafeInteger(Number(value)) ? Number(value) : null;
const list = value => Array.isArray(value) ? value : [];

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)));
}

function collectEvidence(research = {}) {
  const evidence = [];
  const evidenceIds = new Set();
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
    evidenceIds.add(id);
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
    evidenceIds.add(id);
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
      evidenceIds.add(id);
      const ids = valueEvidenceIds.get(value) || [];
      ids.push(id);
      valueEvidenceIds.set(value, ids);
    });
  });

  list(research?.sourceResearch?.numberSources).forEach(source => {
    list(source?.phrases).forEach(phrase => list(phrase?.sourceRefs).forEach(value => {
      const id = clean(value);
      if (!id || evidenceIds.has(id)) return;
      evidenceIds.add(id);
      evidence.push(Object.freeze({ id, kind: "canonical_equal_value_source", value: finiteInteger(source?.value) }));
    }));
  });
  list(research?.sourceResearch?.memberSources).forEach(source => {
    list(source?.verses).forEach(verse => {
      const id = clean(verse?.sourceRef);
      if (!id || evidenceIds.has(id)) return;
      evidenceIds.add(id);
      evidence.push(Object.freeze({ id, kind: "canonical_tanakh_source" }));
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
    lines.push(`- חיבור מספרי ${finiteInteger(item?.value) ?? "לא זמין"}: הופיע אצל ${finiteInteger(item?.count) ?? 0} אנשים דרך ${finiteInteger(item?.distinctExpressionCount) ?? 0} ביטויים שונים; ${item?.sameMethod === true ? "כולל מפגש באותה שיטה" : "החיבור חוצה שיטות"}.`);
  });
  const privateLabels = [...new Set(rows.flatMap(row => {
    const name = clean(row?.name);
    return name ? [name, ...name.split(/\s+/u).filter(part => part.length > 1)] : [];
  }))].sort((a, b) => b.length - a.length);
  const redact = value => {
    let safe = clean(value);
    for (const label of privateLabels) safe = safe.split(label).join("הביטוי שנבדק");
    return safe;
  };
  const sourceResearch = research?.sourceResearch || {};
  list(sourceResearch?.numberSources).slice(0, MAX_SHARED_VALUES).forEach(source => {
    const value = finiteInteger(source?.value);
    const phrases = list(source?.phrases).slice(0, 6)
      .map(item => redact(item?.phrase)).filter(Boolean);
    if (value != null && phrases.length) {
      lines.push(`- ביטויים מאומתים בעלי ערך ${value}: ${phrases.join(" · ")}. זהו שוויון מספרי בלבד.`);
    }
  });
  list(sourceResearch?.memberSources).slice(0, 12).forEach((source, index) => {
    const verses = list(source?.verses).slice(0, 2).map(verse => {
      const ref = clean(verse?.ref);
      const verseText = redact(verse?.text);
      return ref && verseText ? `${ref} — ${verseText}` : null;
    }).filter(Boolean);
    if (verses.length) lines.push(`- מקורות תנ״ך לאדם ${index + 1}: ${verses.join(" | ")}.`);
    const consensus = list(source?.consensus).slice(0, 3)
      .map(item => `${redact(item?.target)} (${finiteInteger(item?.independentFamilyCount) ?? 0} משפחות מקור)`)
      .filter(item => !item.startsWith(" ("));
    if (consensus.length) lines.push(`- התכנסויות מקור לאדם ${index + 1}: ${consensus.join(" · ")}.`);
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
      text: `הערך ${value} חיבר ${count ?? 0} אנשים דרך ${finiteInteger(item?.distinctExpressionCount) ?? 0} ביטויים שונים לאחר נרמול. זו חזרה מחושבת, לא פרשנות על המשפחה.`,
      role: "engine_finding_summary",
      support: { finding_ids: evidence.valueEvidenceIds.get(value) || [] },
    });
  });

  const sources = research?.sourceResearch || {};
  list(sources?.numberSources).slice(0, MAX_SHARED_VALUES).forEach((source, index) => {
    const value = finiteInteger(source?.value);
    const phrases = list(source?.phrases).slice(0, 6).map(item => clean(item?.phrase)).filter(Boolean);
    if (value == null || !phrases.length) return;
    claims.push({
      id: `life-family-analysis-number-source-${index + 1}`,
      text: `לערך ${value} נמצאו במאגר הביטויים: ${phrases.join(" · ")}. זהו שוויון מספרי, לא הוכחת משמעות.`,
      role: "canonical_source_summary",
      support: { finding_ids: list(source?.phrases).flatMap(item => list(item?.sourceRefs)).slice(0, 24) },
    });
  });
  list(sources?.memberSources).slice(0, 12).forEach((source, index) => {
    const refs = list(source?.verses).slice(0, 2).map(verse => clean(verse?.ref)).filter(Boolean);
    if (!refs.length) return;
    claims.push({
      id: `life-family-analysis-verse-source-${index + 1}`,
      text: `לאדם ${index + 1} נמצאו מקורות פסוק מפורשים: ${refs.join(" · ")}.`,
      role: "canonical_source_summary",
      support: { finding_ids: list(source?.verses).map(verse => clean(verse?.sourceRef)).filter(Boolean) },
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
  birthReflections = null,
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
  const selectedRefs = list(research.rows).map(row => clean(row?.memberRef)).filter(Boolean);
  const inputPack = buildLifeJourneySynthesisPack({
    research,
    birthReflections,
    selectedRefs,
    interpreterFacts: facts,
  });
  const rawMessage = await aiAnalysisProvider({
    kind: "life_journey_family",
    subject: "מפת מחקר משפחתית",
    facts: inputPack.interpreter.facts,
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
  const synthesisPack = buildLifeJourneySynthesisPack({
    research,
    analysis: {
      state: "ready",
      data: {
        message: result.message,
        claims: result.synthesis.claims,
      },
    },
    birthReflections,
    selectedRefs,
    interpreterFacts: inputPack.interpreter.facts,
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
      verseCount: finiteInteger(research?.sourceResearch?.coverage?.verseCount) ?? 0,
      equalPhraseCount: finiteInteger(research?.sourceResearch?.coverage?.equalPhraseCount) ?? 0,
    }),
    synthesisPack,
    boundaries: Object.freeze({
      one_private_synthesis_pack: true,
      message_frozen_before_internal_reflection: true,
      internal_reflection_not_exposed: true,
      internal_reflection_evidence_weight: 0,
      birth_lenses_internal_only: true,
      birth_lenses_excluded_from_interpreter: true,
      birth_lenses_evidence_weight: 0,
      names_not_sent_to_interpreter: true,
      public_source_text_sanitized_before_interpreter: true,
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
