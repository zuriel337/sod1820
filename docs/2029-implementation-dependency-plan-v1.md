# SOD1820 — 2029 IMPLEMENTATION DEPENDENCY PLAN v1

**Date:** 2026-09-17  
**Status:** PROGRAM / DEPENDENCY MAP · HUMAN-GATE CONTROLLED · BRANCH-ONLY until merged  
**Scope:** greenfield 2029 tree only. Legacy UI is compatibility/provenance/input where explicitly required; it is not the architecture authority.

> This document is an implementation-navigation plan, not a semantic owner, truth store, product registry or substitute for the active canonical owners. `SOD1820_MASTER_ROADMAP.md` remains the compact program-navigation surface; active laws/contracts remain authoritative for domain semantics.

## 0. North-star rule

Build **bottom-up, one tree**.

`Governance/identity/truth → runtime safety/trace → media/intake → canonical engines → Research OS/context → cross-cutting product rails → 2029 surfaces → ELS Golden → Raziel text/tools → English Golden Locale → premium multimodal/spatial/media → entitlement/business optimization → XR/future projections`

Upper layers consume lower contracts. They do not fork identity, truth, access, research state, telemetry, media identity, entitlement, or engine authority.

A future capability may exist as `BUILDING`, `NEXT`, `LATER` or `PARKED` before runtime implementation. Deferred != deleted. Only explicit Human Gate cancels/retires an approved capability.

---

# 1. Non-negotiable foundations

Before a capability can be called production-ready, it must inherit all relevant rails below.

## 1.1 One identity / one semantic subject

- Stable semantic identity is not URL, language, label, visual placement or route.
- Exact Expression remains distinct from Concept/Anchor and from translated/orthographic representations.
- Guest/account/person identity reconciliation must fail closed and preserve consent boundaries.
- Same capability/entity in every locale; locale changes representation only.

## 1.2 One truth/research boundary

- Deterministic engine facts, interpretation, verification, governance, publication/access and ranking remain distinct.
- UI richness, 3D depth, animation, voice confidence or model confidence never upgrades truth.
- Canonical engines calculate/search; AI plans, interprets, synthesizes and recommends bounded actions.
- Universal Finding / Research Result Bundle is the semantic transport boundary where an adapter exists.

## 1.3 One access tree

Resolve separately:

1. capability availability/building state;
2. identity/role/privacy authorization;
3. entitlement/premium/credits;
4. runtime budget/rate-limit;
5. model/provider routing.

No local `premium=true`, `live=true`, language-specific access flag or UI-only security decision.

## 1.4 One execution trace

Every material interaction gets one root trace. Every engine/model/tool/DB/cache/network/media/background hop is a child span. Parallel engines fan out; synthesis fans in. Retry/continuation/fallback/cancel/timeout remain visible.

Trace must join to user-facing action/Research Context without storing raw private payloads by default.

## 1.5 One media identity

Asset identity is independent from physical path, source platform, post placement, Series, language and derivative.

Preserve original; derivatives/captions/transcodes remain linked representations. Public-approved media and private/unreviewed submission lanes remain separate.

## 1.6 One analytics / attribution tree

Behavior telemetry, operational trace, research provenance and business conversion are different evidence layers, connected by correlation IDs rather than collapsed into one table or truth axis.

Target drill-down:

`campaign/referral/share → arrival/session → surface/action → Research Context → operational trace → engine/tool cost → output use → follow/signup → entitlement/purchase → return/retention`

## 1.7 Compile once → project many

Expensive scans, synthesis, TTS and media generation should run on explicit action/material change/version change, then be reused through versioned projections/cache when appropriate. Public page views must not trigger unbounded heavy research.

---

# 2. Global Definition of Done for every new capability

A capability is not complete merely because the button works. Before production activation, verify the applicable items:

