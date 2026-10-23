import { supabase } from "../supabase.js";
import { contributorSourceLocator } from "./worldContributorSourceLocator.js";

const ZVI_SOURCE_SLUG = "tzvi-opoc";
const clean = (value) => value == null ? "" : String(value).trim();
const baseSourceRef = (value) => clean(value).split("#", 1)[0];
const unique = (values) => [...new Set((values || []).map(clean).filter(Boolean))];

function rounded(value, digits) {
  return Number(Number(value).toFixed(digits));
}

export const ZVI_CONSTANT_CANDIDATES = Object.freeze([
  Object.freeze({
    id: "zvi-constant-candidate:pi-power-pi",
    title: "π בחזקת π — בין 36 ל־46",
    expression: "π^π",
    sourceRefs: Object.freeze([
      "channel_updates:e8fe432c-7a73-4120-a150-bc6c1f03acb6",
      "channel_updates:7d1ec3cc-46a7-4712-bd11-50e923b376ec",
    ]),
    claimedValue: 36.46,
    claimedDigits: 2,
    evaluate: () => Math.pow(Math.PI, Math.PI),
    promotionState: "calculation_only",
    recommendation: "לקדם את החישוב בלבד לאחר אישור; להשאיר את הקישור ל־36 ול־46 כפרשנות לבדיקה.",
    interpretationBoundary: "הערך 36.462… קרוב ל־36.46, אך אינו שווה ל־36 או ל־46.",
  }),
  Object.freeze({
    id: "zvi-constant-candidate:e-power-e",
    title: "e בחזקת e — 15.15 בקירוב",
    expression: "e^e",
    sourceRefs: Object.freeze(["channel_updates:b12444d5-3223-4c46-a4e0-37109561cd3e"]),
    claimedValue: 15.15,
    claimedDigits: 2,
    evaluate: () => Math.pow(Math.E, Math.E),
    promotionState: "calculation_only",
    recommendation: "לא לקדם את הקישור ל־151. אפשר לקדם בעתיד את החישוב בלבד, לאחר אישור המקור.",
    interpretationBoundary: "הזזת הנקודה מ־15.15 ל־151 אינה שוויון ואינה נובעת מן החישוב.",
  }),
  Object.freeze({
    id: "zvi-constant-candidate:pi-power-e",
    title: "π בחזקת e — בדיקת 22.45",
    expression: "π^e",
    sourceRefs: Object.freeze([
      "channel_updates:a7f7e28d-2aa3-4460-a65a-196e15385953",
      "channel_updates:53476dee-38f5-42a7-9788-accc813eedd1",
    ]),
    claimedValue: 22.45,
    claimedDigits: 2,
    evaluate: () => Math.pow(Math.PI, Math.E),
    promotionState: "hold",
    recommendation: "לא לקדם עדיין: הערך הוא 22.459… ובעיגול רגיל לשתי ספרות מתקבל 22.46, לא 22.45.",
    interpretationBoundary: "יש לברר אם המקור התכוון לקיטום ולא לעיגול; עד אז הניסוח דורש תיקון.",
  }),
  Object.freeze({
    id: "zvi-constant-candidate:e-power-pi",
    title: "e בחזקת π — 23.14 בקירוב",
    expression: "e^π",
    sourceRefs: Object.freeze(["channel_updates:c2a2d3de-f63e-470f-9819-e37cefcfb940"]),
    claimedValue: 23.14,
    claimedDigits: 2,
    evaluate: () => Math.pow(Math.E, Math.PI),
    promotionState: "calculation_only",
    recommendation: "לקדם את החישוב בלבד לאחר אישור המקור; אין כרגע חיבור גיאומטרי או רעיוני מבוסס.",
    interpretationBoundary: "הקירוב המספרי מאומת; משמעות נוספת דורשת מקור וחיבור נפרדים.",
  }),
]);

export function buildConstantAdminQueue(researchRows = [], sourceRows = []) {
  const rowsByRef = new Map();
  for (const row of researchRows || []) {
    const ref = baseSourceRef(row?.source_ref);
    if (!rowsByRef.has(ref)) rowsByRef.set(ref, []);
    rowsByRef.get(ref).push(row);
  }
  const sourceByRef = new Map((sourceRows || []).map((row) => [`channel_updates:${row?.id}`, row]));
  return ZVI_CONSTANT_CANDIDATES.map((spec) => {
    const rows = spec.sourceRefs.flatMap((ref) => rowsByRef.get(ref) || []);
    const occurrences = spec.sourceRefs.filter((ref) => rowsByRef.has(ref) || sourceByRef.has(ref));
    if (!rows.length && !occurrences.length) return null;
    const actual = spec.evaluate();
    const displayedValue = rounded(actual, spec.claimedDigits);
    const claimMatches = displayedValue === spec.claimedValue;
    const statuses = unique(rows.map((row) => row.status));
    const privacyScopes = unique(rows.map((row) => row.privacy_scope));
    const representative = [...rows].sort((left, right) => clean(right?.statement).length - clean(left?.statement).length)[0] || null;
    return {
      id: spec.id,
      title: spec.title,
      expression: spec.expression,
      statement: clean(representative?.statement) || "אין תמלול זמין",
      actual,
      claimedValue: spec.claimedValue,
      claimedDigits: spec.claimedDigits,
      displayedValue,
      claimMatches,
      promotionState: claimMatches ? spec.promotionState : "hold",
      calculationState: claimMatches ? "הקירוב המספרי מאומת" : "אי־התאמה בניסוח המקור",
      publicationState: statuses.length === 1 ? statuses[0] : statuses.length ? statuses.join(" · ") : "אין נתון",
      privacyScopes,
      findingRows: rows.length,
      engineVerifiedRows: rows.filter((row) => row?.engine_verified === true).length,
      engineFailedRows: rows.filter((row) => row?.engine_verified === false).length,
      occurrenceCount: occurrences.length,
      duplicateOccurrenceCount: Math.max(0, occurrences.length - 1),
      independentSourceCount: null,
      recommendation: spec.recommendation,
      interpretationBoundary: spec.interpretationBoundary,
      locators: occurrences.map((ref) => contributorSourceLocator(ref, { slug: ZVI_SOURCE_SLUG })),
    };
  }).filter(Boolean);
}

export async function fetchConstantAdminQueue(client = supabase) {
  const refs = unique(ZVI_CONSTANT_CANDIDATES.flatMap((spec) => spec.sourceRefs));
  const ids = refs.map((ref) => ref.split(":")[1]).filter(Boolean);
  const [researchResult, sourceResult] = await Promise.all([
    client.from("world_contributor_research_v1")
      .select("id,statement,source_ref,engine_verified,status,privacy_scope,created_at")
      .in("source_ref", refs),
    client.from("channel_updates")
      .select("id,text,image_url,thumb_url,status,created_at")
      .in("id", ids),
  ]);
  if (researchResult.error) throw researchResult.error;
  if (sourceResult.error) throw sourceResult.error;
  return buildConstantAdminQueue(researchResult.data || [], sourceResult.data || []);
}
