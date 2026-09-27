import { calculateGematriaEnvelope } from "./gematriaCalculationContract.js";

const clean = (value) => value == null ? "" : String(value).trim();
const HEBREW_LETTER_RE = /[\u05D0-\u05EA]/u;

export function buildCalculator2029FastPreview(input) {
  const expression = clean(input);
  if (!expression || !HEBREW_LETTER_RE.test(expression)) return null;

  const envelope = calculateGematriaEnvelope(expression, null);
  const regular = (Array.isArray(envelope?.results) ? envelope.results : [])
    .find((row) => row?.methodKey === "רגיל");

  const value = Number(regular?.value);
  if (!Number.isFinite(value)) return null;

  return Object.freeze({
    kind: "gematria_fast_preview",
    expression,
    methodKey: "רגיל",
    value,
    previewOnly: true,
    canonical: false,
    authority: "client_preview_only",
    canonicalSettle: "fn_method_profile",
  });
}

export default buildCalculator2029FastPreview;