- **Identity:** stable capability/entity/action identity exists.
- **Owner:** canonical owner and dependencies resolved; no parallel owner/system.
- **Availability:** canonical capability state/kill switch connected.
- **Authorization:** RLS/server permission/privacy boundary verified.
- **Entitlement:** server-side entitlement path exists if gated; client does not decide paid access.
- **Budget:** bounded time/calls/search-space/tokens/audio/media/storage; cancel + timeout supported.
- **Trace:** root trace/span propagation; provider/model/tool/version/outcome/cost visible.
- **Telemetry:** meaningful user action tracked with stable surface/capability/entity/action vocabulary.
- **Research Context:** entity-bearing actions preserve/restore relevant context and exact return.
- **Failure:** explicit error/partial/negative/cache/fallback states; no silent false success.
- **Replay:** enough version/parameter/source provenance to reproduce evidential results where required.
- **Cache/versioning:** cache identity and invalidation dimensions defined where output is reusable.
- **Privacy/data lifecycle:** retention, redaction, deletion/erasure and private/public boundary defined.
- **Media:** canonical asset reference used; no ad-hoc path identity when media is involved.
- **Share:** canonical share representation/intention available where the capability is shareable.
- **SEO/indexability:** explicit canonical/index/noindex/sitemap decision for public addressable surfaces.
- **Localization:** copy/representation locale-ready; no locale fork of product state.
- **Accessibility:** keyboard/focus/captions/transcript/reduced-motion/mobile behavior where relevant.
- **Security/abuse:** rate limit / prompt-untrusted-input / upload validation / anti-replay / side-effect gate where relevant.
- **Observability:** SLO/error/cost/latency metrics measurable; alert threshold can be added without redesign.
- **Release:** isolated acceptance, rollback/recovery path, Human Gate if required.

---

# 3. Phase order — implementation dependency spine

## PHASE 0 — Legacy separation + authority map

**Goal:** ensure the new tree never silently depends on old UI authority.

Required:

- classify legacy UI/runtime as `KEEP_SOURCE`, `ADAPTER`, `COMPATIBILITY`, `ABSORB_THEN_ARCHIVE`, `RETIRED` or `PROTOTYPE_REFERENCE`;
- server/canonical engine authority must be explicit for Gematria, ELS, Sources, Research OS, Identity and Access;
- old client calculators/3D/iframe/browser workers cannot become authority merely because they still run;
- **Legacy Experience ≠ Capability ≠ Data ≠ Writer.** Route/UI retirement is not permission to disable a source, canonical capability or data owner; each writer is cut over independently;
- maintain a live writer-level shutdown matrix: current owner/source → writer(s) → current readers → 2029 consumer → replacement proof → post-gate action. Source/ingress may remain live while synthetic Legacy fan-out writers freeze;
- destructive cleanup stays under the existing Research Intake retention protocol: `admin_retention_preview()` / dry-run + dependency/provenance proof first; do not create a second retention/cleanup system;
- final G3 compaction later retires replaced prototypes/writers only after verified replacements and live-consumer proof exist; major Legacy→2029 cutover remains Human-Gated.

Current relevant work:

- PR #478 — early 2029 legacy/runtime separation baseline: useful architecture baseline; branch-only.
- PR #483 — Gematria authority isolation: blocks local legacy calculator authority from 2029 dependency graph; stacked and must be reconciled with its base before release.

**Exit gate:** every new 2029 runtime dependency can identify its canonical owner/adapter; no feature is forced to import Legacy UI for truth.

---

## PHASE 1 — Identity, auth, privacy, consent

**Goal:** establish who is acting and what they are authorized/consented to do before adding premium/private/proactive capability.

Build/verify:

- visitor → account → Person/authorized context mapping;
- principal-bound Research state;
- group/public/private/channel privacy boundaries;
- Follow intent separate from notification-channel consent;
- guest→account reconciliation without stealing anonymous state;
- private data never enters shared/canonical graph by default;
- account deletion/erasure/export requirements identified before private corpus/voice history grows.

Current relevant work:

- PR #479 — principal-bound Research OS sync/persistence.
- PR #482 — release composition for Research Sync; stacked/integration package.
- PR #486 — Follow identity one-tree seam; security/concurrency acceptance already strong, still branch-only.

**Exit gate:** authenticated and guest behavior can be isolated, resumed and reconciled without identity forks or consent leakage.

---

## PHASE 2 — Runtime control plane / No Black Box

**Goal:** make the future large system controllable before it becomes large.

Build:

- Experience Context / capability projection resolver;
- server-authoritative availability + entitlement + budget gate;
- one root trace + hierarchical spans;
- shared correlation envelope across browser/server/Edge/planner/engine/tool/media;
- resource metering: text/cached/reasoning/audio tokens, session seconds, TTS/STT, image/video units, API/tool/DB/RPC calls, rows/search-space, storage/index/network bytes, GPU/latency, retry/continuation;
- provider/model/engine/tool/prompt/config version provenance;
- provider-native price + effective pricing + FX snapshot + ILS exact/estimated/unknown;
- output-use (`used/partial/rejected/superseded`) for multi-engine workflows;
- timeout/cancel/retry/idempotency/circuit-breaker semantics;
- per-capability/user/session/background budgets;
- provider failover without identity/truth changes;
- feature-level kill switches;
- privacy-safe trace references/hashes instead of blind raw payload logging;
- cost/latency/error SLO and alert surfaces.

