import { fetchEntityHubProjection } from "./entityHubProjection.js";

// 🌐 Universal Convergence Projection — number-keyed composition of:
//   authored Topic/Convergence content  (topics.findings, via topicConvergence.js — unchanged)
//   registry-driven engine-verified equality evidence (gematria.families, via
//     getValueFamilies()/fn_number_lookup + gematria_methods Registry — already methods-complete,
//     never a hardcoded method list)
//   graph connections (graph.entity / graph.relations, via entityGraphFinding.js — unchanged)
//
// UNIVERSAL_CONVERGENCE_PROJECTION_1111_V1 (work_log dispatch 91662527-ce5e-4dbf-bc46-0e3dc8612588,
// audit c0008f01-7c6e-4709-bef1-106741cf6077). ONE TREE LAW: this is a thin, explicit-name wrapper
// around the EXISTING canonical composer (fetchEntityHubProjection) — it performs no new fetch, no
// new store, no schema/RPC, no write. It exists so "Universal Convergence Projection" has one
// stable, number-keyed entry point instead of every future caller re-deriving the same
// {type:"number", key:String(n)} call and re-picking the same three facets out of the full
// Entity Hub projection by hand.
//
// projectUniversalConvergence() is the pure reshape (unit-testable without network); the async
// fetch wrapper is the only network-touching part.

/**
 * Pure. Reshapes an already-fetched fetchEntityHubProjection() result (for a number node) into
 * the explicit Universal Convergence Projection envelope. Never mutates its input; returns null
 * when there is no projection to reshape.
 */
export function projectUniversalConvergence(projection, number) {
  if (!projection) return null;
  const n = Number(number);
  return {
    v: 1,
    number: Number.isFinite(n) ? n : (projection.identity?.label ?? null),
    identity: projection.identity ?? null,
    // Authored, approved Topic/Convergence content for this number.
    topics: projection.topics ?? { rows: [], findings: [] },
    // Registry-driven, engine-verified equality evidence for this number (all governed methods).
    equality: {
      families: projection.gematria?.families ?? [],
      registry: projection.gematria?.registry ?? [],
      phraseEntities: projection.gematria?.phraseEntities ?? {},
      note: projection.gematria?.note ?? null,
    },
    // Reality Graph connections for this number's node.
    graph: projection.graph ?? { entity: null, relations: [] },
    surface: projection.surface ?? null,
    source: "fetchEntityHubProjection",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Fetches and composes the Universal Convergence Projection for one number. Read-only; delegates
 * entirely to fetchEntityHubProjection({type:"number", key}) — see projectUniversalConvergence()
 * for the reshape. Returns null when the number has no node (Foundation gap, not an error).
 */
export async function fetchUniversalConvergenceProjection(number, opts = {}) {
  const n = Number(number);
  if (!Number.isFinite(n)) return null;
  const { relationLimit = 120, researchLimit = 60, topicLimit = 16, ...rest } = opts;
  const projection = await fetchEntityHubProjection({
    type: "number",
    key: String(n),
    relationLimit,
    researchLimit,
    topicLimit,
    ...rest,
  });
  return projectUniversalConvergence(projection, n);
}

export default fetchUniversalConvergenceProjection;
