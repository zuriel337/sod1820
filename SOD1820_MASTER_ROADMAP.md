# SOD1820 — MASTER ROADMAP v6.4 COMPACT

**Date:** 2026-09-17  
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

Detailed bottom-up execution/dependency plan: `docs/2029-implementation-dependency-plan-v1.md`.

**Release-semantics pointer:** the detailed dependency plan is navigation only. Release authority always resolves from the live owners. Active `deploy_on_request` **v2** + `inter_agent_coordination_law` **v13** provide standing Human-Gate authorization for routine gate-clean, dependency-clean releases; any older wording in planning/history that requires a fresh `תעלה` for every routine merge/deploy is superseded. Explicit Human Gate remains required for governed-truth canonicalization/publication where required, irreversible/destructive changes, pricing/economics, major Legacy→2029 cutover, privacy/security weakening, and permanent capability/history retirement.

## 2029 North Star — owner pointers only

Detailed domain semantics live in owners, not here:

- Unified Experience / Audio / Motion / Spatial projection → active `experience_governance_foundation_v1_law` **v5**;
- Continuous Raziel Research Companion / multimodal voice readiness → active `raziel_companion_layer_law` **v3**;
- Capability Fabric / bounded Context Compiler / Context Pack → active `research_strategy_layer_law` **v15** + Research Workspace;
- Capability preservation / Premium-readiness / entitlement semantics → active `platform_tiers_law` **v4**;
- Capability availability / building/open state → active `site_flags_lock_law` **v3**;
- No Black Box / full execution trace / system recommendations → active `system_suggestions_law` **v2**;
- Translation / source-language evidence integrity → active `content_translation_law` **v3**;
- Personal Reality / authorized Person-Life relevance projection → active `person_foundation_contract_law` **v6**;
- Contextual Source Gap / missing-source research task → active `research_intake_foundation_contract_law` **v9**.

Historical Roadmap v5.6 remains provenance only. Normal routing starts from the current owner tree, not from the historical Roadmap body.

## G3 dependency spine — bottom-up, one tree

This is the implementation dependency order. Later capability may be preserved/visible as BUILDING before implementation, but it must not fork or bypass the lower layer it depends on.

### A. Runtime foundation first

- Experience Context / capability projection seam;
- server-authoritative availability + entitlement + budget/usage resolution before expensive I/O;
- privacy / lifecycle / RLS / authorization boundaries;
- event-driven background/agent execution, idempotency, cancellation, retry and provenance;
- media/file intake/upload adapter + canonical artifact references;
- **No Black Box full execution trace:** one root trace per material interaction; span tree across every engine/model/tool/DB/cache/network/media/background hop; multi-engine fan-out/fan-in visible; provider/model/version/resource/cost/outcome/replay provenance; 100% material-event coverage with privacy-safe payload references;
- locale-ready semantic actions, identities and status states from the start.

**G3 blocker:** Foundation Runtime is not considered closed if an admin cost/usage aggregate cannot drill down to the underlying root trace and individual span(s), including a three-engine workflow, without double-counting cost.

**Important:** localization architecture is foundational now; public English rollout is not first. We design every identity/action/context so locale can project later without changing capability identity.

### B. Canonical engines and semantic outputs

- Gematria / method registry and deterministic calculation owners;
- Corpus / Books / Sources / exact-expression provenance;
- callable ELS engine boundary + canonical corpus/coordinates/result provenance;
- Research OS / Universal Finding / Result Bundle adapters;
- Universal Resolve/Search/Command and Research Context transport.

### C. 2029 semantic product skeleton

Build the stable surfaces over the same lower contracts:

- System Frame / Home;
- World;
- Heichal;
- Number / Expression;
- Books / Sources;
- ELS;
- Journey;
- Posts / Updates;
- Workspace / Personal Area;
- canonical adaptive action slots for Listen / Raziel / Spatial / Deep Research / Brief / Media / Private Corpus / Pulse.

### D. ELS 2029 is an early Golden dependency

ELS is intentionally before broad language/media expansion because later experiences consume it.

Dependency chain:

`ELS engine/result contract → ELS 2029 surface → layered/spatial representation → Raziel-in-ELS text/context → guided/spoken ELS → high-end spatial/3D → research-to-media`

The 3D renderer may evolve independently, but it never becomes an ELS truth/engine owner.