Current relevant work:

- PR #494 — Experience Context + Capability contract + No-Black-Box contract/acceptance.
- existing AI cost path (`ai_token_log → agent_token_costs → admin_ai_tokens`) remains input/history, not replaced.

Three-engine Golden requirement:

`root interaction → router/plan → engine A + engine B + engine C → optional tools → synthesis → response`

Must display each engine cost/latency/result-use independently and exact root roll-up without double counting.

**Exit gate:** aggregate ₪/usage can drill to root trace and individual hop; no expensive capability can execute before server gate.

---

## PHASE 3 — Event-driven jobs / background execution

**Goal:** support long-running research, media generation, Pulse and agent work without polling/manual orchestration.

Build/verify:

- assignment/job identity;
- lease/claim, duplicate suppression, retry, timeout, cancel/defer;
- stale lease recovery;
- bounded concurrency and one-active-writer where required;
- trace_id propagation into background work;
- result wake/completion correlation;
- jobs are execution, never truth authority;
- Human Gate remains required for merge/publish/canonicalize/high-risk write.

This phase is required before Research Room, Research-to-Media and proactive Pulse become production runtime.

**Exit gate:** background job can be stopped/retried/replayed and tied to the originating user/research/trace without duplicating side effects.

---

## PHASE 4 — Media / Universal Intake / Asset pipeline

**Goal:** one path for future image, audio, video, document, transcript and generated media.

Build/verify:

- canonical public asset path convention;
- private submission inbox;
- immutable original + derivative roles under the same asset identity: thumbnail, preview, full representation, video poster, OG/share, caption and transcode as applicable;
- derivatives are bounded background/ingest or material-change work, not hidden page-view work; a card/list must not fetch an original merely because a suitable derivative is missing, and client-side hidden video/image preload must not become the derivative-generation path;
- source platform/provenance independent from storage identity;
- MIME/magic/hash/size validation;
- least-privilege ticket/upload path;
- private storage/RLS/retention/erasure;
- large-file/resumable transport path before large video;
- canonical artifact reference returned to Research Intake/Posts/Brand/Share rather than raw path assumptions;
- OCR/STT/extraction remain representations/extractions, not truth;
- immutable/versioned public derivatives use cache semantics appropriate to their identity; replacement/invalidation never silently changes asset identity;
- Storage/CDN egress is observable operational cost, not truth: preserve bytes/cache hit-miss/top-object attribution where measurable; provider-exact usage is `EXACT`, internal estimation is `ESTIMATED`, unavailable provider usage is `UNKNOWN` — never invented as zero;
- Control Plane drill-down must be able to surface storage size, large objects, missing/oversized derivatives, original-as-thumbnail defects, hottest assets when provider logs permit it, processing failures and provider quota state;
- media retention/cleanup consumes the existing `admin_retention_preview()` / Research Intake v11 dry-run boundary rather than a Media Cleanup store;
- media processing spans join No-Black-Box trace.

Current relevant work:

- PR #495 — 2029 one-tree media + private submission inbox; branch-only.
- PR #485 — media/OCR admission boundary; semantic admission adapter.
- PR #464 — Universal Intake transport; older branch, reconcile/absorb rather than independently ship if superseded by newer intake work.

**Exit gate:** same uploaded/generated artifact can safely become Post media, Research evidence representation, Share media, TTS/audio asset or future 3D texture without changing identity.

---

## PHASE 5 — Canonical engine layer

**Goal:** every major research capability has one authoritative callable boundary independent of UI.

### 5A Gematria

- canonical method registry/state;
- deterministic server calculation/trace;
- exact Expression identity;
- no local UI calculator authority;
- method/version/operand provenance;
- future language methods attach through same registry/governance.

Current: PR #483 supports authority isolation; release integration must reconcile its stacked base.

### 5B Corpus / Books / Sources

- stable source/work/edition/witness identity;
- exact source-language witness;
- locator/revision/current-render distinction;
- extraction lineage;
- source gap can remain explicit, never fabricated.

### 5C ELS

- one callable/versioned server core;
- canonical corpus/witness + coordinate convention;
- bounded search space and continuation;
- replay/verification and negative/truncated/context-required outcomes;
- geometry is projection of verified occurrence, not engine authority;
- temporary browser/iframe/worker compatibility retired only after parity/cutover proof.

Current relevant work:

- PR #480 — callable canonical ELS core + Research OS adapter.
- PR #484 — stacked ELS core compatibility/replay/geometry extension.

**Exit gate:** World/Heichal/Raziel/ELS UI can call canonical adapters without rebuilding calculation/search truth locally.

