# SOD1820 — MASTER ROADMAP v6 COMPACT

**Date:** 2026-09-15  
**Status:** NAVIGATION / PRIORITY / GATES ONLY · HUMAN-GATE CONTROLLED

This Roadmap is not a rulebook, archive, change log, research store or owner body.

## Current position

**G2 — Foundation/Product capability reconciliation + Canonical Compaction** is OPEN.

Current active gate:

**G2 FINAL CANONICAL COMPACTION · OWNER HIERARCHY · ACTIVE TREE FREEZE**

Detailed acceptance lives at:
`audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md`

## Immediate sequence

1. **Finish active-tree compaction**
   - 100% active rules classified;
   - 0 active rules without owner pointer;
   - retire/supersede legacy active-routing rows;
   - freeze finite owner families.
2. **Compact current-state surfaces**
   - Master v3 Compact;
   - compact Owner Index;
   - bounded `work_log_current`;
   - preserve historical bodies in archive/Git provenance.
3. **One Decision → One Canonical Body**
   - remove current semantic duplication where it can route agents differently.
4. **Release-state reconciliation**
   - DOCUMENTED / IMPLEMENTED / COMMITTED / BRANCH-ONLY / MERGED / DEPLOYED / LIVE / VERIFIED kept exact.
5. **Fresh-agent acceptance**
   - Gematria/Number;
   - ELS;
   - Source/Book;
   - Raziel;
   - Person/Life;
   - Post/Publishing;
   - Follow/Attention;
   - Roadmap status;
   - Release gate.
6. **Human Gate: ZURIEL**
   - approve compact routing tree;
   - close remaining material DRIFT;
   - only then declare G2 closed.

## Program sequence after G2

### G3 — Foundation runtime / implementation

Implement only against frozen current owners. Do not rebuild legacy UI.

**Opening order for G3:**

1. **INTER-AGENT EVENT-DRIVEN DISPATCH RUNTIME — EARLY FOUNDATION/RUNTIME PRIORITY**
   - owner: active `inter_agent_coordination_law` v11;
   - target: assignment → dispatch event → agent claim/lease → live owner resolution → bounded execution → AFTER/result → wake originating controller → Human Gate only when required;
   - event-driven target, not ZURIEL-as-messenger and not manual polling as the operating model;
   - idempotency, duplicate suppression, timeout/retry/failure/deferred/cancelled, stale-lease recovery, parallel-writer protection and provenance are mandatory;
   - READ_ONLY specialist challenge may auto-dispatch when runtime exists;
   - WRITE remains governed; merge/deploy/publish/canonicalization never gain automatic authorization;
   - EXTEND_EXISTING only: no second Agent System, Queue authority, Coordination Store or Truth Store;
   - current state: **NOT IMPLEMENTED · CARRY-FORWARD ONLY**.
2. **Core runtime seams / safety before broad Goldens**
   - server-authoritative entitlement seam;
   - privacy/data-lifecycle enforcement;
   - callable ELS boundary;
   - replay/idempotency/failure recovery;
   - canonical domain adapters where required.
3. **Replayable capability / Golden fixtures**
   - replayable Research Context / Journey path for 878;
   - Year/Verse Journey source/witness/counting provenance;
   - canonical adapters for Research OS, Books/Sources, ELS, Person/Life, Number/World.
4. **Broader G3 product/runtime implementation**
   - Global Now/Home adapters;
   - Follow/Attention delivery truth;
   - Raziel continuous research companion;
   - greenfield product surfaces consuming Foundation owners.

**Mandatory at end of G3:** Implementation Compaction / Archive Pass before the next program phase. Detailed acceptance: `audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md`.

### G4 — Golden Experiences

Run representative real journeys and surfaces against live/replayable fixtures. No simulated PASS.

### G5 — Product / Entitlement Matrix

Exact Free / Registered / Premium / Credits allocation after Goldens. Entitlement never changes truth quality.

### G6–G8 — Global shell, design acceptance, release batching

Complete cross-surface integration, measurable UX acceptance, parity/release proof and final deployment batches.

## Stable product homes / navigation direction

These are product homes, not semantic owners:

- Home
- World
- Heichal
- Updates / Posts
- Archive
- My Personal Area / Workspace

Global capabilities such as Raziel, Universal Resolve/Search/Command, Follow/Attention, Share and Journey may appear across surfaces without becoming separate top-level truth systems.

## Open decisions that still matter

Only decision-changing open items belong here:

- formal G2 closure after fresh-agent replay;
- exact implementation mechanics/provider for the G3 event-driven dispatcher, under `inter_agent_coordination_law` v11;
- exact Home/Global Now composition;
- final Community/Forum disposition in the greenfield experience;
- exact Free/Registered/Premium allocation in G5;
- release batching after acceptance.

## Anti-inflation rule

Do not add detailed contracts, audits, examples or research findings to this Roadmap.

- domain semantics → owner;
- project current state → Master;
- research → Research OS;
- coordination/release trace → work_log;
- superseded detail → Archive;
- Roadmap → navigation, sequence, gates, priority, explicit open decisions only.
