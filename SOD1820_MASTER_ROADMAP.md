# SOD1820 — MASTER ROADMAP v6 COMPACT

**Date:** 2026-09-15  
**Status:** NAVIGATION / PRIORITY / GATES ONLY · **G2 CLOSED · G3 OPEN** · HUMAN-GATE CONTROLLED

This Roadmap is not a rulebook, archive, change log, research store or owner body.

## Current position

**G2 — Foundation/Product capability reconciliation + Canonical Compaction: CLOSED.**

Human-Gate closure: **ZURIEL · 2026-09-15**.

Closure evidence:

- active tree frozen at 86 active rules, 0 ownerless, 0 unclassified;
- independent Claude fresh-agent challenge consumed;
- North-Star absorption blocker patched into existing owners;
- PR #467 merged to main at `27900d3f696a26cda598463a58bcff4e74d5832d`;
- Observability/SEO Build Gate PASS;
- Release Visual Gate PASS;
- production deployment READY and public site HTTP-verified;
- detailed gate: `audits/g2-p0-containment/G2_CANONICAL_COMPACTION_ACTIVE_TREE_FREEZE_GATE_V1.md`.

**Current phase: G3 — Foundation runtime / implementation.**

## 2029 North Star — owner pointers only

Detailed domain semantics live in owners, not here:

- Continuous Raziel Research Companion / Research Presence → active `raziel_companion_layer_law` **v2**;
- Capability Fabric / bounded Context Compiler / Context Pack → active `research_strategy_layer_law` **v15** + Research Workspace;
- Personal Reality / authorized Person-Life relevance projection → active `person_foundation_contract_law` **v6**;
- Contextual Source Gap / missing-source research task → active `research_intake_foundation_contract_law` **v9**.

Historical Roadmap v5.6 remains provenance only. Normal routing starts from the current owner tree, not from the historical Roadmap body.

## G3 opening order

### 1. INTER-AGENT EVENT-DRIVEN DISPATCH RUNTIME — EARLY FOUNDATION/RUNTIME PRIORITY

Owner: active `inter_agent_coordination_law` v11.

Target flow:

`assignment → dispatch event → agent claim/lease → live owner resolution → bounded execution → AFTER/result → wake originating controller → Human Gate only when required`

Mandatory properties:

- event-driven target, not ZURIEL-as-messenger and not manual polling as the operating model;
- idempotency and duplicate suppression;
- timeout / retry / failure / deferred / cancelled;
- stale-lease recovery;
- one-scope / one-active-writer protection;
- provenance and exact AFTER/result linkage;
- READ_ONLY specialist challenge may auto-dispatch when runtime exists;
- WRITE remains governed;
- merge/deploy/publish/canonicalization never gain automatic authorization;
- EXTEND_EXISTING only: no second Agent System, Queue authority, Coordination Store or Truth Store.

Current state: **NOT IMPLEMENTED · G3 PRIORITY**.

### 2. AGENT MEDIA / FILE TOOL ADAPTER — EARLY FOUNDATION/RUNTIME PRIORITY

Reuse the already-proven `AGENT_MEDIA_UPLOAD_BRIDGE_V1` / `agent-upload` ticket mechanism and current Media/Research Intake owners.

Target:

`receive/generated artifact → bounded destination intent → least-privilege single-use ticket → upload → hash/size/mime/reference verification → return canonical artifact reference`

Rules:

- same canonical action usable by GPT and CLAUDE;
- artifact upload is separate from domain placement/binding;
- Post / Reality Stream / Gallery / Brand / Research owners decide governed placement after reference return;
- images are first Golden capability;
- private Books/Documents remain a separate private-storage/RLS/retention lane;
- wrong hash/mime/path/replay fails closed;
- no reusable admin secret;
- no second Upload System, Storage owner, media store or agent-specific upload path.

Current state: **BRIDGE EXISTS · AGENT-RUNTIME ADAPTER NOT IMPLEMENTED**.

### 3. Core runtime seams / safety before broad Goldens

- server-authoritative entitlement seam;
- privacy/data-lifecycle enforcement;
- callable ELS boundary;
- replay/idempotency/failure recovery;
- canonical domain adapters where required;
- implementation against frozen owners, not legacy UI authority.

### 4. Replayable capability / Golden fixtures

- replayable Research Context / Journey path for 878;
- Year/Verse Journey source/witness/counting provenance;
- canonical adapters for Research OS, Books/Sources, ELS, Person/Life, Number/World;
- exact return, Why-transition, provenance and failure/negative outcomes.

### 5. Broader G3 product/runtime implementation

- Global Now/Home adapters;
- Follow/Attention delivery truth;
- Raziel continuous research companion runtime;
- greenfield product surfaces consuming Foundation owners;
- no inheritance obligation from legacy layout/IA.

## Mandatory end-of-G3 gate

Before G4, run:

**G3 Implementation Compaction / Archive Pass**

Detailed acceptance:
`audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md`.

It must retire/archive superseded G3 prototypes, reconcile branch/PR/migration/deploy state, remove stale active adapters/pointers, preserve provenance and rerun fresh-agent/release-state acceptance.

## Later program sequence

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

- exact implementation mechanics/provider for the G3 event-driven dispatcher, under `inter_agent_coordination_law` v11;
- exact runtime integration mechanics for the existing agent media/file upload bridge;
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