---

## PHASE 6 — Research OS / Context Compiler / persistence

**Goal:** all engines plug into one resumable research identity.

Build/verify:

- Research Plan: capability, strategy, anchors, tools/sources, check order, intelligence target, budget, escalation and stop condition;
- bounded Context Compiler;
- Result Bundle/Universal Finding adapters;
- negative/missing/access-filtered/partial outcomes preserved;
- evidence dependency/independence before ranking;
- temporal provenance and replay;
- Research Context exact return;
- principal-bound persistence/sync/recovery;
- open research questions remain resumable objects/state;
- no transcript-only continuity dependency.

Current relevant work:

- PR #479/#482 Research Sync.
- PR #489 roadmap research-trust/external-partner-source material is planning evidence; reconcile into current compact roadmap/owners rather than create a parallel roadmap line.

**Exit gate:** switch surface/channel/model without losing the active research subject, evidence lineage or authorized state.

---

## PHASE 7 — Cross-cutting product rails

These must be in place before broad surface multiplication or English/media scale.

### 7A Analytics correlation rail

Create/normalize a shared event envelope using existing telemetry owners, conceptually including:

- surface;
- capability/action;
- semantic entity/subject reference;
- Research Context/run reference;
- trace_id / interaction_id when expensive execution occurs;
- locale;
- source/attribution/referral/campaign evidence;
- access/entitlement projection state where appropriate;
- outcome/failure/fallback;
- privacy-safe user/visitor reference.

User telemetry != operational trace != research truth, but they must correlate.

Target business answer:

`where user came from → what they opened → what research/AI ran → exact cost → whether output helped → whether they saved/followed/shared/signed up/paid/returned`.

### 7B Share / propagation rail

Before broad 2029 share UI, define one typed Share Object / Intent over existing share owners:

- canonical entity/content identity;
- destination/canonical URL;
- source surface;
- subtype (`share`, `share_story`, future bounded variants);
- channel/platform;
- modality: link/card/image/video/spatial-state/journey-point/research-finding;
- locale/source-language representation;
- exact-state/deep-link reference when safe/addressable;
- media reference;
- attribution parameters (`rid/src/...`);
- arrival_possible vs external/raw-asset share;
- emitted canonical event.

Content identity != landing identity != share action != arrival != conversion != reward.

Current 2029 Frame sharing is functional but simple; do not clone that minimal pattern across every surface before this rail is finalized.

### 7C Follow / Attention / Notifications rail

- Follow intent one tree;
- email/push/other channel consent separate;
- user notifications as projection, not truth;
- unsubscribe/mute/preferences consistent;
- future Pulse consumes Follow/Research state rather than creating a second subscription engine;
- proactive notification obeys Silence Gate.

Current: PR #486 is the key foundation candidate.

### 7D SEO / canonical publishing rail

Before English Golden Locale and mass entity surfaces:

- canonical URL identity;
- index/noindex policy;
- sitemap admission;
- OG/share representation;
- locale/hreflang projection only where real localized content exists;
- deep temporary Research state does not automatically become indexable URL identity;
- crawler/bot behavior cannot create user-side effects;
- invalid address space has explicit behavior rather than infinite thin pages.

Existing `applySeo` / OG/card / observability gate remain owners/primitives; do not build SEO v2 in parallel.

### 7E Cache / projection version rail

For reusable expensive outputs define:

- canonical input/source identity;
- owner/engine/method/model/prompt/config version dimensions;
- locale/representation dimensions only when output actually differs;
- cache hit provenance;
- invalidation on material source/method/version change;
- stale/partial/failure behavior;
- public projections consume snapshots/results, never make cache authority.

### 7F Security / abuse / side-effect rail

- request/user/capability rate limits;
- server-side expensive-I/O budget gate;
- upload validation + anti-replay;
- prompt injection/untrusted external source boundary;
- webhook signature/idempotency;
- bot/crawler read-only side-effect gate;
- provider circuit breakers;
- service-role secrets never exposed to client;
- RLS and least privilege verified in isolated acceptance.

### 7G Recovery / operations rail + Internal Control Plane

The internal 2029 Control Plane is an **Experience projection over existing owners**, not a new Operations/Health/Media/Communications store or truth system. It replaces Legacy admin presentation over time; it does not inherit Legacy information architecture by default.

