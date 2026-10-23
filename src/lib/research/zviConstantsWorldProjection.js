import { getPublicResearchClient } from "./researchViewMode.js";
import { contributorSourceLocator } from "./worldContributorSourceLocator.js";

const ZVI_SOURCE_SLUG = "tzvi-opoc";
const clean = (value) => value == null ? "" : String(value).trim();
const unique = (values) => [...new Set((values || []).filter(Boolean))];

export const ZVI_CONSTANT_CASES = Object.freeze([
  Object.freeze({
    id: "zvi-constant:e-pi-minus-pi-20",
    title: "e בחזקת π פחות π — קרוב ל־20",
    sourceRef: "channel_updates:1eb4df29-9b31-4773-8fce-ec84b1cef609",
    mediaRef: "channel_updates:4cab1899-520b-4c27-9d97-2c7893271d7b",
    researchId: "5c37f55f-03a2-480b-a2b4-2973bb9e7cd1",
    expression: "e^π − π",
    diagramKind: "constant-orbit",
    target: 20,
    evaluate: () => Math.exp(Math.PI) - Math.PI,
    geometryLink: null,
    interpretation: "המקור מקביל את ההתקרבות ל־20 למילה «עשרים» ולכתר. ההקבלה היא פרשנות, לא הוכחה מתמטית.",
  }),
  Object.freeze({
    id: "zvi-constant:pi45-e6-403",
    title: "π⁴ + π⁵ מול e⁶",
    sourceRef: "channel_updates:b76c4363-9b82-4672-aad9-eb1d6bdd4c70",
    mediaRef: "channel_updates:239e8685-57a6-48b8-9b1f-bac368a532db",
    researchId: "23065adb-4db3-410a-9844-d9b246cb8200",
    expression: "π⁴ + π⁵ ≈ e⁶",
    diagramKind: "powers-balance",
    target: null,
    evaluate: () => Math.pow(Math.PI, 4) + Math.pow(Math.PI, 5),
    comparison: () => Math.exp(6),
    geometryLink: null,
    interpretation: "המקור קושר את החלק השלם 403 לביטויים בגימטריה. קרבת הקבועים אינה שוויון ואינה מקור עצמאי לערך 403.",
  }),
  Object.freeze({
    id: "zvi-constant:pi-power-pi",
    title: "π בחזקת π — 36.46 בקירוב",
    sourceRef: "channel_updates:e8fe432c-7a73-4120-a150-bc6c1f03acb6",
    mediaRef: "channel_updates:7d1ec3cc-46a7-4712-bd11-50e923b376ec",
    researchId: "e4fce708-38cf-4322-8715-8acacfbe2e57",
    expression: "π^π ≈ 36.46",
    diagramKind: "powers-balance",
    target: 36.46,
    evaluate: () => Math.pow(Math.PI, Math.PI),
    geometryLink: null,
    connectionStrength: "חזק לחישוב בלבד",
    evidenceQuality: "חישוב דטרמיניסטי ומקור ראשוני אחד",
    recommendation: "מאושר כחישוב; הקישור ל־36 ול־46 נשאר פרשנות לבדיקה.",
    interpretation: "המקור מקשר את הקירוב 36.46 לערכים 36 ו־46. החישוב מאומת, אך הקישור הרעיוני אינו נובע ממנו.",
  }),
  Object.freeze({
    id: "zvi-constant:e-power-e",
    title: "e בחזקת e — 15.15 בקירוב",
    sourceRef: "channel_updates:b12444d5-3223-4c46-a4e0-37109561cd3e",
    mediaRef: "channel_updates:b12444d5-3223-4c46-a4e0-37109561cd3e",
    researchId: "3c92b703-2261-4fae-82c3-8f13a40ac3f4",
    expression: "e^e ≈ 15.15",
    diagramKind: "constant-orbit",
    target: 15.15,
    evaluate: () => Math.pow(Math.E, Math.E),
    geometryLink: null,
    connectionStrength: "חזק לחישוב בלבד",
    evidenceQuality: "חישוב דטרמיניסטי ומקור ראשוני אחד",
    recommendation: "מאושר כחישוב; המעבר מ־15.15 ל־151 נשאר פרשנות לבדיקה.",
    interpretation: "המקור מציב את הקירוב לצד 151. הזזת הנקודה אינה שוויון מתמטי ואינה חלק מן החישוב המאושר.",
  }),
  Object.freeze({
    id: "zvi-constant:e-power-pi",
    title: "e בחזקת π — 23.14 בקירוב",
    sourceRef: "channel_updates:c2a2d3de-f63e-470f-9819-e37cefcfb940",
    mediaRef: "channel_updates:c2a2d3de-f63e-470f-9819-e37cefcfb940",
    researchId: "61f313e4-ef6b-4bef-befd-4561c59bc3f9",
    expression: "e^π ≈ 23.14",
    diagramKind: "constant-orbit",
    target: 23.14,
    evaluate: () => Math.pow(Math.E, Math.PI),
    geometryLink: null,
    connectionStrength: "חזק לחישוב בלבד",
    evidenceQuality: "חישוב דטרמיניסטי ומקור ראשוני אחד",
    recommendation: "מאושר כחישוב; אין כרגע חיבור גיאומטרי או רעיוני מבוסס.",
    interpretation: "הקירוב המספרי מאומת. משמעות נוספת או חיבור למרחב דורשים מקור וראיה נפרדים.",
  }),
]);

