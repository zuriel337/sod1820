import { makeUniversalFinding } from "./universalFinding.js";
import { normalizeForCalc } from "../gematria.js";

// Pure canonical Gematria -> Universal Finding projection. This module never connects to a
// database and never calculates a value locally: it accepts only the live gematria_api response.
// Keeping transport out of this file lets browser and Edge callers share one projection contract.
//
// Provenance: reconciled from PR #226 (502c4b88) under HG-4. The projection deliberately keeps
// verification_state="not_tested": an engine value is not a user/source claim and must never be
// presented as a self-confirming match. It also leaves epistemic stage and governance status unset.
//
// Live contract alignment: gematria_api returns { input, value, methods: { ragil, miluy,
// misratar, kadmi, gadol, siduri, atbash, albam, kadmi_gadol }, distance_from_1820 }.
// Every returned method key is projected; none is hardcoded here. normalizeForCalc mirrors the
// engine's text canonicalization only and never computes a Gematria value locally.
export function gematriaApiResultToFindings(apiResult, { inputText = null, createdAt = null } = {}) {
  if (!apiResult || typeof apiResult.methods !== "object" || apiResult.methods === null || Array.isArray(apiResult.methods)) return [];
  const expression = String(inputText ?? apiResult.input ?? "").trim();
  if (!expression) return [];
  const normalized = normalizeForCalc(expression);
  if (!normalized) return [];

  const at = createdAt || new Date().toISOString();
  return Object.entries(apiResult.methods).flatMap(([rawKey, rawValue]) => {
    const methodKey = String(rawKey || "").trim();
    const value = Number(rawValue);
    if (!methodKey || !Number.isFinite(value)) return [];

    return [makeUniversalFinding({
      kind: "gematria",
      subject: { type: "phrase", key: normalized, label: expression, value, lang: "he" },
      source: {
        engine: "gematria",
        adapter: "gematria-api-v1",
        sourceRef: null,
        method: methodKey,
        corpus: null,
        lang: "he",
      },
      identity: {
        sourceIdentity: { methodKey, normalizedSubject: normalized, value },
        occurrence: null,
        entityRef: null,
        relationRef: null,
      },
      verification: {
        claimed_expression: null,
        claimed_method: null,
        claimed_value: null,
        engine_method_tested: methodKey,
        engine_result: value,
        verification_state: "not_tested",
      },
      evidence: {
        refs: [],
        facts: [{ type: "gematria-method-value", methodKey, normalizedSubject: normalized, value }],
        score: null,
        confidence: null,
      },
      provenance: {
        createdBy: "ENGINE:gematria",
        createdAt: at,
        inputRef: null,
      },
      projection: {
        anchors: [],
        relations: [],
        dimensions: { numeric: { methodKey, value } },
      },
      view: { rendererHints: { role: "method-result" } },
    })];
  });
}

export default gematriaApiResultToFindings;