- forward migration + rollback/recovery plan;
- backup/restore verification for critical state;
- environment/config/secrets ownership;
- production drift detection;
- release state visible as branch/merged/deployed/live/verified, never inferred from commit alone;
- admin-only/server-authorized roll-up + drill-down across owner-native health/status surfaces: Attention/Human Gate, Research governance, Content/Publishing, Media/Sources, People/Identity, Communications, Growth/Traffic, Operations/Cost/Security and Release/Roadmap;
- owner-native operational state remains authoritative (`cron`, queue/outbox, delivery, AI-cost, traffic, security, retention, media, release); Control Plane composes it and links back to the underlying evidence rather than copying domain semantics;
- reuse existing operational projections such as `admin_retention_preview()` and future bounded admin health projections; no duplicate retention/health ledger;
- automated alerts terminate in the canonical `notify_admin` path; UI attention is a projection of the same owner facts, not an independent alert system;
- exact/estimated/unknown measurement state stays explicit for external-provider usage (Supabase/Vercel/AI/media providers);
- Legacy WarRoom/CommandCenter/SystemSuggestions presentation is reference/compatibility only; replacement preserves useful capability, not old component ownership.

**Exit gate for Phase 7:** a new surface can inherit Share, Analytics, SEO, Follow, Cache, Security and Trace without page-local reinvention.

---

## PHASE 8 — Native 2029 System Frame + core surfaces

**Goal:** build semantic homes on top of the completed rails.

Homes:

- Home / Global Now;
- World;
- Heichal;
- Number / Expression;
- Books / Sources;
- ELS;
- Journey;
- Posts / Updates;
- Workspace / Personal Area;
- Internal Control Plane / Admin (non-public Human-Gate + operations home).

Global capabilities:

- Command/Resolve/Search;
- Raziel;
- Share;
- Follow/Attention;
- Add to Research / Save;
- Inspect/Trace/Explain-Why;
- future Listen / Spatial / Brief / Media / Private Corpus / Pulse slots.

Rules:

- surfaces consume Context/Research/Access/Share/Analytics rails;
- Internal Control Plane consumes owner-native operational projections and admin-only actions; it never becomes the owner of research truth, media identity, delivery state, traffic truth, security truth or cost truth;
- no Legacy WarRoom/CommandCenter layout inheritance obligation; only current capabilities/owners survive;
- no local truth/access/palette/action identity;
- same semantic action may have contextual copy;
- exact return preserves research state.

Current:

- native System Frame + baseline World is already released/live.
- PR #492 is the current richer World iteration candidate.
- PR #476 is an older World Golden branch; treat as prototype/reference or reconcile into #492, not as an independent release line.

**Exit gate:** one coherent shell/surface model, no Legacy fallback required for core 2029 interaction, and an internal 2029 Control Plane can answer what needs Human/operational attention with drill-down to the existing owner evidence instead of requiring Legacy Admin.

---

## PHASE 9 — ELS Golden Experience first

ELS is an early differentiating Golden because it exercises almost every lower layer.

Order:

1. canonical server ELS result;
2. ELS native 2029 surface;
3. source/replay/coordinates/Trace;
4. Research Context integration;
5. layered 2D/2.5D representation;
6. meaningful spatial/3D projection;
7. Raziel contextual text inside ELS;
8. `Explain what I am looking at` using current occurrence/selection/camera/context;
9. guided spoken ELS;
10. Research Dossier / Research-to-Media reuse later.

3D is renderer/projection. It never owns ELS search truth.

Historical PR #381 is a spatial mockup/reference, not canonical 2029 runtime authority.

**Exit gate:** a real ELS research session can be replayed, explained, shared, measured and resumed without browser-only engine truth.

---

## PHASE 10 — Raziel text + tools

Before live voice:

- one Raziel identity/personality;
- reads current Research Context and surface/selection;
- capability-aware Research Plan;
- bounded tool execution;
- adaptive intelligence L0–L5 / minimum sufficient intelligence;
- cross-check when justified, not automatically;
- Explain-Why: why this capability/model/tool now;
- full execution/cost trace;
- graceful text fallback;
- memory/continuity from governed Research state, not transcript illusion;
- proactive silence by default unless material change.

**Exit gate:** Raziel can correctly operate in ELS/World/Heichal/Post/Journey in text and tools before microphone complexity is introduced.

---

## PHASE 11 — G4 Golden Experiences

Run real/replayable acceptance journeys, not simulated UI demos.

Minimum Golden set should cover:

- rich/medium/sparse World anchor;
- Number/Expression exact calculation + source/research deepening;
- Books/Source witness + extraction/revision provenance;
- ELS positive, negative, truncated, coordinate mismatch/replay;
- Research save/sync/logout/login/recovery/conflict;
- Follow guest→account + explicit channel consent;
- three-engine parallel synthesis with one rejected output;
- cache hit + version invalidation;
- provider error/fallback;
- private input redaction/authorization;
- Share→arrival attribution;
- exact-return Journey;
- system outage/fail-closed path.

