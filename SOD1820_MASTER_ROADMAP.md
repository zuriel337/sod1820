# SOD1820 — MASTER ROADMAP v6.7 COMPACT

**Date:** 2026-10-01  
**Status:** NAVIGATION / PRIORITY / GATES ONLY · **G2 CLOSED · G3 CLOSED · G3→G4 TRANSITION** · HUMAN-GATE CONTROLLED

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

**Current phase: G3 — CLOSED. Next navigation: G3→G4 transition / Golden preparation.**

**G3 CLOSURE SEAL · 2026-10-01 · Human Gate ZURIEL:** G3 runtime closure release = `74d15f88095deee8a629c9f65daf3b17173e033a`; `origin/main` and Production matched that exact SHA during live acceptance before the docs-only seal; PR #876 MERGED; Vercel READY on the exact SHA; final `sod1820/post-deploy-canary` SUCCESS on the same SHA. The six endgame migrations are LIVE/repo-aligned, 17 required Edge functions are ACTIVE, Canonical Data Inventory reports 317 objects / 0 material unmapped, WA has 0 active cron/background direct DB-held Green paths, the live Maintenance Acceptance Matrix was refreshed, and the independent Foundation LIVE challenge returned **PASS_G3_LIVE_CLOSURE_READY** (`work_log.id=663f93eb-1d16-4bdf-88dd-f3487508b7bc`). Temporary restore-test projects are gone; only canonical Supabase `linswmnnkjxvweumprav` is active.

Non-blocking maintenance debt remains routed to existing owners rather than reopening G3: transient sitemap-canary latency, existing `contributors_feed`/42501 read errors, DB capacity-baseline establishment, inventory client-RLS review items, and stale PR disposition.

**NEXT:** use the already-defined G3→G4 transition lane (informal “G3.5” shorthand) to prepare/validate the next real Golden Experiences. Closing G3 does **not** by itself open English, entitlement/pricing, Voice/Multimodal, Spatial/3D/XR, governed publication, or a broad Legacy→2029 cutover; those remain under their existing Human-Gate/owner rules.

**BOTTOM-UP CLOSURE / NO PREMATURE ASCENT · Human-Gate ZURIEL · 2026-09-29:** active closure owner is `foundation_closure_protocol_law v7`. Before a new WRITE, verify whether the canonical owner/runtime already satisfies the requirement. Ascend only when the load-bearing dependency below is CLOSED or explicitly non-blocking/deferred. A discovered lower gap descends only to its owning seam, closes there, and resumes from the interrupted point; it does not reopen all of G2/G3. Completion percentage and visible UI are never closure authority.

**G3→G4 transition rule · 2026-09-28:** G4 does not activate later capabilities merely because the gate number changes. G3 must first close its implementation/compaction blockers; G4 then runs real/replayable **Golden Experiences** over the already-built 2029 capabilities. A capability becomes Golden only after its real journey passes; English, entitlement/pricing, Voice/Multimodal, Spatial/3D and XR remain governed by their later program stages and do not auto-open at G4.

Detailed bottom-up execution/dependency plan: `docs/2029-implementation-dependency-plan-v1.md`.

**Human-Gate implementation focus · 2026-09-22 — 2029 FIRST.**

- product/UX engineering effort goes to the 2029 tree, not to improving the Legacy experience for temporary parity;
- a Legacy UI/route may be frozen, hidden or explicitly unavailable during transition instead of receiving repair/polish when no current 2029 dependency requires that UI;
- if a capability has no safe 2029 renderer yet, prefer a truthful `BUILDING / unavailable` state over maintaining two competing product runtimes;
- **do not interpret this as blanket Legacy shutdown:** canonical engines, sources, ingress, writers, data/provenance and compatibility adapters remain live wherever 2029 still depends on them;
- source/writer retirement still requires replacement proof + live-consumer proof under existing owners; destructive/permanent retirement and major route cutover remain Human-Gated;
- target end-state: one 2029 product tree; Legacy survives only as bounded source/adapter/provenance until safely absorbed or retired.

