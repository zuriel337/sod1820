// 🔵 CORE RESEARCH CONSUMER — calculation truth comes from the canonical Gematria contract.
// Existing callers stay synchronous; Registry state can be supplied by callers that already have it.
// No formulas, method identity, execution semantics, or UI-projection truth live here.
import { CLIENT_GEMATRIA_METHODS, calculateGematriaEnvelope } from "./gematriaCalculationContract.js";

export const METHOD_KEYS = CLIENT_GEMATRIA_METHODS.map(m => m.key);
export const PRIMARY = "רגיל";

// computeEntity(text, methodStates?) → backward-compatible research projection over the canonical envelope.
// Deliberately do not expose the envelope's UI `projection` block here: core research state is not the
// professional-calculator projection. We project only calculation/Registry facts relevant to research consumers.
export function computeEntity(text, methodStates = null) {
  const t = String(text || "").trim();
  const calculation = calculateGematriaEnvelope(t, methodStates);
  const values = {};
  const methodMeta = {};
  for (const result of calculation.results) {
    values[result.methodKey] = result.value || 0;
    methodMeta[result.methodKey] = {
      methodVersion: result.methodVersion,
      methodState: result.methodState,
      access: result.access,
      storage: result.storage,
      provenance: result.provenance,
    };
  }
  return {
    text: t,
    primary: values[PRIMARY] || 0,
    values,
    calculationContract: calculation.contract,
    registryAvailable: calculation.registryAvailable,
    methodMeta,
  };
}

// connectToAxis(axis, ent) → כל הדרכים שבהן ישות מתחברת לציר הראשי (השם):
// ערך כלשהו של הישות = ערך כלשהו של הציר (חוצה-שיטות) = עובדה.
export function connectToAxis(axis, ent) {
  const links = [];
  if (!axis || !ent) return links;
  for (const ak of METHOD_KEYS) {
    const av = axis.values[ak]; if (!av) continue;
    for (const ek of METHOD_KEYS) {
      if (ent.values[ek] === av) links.push({ value: av, axisMethod: ak, entMethod: ek, same: ak === ek });
    }
  }
  // המובהק ביותר קודם: אותה שיטה > רגיל > השאר
  return links.sort((a, b) => (b.same - a.same) || (a.axisMethod === PRIMARY ? -1 : 0)).slice(0, 6);
}
