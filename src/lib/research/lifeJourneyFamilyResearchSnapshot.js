import { stableIdentityDigest } from "./researchRepresentations.js";
import { compileLifeJourneyFamilyExpressionMatrix } from "./lifeJourneyFamilyResearch.js";

export const LIFE_JOURNEY_FAMILY_SNAPSHOT_VERSION = "life-journey-family-snapshot-v3";
export const LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION = "lifeJourneyFamilyResearchSnapshot";
export const LIFE_JOURNEY_FAMILY_SNAPSHOT_MAX_BYTES = 240000;

const clean = value => String(value || "").trim();
const integer = value => (typeof value === "number" || (typeof value === "string" && value.trim()))
  && Number.isSafeInteger(Number(value)) ? Number(value) : null;
const list = value => Array.isArray(value) ? value : [];
const text = (value, max = 2000) => clean(value).slice(0, max) || null;

function compactFinding(finding) {
  const id = text(finding?.id, 240);
  const value = integer(finding?.value ?? finding?.subject?.value);
  if (!id || value == null) return null;
  return {
    id: `life-family-snapshot-finding:${stableIdentityDigest(id)}`,
    value,
    methodLabel: text(finding?.methodLabel, 80),
    methodKey: text(finding?.methodKey, 80),
    memberRef: text(finding?.memberRef, 240),
    expressionRole: text(finding?.expressionRole, 80),
    expressionLabel: text(finding?.expressionLabel, 120),
    sourceRef: null,
    versionRef: text(finding?.versionRef, 160),
    focusKind: text(finding?.focusKind, 80),
  };
}

function compactSide(side) {
  return {
    memberRef: text(side?.memberRef, 240),
    expressionRole: text(side?.expressionRole, 80),
    expressionLabel: text(side?.expressionLabel, 120),
  };
}

function compactConnection(connection) {
  const id = text(connection?.id, 240);
  if (!id) return null;
  return {
    id: `life-family-snapshot-connection:${stableIdentityDigest(id)}`,
    left: compactSide(connection?.left),
    right: compactSide(connection?.right),
    engineSignal: integer(connection?.engineSignal),
    independentGroupCount: integer(connection?.independentGroupCount),
    rawGroupCount: integer(connection?.rawGroupCount),
    expressionConnectionCount: integer(connection?.expressionConnectionCount) ?? 1,
    findingIds: list(connection?.findingIds).map(value => text(value, 240)).filter(Boolean)
      .map(value => `life-family-snapshot-finding:${stableIdentityDigest(value)}`).slice(0, 768),
  };
}

function compactCoverage(coverage) {
  const out = {};
  for (const key of ["memberCount", "expressionCount", "methodValueCount", "possiblePairCount",
    "candidatePairCount", "searchedPairCount", "relationCount", "connectionCount", "verseCount",
    "equalPhraseCount", "requestedMemberCount", "returnedMemberCount", "requestedValueCount",
    "returnedValueCount"]) {
    const value = integer(coverage?.[key]);
    if (value != null) out[key] = value;
  }
  out.truncated = coverage?.truncated === true;
  return out;
}

