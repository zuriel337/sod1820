import { fetchCanonicalTopicConvergenceFinding } from "./topicConvergence.js";
import { buildTopic2029Projection } from "./topic2029Projection.js";
import { fetchNumberMethodProfile } from "./numberCoreProjection.js";
import { fetchGematriaMethodStates } from "./gematriaMethodRegistry.js";
import { buildGematriaPresentationModel } from "../presentation/gematriaPresentation.js";

export const GOLDEN_TOPIC_GEMATRIA_SLUG = "ateret-tiferetchem-1820";

const clean = (value) => value == null ? "" : String(value).trim();
const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : null;

function profileMethod(profile, methodKey) {
  return (Array.isArray(profile) ? profile : []).find((row) => row?.methodKey === methodKey) || null;
}

function authoredRows(topic) {
  return (Array.isArray(topic?.sections?.rows) ? topic.sections.rows : [])
    .map((row) => ({
      expression: clean(row?.phrase || row?.text),
      value: finite(row?.value),
      note: clean(row?.note) || null,
      sourcePath: clean(row?.sourcePath) || null,
    }))
    .filter((row) => row.expression && row.value != null);
}

function primaryAxisValue(topic, rows) {
  const highlighted = (Array.isArray(topic?.highlightNumbers) ? topic.highlightNumbers : [])
    .map(finite)
    .find((value) => value != null);
  if (highlighted != null) return highlighted;

  const counts = new Map();
  for (const row of rows) counts.set(row.value, (counts.get(row.value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function relatedAxes(topic, primaryValue) {
  const connections = Array.isArray(topic?.sections?.connections) ? topic.sections.connections : [];
  const noteByNumber = new Map(
    connections
      .map((row) => [finite(row?.number), clean(row?.note)])
      .filter(([value]) => value != null),
  );

  return Object.freeze(
    (Array.isArray(topic?.numbers) ? topic.numbers : [])
      .map(finite)
      .filter((value) => value != null && value !== primaryValue)
      .map((value) => Object.freeze({
        value,
        kind: "related_number",
        label: "קשר נוסף בטופיק",
        note: noteByNumber.get(value) || null,
        verifiedAsConvergence: false,
      })),
  );
}

export async function fetchGoldenTopicGematriaCalibration(slug) {
  const topicSlug = clean(slug);
  if (topicSlug !== GOLDEN_TOPIC_GEMATRIA_SLUG) return null;

  const finding = await fetchCanonicalTopicConvergenceFinding(topicSlug);
  const topic = buildTopic2029Projection(finding);
  if (!topic || topic.slug !== topicSlug || topic.withheld) return null;

  const rows = authoredRows(topic);
  const primaryValue = primaryAxisValue(topic, rows);
  if (primaryValue == null) return null;

  const axisRows = rows.filter((row) => row.value === primaryValue);
  if (axisRows.length < 2) return null;

  const [methodStates, ...profiles] = await Promise.all([
    fetchGematriaMethodStates(),
    ...axisRows.map((row) => fetchNumberMethodProfile(row.expression)),
  ]);

  const regularState = (Array.isArray(methodStates) ? methodStates : [])
    .find((row) => row?.method_key === "רגיל");
  const engineReady = regularState?.active === true
    && regularState?.executable === true
    && regularState?.engine_verified === true
    && regularState?.in_engine_drift !== true;
  if (!engineReady) return null;

  const expressions = axisRows.map((row, index) => {
    const regular = profileMethod(profiles[index], "רגיל");
    const engineValue = finite(regular?.computedValue);
    return Object.freeze({
      expression: row.expression,
      claimedValue: row.value,
      engineValue,
      methodKey: "רגיל",
      verified: engineValue === row.value,
      sourcePath: row.sourcePath,
      note: row.note,
      profile: Object.freeze(Array.isArray(profiles[index]) ? profiles[index] : []),
    });
  });

  // Golden calibration is deliberately fail-closed. We do not partially render a
  // "verified convergence" if one authored equality does not reproduce in the engine.
  if (expressions.some((row) => !row.verified)) return null;

  return Object.freeze({
    slug: topic.slug,
    title: topic.title,
    description: topic.description,
    createdBy: topic.createdBy,
    primaryAxis: Object.freeze({
      value: primaryValue,
      methodKey: "רגיל",
      expressions: Object.freeze(expressions),
      expressionCount: expressions.length,
      verified: true,
    }),
    relatedAxes: relatedAxes(topic, primaryValue),
    methodStates: Object.freeze(Array.isArray(methodStates) ? methodStates : []),
    truthBoundary: Object.freeze({
      calculation: "engine_verified",
      interpretation: "topic_authored",
      note: "השוויונות המספריים אומתו במנוע. המשמעות והקשרים הפרשניים נשארים חומר מחקר של הטופיק.",
    }),
  });
}

export function buildGoldenTopicGematriaModel(
  calibration,
  {
    expression = null,
    methodKey = "רגיל",
    researchContextRef = null,
  } = {},
) {
  const rows = calibration?.primaryAxis?.expressions || [];
  if (!rows.length) return null;

  const selectedExpression = clean(expression) || rows[0].expression;
  const selected = rows.find((row) => row.expression === selectedExpression) || rows[0];
  const profile = selected.profile || [];
  const active = profileMethod(profile, clean(methodKey)) || profileMethod(profile, "רגיל") || profile[0] || null;
  if (!active) return null;

  const activeValue = finite(active.computedValue);
  const peers = rows.map((row) => {
    const peerMethod = profileMethod(row.profile, active.methodKey);
    const peerValue = finite(peerMethod?.computedValue);
    return {
      expression: row.expression,
      value: peerValue,
      methodKey: active.methodKey,
      verified: activeValue != null && peerValue === activeValue,
      verificationState: activeValue != null && peerValue === activeValue ? "match" : "different_value",
    };
  });

  return buildGematriaPresentationModel({
    expression: selected.expression,
    numberRoot: activeValue,
    focusKind: "expression",
    activeMethodKey: active.methodKey,
    methodProfile: profile,
    methodStates: calibration.methodStates,
    peerExpressions: peers,
    researchContextRef,
  });
}
