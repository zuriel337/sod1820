import { stableIdentityDigest } from "./researchRepresentations.js";

export const LIFE_JOURNEY_FAMILY_SNAPSHOT_VERSION = "life-journey-family-snapshot-v1";
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
    "candidatePairCount", "searchedPairCount", "relationCount", "connectionCount"]) {
    const value = integer(coverage?.[key]);
    if (value != null) out[key] = value;
  }
  out.truncated = coverage?.truncated === true;
  return out;
}

function compactResearch(research) {
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
    })).filter(item => item.value != null && item.count != null).slice(0, 256),
    methodFindings: list(research.methodFindings).map(compactFinding).filter(Boolean).slice(0, 2048),
    relationRows: list(research.relationRows).map(compactConnection).filter(Boolean).slice(0, 768),
    connections: list(research.connections).map(compactConnection).filter(Boolean).slice(0, 66),
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
  const compactedResearch = compactResearch(research);
  if (!rootRef || !selectionSignature || !compactedResearch) return null;
  const payload = {
    version: LIFE_JOURNEY_FAMILY_SNAPSHOT_VERSION,
    personRef: rootRef,
    selectionSignature,
    savedAt: text(savedAt || new Date().toISOString(), 64),
    research: compactedResearch,
    analysis: compactAnalysis(analysis, [...new Set(list(research?.rows).flatMap(row => {
      const name = clean(row?.name);
      return name ? [name, ...name.split(/\s+/u).filter(part => part.length > 1)] : [];
    }))]),
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
    text: `הערך ${item.value} הופיע בתוצאות של ${item.count} אנשים שנבחרו. זו חזרה מחושבת, לא פרשנות על המשפחה.`,
    role: "engine_finding_summary",
  }));
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
  const research = {
    ...snapshot.research,
    rows,
    relationRows,
    connections,
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