G3/G4 acceptance should produce reusable fixtures for future English/Voice/3D tests.

---

## PHASE 12 — G5 Product / Entitlement Matrix

Only after capability behavior and cost are measurable:

- Free / Registered / Premium / Credits allocation;
- monthly allowances/minutes/credits;
- overage/top-up policy;
- free previews/trials;
- per-capability cost envelope and margin model;
- entitlement changes richness/volume/access, never truth quality;
- exact prices remain business config/Human Gate, not UI code.

Business dashboard should eventually expose:

- usage and cost per capability;
- cost per successful research outcome;
- cost per active user/subscriber;
- conversion by source/surface/capability;
- gross margin by plan/capability;
- retention correlated with meaningful research actions, not vanity engagement only.

---

## PHASE 13 — English Golden Locale

Localization architecture is required from Phase 0–7; public English rollout happens here.

Order:

`Hebrew canonical source → English Golden Locale → parity acceptance → other locales`

Prove English across the same:

- semantic identity;
- access/entitlement;
- Research Context;
- Share Object;
- analytics/attribution;
- SEO/canonical/hreflang;
- Raziel personality/depth;
- Truth/Trace;
- public actions/statuses.

Exact language-specific Expressions retain their own calculations/provenance; translation never inherits numeric result.

Then expand to canonical locale set (`ar/es/fr/ru/pt/de`) without new product trees.

**Reason for this order:** translating stable semantic contracts is cheap; translating a moving architecture creates duplicated debt.

---

## PHASE 14 — Voice / Audio / Private Research premium layer

Activate capabilities selectively after text/context/identity/trace/entitlement are proven.

### Post Listen

- authored post → TTS generation once → cached audio asset;
- transcript/source text linked;
- playback does not invoke fresh AI generation;
- locale/voice/version provenance.

### Research Audio Brief

- bounded synthesis → speech generation → reusable asset when stable;
- trace separates reasoning from speech generation/delivery.

### Raziel Push-to-Talk

- explicit microphone opt-in;
- STT/transcript + same Raziel text/tool path;
- lower complexity than full duplex; recommended first live voice step.

### Raziel full live voice

- interruptible session;
- audio/session metering;
- tool calls remain governed;
- deeper reasoning can escalate behind conversational path;
- transcript/captions when technically practical;
- session failure preserves Research Context.

### Private Research Corpus

- private uploads/media/text;
- indexing/storage/retention/erasure;
- authorization before retrieval;
- private source never promoted/shared automatically;
- public canonical source results and private personal evidence remain separable.

---

## PHASE 15 — High-end Spatial / 3D

Build maximum capability below, selective activation above.

Spatial ladder:

`S0 static → S1 micro-light → S2 layered depth → S3 Canvas/2.5D → S4 GPU 3D → S5 XR`

Use true 3D when geometry/data/path/camera genuinely communicates structure.

Requirements:

- canonical entities/findings/ELS occurrences drive geometry;
- view state separated from truth;
- reduced-motion/low-power/mobile fallback preserves meaning;
- GPU/asset/network cost visible in trace/performance telemetry;
- exact crown/wordmark assets protected;
- approved faithful spatial derivative required for true crown mesh/extrusion;
- spatial state can be shared/replayed when semantically meaningful.

---

## PHASE 16 — Research Room / Dossier / Research-to-Media

### Research Room

Long-running bounded project over the same Research OS:

- goal/questions;
- active anchors;
- executed/negative/missing results;
- sources;
- next actions;
- budgets/jobs;
- Human decisions;
- resumable state.

### Research Dossier

Exportable structured research record:

- methods/results;
- facts vs interpretations;
- sources/locators;
- Trace/Explain-Why;
- negative/contradictory outcomes;
- media/spatial snapshots;
- version/provenance;
- optional narration/video derivative.

### Research-to-Media

Same Research Context → Post / Share Card / Reel / narrated video / Remotion export.

AI generates scenes/derivatives; canonical brand assets are composited through Brand Core. Media output never becomes independent research evidence merely because it is another representation.

---

## PHASE 17 — Research Pulse + cross-channel continuity

Only after background jobs, identity/consent, trace, Follow/Attention and Silence Gate are real.

Research Pulse may surface only decision-changing change:

- new independent source/evidence;
- contradiction/resolution;
- engine/method replay change;
- meaningful Research Finding connected to followed/saved inquiry;
- source gap resolved;
- important downgrade/correction.

