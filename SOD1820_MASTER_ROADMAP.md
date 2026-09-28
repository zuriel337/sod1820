# SOD1820 — MASTER ROADMAP v6.5 COMPACT

**Date:** 2026-09-27  
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

**G3→G4 transition rule · 2026-09-28:** G4 does not activate later capabilities merely because the gate number changes. G3 must first close its implementation/compaction blockers; G4 then runs real/replayable **Golden Experiences** over the already-built 2029 capabilities. A capability becomes Golden only after its real journey passes; English, entitlement/pricing, Voice/Multimodal, Spatial/3D and XR remain governed by their later program stages and do not auto-open at G4.

Detailed bottom-up execution/dependency plan: `docs/2029-implementation-dependency-plan-v1.md`.

**Human-Gate implementation focus · 2026-09-22 — 2029 FIRST.**

- product/UX engineering effort goes to the 2029 tree, not to improving the Legacy experience for temporary parity;
- a Legacy UI/route may be frozen, hidden or explicitly unavailable during transition instead of receiving repair/polish when no current 2029 dependency requires that UI;
- if a capability has no safe 2029 renderer yet, prefer a truthful `BUILDING / unavailable` state over maintaining two competing product runtimes;
- **do not interpret this as blanket Legacy shutdown:** canonical engines, sources, ingress, writers, data/provenance and compatibility adapters remain live wherever 2029 still depends on them;
- source/writer retirement still requires replacement proof + live-consumer proof under existing owners; destructive/permanent retirement and major route cutover remain Human-Gated;
- target end-state: one 2029 product tree; Legacy survives only as bounded source/adapter/provenance until safely absorbed or retired.

**Release-semantics pointer:** the detailed dependency plan is navigation only. Release authority always resolves from the live owners. Active `deploy_on_request` **v2** + `inter_agent_coordination_law` **v13** provide standing Human-Gate authorization for routine gate-clean, dependency-clean releases; any older wording in planning/history that requires a fresh `תעלה` for every routine merge/deploy is superseded. Explicit Human Gate remains required for governed-truth canonicalization/publication where required, irreversible/destructive changes, pricing/economics, major Legacy→2029 cutover, privacy/security weakening, and permanent capability/history retirement.

## 2029 North Star — owner pointers only

Detailed domain semantics live in owners, not here:

- Unified Experience / Audio / Motion / Spatial projection → active `experience_governance_foundation_v1_law` **v7**;
- Continuous Raziel Research Companion / multimodal voice readiness → active `raziel_companion_layer_law` **v3**;
- Capability Fabric / bounded Context Compiler / Context Pack → active `research_strategy_layer_law` **v15** + Research Workspace;
- Capability preservation / Premium-readiness / entitlement semantics → active `platform_tiers_law` **v5**;
- Capability availability / building/open state → active `site_flags_lock_law` **v3**;
- No Black Box / full execution trace / system recommendations / Incident Intelligence / resource-aware reliability → active `system_suggestions_law` **v5**;
- Translation / source-language evidence integrity → active `content_translation_law` **v3**;
- Personal Reality / authorized Person-Life relevance projection → active `person_foundation_contract_law` **v6**;
- Contextual Source Gap / missing-source research task → active `research_intake_foundation_contract_law` **v13**.

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
- Video / Media asset projection;
- Workspace / Personal Area;
- canonical adaptive action slots for Listen / Raziel / Spatial / Deep Research / Brief / Media / Private Corpus / Pulse.

### D. ELS 2029 is an early Golden dependency

ELS is intentionally before broad language/media expansion because later experiences consume it.

Dependency chain:

`ELS engine/result contract → ELS 2029 surface → layered/spatial representation → Raziel-in-ELS text/context → guided/spoken ELS → high-end spatial/3D → research-to-media`

**Current ELS state pointer · 2026-09-27:** active owner is `els_research_layer_law` **v9**. PR #748 (Vector Geometry / Slice Shift / Dynamic Matrix Volume foundation) is **MERGED · DEPLOYED · PRODUCTION LIVE · VERIFIED** at main `a43eb5ac`. Classic Matrix / Research Matrix are now defined as two projection profiles over one canonical engine/state: Classic = direct low-cost 2D/manual profile; Research = default 2029 capability envelope with minimal initial disclosure and optional bounded adaptive/AI depth. The pure profile model/acceptance is branch-only in the current v9 implementation slice; UI cutover is deferred while overlapping #744 ELS-page writer remains active. Runtime scanner, seeded nulls/FDR and SQL provenance reconciliation remain open before full ELS runtime closure. No GPU/3D renderer is required for this step.

