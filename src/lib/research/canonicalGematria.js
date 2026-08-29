import { supabase } from "../supabase.js";
import { makeUniversalFinding } from "./universalFinding.js";

// Canonical Gematria → Universal Finding adapter.
// This module never calculates Gematria locally. It accepts only the live canonical
// `gematria_api(text)` response and projects each returned method result into the
// existing Universal Finding contract.
export function gematriaApiResultToFindings(apiResult, { inputText = null, createdAt = null } = {}) {
  if (!apiResult || !Array.isArray(apiResult.methods)) return [];
  const normalized = String(apiResult.normalized || "").trim();
  const expression = String(inputText ?? apiResult.text ?? "").trim();
  if (!normalized || !expression) return [];

  const at = createdAt || new Date().toISOString();
  return apiResult.methods.flatMap((method) => {
    const methodKey = String(method?.key || "").trim();
    const value = Number(method?.value);
    if (!methodKey || !Number.isFinite(value)) return [];

    return [makeUniversalFinding({
      kind: "gematria",
      stage: "finding",
      status: "active",
      subject: { type: "phrase", key: normalized, label: expression, value },
      source: {
        engine: "gematria",
        adapter: "gematria-api-v1",
        sourceRef: null,
        method: methodKey,
        corpus: null,
      },
      identity: {
        sourceIdentity: { methodKey, normalizedSubject: normalized, value },
        occurrence: null,
        entityRef: null,
        relationRef: null,
      },
      verification: {
        claimed_expression: expression,
        claimed_method: methodKey,
        claimed_value: value,
        engine_method_tested: methodKey,
        engine_result: value,
        verification_state: "match",
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

export async function fetchCanonicalGematriaFindings(text) {
  const inputText = String(text || "").trim();
  if (!inputText) return [];

  const { data, error } = await supabase.rpc("gematria_api", { p_text: inputText });
  if (error) throw error;
  return gematriaApiResultToFindings(data, { inputText });
}
