// Canonical W2 executor entrypoint.
//
// W2.2d keeps the previously released W2.2b executor implementation byte-for-byte in the internal
// researchW2ExecutorsBase module and extends THIS canonical entrypoint with the canonical Gematria
// executor. This is one executor tree, not a second composer/engine: existing imports keep using this
// path, and all prior Numeric/Graph/Research-Object/Operator/ELS behavior still comes from the same
// released implementation.

import { createCanonicalNumberW2Executors as createBaseW2Executors } from './researchW2ExecutorsBase.js';
import { createGematriaW2Executor } from './gematriaW2Executor.js';

export { SAFE_W2_NUMERIC_LENSES, NUMERIC_SYSTEM_METHOD_RULE_IDS } from './researchW2ExecutorsBase.js';

export function createCanonicalNumberW2Executors(options = {}) {
  const base = createBaseW2Executors(options);
  const gematria = createGematriaW2Executor({
    supabase: options.supabase,
    maxRepresentations: options.gematriaMaxRepresentations ?? 16,
    controls: options.gematriaControls !== false,
  });

  return {
    ...base,
    gematria,
  };
}

export const createCanonicalW2Executors = createCanonicalNumberW2Executors;
export default createCanonicalNumberW2Executors;