function compactSourceResearch(sourceResearch, privateLabels) {
  if (!sourceResearch || typeof sourceResearch !== "object") return null;
  return {
    version: text(sourceResearch.version, 120),
    memberSources: list(sourceResearch.memberSources).slice(0, 12).map(source => ({
      memberRef: text(source?.memberRef, 240),
      verses: list(source?.verses).slice(0, 2).map(verse => ({
        id: text(verse?.id, 240),
        ref: text(verse?.ref, 160),
        text: redactPrivateLabels(verse?.text, privateLabels),
        sourceRef: text(verse?.sourceRef, 160),
        evidence: text(verse?.evidence, 40),
      })).filter(verse => verse.id && verse.ref && verse.text),
      tracks: list(source?.tracks).slice(0, 18).map(track => ({
        id: text(track?.id, 80),
        label: text(track?.label, 160),
        evidence: text(track?.evidence, 40),
        count: integer(track?.count) ?? 0,
        sourceRef: text(track?.sourceRef, 160),
      })).filter(track => track.id),
      consensus: list(source?.consensus).slice(0, 6).map(item => ({
        id: text(item?.id, 240),
        type: text(item?.type, 80),
        target: redactPrivateLabels(item?.target, privateLabels),
        independentFamilyCount: integer(item?.independentFamilyCount) ?? 0,
        families: list(item?.families).map(value => text(value, 80)).filter(Boolean).slice(0, 6),
        sourceRef: text(item?.sourceRef, 160),
      })).filter(item => item.id && item.target),
      tracksWithResults: integer(source?.tracksWithResults) ?? 0,
      sourceRef: text(source?.sourceRef, 160),
    })).filter(source => source.memberRef),
    numberSources: list(sourceResearch.numberSources).slice(0, 8).map(source => ({
      value: integer(source?.value),
      phrases: list(source?.phrases).slice(0, 6).map(phrase => ({
        id: text(phrase?.id, 240),
        phrase: redactPrivateLabels(phrase?.phrase, privateLabels),
        methods: list(phrase?.methods).map(value => text(value, 80)).filter(Boolean).slice(0, 12),
        sourceRefs: list(phrase?.sourceRefs).map(value => text(value, 160)).filter(Boolean).slice(0, 12),
        governed: phrase?.governed === true,
        evidence: text(phrase?.evidence, 40),
      })).filter(phrase => phrase.id && phrase.phrase),
      sourceRef: text(source?.sourceRef, 160),
      truncated: source?.truncated === true,
    })).filter(source => source.value != null),
    coverage: compactCoverage(sourceResearch.coverage),
    boundaries: Object.fromEntries(Object.entries(sourceResearch.boundaries || {})
      .filter(([, value]) => typeof value === "boolean")),
  };
}

function compactResearch(research, privateLabels = []) {
  if (research?.state !== "ready") return null;
  const rows = list(research.rows).slice(0, 12).map(row => ({
    memberRef: text(row?.memberRef, 240),
    state: row?.state === "ready" ? "ready" : "error",
    data: row?.state === "ready" ? {
      fullValue: integer(row?.data?.fullValue),
      methodFindings: list(row?.data?.methodFindings).map(compactFinding).filter(Boolean).slice(0, 128),
      crossFindings: list(row?.data?.crossFindings).map(compactFinding).filter(Boolean).slice(0, 128),
      crossValues: list(row?.data?.crossValues).map(integer).filter(value => value != null).slice(0, 128),
      tracksWithResults: integer(row?.data?.tracksWithResults) ?? 0,
      partial: row?.data?.partial === true,
    } : null,
    error: row?.state === "ready" ? null : "המחקר לא הושלם עבור האדם הזה.",
  })).filter(row => row.memberRef);
  return {
    state: "ready",
    rows,
    sharedValues: list(research.sharedValues).map(item => ({
      value: integer(item?.value),
      count: integer(item?.count),
      expressionCount: integer(item?.expressionCount),
      distinctExpressionCount: integer(item?.distinctExpressionCount),
      normalizedEvidenceCount: integer(item?.normalizedEvidenceCount),
      methodGroupCount: integer(item?.methodGroupCount),
      repeatedExpressionCount: integer(item?.repeatedExpressionCount),
      sameMethod: item?.sameMethod === true,
      classification: text(item?.classification, 80),
    })).filter(item => item.value != null && item.count != null).slice(0, 256),
    sharedExpressions: list(research.sharedExpressions).map(item => ({
      id: text(item?.id, 240),
      memberCount: integer(item?.memberCount),
      memberRefs: list(item?.memberRefs).map(value => text(value, 240)).filter(Boolean).slice(0, 12),
      expressionRoles: list(item?.expressionRoles).map(value => text(value, 80)).filter(Boolean).slice(0, 12),
      valueCount: integer(item?.valueCount),
      values: list(item?.values).map(integer).filter(value => value != null).slice(0, 64),
      effectiveMethodGroupCount: integer(item?.effectiveMethodGroupCount),
    })).filter(item => item.id && item.memberCount).slice(0, 64),
    methodNormalization: {
      rawMethodResultCount: integer(research?.methodNormalization?.rawMethodResultCount) ?? 0,
      effectiveMethodResultCount: integer(research?.methodNormalization?.effectiveMethodResultCount) ?? 0,
      collapsedMethodResultCount: integer(research?.methodNormalization?.collapsedMethodResultCount) ?? 0,
      appliedEquivalenceFamilies: list(research?.methodNormalization?.appliedEquivalenceFamilies)
        .map(value => text(value, 180)).filter(Boolean).slice(0, 32),
    },
    methodFindings: list(research.methodFindings).map(compactFinding).filter(Boolean).slice(0, 2048),
    relationRows: list(research.relationRows).map(compactConnection).filter(Boolean).slice(0, 768),
    connections: list(research.connections).map(compactConnection).filter(Boolean).slice(0, 66),
    sourceResearch: compactSourceResearch(research.sourceResearch, privateLabels),
    message: null,
    coverage: compactCoverage(research.coverage),
    error: null,
  };
}