### E. Raziel text/tool runtime before live voice

- one Raziel identity + Research Context;
- context-aware presence on ELS/World/Heichal/Journey/Post;
- canonical tool/action execution with Explain-Why / Trace;
- text continuity and graceful fallback proven before live microphone sessions.

### F. English Golden Locale, then language expansion

Actual English rollout belongs **after A–E are stable enough that the same identities/actions/results can be projected without forks**, and **before mass production of multilingual voice/media assets**.

Order:

`Hebrew canonical source → English Golden Locale → prove same capability/access/truth semantics → ar/es/fr/ru/pt/de rollout`

English must not create English-specific ELS, Raziel, premium state, graph, research OS or feature flags. Translation remains representation; exact language-specific Expressions/calculations retain their own provenance.

### G. Multimodal / premium richness

Once the semantic core and English Golden Locale are stable:

- Post Listen / cached authored narration;
- Research Audio Brief;
- Raziel Push-to-Talk;
- Raziel full live voice + transcript/captions;
- Private Research Corpus / uploads;
- Explain What I Am Looking At;
- Research Room / long-running bounded research;
- Research Dossier export;
- guided spatial research and high-end 3D;
- Research-to-Media;
- proactive Research Pulse;
- cross-channel companion continuity;
- XR/VR projection.

These remain preserved capabilities under `platform_tiers_law v4`; defer != delete and only explicit Human Gate cancels/retires.

## G3 opening order

### 1. INTER-AGENT EVENT-DRIVEN DISPATCH RUNTIME — EARLY FOUNDATION/RUNTIME PRIORITY

Owner: active `inter_agent_coordination_law` v13.

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
- routine gate-clean/dependency-clean merge/deploy may auto-release under active release owners; explicit Human Gate remains for governed-truth canonicalization/publication where required, irreversible/destructive changes, pricing/economics, major Legacy→2029 cutover, privacy/security weakening, and permanent capability/history retirement;
- EXTEND_EXISTING only: no second Agent System, Queue authority, Coordination Store or Truth Store.

Current state: **EVENT-DRIVEN GPT↔CLAUDE DISPATCH LIVE · STANDING DEPENDENCY-AWARE AUTO-RELEASE ACTIVE · CONTINUE COVERAGE/HARDENING IN G3**.

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

Current state: **BRIDGE EXISTS · URL-RELAY IMAGE TRANSPORT LIVE · BROADER FILE/PRIVATE/LARGE-MEDIA ADAPTERS STILL IN G3**.

### 3. Core runtime seams / safety before broad Goldens

- server-authoritative entitlement seam;
- privacy/data-lifecycle enforcement;
- Experience Context / capability projection seam;
- usage/cost resource metering boundary;
- root trace + parent/child span propagation through browser/server/edge/planner/engine/tool/storage/media;
- per-span provider-native cost + ILS provenance + exact/estimated/unknown state;
- three-engine parallel/sequential/synthesis acceptance with output-use attribution and no double-counting;
- callable ELS boundary;
- replay/idempotency/failure recovery;
- canonical domain adapters where required;
- implementation against frozen owners, not legacy UI authority.

### 4. Replayable capability / Golden fixtures

- replayable Research Context / Journey path for 878;
- Year/Verse Journey source/witness/counting provenance;
- canonical adapters for Research OS, Books/Sources, ELS, Person/Life, Number/World;
- ELS result/coordinate/replay Golden fixture;
- No-Black-Box fixtures: parallel three-engine synthesis, sequential escalation, cache hit, retry/continuation, timeout/cancel, unpriced model, partial failure, private-input redaction and cross-layer trace propagation;
- exact return, Why-transition, provenance and failure/negative outcomes.

### 5. Broader G3 product/runtime implementation

