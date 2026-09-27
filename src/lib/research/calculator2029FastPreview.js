import { METHODS } from "../gematria.js";
import { canonicalMethodPublicLabel } from "../presentation/canonicalPresentation.js";

const clean = (value) => value == null ? "" : String(value).trim();
const HEBREW_LETTER_RE = /[\u05D0-\u05EA]/u;

export const CALCULATOR_2029_FAST_CORE_KEYS = Object.freeze([
  "רגיל",
  "מילוי",
  "מסתתר",
  "קדמי",
  "ריבוע",
  "גדול",
  "סידורי",
  "אתבש",
  "אלבם",
]);

const CLIENT_METHOD_BY_KEY = new Map(METHODS.map((method) => [method.key, method]));
const FAST_CORE_METHODS = CALCULATOR_2029_FAST_CORE_KEYS
  .map((key) => CLIENT_METHOD_BY_KEY.get(key))
  .filter(Boolean);

export function buildCalculator2029FastPreview(input) {
  const expression = clean(input);
  const hasHebrew = HEBREW_LETTER_RE.test(expression);

  const methods = FAST_CORE_METHODS.map((method, index) => {
    const rawValue = hasHebrew ? method.fn(expression) : 0;
    const value = Number(rawValue);
    return Object.freeze({
      methodKey: method.key,
      displayLabel: canonicalMethodPublicLabel(method),
      computedValue: Number.isFinite(value) ? value : 0,
      sortOrder: index,
      executionKind: "client_preview",
      previewOnly: true,
      canonical: false,
      sourceOfTruth: "client_preview_only",
    });
  });

  return Object.freeze({
    kind: "gematria_fast_preview",
    expression,
    methods: Object.freeze(methods),
    methodCount: methods.length,
    previewOnly: true,
    canonical: false,
    authority: "client_preview_only",
    canonicalSettle: "fn_method_profile",
  });
}

export default buildCalculator2029FastPreview;