function redactPrivateLabels(value, privateLabels) {
  let safe = text(value, 8000);
  for (const label of privateLabels) {
    if (label) safe = safe?.split(label).join("אדם שנבחר") || null;
  }
  return safe;
}

function compactAnalysis(analysis, privateLabels = []) {
  if (analysis?.state !== "ready" || !analysis?.data) return null;
  const data = analysis.data;
  return {
    state: "ready",
    data: {
      version: text(data.version, 120),
      status: "ready",
      message: redactPrivateLabels(data.message, privateLabels),
      claims: [],
      strongestConnections: [],
      sharedValues: list(data.sharedValues).map(item => ({
        value: integer(item?.value), count: integer(item?.count),
      })).filter(item => item.value != null && item.count != null).slice(0, 16),
      coverage: compactCoverage(data.coverage),
      boundaries: Object.fromEntries(Object.entries(data.boundaries || {})
        .filter(([, value]) => typeof value === "boolean")),
    },
    error: null,
  };
}

export function lifeJourneyFamilySelectionSignature(members = [], selectedRefs = []) {
  const selected = new Set(list(selectedRefs).map(clean).filter(Boolean));
  const rows = list(members).flatMap(member => {
    const memberRef = clean(member?.source_ref ?? member?.memberRef);
    if (!selected.has(memberRef)) return [];
    const meta = member?.meta && typeof member.meta === "object" && !Array.isArray(member.meta) ? member.meta : {};
    return [{
      memberRef,
      name: clean(member?.name ?? member?.fullName),
      firstName: clean(meta.first_name ?? member?.firstName),
      surname: clean(meta.surname ?? member?.surname),
      birthdate: clean(meta.birthdate_iso ?? member?.birthdate),
    }];
  }).sort((a, b) => a.memberRef.localeCompare(b.memberRef));
  return rows.length === selected.size && rows.length
    ? stableIdentityDigest(JSON.stringify(rows))
    : null;
}

export function serializeLifeJourneyFamilySnapshot({ personRef, signature, research, analysis = null, savedAt = null } = {}) {
  const rootRef = clean(personRef);
  const selectionSignature = clean(signature);
  const privateLabels = [...new Set(list(research?.rows).flatMap(row => {
    const name = clean(row?.name);
    return name ? [name, ...name.split(/\s+/u).filter(part => part.length > 1)] : [];
  }))];
  const compactedResearch = compactResearch(research, privateLabels);
  if (!rootRef || !selectionSignature || !compactedResearch) return null;
  const payload = {
    version: LIFE_JOURNEY_FAMILY_SNAPSHOT_VERSION,
    personRef: rootRef,
    selectionSignature,
    savedAt: text(savedAt || new Date().toISOString(), 64),
    research: compactedResearch,
    analysis: compactAnalysis(analysis, privateLabels),
  };
  const serialized = JSON.stringify(payload);
  return new TextEncoder().encode(serialized).byteLength <= LIFE_JOURNEY_FAMILY_SNAPSHOT_MAX_BYTES
    ? serialized
    : null;
}