No material change → no interruption.

Cross-channel Raziel uses same research identity and privacy boundary. Channel changes available actions/consent, not personality/truth.

---

## PHASE 18 — XR / AR / future renderers

XR is a projection of the same anchors, Research Context, spatial semantics, media identity and Raziel. No XR truth store or separate research graph.

Only start after S4 spatial Golden and accessibility/performance/fallback are mature.

---

# 4. Existing open PR dependency map — recommended reconciliation order

This is a planning map, not release authorization.

## Foundation candidates first

1. **#494 Experience Context + capability + No-Black-Box** — foundational runtime contract. Review/reconcile first because many later surfaces should consume it.
2. **#495 media one-tree + private inbox** — foundation for future files/audio/video/private corpus. Can progress in parallel with #494 but must be reconciled against latest main before release.
3. **#486 Follow identity seam** — identity/consent/Attention prerequisite for Pulse/cross-channel and clean registration funnel.
4. **#479/#482 Research Sync stack** — principal-bound resumable personal research. Reconcile stacked package; do not ship dependent UI before DB/client choreography is closed.
5. **#483 Gematria authority isolation** — stacked on #482; reconcile/compose after base path is resolved rather than merge as an orphaned stack.
6. **#480/#484 ELS core stack** — canonical callable ELS + replay/geometry; release as one coherent ELS foundation package after main reconciliation.
7. **#485 Media/OCR admission** — compose with #495/Research Intake so storage/transport and semantic admission are one tree, not two disconnected media tracks.

## Surfaces after foundations

8. **#492 World real live calibration** — rebase/reconcile after required foundation seams; do not let World invent local alternatives to new Context/Share/Trace rails.

## Planning/prototype branches

- **#489** — useful roadmap/research-trust planning; absorb relevant decisions into current Roadmap/owners rather than maintain a second roadmap branch indefinitely.
- **#476** — older World Golden; PARK/close after confirming #492 contains the desired material. Do not release both.
- **#381** — 3D spatial mockup; preserve as prototype/reference, not runtime authority.
- **#464** — older Universal Intake transport; reconcile into current intake/media stack and retire duplicate branch if superseded.
- **#410/#383** — older brand/theme branches must be reconciled against current Brand Core/Design owners before any use; do not merge stale visual governance blindly.
- **#460** — temporary countdown bridge is independent release work; it must not become 2029 architecture authority.

---

# 5. Parallel work lanes that are safe

Parallelism is allowed when ownership/write scope does not overlap.

Recommended lanes:

- **Lane A — Runtime/Trace:** #494 + physical trace persistence/correlation later.
- **Lane B — Media/Intake:** #495 + #485 reconciliation.
- **Lane C — Identity/Follow:** #486.
- **Lane D — Research persistence:** #479/#482.
- **Lane E — Engines:** Gematria #483 and ELS #480/#484, with shared-file coordination where stacked dependencies exist.
- **Lane F — Surface design:** #492 only after consuming released/stable foundations; no parallel World branches.

Every lane uses one active writer per overlapping scope, current-main reconciliation before release, and Human Gate for merge/deploy where required.

---

# 6. What must happen before English

Must be architecturally stable before English Golden Locale:

- semantic identity/action vocabulary;
- Research Context/Result Bundle;
- Access/Entitlement/Availability separation;
- Identity/privacy/consent;
- Share Object + attribution;
- Analytics correlation envelope;
- canonical URLs/indexability/SEO rail;
- media asset identity;
- canonical Gematria/ELS callable boundaries;
- Raziel text/tool identity and voice personality contract;
- No-Black-Box trace/cost;
- cache/versioning rules;
- System Frame/core surface semantics.

Does **not** need to be fully activated before English:

- full live voice;
- high-end 3D;
- Research-to-Media;
- Pulse;
- XR;
- final premium prices.

Their hooks/contracts should already exist so English does not require redesign later.

---

# 7. What must happen before Voice

- Raziel text/tools Golden;
- identity/privacy/consent;
- server entitlement/budget gate;
- trace + audio resource metering;
- transcript/caption representation contract;
- media/audio asset path;
- cancel/timeout/provider failover;
- rate limits;
- locale voice profile/prosody rules;
- text fallback preserving Research Context.

Start with Push-to-Talk before full-duplex live voice.

---

# 8. What must happen before premium/private corpus

- principal identity + entitlement;
- private bucket/RLS;
- retention/deletion/export policy;
- file/media intake validation;
- indexing provenance/cost;
- private/public evidence separation;
- audit/trace;
- account recovery/ownership safety;
- consent around cross-channel/background use.

