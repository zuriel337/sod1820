import { METHODS } from "../gematria.js";
import { canonicalMethodPublicLabel } from "../presentation/canonicalPresentation.js";
import { classifyCalculatorInput } from "./calculator2029Input.js";

const clean = (value) => value == null ? "" : String(value).trim();

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
  const inputInfo = classifyCalculatorInput(expression);
  const hasHebrew = inputInfo.hebrewApplicable;

  const methods = FAST_CORE_METHODS.map((method, index) => {
    // Empty input keeps the quiet "0" calculator look; non-empty input the Hebrew methods do not
    // apply to (Latin, digits, other scripts) shows no value instead of an invented 0.
    const rawValue = hasHebrew ? method.fn(expression) : null;
    const value = rawValue == null ? null : Number(rawValue);
    return Object.freeze({
      methodKey: method.key,
      displayLabel: canonicalMethodPublicLabel(method),
      computedValue: value != null && Number.isFinite(value) ? value : (expression ? null : 0),
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
    inputKind: inputInfo.kind,
    inputNotice: inputInfo.notice,
    methods: Object.freeze(methods),
    methodCount: methods.length,
    previewOnly: true,
    canonical: false,
    authority: "client_preview_only",
    canonicalSettle: "fn_method_profile",
  });
}

export default buildCalculator2029FastPreview;