**Release-semantics pointer:** the detailed dependency plan is navigation only. Release authority always resolves from the live owners. Active `deploy_on_request` **v3** + `inter_agent_coordination_law` **v13** provide standing Human-Gate authorization for routine gate-clean, dependency-clean releases; any older wording in planning/history that requires a fresh `תעלה` for every routine merge/deploy is superseded. Explicit Human Gate remains required for governed-truth canonicalization/publication where required, irreversible/destructive changes, pricing/economics, major Legacy→2029 cutover, privacy/security weakening, and permanent capability/history retirement.

## 2029 North Star — owner pointers only

Detailed domain semantics live in owners, not here:

- Foundation gate sequence / bottom-up closure / maintenance acceptance → active `foundation_closure_protocol_law` **v7**;
- Unified Experience / Audio / Motion / Spatial projection → active `experience_governance_foundation_v1_law` **v7**;
- Continuous Raziel Research Companion / multimodal voice readiness → active `raziel_companion_layer_law` **v3**;
- Capability Fabric / bounded Context Compiler / Context Pack → active `research_strategy_layer_law` **v17** + Research Workspace;
- Capability preservation / Premium-readiness / entitlement semantics → active `platform_tiers_law` **v5**;
- Capability availability / building/open state → active `site_flags_lock_law` **v3**;
- No Black Box / full execution trace / system recommendations / Incident Intelligence / resource-aware reliability → active `system_suggestions_law` **v5**;
- Translation / source-language evidence integrity → active `content_translation_law` **v4**;
- Personal Reality / authorized Person-Life relevance projection → active `person_foundation_contract_law` **v6**;
- Contextual Source Gap / missing-source research task → active `research_intake_foundation_contract_law` **v13**.
- 2029 Search / Video Discovery Foundation → current Video/Search projection remains on the 2029 product tree; canonical direction: `source/asset → 2029 projection → 2029 route`. Detailed implementation evidence stays in `docs/2029-implementation-dependency-plan-v1.md` + `docs/2029-search-indexing-closure-map-v1.md`, not duplicated here.

Historical Roadmap v5.6 remains provenance only. Normal routing starts from the current owner tree, not from the historical Roadmap body.

## G3 closure archive — pointer only

G3 is **CLOSED**. Its dependency spine, opening order, maintenance/compaction requirements and implementation detail are no longer part of active navigation.

Current closure pointers:
- documented current state and exact release evidence → `SOD1820_MASTER_STATE.md`;
- Foundation closure owner / acceptance law → active `foundation_closure_protocol_law v7`;
- implementation compaction / archive acceptance → `audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md`;
- post-release Maintenance Acceptance Matrix refresh → `work_log.id=4220295a-1e98-40de-98c4-d127d8f20059`;
- final independent LIVE Foundation verdict → `work_log.id=663f93eb-1d16-4bdf-88dd-f3487508b7bc`;
- final closure seal → `work_log.id=325cca05-3d5d-4ec5-bc21-683d3a51094d`.

Open operational debt from G3 is maintenance work under its existing owners; it does not restore the closed G3 execution plan to this Roadmap.

## G3→G4 transition lane — 2029 Public Shell + Posts-first Design Readiness

**ACTIVE NOW after G3 CLOSED. Informal shorthand: “G3.5”. This is NOT a new gate.**

Purpose: make 2029 the coherent visible product shell quickly, without pretending unfinished capabilities are live, without polishing Legacy UI, and without freezing replaceable presentation before G4 can teach us from real use.

