// One saved expression, one preferred calculator method. Reuse the canonical
// phrase identity and ResearchProvider.saveItem; never snapshot every method.
import { makeEntity } from "./entity.js";
import { isReportableValue } from "./calculator2029Input.js";

const clean = value => value == null ? "" : String(value).trim();
const asObject = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};

// No share-only v/s parameters: /gematria?q=...&m=... opens the professional
// calculator and recalculates ALL methods, highlighting the selected one.
export function calculatorSavedExpressionHref(selection) {
  const expression = clean(selection?.expression);
  const method = clean(selection?.methodKey);
  if (!expression || !method || !isReportableValue(selection?.resultValue)) return null;
  return "/gematria?" + new URLSearchParams({ q: expression, m: method }).toString();
}

export function matchingSavedCalculatorPhrase(selection, savedItems = []) {
  const expression = clean(selection?.expression);
  if (!expression || !Array.isArray(savedItems)) return null;
  return savedItems.find(item => item?.type === "phrase" && clean(item.ref) === expression) || null;
}

// The same [type,ref] identity as entityFromPhrase: an existing saved phrase
// remains ONE row when the reader selects a different method. Personal title,
// note, collection membership and unrelated metadata survive the update.
export function buildCalculatorSavedEntity(selection, previous = null) {
  const href = calculatorSavedExpressionHref(selection);
  if (!href) return null;
  const expression = clean(selection.expression);
  const methodKey = clean(selection.methodKey);
  const old = previous?.type === "phrase" && clean(previous.ref) === expression ? previous : null;
  const oldMeta = asObject(old?.metadata);
  const version = selection.methodVersion == null || !Number.isFinite(Number(selection.methodVersion))
    ? null : Number(selection.methodVersion);
  const entity = makeEntity({
    type: "phrase",
    ref: expression,
    title: expression,
    link: href,
    metadata: {
      ...oldMeta,
      value: Number(selection.resultValue),
      method: methodKey,
      methodLabel: clean(selection.methodLabel) || methodKey,
      methodVersion: version,
      calculatorSaved: true,
      savedResultValue: Number(selection.resultValue),
    },
  });
  if (!old) return entity;
  return {
    ...old,
    ...entity,
    title: clean(old.title) || expression,
    addedAt: old.addedAt ?? entity.addedAt,
  };
}

// Semantic UI state only. The caller must ALSO check ResearchProvider's sync
// status before claiming that a change is saved to the account on the server.
export function calculatorSaveChoice(selection, savedItems = []) {
  if (!calculatorSavedExpressionHref(selection)) return "unavailable";
  const saved = matchingSavedCalculatorPhrase(selection, savedItems);
  if (!saved) return "save";
  return clean(saved.metadata?.method) === clean(selection.methodKey) ? "saved" : "update";
}
