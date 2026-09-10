# W2.1 — Identity-First Context Pack / Universal Research Composer v1

Status: **IMPLEMENTED ON BRANCH · NOT WIRED TO LIVE RAZIEL · NO SCHEMA/DB/DEPLOY CHANGE**

Human-Gate: ZURIEL, 2026-09-10.

## Owner check

**EXTEND_EXISTING.** This slice extends the existing Research OS / Research Context / Universal Finding lineage. It is not a second context store, graph, engine, router registry, truth store, or Raziel brain.

Canonical boundaries remain:

- Reality identity/relations → `reality_graph_law`, `nodes` + `edges`.
- Research Context / Journey composition → existing Research Studio owner.
- Atomic cross-source envelope → `Universal Finding v1`.
- Truth axes / Human Gate → `truth_axes_foundation_law`.
- Capability/domain execution → each canonical engine/source owner.
- Raziel → downstream interface/synthesis consumer.

## Problem closed by this slice

The current `metatron_context()` can interpret a semantic label as calculation text before resolving its identity. The audit example was:

`"מה הקשר בין 1820 לאהבת תורה?"`

where `אהבת תורה` is already a canonical Book identity but the current context path can also calculate the label as text (`1019`). W2.1 establishes the invariant:

> **Semantic identity precedes textual representation.**

A known Book/Person/Event/etc. is not silently sent to Gematria because its label contains text. Text calculation is opt-in/intent-driven.

## Files

### `src/lib/research/researchIdentityResolver.js`
Pure identity-resolution policy over caller-supplied authorized candidates.

- preserves raw input;
- orders exact graph/surface/personal identities ahead of loose text matches;
- deduplicates by stable identity key/ref/id;
- exposes `text_calculation_allowed`;
- does not query DB, calculate or create identity.

### `src/lib/research/researchPlanV2.js`
Identity-first Research Plan.

- identity → context/access → strategy → capability hints → check order;
- Book+Number becomes cross-identity research, not Book-title Gematria;
- Person/Family + clock/time requests person/family/time/operator capability families;
- explicit ELS remains ELS;
- unknown future capability names may be requested without schema change;
- canonical owners still decide whether execution is actually allowed.

### `src/lib/research/researchResultBundle.js`
Generic stable socket around **existing Universal Finding v1** objects.

Bundle fields align with the already-approved normalized finding socket:

- `contract_version`
- `query`
- `plan`
- `findings`
- `ranking`
- `capability_trace`
- `coverage`
- `resolved_run_snapshot`
- `next_actions`
- `synthesis`

It deduplicates the same Finding by stable id across multiple capability projections, preserves partial failures, and never creates AI arithmetic fallback/canonical/public state.

### `src/lib/research/researchComposerW2.js`
First executable generic composition seam.

Executors are dependency-injected by capability key. The composer owns no registry and knows no engine-specific implementation. A future capability plugs in by providing an authorized executor whose output is adapted to Universal Finding.

Pipeline:

```text
raw question
  → identity resolution
  → Research Plan v2
  → ordered requested capability execution
  → source-native adapters / Universal Findings
  → dedupe + capability trace + coverage
  → snapshot by value
  → deterministic Result Bundle
  → downstream Raziel/AI synthesis
```

Missing/failed executors remain explicit. They are never replaced by local/AI calculation.

## Acceptance fixtures included

- 1820 + Ahavat Torah: Book identity wins over accidental title calculation.
- Explicit `כמה אהבת תורה בגימטריה?`: same Book identity remains, but Gematria may be requested as an explicit text lens.
- Person/Family + 4:24: personal/time/operator families are selected with access-before-evidence guard.
- Explicit ELS query: routes ELS without silently adding Gematria.
- Same Finding returned through multiple capabilities: one identity in the bundle.
- Capability failure: partial coverage is disclosed, no fabricated fallback.
- Future `future_engine_2030`: plugs into the same bundle without changing consumer schema.

Tests:

- `src/lib/research/researchComposerW2.test.js`
- `src/lib/research/researchComposerW2.runtime.test.js`

## Intentionally not done in W2.1

- no Supabase schema/migration/data write;
- no new `entity_types`;
- no new context table/store;
- no new capability registry;
- no live `metatron_context()` replacement;
- no modification of current Raziel production routing;
- no product/UI change;
- no deployment.

## Next slice — W2.2 wiring

Wire the new identity-first plan/result seam into the existing server-side Research Context path, reusing canonical readers/adapters:

1. server identity resolution from existing graph/person/book/source owners;
2. authorization before personal/private evidence retrieval;
3. existing canonical Gematria adapter;
4. existing ELS adapter;
5. existing Graph adapter;
6. existing Book/Source projection;
7. governed numeric operators (zero/one/clock/etc.) through owner-specific adapters;
8. relevant-rule selection instead of injecting the entire rulebook;
9. Raziel receives the Result Bundle and performs synthesis only after deterministic/retrieval completion.

W2.2 must not turn `raziel_protocol_agents` into the global capability registry. Research OS remains the capability fabric; Raziel remains a consumer/orchestrator interface.