- Freeze a **semantic shell contract**, not an irreversible IA or final visual composition. Stable through the transition: canonical surface/entity identities, route families, truth/access semantics, availability states, Research Context/Exact Return behavior, and capability slots. Replaceable by G4 evidence: navigation grouping/order, page composition, hierarchy emphasis, card geometry, imagery, motion, spatial treatment and other presentation details.
- High-fidelity design is an **early Human-Gate thinking instrument**, not a late cosmetic phase and not an acceptance shortcut. Once the semantic shell/availability contract is frozen, build at real visual quality so ZURIEL can inspect the system, compare directions and change composition before broad rollout.
- Freeze one coherent 2029 shell vocabulary across Home, World, Posts, Topics, Books/Sources, Number, ELS/Cipher, Journey, Community, Personal Area/Workspace, Raziel and future capability slots. Existing owners keep semantic authority; no surface becomes a new truth or capability owner.
- Every visible destination must project an honest availability state through existing capability/site-flag owners: **OPEN / BUILDING / LATER / GATED**. A visible button, image, icon or card may preview the future product, but an unavailable capability must not resolve into a fake working route or imply Golden acceptance.
- Define the **minimum public 2029 slice** before broad cutover: Home, World, Posts Index, Post, Topic and Book/Source navigation must form a coherent route chain with truthful return/navigation. Other surfaces may remain BUILDING.
- The public-shell transition is presentation/cutover readiness, not Legacy destruction. Legacy engines, sources, data, media, SEO compatibility and adapters remain behind 2029 until replacement/consumer proof permits retirement under their existing owners.
- **Posts-first priority:** because new public posts are the immediate Human-Gate need, the first high-fidelity Golden is **Posts Index + Post**. Current FZ1073 and Bennett×salt are fixtures; do not create a third Post Golden merely to test another local composition.
- Posts-first does **not** make Posts the owner of the visual system. Extract/reuse shared primitives and tokens so World and Home inherit the same language; no Bennett/FZ1073-specific UI law and no page-local visual system.
- Posts Golden acceptance must prove generic relationships and navigation rather than slug-specific semantics: Post↔Topic/Number/Book/Source connections, list→post→context→return, and shared Research Path behavior. Decision-changing failures descend only to their owning lower seam.
- G4 begins with the **Posts Index + Post Golden** over this semantic shell. Design readiness must never masquerade as experience acceptance.
- After Posts passes, run one bounded **Cross-Surface Skeleton Golden** over the minimum public slice before cutover — representative path such as Home → World → Topic → Post → Book/Number → exact return. Its purpose is to prove shared navigation/context/availability semantics across surfaces, not to require final World/Home artwork.
- A **2029 Public Cutover** may occur only after both the Posts Golden and the Cross-Surface Skeleton Golden pass, the minimum public slice passes release/crawler/redirect/SEO checks, and ZURIEL explicitly authorizes the major cutover. At that point 2029 becomes the public face; unfinished destinations stay visibly BUILDING rather than falling back to Legacy UI.
- After cutover, continue G4 with **World high-fidelity Golden second** and **Home high-fidelity Golden third**, reusing the same visual system while allowing G4 evidence to change composition/navigation presentation without changing semantic identity.
- G4 remains the formal Golden-experience gate. This transition lane prepares the shell and high-fidelity design; it does not mark a capability Golden or satisfy G4 acceptance by itself.

## Later program sequence

### G4 — Golden Experiences

Run representative real journeys and surfaces against live/replayable fixtures. No simulated PASS.

**Transition semantics:** entering G4 means the G3 foundation/runtime is sufficiently closed to test complete experiences. It does **not** auto-enable G5+ capabilities. G4 consumes what already exists, finds real cross-layer failures, and promotes only journeys that pass Golden acceptance. Failed journeys route back to the owning G3 layer for repair without reopening Legacy UX as the target.

Golden order should include ELS + Raziel/context before broad localization/media rollout.

Golden acceptance also includes measured end-to-end performance on representative core journeys against live/replayable production-like data: route/input responsiveness, p50/p95 server/RPC latency where measurable, Raziel tool/response latency, query count/DB time, cache behavior, Storage/CDN egress, error/fallback rate and trace completeness. A latency/query/storage regression routes back to its owning G3 layer for repair. Raw/historical telemetry may be archived only after the Golden window proves canonical rollups preserve the required history.

**Post-G4 retrieval/inventory regression check:** after representative G4 Goldens complete, rerun the end-of-G3 owner-first retrieval benchmark, diff the Canonical Data Inventory against its G3 closure baseline, **and replay the enforcement-chain negative tests** for save receipts, Person ownership, canonical engine/writer entrypoints and media ingress. Any reintroduced orphan Person/artifact linkage, archived-log dependency in default routing, serial cross-store fallback, duplicate source authority, unowned new table/store, bypass that can still claim `DONE/SAVED`, or material p95 regression routes back to the owning G3 seam for correction before broad G5+ scaling. This is a maintenance/reconciliation check under existing owners, not a new monitoring or search system.

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
