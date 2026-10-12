import { EN_METHODS } from "../englishGematria.js";
import { classifyCalculatorInput, isEnglishMethodKey, isReportableValue } from "./calculator2029Input.js";

// English lane for Calculator 2029.
// Registry state (verified live 2026-10-12): en_ordinal / en_full_reduction / en_reverse_ordinal /
// en_reverse_reduction exist with SQL implementations but are active=false (Human Gate), so
// fn_method_profile does not return them and the Registry has no Agrippa/Latin row at all.
// Until activation, values here are an instant preview from the existing englishGematria.js
// definitions, marked non-canonical and never selectable or shareable. When the Registry
// returns a canonical row for the same key, that row replaces the preview automatically.

const REGISTRY_KEY_BY_ENGLISH_KEY = Object.freeze({
  ordinal: "en_ordinal",
  reduction: "en_full_reduction",
  reverse: "en_reverse_ordinal",
  reverse_reduction: "en_reverse_reduction",
  agrippa: null,
});

export const ENGLISH_LANE_PENDING_NOTE = "ממתין להפעלה קנונית במנוע";

const ACTIVE_ENGLISH_METHODS = Object.freeze(
  EN_METHODS
    .filter((method) => method.active)
    .map((method, index) => Object.freeze({
      englishKey: method.key,
      methodKey: REGISTRY_KEY_BY_ENGLISH_KEY[method.key] || "en_" + method.key,
      registered: REGISTRY_KEY_BY_ENGLISH_KEY[method.key] != null,
      label: method.label,
      hebrewLabel: method.he,
      tag: method.tag,
      note: method.note,
      explain: method.explain,
      sortOrder: 901 + index,
      fn: method.fn,
    })),
);

export const ENGLISH_LANE_METHOD_KEYS = Object.freeze(ACTIVE_ENGLISH_METHODS.map((method) => method.methodKey));

export function englishLaneDefinitions() {
  return ACTIVE_ENGLISH_METHODS;
}

export function buildEnglishLaneRows(expression, canonicalRows = []) {
  const info = classifyCalculatorInput(expression);
  if (!info.englishApplicable) return [];

  const canonicalByKey = new Map(
    (Array.isArray(canonicalRows) ? canonicalRows : [])
      .filter((row) => isEnglishMethodKey(row?.methodKey) && isReportableValue(row?.computedValue))
      .map((row) => [row.methodKey, row]),
  );

  return ACTIVE_ENGLISH_METHODS.map((method) => {
    const canonical = canonicalByKey.get(method.methodKey);
    if (canonical) {
      return {
        ...canonical,
        label: method.label,
        language: "en",
        englishKey: method.englishKey,
        previewOnly: false,
        canonical: true,
      };
    }
    const value = Number(method.fn(info.expression));
    return {
      methodKey: method.methodKey,
      displayLabel: method.label,
      label: method.label,
      hebrewLabel: method.hebrewLabel,
      category: "base",
      language: "en",
      englishKey: method.englishKey,
      computedValue: Number.isFinite(value) ? value : null,
      sortOrder: method.sortOrder,
      executionKind: "client_preview",
      previewOnly: true,
      canonical: false,
      pendingNote: method.registered ? ENGLISH_LANE_PENDING_NOTE : "לא רשום עדיין במנוע",
      sourceOfTruth: "client_preview_only",
      sourceTag: method.tag,
      note: method.note,
    };
  });
}