export function readLifeJourneyFamilySnapshot(context, { personRef, signature } = {}) {
  const raw = context?.dimensions?.[LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION];
  if (typeof raw !== "string" || !raw) return null;
  try {
    if (new TextEncoder().encode(raw).byteLength > LIFE_JOURNEY_FAMILY_SNAPSHOT_MAX_BYTES) return null;
    const payload = JSON.parse(raw);
    if (payload?.version !== LIFE_JOURNEY_FAMILY_SNAPSHOT_VERSION
      || payload?.personRef !== clean(personRef)
      || payload?.selectionSignature !== clean(signature)
      || payload?.research?.state !== "ready") return null;
    return payload;
  } catch {
    return null;
  }
}

function restoredFamilyMessage(research) {
  const connections = list(research?.connections);
  if (list(research?.rows).length < 2) return "כדי ליצור מחקר משפחתי מאוחד יש לבחור לפחות שני אנשים.";
  const strongest = connections[0];
  if (!strongest) {
    return `נבדקו ${research.rows.length} אנשים זה מול זה, אך לא נמצאה כרגע התכנסות מנורמלת בין שמותיהם. זו תוצאה פתוחה למחקר, לא קביעה שאין קשר.`;
  }
  const normalized = Number.isSafeInteger(strongest.independentGroupCount)
    ? `לאחר נרמול התלות נשארו ${strongest.independentGroupCount} קבוצות שיטה עצמאיות`
    : "החיבור עבר נרמול תלות בין השיטות";
  return `החיבור הבולט במפה המשפחתית נמצא בין ${strongest.left.name} (${strongest.left.expressionLabel}) לבין ${strongest.right.name} (${strongest.right.expressionLabel}); ${normalized}. בסך הכול נבדקו ${research.coverage?.expressionCount || 0} ביטויי שם ותאריך ונמצאו ${connections.length} זוגות אנשים עם חיבור מחושב.`;
}

function restoredAnalysisClaims(research) {
  const claims = list(research?.connections).slice(0, 8).map((connection, index) => ({
    id: `life-family-analysis-connection-${index + 1}`,
    text: `${connection.left.name} ו־${connection.right.name}: ${Number.isSafeInteger(connection.independentGroupCount)
      ? `נמצאו ${connection.independentGroupCount} קבוצות שיטה עצמאיות לאחר נרמול`
      : "נמצא חיבור מנוע שעבר נרמול תלות"}.`,
    role: "engine_finding_summary",
  }));
  list(research?.sharedValues).slice(0, 8).forEach((item, index) => claims.push({
    id: `life-family-analysis-shared-${index + 1}`,
    text: `הערך ${item.value} חיבר ${item.count} אנשים דרך ${item.distinctExpressionCount || 0} ביטויים שונים לאחר נרמול. זו חזרה מחושבת, לא פרשנות על המשפחה.`,
    role: "engine_finding_summary",
  }));
  list(research?.sourceResearch?.numberSources).slice(0, 8).forEach((source, index) => {
    const phrases = list(source?.phrases).slice(0, 6).map(item => clean(item?.phrase)).filter(Boolean);
    if (!phrases.length) return;
    claims.push({
      id: `life-family-analysis-number-source-${index + 1}`,
      text: `לערך ${source.value} נמצאו במאגר הביטויים: ${phrases.join(" · ")}. זהו שוויון מספרי, לא הוכחת משמעות.`,
      role: "canonical_source_summary",
    });
  });
  list(research?.sourceResearch?.memberSources).slice(0, 12).forEach((source, index) => {
    const refs = list(source?.verses).slice(0, 2).map(verse => clean(verse?.ref)).filter(Boolean);
    if (!refs.length) return;
    claims.push({
      id: `life-family-analysis-verse-source-${index + 1}`,
      text: `לאדם ${index + 1} נמצאו מקורות פסוק מפורשים: ${refs.join(" · ")}.`,
      role: "canonical_source_summary",
    });
  });
  if (!claims.length) claims.push({
    id: "life-family-analysis-coverage",
    text: `המחקר בדק ${research?.coverage?.searchedPairCount || 0} זוגות ולא העלה כרגע חיבור מנורמל להצגה.`,
    role: "coverage_summary",
  });
  return claims;
}

