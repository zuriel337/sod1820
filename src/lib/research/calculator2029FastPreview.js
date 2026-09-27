import { calculateGematriaEnvelope } from "./gematriaCalculationContract.js";

const clean = (value) => value == null ? "" : String(value).trim();
const HEBREW_LETTER_RE = /[\u05D0-\u05EA]/u;

export function buildCalculator2029FastPreview(input) {
  const expression = clean(input);
  if (!expression || !HEBREW_LETTER_RE.test(expression)) return null;

  const envelope = calculateGematriaEnvelope(expression, null);
  const methods = (Array.isArray(envelope?.results) ? envelope.results : [])
    .map((row) => {
      const value = Number(row?.value);
      if (!row?.methodKey || !Number.isFinite(value)) return null;
      return Object.freeze({
        methodKey: row.methodKey,
        displayLabel: row.methodKey,
        computedValue: value,
        executionKind: "client_preview",
        previewOnly: true,
        canonical: false,
        sourceOfTruth: "client_preview_only",
      });
    })
    .filter(Boolean);

  if (!methods.length) return null;
  const regular = methods.find((row) => row.methodKey === "רגיל") || null;

  return Object.freeze({
    kind: "gematria_fast_preview",
    expression,
    methods: Object.freeze(methods),
    methodCount: methods.length,
    value: regular?.computedValue ?? null,
    previewOnly: true,
    canonical: false,
    authority: "client_preview_only",
    canonicalSettle: "fn_method_profile",
  });
}

export default buildCalculator2029FastPreview;