- 2029 System Frame / Global Now/Home adapters;
- World / Heichal / Number / Books / ELS / Journey / Post / Workspace semantic surfaces;
- internal 2029 Control Plane / Admin projection over existing domain/operations owners for Human Gate, health, media/storage, communications, publishing, security, cost and release — not a new truth/store owner and not Legacy WarRoom inheritance;
- Legacy shutdown/absorption proceeds writer-by-writer only after replacement + live-consumer proof; retiring a Legacy Experience never silently retires its capability, source data or canonical owner, and major Legacy→2029 cutover remains Human-Gated;
- Follow/Attention delivery truth;
- Raziel continuous research companion text/tool runtime;
- ELS 2029 + spatial-ready projection, with explicit G3 acceptance:
  - preserve canonical occurrence identity and replay inputs across renderers (corpus/version, start/positions/span, skip, direction and selected locus/path context as applicable);
  - keep the minimal Glyph Identity separation explicit under the existing ELS/Experience owners: **Character Identity ≠ Textual Occurrence ≠ Glyph Representation ≠ font-specific outline ≠ Rendering Instance**;
  - a future S3/S4 renderer may consume those identities/occurrences, but MUST NOT recompute ELS truth, mint canonical per-glyph entities, or treat visual proximity/depth as evidence;
  - the renderer boundary must remain compatible with DOM/static accessibility fallback and later Canvas/SDF/atlas/instanced-GPU implementations without changing semantic identity;
  - the isolated ~10k Hebrew-glyph performance proof is a **pre-S3/S4 implementation gate**, not a blocker for closing current G3 Foundation/runtime work;
- canonical future-action slots that can show BUILDING without expensive I/O;
- greenfield product surfaces consuming Foundation owners;
- no inheritance obligation from legacy layout/IA.

## Mandatory end-of-G3 gate

Before G4, run:

**G3 Implementation Compaction / Archive Pass**

Detailed acceptance:
`audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md`.

It must retire/archive superseded G3 prototypes, reconcile branch/PR/migration/deploy state, remove stale active adapters/pointers, reconcile the live Legacy writer-shutdown matrix against verified 2029 replacements/consumers, preserve provenance and rerun fresh-agent/release-state acceptance.

No-Black-Box acceptance is mandatory before G3 closes: every material new G3 runtime path must be trace-correlatable from aggregate cost/usage to root trace and individual spans, while raw private payloads remain protected.

## Later program sequence

### G4 — Golden Experiences

Run representative real journeys and surfaces against live/replayable fixtures. No simulated PASS.

Golden order should include ELS + Raziel/context before broad localization/media rollout.

### G5 — Product / Entitlement Matrix

Exact Free / Registered / Premium / Credits allocation after Goldens. Entitlement never changes truth quality.

### G6 — English Golden Locale / multilingual projection acceptance

Prove English over the same identities, capability/access state, Research Context, truth/provenance and product surfaces. Then expand the same projection contract to the remaining canonical locales.

### G7 — Multimodal / spatial / premium experience activation

Activate selected Voice/Audio/Private Corpus/Spatial/Media/Pulse/Cross-channel capabilities according to G5 entitlement and per-capability Golden acceptance. Capability may remain BUILDING/PARKED without deletion.

### G8 — Global shell, design acceptance, release batching

Complete cross-surface integration, measurable UX acceptance, parity/release proof and final deployment batches.

## Stable product homes / navigation direction

These are product homes, not semantic owners:

- Home
- World
- Heichal
- Updates / Posts
- Archive
- My Personal Area / Workspace
- Internal Control Plane / Admin — internal-only Human-Gate and operations projection; not public navigation and not a semantic owner

Global capabilities such as Raziel, Universal Resolve/Search/Command, Follow/Attention, Share and Journey may appear across surfaces without becoming separate top-level truth systems.

## Open decisions that still matter

Only decision-changing open items belong here:

- exact remaining hardening/coverage mechanics for the G3 event-driven dispatcher, under `inter_agent_coordination_law` v13;
- exact runtime integration mechanics for the existing agent media/file upload bridge beyond the live bounded image URL relay;
- exact physical trace/span persistence + propagation mechanics that extend current AI/cost logs without creating disconnected telemetry;
- exact runtime provider/routing implementation for voice/STT/TTS and usage metering; providers remain replaceable;
- exact Home/Global Now composition;
- final Community/Forum disposition in the greenfield experience;
- exact replacement gates and safe batching for Legacy writer retirement / major route cutover after 2029 consumer proof;
- exact Free/Registered/Premium/Credits allocation in G5;
- exact English launch scope after Golden Locale acceptance;
- release batching after acceptance.

## Anti-inflation rule

Do not add detailed contracts, audits, examples or research findings to this Roadmap.

- domain semantics → owner;
- project current state → Master;
- research → Research OS;
- coordination/release trace → work_log;
- superseded detail → Archive;
- Roadmap → navigation, sequence, gates, priority, explicit open decisions only.
