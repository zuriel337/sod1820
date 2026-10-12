import { canonicalMethodPublicLabel, sortMethodsByCanonicalOrder } from "../presentation/canonicalPresentation.js";
import { isReportableValue } from "./calculator2029Input.js";
import { numberExpressionFocusHref } from "./numberExpressionFocus.js";

const clean = (value) => value == null ? "" : String(value).trim();

export const CALCULATOR_2029_CORE_METHOD_LIMIT = 9;

export function normalizeCalculatorMethods(rows = []) {
  return sortMethodsByCanonicalOrder(Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    label: canonicalMethodPublicLabel(row),
    // Canonical 0 means "no letters counted" and is never a result; preview rows keep their empty-state 0.
    computedValue: isReportableValue(row?.computedValue) || (row?.previewOnly && Number(row?.computedValue) === 0)
      ? Number(row.computedValue)
      : null,
  }));
}

export function splitCalculatorMethods(rows = [], limit = CALCULATOR_2029_CORE_METHOD_LIMIT) {
  const methods = normalizeCalculatorMethods(rows);
  const cap = Math.max(1, Number(limit) || CALCULATOR_2029_CORE_METHOD_LIMIT);
  return {
    core: methods.slice(0, cap),
    rest: methods.slice(cap),
    all: methods,
  };
}

export function buildCalculationSelection(expression, method) {
  const phrase = clean(expression);
  const methodKey = clean(method?.methodKey);
  if (!phrase || !methodKey) return null;
  const value = isReportableValue(method?.computedValue) ? Number(method.computedValue) : null;
  return Object.freeze({
    kind: "gematria_calculation",
    expression: phrase,
    methodKey,
    methodLabel: clean(method?.label || method?.displayLabel || methodKey) || methodKey,
    resultValue: value,
    methodVersion: Number.isFinite(Number(method?.definitionVersion)) ? Number(method.definitionVersion) : null,
    executionKind: clean(method?.executionKind) || null,
    dbColumn: clean(method?.dbColumn) || null,
    requiredEntitlement: clean(method?.requiredEntitlement) || null,
    sourceOfTruth: clean(method?.sourceOfTruth) || "public.gematria_methods + fn_method_profile",
    provenance: Object.freeze({
      engine: "fn_method_profile",
      registry: "public.gematria_methods",
      projection: "calculator_2029",
    }),
  });
}

export function calculationAvailabilityLabel(method) {
  if (isReportableValue(method?.computedValue)) return null;
  const kind = clean(method?.executionKind);
  if (kind === "context_activated") return "דורש הקשר";
  if (!kind || kind === "unimplemented") return "לא זמין";
  return "ללא תוצאה";
}

export function buildCalculatorResearchContext(selection, extraDimensions = {}) {
  if (!selection) return null;
  const hasValue = selection.resultValue != null;
  return {
    subject: {
      id: String(selection.resultValue ?? selection.expression),
      type: hasValue ? "number" : "phrase",
      label: selection.expression,
      href: hasValue
        ? numberExpressionFocusHref(selection.resultValue, { expression: selection.expression, method: selection.methodKey })
        : "/2029/gematria",
    },
    selection: {
      entityId: hasValue ? String(selection.resultValue) : selection.expression,
      entityType: hasValue ? "number" : "phrase",
      expression: selection.expression,
      method: selection.methodKey,
      resultValue: selection.resultValue,
      focusKind: "calculation",
    },
    lens: "gematria",
    dimensions: {
      calculationSelection: true,
      source: "calculator-2029",
      ...extraDimensions,
    },
  };
}
