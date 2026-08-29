import { supabase } from "../supabase.js";
import { makeUniversalFinding } from "./universalFinding.js";

// Canonical Gematria → Universal Finding adapter.
// This module never calculates Gematria locally. It accepts only the live canonical
// `gematria_api(text)` response and projects each returned method result into the
// existing Universal Finding contract.
//
// ── PROVENANCE ────────────────────────────────────────────────────────────────────────────
// Reconciled from PR #226 (gpt/research-studio-canonical-extension-v0, head 502c4b88) into the
// M1 truth-contract branch per Human-Gate decision HG-4 (HOLD + AMEND). The canonical-RPC-only
// design is preserved verbatim; two semantic fabrications were removed before adoption:
//
//   1. HG-3 — it hardcoded  verification_state: "match"  while setting claimed_value to the
//      ENGINE'S OWN value. That is self-confirming: nothing was claimed, so nothing matched.
//      "match" is never fabricated (truth_axes_foundation_law AXIS 2 / INVARIANT V2). The engine
//      output is still fully recorded in engine_method_tested/engine_result — capability kept,
//      false claim dropped. The honest state is "not_tested": no claim-vs-engine test took place.
//
//   2. INVARIANT PR1/PR3 — it declared  stage: "finding"  and  status: "active"  for every
//      returned method value. A projection adapter does not own the EPISTEMIC TYPE or the
//      GOVERNANCE state of what it transports, so both are now left honestly unset.
//
// If a caller genuinely HAS a claim to test (a post asserting "אהרן = 256", a contributor's
// stated value), it should pass claimed_expression/claimed_method/claimed_value together with a
// real match/mismatch/method_unknown state — that is what this envelope exists to carry.
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
        // No claim was submitted, so there is nothing for the engine to agree or disagree with.
        claimed_expression: null,
        claimed_method: null,
        claimed_value: null,
        // What the canonical engine actually did, recorded in full.
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

export async function fetchCanonicalGematriaFindings(text) {
  const inputText = String(text || "").trim();
  if (!inputText) return [];

  const { data, error } = await supabase.rpc("gematria_api", { p_text: inputText });
  if (error) throw error;
  return gematriaApiResultToFindings(data, { inputText });
}
