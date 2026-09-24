import { canonicalMethodPublicLabel, sortMethodsByCanonicalOrder } from "../presentation/canonicalPresentation.js";

const clean = (value) => value == null ? "" : String(value).trim();

export const CALCULATOR_2029_CORE_METHOD_LIMIT = 9;

export function normalizeCalculatorMethods(rows = []) {
  return sortMethodsByCanonicalOrder(Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    label: canonicalMethodPublicLabel(row),
    computedValue: row?.computedValue == null || !Number.isFinite(Number(row.computedValue))
      ? null
      : Number(row.computedValue),
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
  const value = method?.computedValue == null || !Number.isFinite(Number(method.computedValue))
    ? null
    : Number(method.computedValue);
  return Object.freeze({
    kind: "gematria_calculation",
    expression: phrase,
    methodKey,
    methodLabel: clean(method?.label || method?.displayLabel || methodKey) || methodKey,
    resultValue: value,
    methodVersion: Number.isFinite(Number(method?.definitionVersion)) ? Number(method.definitionVersion) : null,
    executionKind: clean(method?.executionKind) || null,
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
  if (method?.computedValue != null && Number.isFinite(Number(method.computedValue))) return null;
  const kind = clean(method?.executionKind);
  if (kind === "context_activated") return "דורש הקשר";
  if (!kind || kind === "unimplemented") return "לא זמין";
  return "ללא תוצאה";
}