**ELS Dynamic Matrix Volume pointer (Human-Gate ZURIEL · 27.9.2026):** ELS spatial research uses one bounded Matrix Volume / one scanner, not separate “depth”, “diagonal” or “3D” engines. Preserve two distinct concepts: (1) **Slice Shift** — the v7 whole-window transform `baseCorpusIndex + k×S`, useful for layered/2.5D comparison but not an independent Z because `+S` is also one row in an `S`-wide matrix; and (2) **True Volume** — a frozen independent 3D basis. Default rectangular basis for plane height `H`: `eX=+1`, `eY=+S`, `eZ=+(S×H)`, so `corpusIndex = origin + x + y×S + z×(S×H)`. All straight/diagonal/depth paths are bounded primitive vectors `(dx,dy,dz)` over the same result lineage.

The box starts at the smallest sufficient Anchor volume and expands only when existing Research Strength / Information Gain justifies it. Expansion may be asymmetric along the unresolved vector/face/depth. Three- and four-letter tokens are allowed only inside a bounded **hot** subvolume after stronger non-short/structural evidence already made the area worth deeper inspection, or when explicitly pre-registered/requested; a short token cannot by itself make a cold box hot. Same-line extension, intersections, parallel/volume continuation, rarity, repeated motifs, controls/contradictions and Human research intent can justify expansion. Stop when added space produces only dependent/duplicate noise or low information. Canonical semantics live in active `els_research_layer_law`; Experience/GPU/3D only renders them.

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

These remain preserved capabilities under `platform_tiers_law v5`; defer != delete and only explicit Human Gate cancels/retires.

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

Current state: **BRIDGE EXISTS · URL-RELAY IMAGE TRANSPORT LIVE · ONE-TREE MEDIA/PRIVATE INTAKE RELEASED VIA PR #499 · WORLD 2029 MEDIA PROJECTION RELEASED VIA PR #511 · PERFORMANCE/DELIVERY STANDARDIZATION STILL IN G3**.

Media performance/delivery navigation: `docs/2029-media-performance-delivery-map-v1.md` — preserve `resize=contain`, static derivatives first, poster-only-before-video-intent, bounded representation classes, observable egress and no page-view derivative generation.

### 3. Core runtime seams / safety before broad Goldens

**Immediate 2029-only hardening sequence — LIVE / VERIFIED (23.9.2026):**

`Operational Trace runtime → server capability/entitlement/budget gate → Experience Context as the real cross-surface seam → server/document SEO+AI metadata parity → Research Plan/Path resumability → cheap route/test/least-privilege cleanup`

