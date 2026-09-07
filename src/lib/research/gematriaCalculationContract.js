import { METHODS, DEPTH_METHODS, normalizeForCalc } from "../gematria.js";
import { indexGematriaMethodStates } from "./gematriaMethodRegistry.js";

// Existing client execution definitions remain the calculation implementation in this slice.
// This adapter adds identity/state/provenance without changing a formula, key, or numeric result.
export const CLIENT_GEMATRIA_METHODS = Object.freeze([...METHODS, ...DEPTH_METHODS]);

export function calculateGematriaEnvelope(input, methodStates = null) {
  const raw = String(input ?? "");
  const normalized = normalizeForCalc(raw);
  const stateIndex = indexGematriaMethodStates(methodStates);
  const registryAvailable = stateIndex !== null;

  const results = CLIENT_GEMATRIA_METHODS.map(method => {
    const state = stateIndex?.get(method.key) || null;
    const requiredEntitlement = state?.required_entitlement ?? null;
    return {
      // Backward-compatible projection fields used by existing UI consumers.
      key: method.key,
      sub: method.sub || method.soul || "",
      value: method.fn(raw),

      // Canonical calculation contract fields.
      methodKey: method.key,
      methodVersion: state?.method_version ?? null,
      representation: {
        raw,
        normalized,
        language: "he",
        script: "Hebrew",
      },
      methodState: {
        registryAvailable,
        registered: registryAvailable ? Boolean(state?.registered) : null,
        active: registryAvailable ? Boolean(state?.active) : null,
        inEngineDeclared: registryAvailable ? Boolean(state?.in_engine_declared) : null,
        executable: registryAvailable ? Boolean(state?.executable) : null,
        engineVerified: registryAvailable ? Boolean(state?.engine_verified) : null,
        scannable: registryAvailable ? Boolean(state?.scannable) : null,
        executionKind: state?.execution_kind ?? null,
        operator: state?.operator ?? null,
      },
      // Access is orthogonal to truth/execution. V1 carries the Registry requirement only;
      // it does not invent a paid entitlement decision or infer current-user accessibility.
      access: {
        requiredEntitlement,
        accessible: null,
      },
      // This professional projection currently renders every client-defined method.
      // Displayed is a projection fact, never Registry/canonical truth.
      projection: {
        displayed: true,
        projectionKey: "professional_calculator_v1",
      },
      // A physical column means the method CAN have canonical stored values; it does not prove
      // this arbitrary input/result is actually stored. `stored` remains UNKNOWN without row evidence.
      storage: {
        dbColumnHint: method.col || null,
        storageCapable: Boolean(method.col),
        stored: null,
      },
      provenance: {
        calculationEngine: "src/lib/gematria.js",
        methodRegistry: "public.gematria_methods",
        methodStateProjection: "public.v_method_states",
      },
    };
  });

  return {
    contract: "gematria_calculation_projection_v1",
    input: {
      raw,
      normalized,
      language: "he",
      script: "Hebrew",
    },
    registryAvailable,
    results,
  };
}
