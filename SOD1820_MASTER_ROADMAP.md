# SOD1820 — MASTER ROADMAP v6.13 COMPACT

**Date:** 2026-10-09
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
- Unified Experience / Audio / Motion / Spatial projection → active `experience_governance_foundation_v1_law` **v8**;
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

**Execution priority · ZURIEL direction · 2026-10-09:** World → Posts → Heichal. This orders current delivery; the existing Posts Golden and Cross-Surface Skeleton remain acceptance requirements. P0 security and G1 acceptance continue with their existing owners. Full Admin/Control Plane expansion is deferred; essential safety and operational blockers stay in scope.

**Journey foundation belongs in G4, before English:** complete the existing unified Research Path continuity across source/gallery, World/Topic/Post, Number/Expression/method crossings and ELS, with exact return and contextual Raziel. Preserve original material and the existing ELS capability inventory. Detailed bounded delivery, historical decision reconciliation and session boundaries live in [the existing dependency plan](docs/2029-implementation-dependency-plan-v1.md#journey-foundation-g4). This is not a new gate, Journey system or whole-corpus rescan. G5 may enrich coverage and personal research; G6 consumes the accepted continuity; spatial/3D, voice and advanced background activation remain in G7 under their existing owners.

- Freeze a **semantic shell contract**, not an irreversible IA or final visual composition. Stable through the transition: canonical surface/entity identities, route families, truth/access semantics, availability states, Research Context/Exact Return behavior, and capability slots. Replaceable by G4 evidence: navigation grouping/order, page composition, hierarchy emphasis, card geometry, imagery, motion, spatial treatment and other presentation details.
- High-fidelity design is an **early Human-Gate thinking instrument**, not a late cosmetic phase and not an acceptance shortcut. Once the semantic shell/availability contract is frozen, build at real visual quality so ZURIEL can inspect the system, compare directions and change composition before broad rollout.
- Freeze one coherent 2029 shell vocabulary across Home, World, Posts, Topics, Books/Sources, Number, ELS/Cipher, Journey, Community, Personal Area/Workspace, Raziel and future capability slots. Existing owners keep semantic authority; no surface becomes a new truth or capability owner.
- Every visible destination must project an honest availability state through existing capability/site-flag owners: **OPEN / BUILDING / LATER / GATED**. A visible button, image, icon or card may preview the future product, but an unavailable capability must not resolve into a fake working route or imply Golden acceptance.
- Define the **minimum public 2029 slice** before broad cutover: Home, World, Posts Index, Post, Topic and Book/Source navigation must form a coherent route chain with truthful return/navigation. Other surfaces may remain BUILDING.
- The public-shell transition is presentation/cutover readiness, not Legacy destruction. Legacy engines, sources, data, media, SEO compatibility and adapters remain behind 2029 until replacement/consumer proof permits retirement under their existing owners.
- **Posts acceptance priority within the delivery order above:** the first high-fidelity Golden remains **Posts Index + Post**. Current FZ1073 and Bennett×salt are fixtures; do not create a third Post Golden merely to test another local composition.
- Posts-first does **not** make Posts the owner of the visual system. Extract/reuse shared primitives and tokens so World and Home inherit the same language; no Bennett/FZ1073-specific UI law and no page-local visual system.
- Posts Golden acceptance must prove generic relationships and navigation rather than slug-specific semantics: Post↔Topic/Number/Book/Source connections, list→post→context→return, and shared Research Path behavior. Decision-changing failures descend only to their owning lower seam.
- G4 begins with the **Posts Index + Post Golden** over this semantic shell. Design readiness must never masquerade as experience acceptance.
### Source-world completion timing after the 2026-10-07 corpus census

- **Now / before the Posts Golden is accepted:** close only the selective identity/linkage repairs and exact source/provenance seams actually used by the Golden fixtures. The completed Zvi + Sod Hashmal maps are sufficient to proceed; do **not** deep-map the whole remaining world first.
- **During G4, before the Cross-Surface Skeleton Golden and before any 2029 Public Cutover:** complete the three P0 source-boundary maps discovered by the census: **P0-A Legacy Published Posts family**, **P0-B non-Zvi Channel/WhatsApp source-occurrence + identity**, and **P0-C OpenWeb/community admission boundary**. Required closure is boundary/identity/provenance sufficient to prevent duplicate source authority, false evidence independence and wrong attribution on active Post/Topic/Number/World/Book/Source projections; it is **not** a requirement to deep-extract every legacy item.
- **Before G4 closure:** any P0 corpus materially consumed by a Golden or public cross-surface projection must have owner-first lookup/reconciliation against existing Number/Entity/Convergence/Event/Source identities. An unresolved P0 source-identity/false-independence gap is a G4 blocker and must not be relabeled as G5 entitlement debt.
- **G5+ may carry deferred P1/P2/P3 deep maps and selective admissions** for source works, contributor packs and long-tail references that no closed Golden/public journey depends on. The moment such a corpus becomes an active public/premium capability input, its source/provenance/admission boundary must close **before activation**; entitlement never hides a Truth/Source gap.
- This timing creates no Corpus #3, tree, store or registry. It routes the census result through the existing Research Intake / Truth / Reality Graph owners and preserves One Tree.

- After Posts passes, run one bounded **Cross-Surface Skeleton Golden** over the minimum public slice before cutover — representative path such as Home → World → Topic → Post → Book/Number → exact return. Acceptance must include an exact-return replay after a full page reload, an auth-expiry → sign-in → return transition, and the constrained-mobile / Contextual Inspector bottom-sheet path. Its purpose is to prove shared navigation/context/availability semantics across surfaces, not to require final World/Home artwork.
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

**External challenge + single-operator blind-spot review (standing G4/cutover matrix):** use the existing Redesign-Risk Challenge in `foundation_closure_protocol_law` plus read-only specialist dispatch under `inter_agent_coordination_law`; ZURIEL is never the messenger and no new agent system/registry is created. Review lenses are roles, not new bots: (1) beginner/product comprehension, (2) truth/Reality-Graph integrity, (3) release/SEO/cutover safety, (4) operability/simplification for one human operator, and (5) independent skeptic/unknown-unknown challenge. **Before G4 closure:** prove the Exact Return replay cases above and resolve the live Reality-Graph contract→DB enforcement gap for relation vocabulary/provenance/alias drift through the existing graph owner and Human Gate; stable writer/source binding must be resolved before any Golden materially relies on standing trusted-writer attribution. **Before Public Cutover:** prove parity+rollback/Legacy-retirement evidence, audit the two authorized POST-A pilot redirects before any broader post-URL precedent, challenge Topic↔Number and Home↔World product boundaries, include a Raziel unavailable/unregistered-capability negative test, verify beginner/orientation learnability, and run a bounded operations simplification pass over active functions/jobs/flags. **Later major gates only:** re-check retention/egress proportionality and rerun this matrix; do not create continuous monitoring merely to satisfy the review. Full external CTO A–J reconciliation and explicit do-not-build decisions: `audits/g4-gemini-cto-review/GEMINI_CTO_REVIEW_RECONCILIATION_V1.md`. Detailed evidence stays in work_log/audits and domain owners, not in this Roadmap.

**Security Hardening timing lane:** security is staged, not deferred. During G4 collect journey/RPC evidence and fix confirmed critical exposure immediately; before major 2029 Public Cutover pass the blocking Pre-Cutover Security Gate; G5 adds the Money/Entitlement Security Gate before paid/credit activation; G6 adds the Global Exposure Gate before broad multilingual exposure. Detailed acceptance stays in `docs/2029-security-hardening-gate-plan-v1.md`; security weakening remains Human-Gated.

**Public Beta Evidence / Self-Learning lane:** after required Goldens + the Pre-Cutover Security Gate, use the 2029 Public Cutover as a measured evidence window. Reuse existing Traffic Intelligence / Analytics owners; no second analytics truth store. G5 product allocation and G6 international rollout consume this evidence. Detailed metric identity, windows/cohorts and governed recommendation loop live in `docs/2029-public-beta-evidence-learning-plan-v1.md`.

**2029 Control Plane / Attention readiness lane:** retain shared launch evidence and essential safety/operational readiness through existing owners. Under the 2026-10-09 execution priority, full Control Plane/Admin expansion and its dashboard rollout are deferred; they do not precede public World → Posts → Heichal completion. Existing security/release evidence remains required. Any surface may remain BUILDING, but may not become OPEN/Golden/Public without its applicable launch evidence. Detailed future inheritance/observability plan remains in `docs/2029-control-plane-attention-observability-plan-v1.md` + `docs/2029-implementation-dependency-plan-v1.md`.

External analytics/search/observability providers remain complementary evidence projections. Missing or unconfigured feeds render `UNAVAILABLE/NOT_CONFIGURED`, never synthetic zero; detailed provider/dimension semantics stay outside this Roadmap.

### G5 — Product / Entitlement Matrix

Exact Free / Registered / Premium / Credits allocation after Goldens. Entitlement never changes truth quality.

Deferred P1/P2/P3 corpus deep-mapping may continue in or after G5 when those corpora were not dependencies of closed G4 Goldens/public cutover. P0 source-boundary debt from the G4 source-world timing above is **not** deferrable into G5.

**Security gate:** before any first live paid purchase, credit grant/spend or premium entitlement activation, pass the G5 Money/Entitlement Security Gate from `docs/2029-security-hardening-gate-plan-v1.md`: server-owned amount/package/entitlement truth, authenticated ownership/admin boundaries, webhook verification + idempotency/replay protection, immutable/auditable credit ledger semantics, bounded rate/abuse controls and recovery/failure-path acceptance.

### G6 — English Golden Locale / multilingual projection acceptance

Prove English over the same identities, capability/access state, Research Context, truth/provenance and product surfaces. Then expand the same projection contract to the remaining canonical locales.

Prerequisite: the G4 Journey foundation above, including Number/method selection, ELS exact occurrence, source/gallery return and Raziel continuation, must be accepted in Hebrew first. Translate the experience over those identities; do not create locale-specific paths or replace source-language calculations.

**Security gate:** before broad English/multilingual exposure, pass the G6 Global Exposure Gate from `docs/2029-security-hardening-gate-plan-v1.md`: locale routes preserve the same authorization/side-effect boundaries, public crawler/AI access remains read-only where intended, international abuse/rate patterns are measured, and Turnstile/ASN/datacenter/country controls are added only from evidence rather than by default.

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
- exceptional POST-A pilot redirects for FZ1073/Bennett remain bounded Human-Gate pilots, not general URL precedent; before any broad post-URL migration, complete inbound/SEO/canonical parity evidence under the existing route owner;
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