---

# 9. What must happen before Research Pulse

- Follow/Attention truth;
- notification consent/delivery projection;
- background job runtime;
- authorized longitudinal Research Context;
- material-change detector;
- dependency/evidence-aware self-audit;
- Silence Gate;
- dedupe/cooldown;
- cost/background budget;
- Why-Now trace;
- mute/pause/disable controls.

---

# 10. What must happen before 3D/XR

- canonical 2D semantic representation first;
- ELS/Graph/Research outputs stable;
- spatial projection semantics;
- renderer-independent Experience Context;
- performance capability detection;
- reduced-motion/low-power/mobile fallback;
- asset/texture identity;
- safe area/brand protection;
- share/replay state if spatial selection is meaningful;
- trace GPU/network/asset load where material.

XR waits for proven S4 3D Golden; it is never a prerequisite for core research.

---

# 11. Business optimization built into the architecture

Do not add a separate “business brain.” Use the same correlation rails to derive:

- acquisition source/campaign → meaningful research action;
- conversion to registration/follow/subscription;
- cost per capability/use/user/subscriber;
- engine/provider cost split;
- abandoned expensive actions;
- cache savings;
- feature adoption vs retention;
- free→premium trigger paths;
- share/referral downstream value;
- per-plan gross margin once G5 pricing exists;
- churn/retention correlated with research value, not mere page views.

Important: analytics classification and business value never alter research truth.

---

# 12. System health / operational dashboard requirements

Admin should eventually be able to answer without querying raw tables manually:

- what is live/building/parked;
- current versions/providers/models/engines;
- error/timeout/retry rates;
- latency percentiles;
- cache hit rate;
- cost ₪ by capability/provider/model/surface/user class;
- unpriced/unknown-cost calls;
- top expensive traces;
- background queue/jobs and stalled work;
- storage/egress/index growth;
- entitlement denials/budget exhaustion;
- provider outage/failover state;
- DB/RPC/Edge/Vercel health;
- release version/drift;
- conversion/retention summary;
- privacy/security anomaly alerts.

This dashboard is a projection over existing telemetry/trace/traffic/system owners, not a new truth store.

---

# 13. Release strategy

Do not release by “feature excitement.” Release by dependency batch.

Recommended batches:

### Batch F0 — Foundation contracts

Experience Context, Trace contract/acceptance, capability seams; no user-facing activation required.

### Batch F1 — Identity/persistence/media seams

Research Sync, Follow identity, Media one-tree/admission, server gates.

### Batch F2 — Canonical engines

Gematria authority cleanup + ELS callable/replay package + source adapters.

### Batch F3 — Cross-cutting rails

Analytics correlation, Share 2029, SEO/canonical publishing, cache/versioning, notification projection, abuse/circuit breakers.

### Batch P1 — Core surfaces

System Frame/Home/World/Heichal/Number/Books/ELS/Journey/Post/Workspace consuming the rails.

### Batch P2 — ELS + Raziel text Golden

Real research workflows, not demos.

### Batch P3 — English Golden Locale

Same system, second language.

### Batch P4 — Premium multimodal

Listen, audio brief, Push-to-Talk, Live Voice, Private Corpus.

### Batch P5 — Spatial/media intelligence

High-end 3D, Research Room/Dossier/Media, Pulse/Cross-channel.

### Batch P6 — XR/future projections

After spatial maturity.

Each batch requires current-main reconciliation, CI/Golden acceptance, release-state evidence and Human Gate where applicable.

---

# 14. Program completion criteria

The 2029 foundation is “ready for open-ended growth” when all are true:

1. a new capability can plug in through an owner-qualified adapter without adding a new truth/access/research system;
2. a new surface can consume identity/access/research/share/analytics/SEO/cache/trace rails without custom local replacements;
3. a new language can project the same capability/entity/action without duplicate state;
4. a new model/provider can be routed/fail over without changing product identity or truth semantics;
5. three+ engines can collaborate under one Research Plan and one trace with exact cost/use attribution;
6. private/public data boundaries survive cross-surface/channel work;
7. expensive results can be cached/reused/version-invalidated honestly;
8. a user can leave/return/change channel without losing authorized Research state;
9. every capability can be disabled/parked without deleting identity/history;
10. operational/business dashboards can explain usage, cost, failures and downstream value;
11. no legacy UI/runtime is required as authority for a core 2029 capability;
12. release/rollback/recovery are verified rather than inferred.

Literal “100% future-proof” cannot be guaranteed because unknown future capabilities will exist. The architectural target is instead: **unknown future capability can attach without redesigning the tree.**