This dependency chain is now **MERGED · DEPLOYED · LIVE · VERIFIED** through main `5376523be8c4a81b42b428eab30b970e4506e797`, canonical Supabase and production. The next program dependency is **§4 Replayable capability / Golden fixtures**. Do not spend a sprint restoring Legacy UX to unblock it.

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
- World / Heichal / Number / Books / ELS / Journey / Post / Video-Media / Workspace semantic surfaces;
- **2029 Search / Video Discovery Foundation — RELEASED · DEPLOYED · LIVE (PR #779 + #782):** Search/Video is a 2029 rail, not a Legacy UX repair. Canonical public flow is `source/asset → 2029 projection → 2029 route → indexability → server metadata → sitemap → crawler access → GSC verification`. Primary product URLs are `/post/:slug`, `/video/:assetId`, `/topic/:slug`, `/2029/number/:value`, `/book/:slug` and `/els`; Legacy root-slug/video routes are source/compatibility only and are not new product homes. Unified Video Projection + Search indexability landed in #779; native 2029 route/crawler cutover landed in #782. Preserve one asset / many placements / one Google primary-page semantics. Search Console validation is external verification, not a second truth owner. Residual route-legitimacy closure remains owner-specific for false dynamic entities beyond the already-covered post/video cases. Detailed closure map: `docs/2029-search-indexing-closure-map-v1.md`;
- **World / Convergence SEO + AI Discovery:** World Discovery is LIVE as an independent discovery hub. **Human Gate correction:** Beit Midrash remains independently addressable and must not auto-route into World; the earlier Beit-Midrash→World cutover is superseded. `/topic/:slug` remains the canonical public Convergence identity. LIVE = World full Convergence catalog + native Topic 2029 renderer + hydrated canonical/meta/OG/structured-data projection. **DRIFT / NOW:** the initial 2029 HTML document still serves generic metadata to ordinary crawlers before hydration; server/document canonical/title/description/OG/JSON-LD parity must be closed before calling SEO/AI discovery foundation complete. Preserve existing indexability until Human Gate approves any bulk change. Detailed execution map: `docs/2029-world-convergence-seo-ai-discovery-plan-v1.md`;
- **Number Mathematical / Prime Lens:** extend the released `number_math_profile` with bounded prime context/relations and one-tree numeric re-entry; Golden fixture `787 → prime index 138 → Number 138 → verified צמח=138`; Heichal consumes the same Context as a bounded Prime/Pattern deep-research lane, while Beit Midrash owns the learning explanation. `138` remains a curated strong-number / anchor candidate until a separate Human-Gate anchor decision. Detailed plan: `docs/2029-number-prime-lens-beit-midrash-plan-v1.md`;
- internal 2029 Control Plane / Admin projection over existing domain/operations owners for Human Gate, health, media/storage, communications, publishing, security, cost and release — not a new truth/store owner and not Legacy WarRoom inheritance;
- **Community Core 2029 / historical conversation absorption — LIVE VERIFIED:** one shared social/research substrate; Community Core runtime/security foundation is merged and canonical OpenWeb archive absorption is complete in canonical Supabase (41,080/41,080 source messages imported with source-native provenance, reply lineage and replay idempotency verified; 0 pending). WordPress remains compatible historical conversation projection where applicable. Public Community UI cutover, avatar recovery, rich presence/notifications and visual polish remain later Experience work and are **not** G3 Foundation blockers;
- Legacy shutdown/absorption proceeds writer-by-writer only after replacement + live-consumer proof; **Legacy UX parity is not a G3 goal** and obsolete Legacy UI/routes may be frozen or made explicitly unavailable instead of repaired. Retiring a Legacy Experience never silently retires its capability, source data or canonical owner, and major Legacy→2029 cutover remains Human-Gated;
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

**Data/query compaction + performance baseline (end-of-G3):** after enough real 2029 usage exists, run an evidence-based optimization pass over the existing owners: classify legacy/staging/operational stores, fix measured hot queries/RPCs/index/RLS costs, remove duplicate/unused indexes only with live-consumer proof, preserve provenance/retention-safe data, and record storage/growth + core-latency baselines before G4. **One Tree does not mean one SQL table**; do not bulk-merge or purge tables merely to reduce table count.

**Community closure check:** G3 archive/history ownership is no longer an open Chat-vs-Forum decision. Community Core is the shared substrate and OpenWeb absorption is LIVE VERIFIED. G3 may close with public Community UI still BUILDING, but it must preserve the imported archive/provenance and must not reintroduce a parallel Chat/Forum truth system. Temporary import-stage artifacts are handled by the final G3 compaction/archive decision, not by silent deletion.

No-Black-Box acceptance is mandatory before G3 closes: every material new G3 runtime path must be trace-correlatable from aggregate cost/usage to root trace and individual spans, while raw private payloads remain protected.

**Reliability / Incident Intelligence closure check:** G3 cannot close while `G3_RELIABILITY_PRECLOSE_V1` is incomplete. Before closure, all of the following must be implemented, released and live-verified under active `system_suggestions_law` v5 + existing owners; contract-only state is insufficient:

- canonical `IssueReport → events → incident detection/system_suggestions → Control Plane/Watchman`;
- event-driven client runtime-error capture (no polling);
- sparse deterministic Synthetic Critical Journeys — post-deploy + at most 4 scheduled passes/day by default, zero-AI;
- sensor/notification dead-man so “no data” cannot masquerade as “all healthy”;
- exact-SHA post-deploy production canary, fail-closed for the next release but no automatic rollback;
- at least one isolated restore drill proving recovery, not merely existence of backups.

Resource policy: event-driven first; normal monitoring AI-token budget = ZERO; no new incident-monitoring cron faster than 15 minutes without evidence + Human Gate. **Current 2026-09-27:** contracts LIVE; `health-watch` is 15m and DB-size-alone false alerts are fixed LIVE; runtime remains DEFERRED pending builder availability.

## Later program sequence

### G4 — Golden Experiences

Run representative real journeys and surfaces against live/replayable fixtures. No simulated PASS.

**Transition semantics:** entering G4 means the G3 foundation/runtime is sufficiently closed to test complete experiences. It does **not** auto-enable G5+ capabilities. G4 consumes what already exists, finds real cross-layer failures, and promotes only journeys that pass Golden acceptance. Failed journeys route back to the owning G3 layer for repair without reopening Legacy UX as the target.

Golden order should include ELS + Raziel/context before broad localization/media rollout.

Golden acceptance also includes measured end-to-end performance on core journeys against live/replayable production-like data. A latency/query/storage regression routes back to its owning G3 layer for repair; G5 is not a database-cleanup stage.

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
- final Convergence index-admission threshold after the public Topic census; preserve current `/topic/:slug` behavior until Human Gate approves any bulk deindex policy;
- exact replacement gates and safe batching for Legacy writer retirement / major route cutover after 2029 consumer proof; Legacy UX maintenance/parity itself is no longer an objective;
- exact server-boundary mechanics for HTTP 404/301/200 on invalid/retired/current **2029** public routes, without adding DB lookups to CN/SG bot-policy middleware;
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