/** Rejoins reference-only Context data with the current authorized private Ledger in memory. */
export function materializeLifeJourneyFamilySnapshot(snapshot, members = [], { hebrewDateForMember = null } = {}) {
  if (!snapshot?.research) return null;
  const byRef = new Map(list(members).map(member => [clean(member?.source_ref), member]));
  const nameForRef = memberRef => clean(byRef.get(clean(memberRef))?.name);
  const restoreSide = side => ({ ...side, name: nameForRef(side?.memberRef) });
  const restoreConnection = connection => ({
    ...connection,
    left: restoreSide(connection?.left),
    right: restoreSide(connection?.right),
  });
  const rows = list(snapshot.research.rows).map(row => {
    const member = byRef.get(clean(row?.memberRef));
    const name = clean(member?.name);
    if (!member || !name) return null;
    return {
      ...row,
      name,
      data: row.state === "ready" ? {
        ...row.data,
        hebrewDate: typeof hebrewDateForMember === "function" ? text(hebrewDateForMember(member), 160) : null,
      } : null,
    };
  }).filter(Boolean);
  if (rows.length !== list(snapshot.research.rows).length) return null;
  const relationRows = list(snapshot.research.relationRows).map(restoreConnection);
  const connections = list(snapshot.research.connections).map(restoreConnection);
  if ([...relationRows, ...connections].some(connection => !connection.left.name || !connection.right.name)) return null;
  const expressionTextById = new Map();
  const expressionInputs = list(members).map(member => {
    const meta = member?.meta && typeof member.meta === "object" && !Array.isArray(member.meta) ? member.meta : {};
    const name = clean(member?.name);
    const pieces = name.split(/\s+/u).filter(Boolean);
    return {
      memberRef: clean(member?.source_ref),
      fullName: name,
      firstName: clean(meta.first_name) || pieces[0] || "",
      surname: clean(meta.surname) || pieces.slice(1).join(" "),
      birthdate: clean(meta.birthdate_iso),
    };
  });
  for (const expression of compileLifeJourneyFamilyExpressionMatrix(expressionInputs)) {
    const normalized = clean(expression?.text).normalize("NFKC").replace(/\s+/gu, " ");
    const id = `life-family-shared-expression:${stableIdentityDigest(normalized)}`;
    if (!expressionTextById.has(id)) expressionTextById.set(id, clean(expression?.text));
  }
  const sharedExpressions = list(snapshot.research.sharedExpressions).map(item => ({
    ...item,
    expressionText: expressionTextById.get(clean(item?.id)) || null,
  })).filter(item => item.expressionText);
  const research = {
    ...snapshot.research,
    rows,
    relationRows,
    connections,
    sharedExpressions,
  };
  research.message = restoredFamilyMessage(research);
  const analysis = snapshot.analysis ? {
    ...snapshot.analysis,
    data: { ...snapshot.analysis.data, claims: restoredAnalysisClaims(research) },
  } : null;
  return { research, analysis, savedAt: snapshot.savedAt || null };
}

export function lifeJourneyFamilySnapshotPatch(serialized) {
  return { dimensions: { [LIFE_JOURNEY_FAMILY_SNAPSHOT_DIMENSION]: serialized || null } };
}

