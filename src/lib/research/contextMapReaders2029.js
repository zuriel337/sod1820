// The Small Context Map reads only through existing owners: node identity (numberOpeningIdentity2029),
// the Reality Graph adapter (entityGraphFinding) and the canonical engine RPC (canonicalGematria).
// Nothing is calculated here and nothing is stored; the reads run when the reader opens the map.
import { resolveEntityHubNode } from "./numberOpeningIdentity2029.js";
import { fetchCanonicalGraphEntityFindings } from "./entityGraphFinding.js";
import { fetchCanonicalGematriaFindings } from "./canonicalGematria.js";
import { METHODS, DEPTH_METHODS } from "../gematria.js";

const LABEL_BY_COLUMN = Object.freeze(Object.fromEntries([...METHODS, ...(DEPTH_METHODS || [])].filter((m) => m.col).map((m) => [m.col, m.key])));

export const contextMapReaders = Object.freeze({
  resolveNode: (focus) => resolveEntityHubNode({ type: focus.type, key: focus.label || focus.id }),
  readGraph: (nodeId) => fetchCanonicalGraphEntityFindings(nodeId, { relationLimit: 30, mediaRelationLimit: 5 }),
  // Engine values that equal the focus number. Each phrase is one bounded RPC; failures drop that phrase only.
  async readCalculations(labels, focus) {
    const target = Number(focus?.label ?? focus?.id);
    const out = await Promise.all([...new Set(labels)].slice(0, 5).map(async (label) => {
      try {
        const matches = (await fetchCanonicalGematriaFindings(label))
          .filter((f) => Number(f.verification?.engine_result) === target)
          .map((f) => LABEL_BY_COLUMN[f.verification.engine_method_tested] || f.verification.engine_method_tested);
        return matches.length ? { label, value: target, methodLabel: matches[0], verified: true, extra: [] } : null;
      } catch { return null; }
    }));
    return out.filter(Boolean);
  },
});