export function verifyConstantCase(spec) {
  const actual = spec.evaluate();
  const comparison = typeof spec.comparison === "function" ? spec.comparison() : spec.target;
  const error = Number.isFinite(comparison) ? actual - comparison : null;
  const absoluteError = Number.isFinite(error) ? Math.abs(error) : null;
  const relativeError = Number.isFinite(absoluteError) && comparison !== 0 ? absoluteError / Math.abs(comparison) : null;
  return {
    actual,
    comparison,
    error,
    absoluteError,
    relativeError,
    relation: absoluteError === 0 ? "exact" : "approximation",
    label: absoluteError === 0 ? "שוויון מדויק" : "קירוב — לא שוויון",
  };
}

function publicImage(row) {
  const thumb = clean(row?.thumb_url);
  const image = clean(row?.image_url);
  if (/^https:\/\//i.test(thumb)) return thumb;
  if (/^https:\/\//i.test(image)) return image;
  return null;
}

export function buildZviConstantsWorldProjection(researchRows = [], sourceRows = []) {
  const researchById = new Map((researchRows || []).map((row) => [String(row?.id), row]));
  const sourceByRef = new Map((sourceRows || []).map((row) => [`channel_updates:${row?.id}`, row]));
  const cards = ZVI_CONSTANT_CASES.map((spec) => {
    const research = researchById.get(spec.researchId);
    const source = sourceByRef.get(spec.sourceRef);
    const media = sourceByRef.get(spec.mediaRef);
    if (!research || !source || clean(research.privacy_scope) !== "public" || clean(research.status) !== "approved") return null;
    const verification = verifyConstantCase(spec);
    return {
      id: spec.id,
      title: spec.title,
      expression: spec.expression,
      diagramKind: spec.diagramKind,
      statement: clean(source.text) || clean(research.statement),
      image: publicImage(media) || publicImage(source),
      source: contributorSourceLocator(spec.sourceRef, { slug: ZVI_SOURCE_SLUG }),
      mediaSource: contributorSourceLocator(spec.mediaRef, { slug: ZVI_SOURCE_SLUG }),
      verification,
      geometryLink: spec.geometryLink,
      interpretation: spec.interpretation,
      review: {
        connectionStrength: spec.connectionStrength || "בינוני",
        evidenceQuality: spec.evidenceQuality || "חישוב דטרמיניסטי ומקור יחיד",
        independentSourceCount: null,
        publicationState: research.status,
        recommendation: spec.recommendation || "דורש בדיקה",
      },
    };
  }).filter(Boolean);
  return {
    id: "zvi-pi-constants-world-v1",
    title: "פאי וקבועים",
    description: "סדרה תחת מספרים ורצפים. קירובים מוצגים כקירובים; קשר למרחב יוצג רק אם קיימת גיאומטריה ממשית.",
    cards,
    adminQueue: [],
    counts: { cases: cards.length, exact: cards.filter((card) => card.verification.relation === "exact").length, approximations: cards.filter((card) => card.verification.relation === "approximation").length, adminCandidates: null },
    rules: { approximationIsNotEquality: true, noGeometryLinkWithoutGeometry: true, occurrencesAreNotIndependentSources: true },
  };
}

export async function fetchZviConstantsWorldProjection({
  publicClient = getPublicResearchClient,
  adminClient = null,
  includeAdmin = false,
} = {}) {
  try {
    const client = publicClient();
    const [researchResult, sourceResult, adminResult] = await Promise.all([
      client.from("world_contributor_research_v1")
        .select("id,statement,source_ref,engine_verified,status,privacy_scope")
        .in("id", ZVI_CONSTANT_CASES.map((item) => item.researchId)),
      client.from("channel_updates")
        .select("id,text,image_url,thumb_url,status,created_at")
        .in("id", unique(ZVI_CONSTANT_CASES.flatMap((item) => [item.sourceRef, item.mediaRef]).map((ref) => ref.split(":")[1]))),
      includeAdmin
        ? import("./zviConstantsAdminProjection.js")
          .then(({ fetchConstantAdminQueue }) => fetchConstantAdminQueue(adminClient || undefined))
          .catch(() => null)
        : Promise.resolve([]),
    ]);
    if (researchResult.error) throw researchResult.error;
    if (sourceResult.error) throw sourceResult.error;
    const projection = buildZviConstantsWorldProjection(researchResult.data, sourceResult.data);
    return {
      ...projection,
      adminQueue: Array.isArray(adminResult) ? adminResult : [],
      counts: { ...projection.counts, adminCandidates: Array.isArray(adminResult) ? adminResult.length : null },
      access: { available: true, reader: "public_rls", adminQueue: includeAdmin ? (Array.isArray(adminResult) ? "authorized" : "unavailable") : "not_requested" },
    };
  } catch (_) {
    return { ...buildZviConstantsWorldProjection(), counts: { cases: null, exact: null, approximations: null, adminCandidates: null }, access: { available: false, reader: "public_rls", adminQueue: includeAdmin ? "unavailable" : "not_requested" } };
  }
}
