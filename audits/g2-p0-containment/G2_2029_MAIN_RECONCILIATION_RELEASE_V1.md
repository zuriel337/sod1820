# G2 2029 — Full Main Reconciliation Release V1

**Date:** 2026-09-14  
**Human Gate:** ZURIEL explicitly authorized raising all accumulated G2 work to `main` so the repository reflects the most advanced 2029 direction, even when legacy UI must be closed/inactive rather than preserved.  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Baseline main before release:** `fa154d67e5209c28f4043c2adfdede5451f12386`

## Release intent

This release is a **G2 parity/reconciliation release**, not G2 closure and not G3 implementation.

Primary rule:

> Preserve capability, identity, truth, provenance, privacy, history and Human decisions. Do not preserve legacy upper-layer UI/runtime authority merely because it exists.

## Reconciled live owners

Live canonical owner routing at release preparation:

- `reality_graph_law v5`
- `research_strategy_layer_law v11`
- `research_intake_foundation_contract_law v8`
- `truth_axes_foundation_law v3`
- `research_workspace_law v2`
- `content_translation_law v3`
- `person_foundation_contract_law v5`
- `canonical_methods_registry_law v5`
- `engine_governance_registry_authority_law v1`
- `foundation_closure_protocol_law v4`
- `inter_agent_coordination_law v10`

`SOD1820_MASTER_OWNER_INDEX.md` is updated in this release to point fresh agents to the live owners above instead of stale Research Strategy v5 / Person v4 / Translation v2 routing.

## Included G2 foundation parity

The release adds repository migration artifacts for changes already LIVE/verified in canonical Supabase:

1. P0 semantic writer containment / discoveries + privileged writers.
2. Graph privacy contribution boundary and public-reader containment.
3. Number dossier root-of-trust containment.
4. Person self-erasure Foundation function semantics (no delete-account UI added).
5. Legacy autonomous regeneration freeze while keeping Raziel active.
6. Observation successor/correction lineage.
7. Research Path outcome envelope for executed / negative_result / missing_adapter / unverified / context_required / entitlement_gated / failed / skipped semantics.
8. Legacy `wizard_build_convergence` and `set_relation_evidence` runtime write freeze.

These migration files document/replay the already-live object state; migration history alone is not claimed as the live-state oracle.

## Included G2 semantic/product evidence

- 2029 semantic product walkthrough checkpoint.
- Number/Phrase Hub 358 walkthrough (with sparse 359 control).
- World / convergence ranking decisions.
- Gate 2 preservation manifest.
- Number-researcher containment evidence.
- Bedrock adversarial proof report + offline replay.
- Historical rulebook activation audit, explicitly marked as provenance rather than current-version routing.
- Product-language naming reconciliation and System Frame inheritance.

## Intentional legacy surface containment

Two legacy surfaces would otherwise call DB writers intentionally frozen by G2. Human Gate explicitly authorized marking such surfaces closed/inactive instead of restoring legacy authority.

### 1. Convergence Wizard

`ConvergenceWizard` no longer exposes a new-write action to `wizard_build_convergence`.

- Existing legacy convergence links remain visible as provenance.
- New build action is replaced by an explicit closed state: `אשף ההתכנסויות סגור · נבנה מחדש ל־2029`.
- No replacement Convergence system is invented in G2.

### 2. Findings / relation_evidence review

`FindingsTab` no longer exposes approve/reject writes to `set_relation_evidence`.

- Historical stats, candidates and confirmed rows remain readable.
- Surface is explicitly READ-ONLY.
- Future Human-Gate review belongs to the existing Research OS + Truth owners.

No other direct frontend callsite to the hardened/frozen P0 writer names was found in the bounded main search at release preparation.

## World / convergence decisions carried into main

- `התכנסות` and `הצלבה` are not separate top-level product destinations.
- Convergence is the primary research composition; crossings explain its strength.
- World may expose a small explainable Top Convergences set and deeper `כל ההתכנסויות` exploration.
- 2029 rank is contextual and explainable: Human curation, verification/method trace, evidence independence, source quality, contradiction/controls, contextual relevance, novelty/emergence and durable research structure may contribute.
- Legacy `meter_score` is one signal only.
- Rank != Truth; Signal != Curated; repeated representations/derivations do not inflate evidence.

## Explicitly NOT closed by this release

This release does **not** claim:

- G2 CLOSED;
- G3 started/implemented;
- all Source physical identity gaps solved;
- shared-artifact/evidence-independence foundation implemented end-to-end;
- immutable Gate-2 backup/export proof;
- Person deletion runtime privacy challenge independently closed;
- legacy tables physically deleted;
- legacy UI architecture preserved.

Open formal challenge at release preparation:

- Claude READ-ONLY P0-C Person erasure/privacy challenge `a8136225-503a-41f8-9c5e-4820ea03de97`.

## Release safety boundary

Safe to merge:

- docs/audits/routing parity;
- migration artifacts representing already-live DB changes;
- naming corrections;
- explicit closure/read-only treatment of legacy UI whose writers are intentionally frozen.

Not authorized/attempted here:

- destructive legacy table retirement;
- new 2029 UI implementation;
- new engine/store/graph/registry;
- automatic canonical promotion/publication;
- reactivation of frozen legacy semantic writers.

## Post-merge verification requirement

After `main` moves:

1. verify exact `origin/main` SHA;
2. verify Owner Index reads the live versions;
3. verify Vercel production deployment/build succeeds;
4. verify key changed routes render without build/runtime failure;
5. record `MERGED / DEPLOYED / LIVE / VERIFIED` separately;
6. keep G2 status OPEN until its actual closure gates are satisfied.
