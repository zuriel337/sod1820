# SOD1820 — 2029 IMPLEMENTATION DEPENDENCY PLAN v1

**Date:** 2026-09-17 · execution reconciliation 2026-10-09
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

- **PR #499 — RELEASED** one-tree media intake + private submission inbox + resumable TUS upload + contribution media binding/moderation; this is the released continuation of the #495 media foundation package.
- **PR #511 — RELEASED** native World 2029 media projection over existing Gallery/Reality Graph records; public World gate is `gallery_images.published=1` + not curator-hidden.
- PR #485 — media/OCR admission boundary; semantic admission adapter.
- PR #464 — Universal Intake transport; older branch, reconcile/absorb rather than independently ship if superseded by newer intake work.
- Delivery/performance implementation map: `docs/2029-media-performance-delivery-map-v1.md`. It records the Legacy resize/thumb/video lessons, bounded derivative ladder, poster/transcode rules, egress/Control Plane metrics and retirement gates without creating a new Media owner.

**Exit gate:** same uploaded/generated artifact can safely become Post media, Research evidence representation, Share media, TTS/audio asset or future 3D texture without changing identity, and every public surface can request the smallest sufficient bounded representation without page-view media processing or unintended raw-video/original fetch.

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

**Public Beta evidence-learning extension:** detailed execution map: `docs/2029-public-beta-evidence-learning-plan-v1.md`.

The Analytics rail must preserve metric identity rather than collapse everything into one “users” number:

- Edge request classes: `browser / goodbot / ai / bad-bot` remain request-level evidence;
- first-party sessions: `human-like / suspected automation / unknown` remain session-level evidence;
- JS/quarantine proof is never Human proof;
- bot-filtered first-party product metrics and raw Edge/crawl demand are shown side-by-side, never added together;
- every metric is queryable by exact time axis: 5m/1h for operations, calendar day/week/month/year, rolling 7/30/90d, cohort windows and exact release-SHA before/after windows;
- shared dimensions should include surface, route/entity, capability/action, acquisition/referrer, country, device, locale, auth/access state, experiment and traffic class where available;
- all primary 2029 surfaces (Home, World, Topic, Post, Book/Source, Number, ELS, Journey, Community/Workspace and Raziel/tool execution) project into the same correlation rail rather than creating page-local counters;
- Legacy traffic/search behavior remains baseline evidence and may inform 2029 priorities, but Legacy metric identity is not silently reinterpreted as 2029 telemetry;
- raw behavioral detail stays bounded by current retention; long-term rollups preserve trend comparability.

The system may generate owner-routed product recommendations from evidence, but analytics is never self-authorizing. The allowed loop is `observe → aggregate → compare → recommend → Human Gate/owner decision → bounded change/experiment → measure → keep/revert`. No autonomous security, pricing, entitlement, canonical-truth or publication mutation is authorized by this rail.

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


#### 7D.1 World / Convergence Search + AI Discovery migration

Detailed execution map: `docs/2029-world-convergence-seo-ai-discovery-plan-v1.md`.

Current LIVE state:
- PR #553: World Discovery entrance + canonical `התכנסות/התכנסויות` presentation released.
- PR #555 historically retired `/beit-midrash` into `/world`, but this was **superseded by Human Gate**: `/beit-midrash` and its method routes remain independently addressable; World remains independent. Calculator intents remain preserved through the canonical calculator path.
- `/topic/:slug` remains the canonical public Convergence identity and was not migrated.

NOW:
1. **DONE / clarified:** `lock_convergence_tree` governs the retired legacy `/numbers` tree, not canonical `/topic/:slug`; do not remove Topic URLs from sitemap based on that flag.
2. **DONE / census baseline:** 205 public Topics; 0 missing titles; 0 missing numbers; 0 duplicate normalized titles; 172 missing subtitles; 199 carry object-shaped authored findings; 198 caveats; 187 hints; 100 phrase/source-rich; 16 with images.
3. define/test Search admission without conflating public/approved/truth/indexable; subtitle/image absence alone is not a thin-page verdict because authored content lives mainly in `findings`.
4. **DONE / LIVE:** native 2029 `/topic/:slug` on the same canonical URL (PR #557).
5. **FOUNDATION LIVE:** canonical/meta/sitemap/OG/WebPage+Breadcrumb structured-data/internal-link parity is in native Topic 2029; continue measured Search/AI quality verification before any indexability change.
6. expose AI-readable provenance/truth distinctions from the same public owner-backed content, not AI-only pages/stores.

#### 7D.2 Unified Video + Search Discovery 2029

**Scope: greenfield 2029 product tree only.** Legacy routes/data may feed the projection for provenance/compatibility, but they are not target product identities.

Canonical pipeline:

`source / media asset → canonical projection → 2029 product route → indexability verdict → server/crawler metadata → sitemap admission → crawler access → GSC verification`

Required routing identity:
- post-owned media → `/post/:slug`;
- media without a richer 2029 owner → `/video/:assetId`;
- convergence → `/topic/:slug`;
- Number 2029 → `/2029/number/:value`;
- Books/Sources → `/book/:slug`;
- ELS context remains under `/els`.

Rules:
- Legacy root-slug / Legacy video surfaces are source/adapter/provenance only; do not spend G3 on visual/SEO parity there.
- one immutable media identity may have many placements but one primary Google landing page;
- sitemap/indexability/server metadata must converge on the same 2029 URL identity;
- a generic video page is indexable only after grounded metadata is ready;
- Googlebot/Bingbot receive server metadata for 2029 `/post` and `/video` routes before hydration;
- public/index-worthy 2029 URLs must remain reachable to public goodbots under the existing edge policy;
- GSC is verification/feedback, never a canonical owner;
- true HTTP status semantics (200 current · 301 replaced · 404 nonexistent) belong at the 2029 routing/server boundary, not inside CN/SG quarantine middleware.

**RELEASED · DEPLOYED · LIVE:** PR #779 established Unified Video Projection + Search indexability baseline; PR #782 completed the 2029-only route/crawler cutover. Unified video now runs through `App2029`, post/video primary landing identities converge on `/post/:slug` or `/video/:assetId`, and Googlebot/Bingbot receive server metadata before hydration. Legacy remains source/compatibility/provenance only.

**Residual before G4 closure:** owner-specific route-legitimacy checks for false dynamic Topic/Book/Number entities, GSC recrawl/validation, and unrelated 2029 CLS/reliability blockers continue under their owners; they are not reasons to restore Legacy parity.

LATER:
- bounded public machine projection only after native Topic + indexability contract are proven;
- RSS/JSON Feed/publishing freshness projection;
- English Golden + real hreflang alternates;
- broader agent discovery.

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



### 7H Surface Registration / Launch Contract + Attention inheritance

Every current or future 2029 surface registers into the shared rails rather than remembering telemetry/SEO/alerts page-by-page.

Minimum registration envelope:

- stable `surface_id` + route family + canonical entity/subject type;
- owner reference and current availability state: OPEN / BUILDING / LATER / GATED;
- public/private/internal classification;
- SEO decision: index/noindex, canonical owner, sitemap eligibility, OG/share identity, crawler-safe behavior;
- baseline telemetry: page/view, engagement, acquisition, country, device, locale, identity/access tier, traffic class;
- meaningful action vocabulary for the surface (search/compute/open/save/share/follow/ask/run/etc.);
- Research Context / trace / interaction correlation for expensive or semantic work;
- performance/error/fallback/unavailable evidence;
- cost/provider/resource evidence where non-trivial;
- privacy/PII class and retention behavior;
- Attention owner + severity/routing rules;
- release/deployed SHA correlation + before/after comparison key.

Launch law:

> **No surface becomes OPEN / Golden / Public merely because its UI exists.** It must prove the shared Launch Contract or remain BUILDING/GATED.

The contract explicitly covers surfaces already present and future additions, including:

- Home / Global Now;
- World;
- Posts Index + Post;
- Topic / Convergence;
- Books / Sources;
- Number / Expression;
- Gematria / Calculator;
- ELS / Cipher;
- Cipher Library + Cipher detail / future `/codes` projection;
- Heichal;
- Journey;
- Search / Command / Resolve;
- Archive / history projections;
- Video / Media;
- Community;
- Workspace / Personal Area;
- public Person / User / Contributor pages;
- Auth / Onboarding / account recovery;
- Researcher, Research Room and Dossier;
- Raziel and tool executions;
- Follow / Attention / Notifications;
- Credits / Premium / Entitlements;
- later Voice / Audio / Spatial / XR projections.

Future capability slots inherit the contract even when their final route/UI does not yet exist.

### 7I Google / external discovery evidence rail

Treat Google/external analytics as evidence sources projected into the same Control Plane, not as canonical product truth.

Required source families:

- GA4: users/sessions/views/engagement/bounce/landing/source/country/device/browser/language/realtime;
- Search Console: query/page/country/device plus separate Search-type slices where available:
  - Web;
  - Discover;
  - Image;
  - Video;
  - News / Google News;
- first-party Traffic Intelligence and internal search;
- Edge crawler / goodbot / AI / bad-bot demand;
- Microsoft Clarity qualitative evidence (session recordings / heatmaps / rage/dead-click style signals where available);
- Vercel Web Analytics as an independent web-traffic comparison source;
- 2029 RUM/Web Vitals;
- provider/runtime/DB/Edge health and cost/egress evidence.

Rules:

- missing source/configuration = `UNAVAILABLE/NOT_CONFIGURED`, never zero;
- Search Console availability thresholds are respected; absence of a Discover report is not evidence of zero Discover reach;
- one Google property/source does not overwrite another source’s metric identity;
- dashboards may compare trends/confidence, but never manufacture a “single true users” number from incompatible denominators;
- external dashboard links may remain deep links when APIs do not expose the required qualitative detail.

### 7J Attention / Recommendation routing

Use one owner-routed Attention model over existing `system_suggestions_law`, health/security owners and canonical `notify_admin` delivery. Do not create Alert Store 2.

Attention classes:

- CRITICAL — immediate operational/security/payment/data-integrity stop;
- ACTION — needs Human Gate / owner decision;
- WATCH — meaningful trend/anomaly requiring more evidence;
- INFO — useful context, no interruption.

Every attention item should carry:

- owner;
- category;
- severity;
- observed window + comparison window;
- metric identity / denominator;
- evidence links / trace / affected surface;
- confidence + sample size where inferential;
- recommended next step;
- whether action requires Human Gate;
- dedupe/cooldown key;
- current status: open / accepted / rejected / later / resolved.

Delivery policy:

- Control Plane inbox is canonical visual projection;
- in-app + WhatsApp/email/push/channel delivery are projections of the same item/owner facts;
- silence when no meaningful change;
- critical items may interrupt according to owner rules;
- recommendations never mutate production by themselves.

**Exit gate for Phase 7:** a new surface can inherit Share, Analytics, SEO, Follow, Cache, Security and Trace without page-local reinvention.

---

## PHASE 8 — Native 2029 System Frame + core surfaces

**Goal:** build semantic homes on top of the completed rails.

Current delivery priority is World → Posts → Heichal, with the Journey foundation below completed in G4 before English. Earlier PR lists in this document are lineage, not current release status. P0 security and G1 acceptance retain their existing owners. Full Admin/Control Plane expansion is deferred by ZURIEL's current direction; only essential safety/operational blockers take priority over public completion.

Homes:

- Home / Global Now;
- World;
- Heichal;
- Number / Expression;
- Books / Sources;
- ELS;
- Journey;
- Posts / Updates;
- Video / Media asset projection;
- Workspace / Personal Area;
- Internal Control Plane / Admin (non-public Human-Gate + operations home).

**Control Plane build timing**

- **G4 / Phase 8–11:** build/verify contracts, adapters and owner projections first; UI polish is not the priority.
- **Before Public Beta Cutover:** prove essential release/safety/operational readiness using existing owner evidence. The full Control Plane V1 dashboard is deferred by the 2026-10-09 direction; its proposed lenses remain future scope.
- **Public Beta evidence window:** collect the already-governed evidence. Control Plane V2 comparison/cohort/drill-down UI remains deferred, rather than an automatic expansion during that window.
- **G5 before money:** add payment/entitlement/credits/cost/margin/reconciliation lens.
- **G6 before broad multilingual:** add locale/international/Search-type/crawler/abuse comparison lens.
- **Later G7/G8:** voice/media/spatial/XR resource and adoption lenses inherit the same contract; no dashboard redesign required.

The detailed map is `docs/2029-control-plane-attention-observability-plan-v1.md`.

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
- Video / Media is a 2029 projection over canonical asset identity and placements; it never becomes a second media registry/storage owner;
- Internal Control Plane consumes owner-native operational projections and admin-only actions; it never becomes the owner of research truth, media identity, delivery state, traffic truth, security truth or cost truth;
- no Legacy WarRoom/CommandCenter layout inheritance obligation; only current capabilities/owners survive;
- no local truth/access/palette/action identity;
- same semantic action may have contextual copy;
- exact return preserves research state.

Current:

- native System Frame + baseline World is already released/live.
- World Discovery + full public Convergence catalog (server pagination/search/creator filter) are released/live. **Do not auto-route Beit Midrash into World**; Beit Midrash remains a distinct research/method-learning surface while World owns discovery/convergence browsing. Native canonical Topic/Convergence rendering + SEO/AI discovery parity is the next dependency.
- PR #492 is the current richer World iteration candidate.
- PR #476 is an older World Golden branch; treat as prototype/reference or reconcile into #492, not as an independent release line.

**Exit gate:** one coherent shell/surface model, no Legacy fallback required for core 2029 interaction, and essential Human/operational attention remains accessible through existing owners. Full Admin replacement is not added to the current public completion scope.

<a id="journey-foundation-g4"></a>

### 8A. Unified Journey foundation — G4 before English

**ZURIEL direction, 2026-10-09; EXTEND_EXISTING.** This section expands the existing delivery plan. It is neither a new semantic contract nor an additional gate. Authority remains with Research Workspace v5, Research Strategy v17, Reality Graph, Intake/Media/Truth, Gematria/Methods, ELS v9, Raziel and System Frame/Experience. Resolve live versions before implementation.

#### Target experience

A visitor enters through a story, image, number, word, source or cipher, understands the selected item, sees why a few next steps matter, and can continue or return without learning the site's architecture. A Journey is a chosen traversal through this same material. A numerical crossing is a possible transition, not an automatically saved Journey or proof that two subjects are identical. Chaining relations does not establish a new transitive fact.

The same path may later render as guided reading, an Atlas view, layered ELS or spatial/3D. Semantic identity, source evidence and path revisions survive renderer changes; camera coordinates never become research truth. An ordinary click/search does not silently start a Journey. Start/continue is explicit under the current Workspace owner. Guided and organic paths share the same substrate; Name-as-word and authorized Person/Life are distinct entry contexts, not duplicate systems.

#### Verified starting point — 2026-10-09

- Repository baseline: origin/main 8e939d3b092f267e40d74953b9103711322276d2. Live Research Path append/resume/fork RPCs exist; aggregate snapshot is 3 paths / 4 revisions, with 0 approved, public, published revisions. Counts are verification evidence, never UI constants.
- Number2029Page already consumes canonical method/context/trace projections. Its special Journey branch still uses legacy addJourney for 878; the general NumberLivingWorld Journey action otherwise navigates to World. Preserve useful depth while replacing this incomplete continuation seam.
- Post reading trails are declared fixture data in post2029ReadingProjection; they are not proof of generic relation-driven Journey execution. Keep the two existing Post Goldens, FZ1073 and Bennett; elections and 1237 are supporting coverage, not new Post Goldens.
- ResearchProvider/researchPathRuntime already implement save/resume/fork over research_paths/research_path_revisions. Reuse them. research_plans are execution plans, not saved Journeys; legacy journey_saves/addJourney are compatibility lineage.
- PR #932 is an open draft Guided Discovery seam; reconcile it before implementing overlapping files. PR #928 is CLOSED, unmerged, and fn_research_path_public_read_v1 is absent live. Personal path persistence does not prove public guided-path publication/sharing. That capability stays unavailable until its existing reader/governance seam passes acceptance.
- ELS already has exact-reopen helpers, an ELS Raziel context adapter, and matrix-depth/volume/mode primitives on main. These do not prove a complete cross-surface ELS Journey. PR #965 remains an open draft under the existing ELS writer; its preview evidence is not main/production acceptance.
- Raziel Intelligence Core PR #958 is merged; the 5 October Working Beta release record also documents an ELS intent hotfix. Older September notes calling the entire core branch-only are historical. This does not certify every contextual ELS/World/Journey flow.
- Production browser checks from this coordinator received HTTP 403 for Number 1237/878 and the two Posts. The findings above are code/DB/PR evidence, not a live visual PASS.

#### Historical intent recovered — preserve through current owners

The history search covered work_log from June–October 2026, including archived history, the existing project_codex homes, the archived Roadmap and ELS/Research Studio plans. Journal entries are provenance; current owners and later decisions control. Private GPT conversations not saved in these sources are outside this evidence set.

| Decision provenance | Capability that must survive | Current home / delivery timing |
|---|---|---|
| 19 June feature plan, work_log 674ddd18; 12 July ELS vision, 49ffbdcb | Number → method/crossing → source/ELS → further discovery; eventual spatial traversal | Workspace + Methods + ELS; core continuation in G4, spatial activation G7 |
| 23 July six-month Raziel plan, c4545b2b; One Tree companion, 45f5a7e6 | One contextual companion across site/WhatsApp; useful first action, personal continuity, optional shared contribution | Existing Raziel/Person/Intake owners; do not revive obsolete monthly schedule, pricing or bot topology |
| 17 August ELS foundation, 39dd51f7; 24 August capability unification, a61a2be5 | Discovery → Investigation → Judgment; shared Finding identity; 2D/Layered/3D; 85 recovered capabilities | Existing els-capability-workarea-unification.md and els-capability-audit.md; preserve dispositions, not historical LIVE counts |
| 25 August numeric interview, f6feb35c; 23 September project_codex raziel_mind_architecture | Learn ZURIEL's research procedures from chosen branches, corrections and attributed readings; exact methods and source history | Research Strategy / existing number_readings / Synthesis; calibration is not automatic truth promotion |
| 14 September Heichal/ELS/Journey checkpoint, 39785155 | Recoverable research spine, full-focus ELS, shared inspector, exact corpus/matrix/layer return; one Journey family | Workspace + ELS + System Frame; adapters/continuity now, future renderer remains separate work |
| 15 September companion checkpoint, 486a16a4 | What Changed from governed revisions; Silence Gate, additive self-correction, useful STOP/PAUSE, authorized channel continuity | Raziel + Strategy; G4 text/context/negative cases, broader Pulse/channel activation per later gates |
| 27 September unified Path decision, ab4abf4f | Durable revisions, branches, exact resume; discovery/number/name/person/ELS/source/topic kinds; one Journey telemetry family | research_paths/revisions + journey_2029, not legacy visit counts |
| ELS owner v4–v9 and 30 September Human decision, 3eea2971 | Bounded open discovery, dynamic lexicons, structural motifs, controls, vector/volume research; multiple verified execution strategies inside one truth boundary | Existing ELS/Strategy owners; preserve advanced capability without making full mining or 3D a G4 UI prerequisite |
| 4 October Guided Discovery decisions, 6958ffc9 and 20c94379 | Guided steps in existing Inspector/mobile sheet; 878 first teaching example, not a hardcoded universal model | Existing Learn/System Frame/Workspace seam, including PR #932 lineage |

Legacy statements such as “ELS only follows gematria”, “one browser implementation”, “all AI cores are still unmerged”, and fixed historical method/capability readiness counts must not override later live owners. ELS may enter from a qualified source, expression, event or Journey, and bounded open discovery is allowed. The canonical ELS boundary retains corpus/coordinates/replay/results even when internal strategies differ.

#### Material preparation — catalog references, preserve originals

1. Reuse the completed Zvi/Sod Hashmal/India/source maps and admitted identities before extracting anything again. Classify source artifact, source occurrence, authored interpretation, exact expression/calculation, event/topic relation and Journey step separately through existing owners. No new tagging graph or intake queue.
2. Preserve original gallery title/caption/credit/URL/order and every historical placement. Chronological viewing carries date precision and never overwrites source order. A selected image may participate in several topics/paths with a different explained relation; copied images do not become independent evidence.
3. Keep incoming authorized WhatsApp/source material eligible for Home/World movement before research admission. Extraction and a proposed topic relation do not silently publish private material or create an approved topic. Do not alter existing ingest settings.
4. A method transition preserves exact expression, canonical method key/version, result and trace. A date/digit/system-rule transform preserves its own input/operator/output lineage. Equal numbers, equivalent methods and copied source occurrences remain distinguishable.
5. ELS material retains exact searched representation, corpus/version, occurrence coordinates, signed direction/skip, geometry/search scope, engine/strategy version, completion state and dependency lineage. Historical cipher images without replay data remain usable historical sources with that limitation; no invented coordinates or rewritten captions.
6. Start with the material actually used by FZ1073/Bennett, 878, 1237 and the existing ELS Golden. Close relevant P0 boundaries; long-tail enrichment may follow in G5+. Do not delay G4 for another complete corpus extraction.

#### Delivery packages inside the existing G4 sequence

| Order | Deliverable | Existing responsibility | Evidence of completion |
|---|---|---|---|
| 1 — World/source | Authorized arrivals and already-linked media/source material resolve through existing Entity Hub/media adapters; bounded “why here / continue” with exact gallery placement | Existing World GPT writer, Intake/Media/Reality/Truth | PR #1010 reconciled separately; India/image/gallery return and source permissions proven; no dependency on final Topic redesign |
| 2 — shared continuity + Posts | Connect selected source/paragraph/relation to the same Path state; consume generic guided/organic seam; preserve revision, branch point, transition reason and multi-step return | Workspace/Journey owner; existing Claude Post builder + GPT reviewer own Post files; Chrome owner owns frame | FZ1073 captain → India → image/gallery → exact return; Bennett → elections/631 → return; reload/auth-expiry/mobile replay; no hardcoded trail mistaken for a saved path |
| 3 — Number + Heichal/ELS + Raziel | Generic Start/Continue from selected Number/expression/method/crossing; ELS exact occurrence → source/method/next finding → same Path; contextual explanation and next action | Methods/Workspace, existing ELS writer, Raziel/Strategy; one writer per shared file | 878 compatibility preserved; 1237→same-expression other-method coverage; exact ELS replay after return; no-result/partial/unavailable/STOP handled honestly |
| Acceptance | Existing Posts, Cross-Surface, ELS and Raziel Goldens consume these packages | Foundation/Experience + existing security/release owners | Complete source→calculation/ELS→explained continuation→save/resume/fork/return; newcomer/mobile/performance checks; public-path sharing only after its reader is accepted |

These packages add no G4 subgate. In G4 build a readable 2D Journey and preserve extension points. In G5 deepen catalog coverage, personal research and governed automation with the existing Product/Entitlement matrix. G6 translates the accepted same-path experience. G7 may activate spatial/3D, narrated journeys, richer background work and authorized cross-channel continuation. Full ELS capability rollout remains staged by its owner; no capability disappears because it is deferred.

#### ELS depth and AI — explicit carry-forward

- Preserve the existing 85-capability inventory: matrix/display; search; Finding actions; occurrence/proximity; ranking/statistics; candidate generation; save/share/research case. Its August readiness counts are not present-day acceptance.
- Preserve exact replay first, same-axis forward/back continuation, representation/FORMS and split/join lineage, local intersections/parallel families, source verses and bounded cross-matrix comparisons. A discovered occurrence can become the next focus while the previous axis remains reopenable.
- Preserve the distinction between sliding 2D slices, layered presentation and a declared matrix-volume coordinate basis. Camera depth alone is not a new research dimension. Heavy geometry and 3D are loaded only on demand.
- Preserve bounded open sequence discovery, declared lexicon sources, long-sequence extension, context-qualified short terms, structural motifs and cross-matrix “language signature” as research candidates. Adaptive expansion follows a concrete question/information gain, with budget and stop conditions.
- Statistical claims require the existing replayable manifest, search-space/dependency accounting, controls/nulls and holdout discipline. A visually impressive matrix, repeated crop, AI agreement or semantic similarity supplies no additional independent evidence.
- Raziel uses existing Research Plan → authorized Context Pack → canonical tools → Result Bundle → Synthesis → contextual presentation. It can explain, suggest, compare, challenge and continue; it does not calculate gematria/ELS in prose or run unbounded scans on page load.
- Research Grammar learns useful procedures from accepted examples and corrections. “What changed” compares governed source/result/path revisions; it cannot be inferred from chat memory alone. Silence, STOP and correction are real successful outcomes.
- Guest/public reading remains useful when AI is unavailable. Authorized personal saving and channel continuation use existing identity/consent. A private Journey is not published by a share button; public curated paths need the existing governed reader/publication boundary.

#### Number page, Projector and shared frame

Recommend one selected subject and progressive depth: short readable meaning/context → relevant sources and continuations → selected method/crossing explanation → full Heichal depth on request. Do not stack every method, topic, gallery and AI panel down the default Number page. Current method/trace/deep-view capabilities are preserved behind meaningful selections.

The header maintains orientation/search/account; the global rail owns destinations. The existing Inspector/Projector explains the selected item and why a next step belongs. The bottom path/action surface shows the active Journey position, next/back/exact return and save/continue when available. The small trail inside a Post is an entry/position projection of this same path, never another history. On mobile, reuse one recoverable sheet/command surface with keyboard/focus/reduced-motion support; avoid competing overlays. World supplies the wider discovery view; no permanently duplicated mini-World. Physical placement remains under current System Frame/Design owners.

#### Contextual quality, discovery and learned research grammar — execution acceptance

**2026-10-09 execution addendum, proposed delivery detail under existing owners.** This does not create a quality law, ranking service, score store, learning registry or Journey family. Binding semantic authority already exists in `research_gold_hints_law v4`, `cross_vs_convergence_criteria` (live row `rule_version=4`, with the Human-Gate **6 October Event Convergence Profile / General Equation** addendum in its body), `research_strategy_layer_law v17`, Reality/Intake/Truth and `system_suggestions_law v5`; `project_codex.raziel_mind_architecture` is their existing routing pointer, not another owner. Preserve the recorded row/body version distinction in provenance; this plan does not silently rewrite the registry version. Proposed public wording and consumer acceptance below are not a new canonical promotion.

**Historical decisions recovered:** work_log `82da15d6` (9 September) records Number-set stacks and Gate Nun 676/1234/2626; `55329b92` (14 September) records ordered structure as a Research Strength dimension. The latter distinguishes 676/787 palindromes, 1234 ordered run, 2626 repeated block and component symmetry. These are research signals with their own identities, not numerical quality ratings. Historical approved research material may still be private or public-candidate; approval does not grant public visibility. Use authorized public source witnesses for World fixtures.

**What is evaluated:**

| Object | Relevant evaluation | What it must not inherit automatically |
|---|---|---|
| Exact calculation | Expression, canonical method/version, result, Trace, spelling/representation and calculation status | Importance, event verification or spiritual interpretation from equality alone |
| Sourced Finding / relation | Source quality, replayability, typed reason, independent support, dependency family, uncertainty and contextual explanatory value | One extra independent evidence for each zero/one transform or copied occurrence |
| Event / qualified convergence focus | An aggregate Research Strength Profile around the stable event identity | A count of posts/tags as strength; later cross-time convergence as a historical child event |
| Topic / subject / Number | Coverage and meaningful qualified branches, distinct events, source groups, gaps and contextual prominence | A flat quality score attached to its name, degree count or bare number |
| Post / Journey | Source fidelity, clear narrative or transitions, supported steps, exact return and suitability for the current reader | Truth promotion because presentation is attractive or engagement is high |

The same Finding/profile keeps the same semantic identity across Home, World, Post, Topic, Number, Journey, Heichal and Raziel. The context may change display order. The full canonical Event Profile covers reality salience; independent evidence; cross-domain breadth; numeric verification depth; temporal precision; source/provenance quality; recurrence across distinct events/times; semantic graph coherence; human curation; contradictions/negative controls/unknowns; and current relevance. A relevant unknown stays unknown; lack of adapter coverage is not a zero quality value.

Keep **two outputs** from the existing Result Bundle/prominence owners: (1) inspectable **Research Strength Profile**, (2) **Presentation Priority** relative to the active context. The latter can use a bounded numeric sort internally only with reconstructable contributors/penalties. No opaque global 0–100 or 1–7 truth meter. Suggested public projection: **במרכז / להמשך / לעומק**, corresponding to the already-defined Spotlight/Supporting/Deep-only bands. Their UI thresholds require calibration, not invented global constants. Source/verification state remains separate. Human Gold/Diamond/Treasure curation is not automatically granted by AI or by this document.

**Statistics contract:** numbers displayed beside a subject must be generated from the same authorized, normalized scope. Keep separate: unique source artifacts; historical placements; source-origin/dependency groups (unknown unless classified); canonical calculations; independent method families when the relation engine establishes them; distinct events and periods; qualified cross-domain layers; unresolved links; and scan coverage. Include scope/filter/version/as-of where needed. Do not display the sum of all these as a total strength. Do not claim a statistical coincidence probability from a curated collection; a probability requires the existing declared search-space/control/holdout procedure. Two return paths or three descriptions of one source do not create new independent evidence. Reuse existing counts/readers where complete; omit or label unavailable counts rather than guess.

**Discovery / hint assembly contract:**

1. Resolve the current subject and authorized public source envelope; reuse admitted material and existing corpus maps before any fresh extraction. Raw arrivals may remain discovery material before research admission.
2. Extract exact operands, source region/video range, units/date representation and authorship. Keep source claim, calculation, rule application and interpretation separate.
3. Run applicable canonical methods and active System Methods within the existing Strategy budget. Preserve every step's original input, method/rule identity+version, operation, result, Trace and source lineage. No changing spellings or arbitrary arithmetic to hit a desired number. Source-supported alternate readings remain separately addressable.
4. Retrieve qualified existing connections. Label exact equality, same-expression method transition, governed zero/one transform, temporal relation, authored pattern reading, thematic relation and cross-time convergence distinctly. A traversal is not a new transitive fact.
5. Group dependencies before composing the contextual profile. Repeated screenshots, formula-equivalent methods and transformations of one result may enrich an explanation without increasing independent evidence. Surface contradictions and source gaps through the existing model.
6. Select a bounded set of strong, explainable entry points. Each offers the actual source, one clear reason, the relevant physical calculation opening where supported, and an actionable continuation with exact return. Ordinary browsing does not start/save a Path; Journey start remains explicit.
7. Raziel explains from this same result and may propose research or a next step. Proposed relationships follow existing Intake/Human-Gate promotion; discovery, verification, ranking, publication and Follow remain separate.

**Current implementation boundary:** `worldContextualProminence.js` and `worldConvergenceLensProjection.js` already provide shared contextual ranking/explanation, dependency and verification handling. This review does not certify a complete consumer of all eleven Event Profile dimensions; source-quality coverage remains incomplete in the existing projection. Extend these owners/adapters, not a new quality engine. No fixed demo counts or event-specific ranking array may stand in for generic execution.

**Existing consumer contract, before proposing fields:** `buildWorldContextualProminence` returns items with `sourceRef`, `familyKey` and `explainWhy` (relevance, relationPath, humanCuration, researchStrengthSignals, dependency, directness, informationGain, temporalRelevance, uncertainty, signalOnly), plus `candidateCount` and `contextSignals`. Its `crossMethodStrength` already distinguishes independent/dependent phrases and methods. `buildWorldConvergenceLensProjection` exposes verification/status/layer/presentation counts and capability state. Reuse these semantics: `multiTrace` is a raw multi-provenance signal, not independent evidence; `candidateCount` is current projection candidates, not completed corpus coverage. Any missing Event Profile dimension must be mapped by its existing owner/adapter with an honest unavailable state, not fabricated from these counts.

**Verified calibration routes, not automatically published Journeys:**

| Pilot | Exact verified structure | Acceptance focus |
|---|---|---|
| FZ1073 / festival / gratitude | `תשפ״ז`, `ושמחת בחגך`, and `מי שגמלך כל טוב הוא יגמלך כל טוב סלה` each =787 in regular; Post5112 supplies the authored event connection. Two written date expressions yield1718; the one-law yields718; `שביעי באוקטובר` regular718. | Event/calendar source and expression calculations remain distinct support layers. A historic blessing's thematic fit is not independent reporting that it was recited in the flight. FZ1073→7.10 is cross-time convergence. Source occurrence date requires its own evidence. |
| Wisdom / methods / source | `חכמה` regular73, kadmi271, miluy613, miluy-gadol1893, miluy-only-gadol1820, miluy-demiluy1230, mistater67; historical source `c502fa89-96f1-495b-aeb7-b16deaaa96b3` preserves labels. | Same expression, different canonical methods; physical opening preserves COMPOSITE diff1893−73=1820. `מסתתר` is adjacent-difference geometry, not the hidden letters of Miluy. |
| Wisdom / pleasure / order | `חכמה` miluy-demiluy1230 → zero-law123 → `ענג` regular123. Separately, `סלחתי כדברך` mistater1230 → same-expression גדול1234 → `התגלות השכינה` regular1234 / `שער נון` miluy1234 → same-expression regular676 and kadmi2626. Public source `4de128e1-7609-406c-b692-7d9b2f9ffec1`, gallery67/order4. | Each arrow has its own typed operation. Preserve spelling `ענג`; `עונג` gives129. There is no fabricated equality123=1234 or implicit +1 operation. 676/1234/2626 structural patterns are an additional labeled dimension, not three independent event witnesses. |
| Gate Nun / Internet | `רשת האינטרנט` regular1234 and mistater676; `שער נון` miluy1234 and regular676. Public source `fe9f458e-364c-4462-8a57-94f57a96ec65`, gallery67/order1. | Explain two method-specific crossings and dependency classification without turning source interpretation into a system claim about the Internet. |
| Elections / names / historical branches | Existing exact631 and Ofer-Winter miluy1820 fixtures; 271 pregnancy/wisdom connection and source-backed USA/Israel branches retain separate event identities. | Topic coverage differs from one event profile; preserve author/time/person distinctions and historical galleries. Post5107 is intended as a 2029 flagship per ZURIEL; old draft provenance does not dictate future visibility, but publishing still uses the existing owner. |

These calculation receipts were replayed through the canonical engine at this review, not inferred from an old caption. Source existence/engine parity are not a proof that all paths are admitted, public, or implemented. No fresh transcription was required; video timing acceptance remains with its source owner.

**Learning from ZURIEL's choices:** `project_codex.raziel_mind_architecture` routes Research Grammar learning from chosen branches, corrections, saved readings and accepted focus to Research Strategy, System Suggestions and the existing decision/learning owners. Record the **reason for a choice**, not only the clicked entity: source clarity, contextual multi-layer fit, reconstructable method opening, meaningful history, understandable continuation, rejection/correction or temporary display preference. The current positive example is Wisdom because its source exposes multiple exact methods and an explainable path to1820; this does not mean every1820 match is automatically strong. A preference for display is not a numeric law or public research finding.

Use `system_suggestions_law v5` Observe→Detect→Suggest→Explain→Decide. Existing research-decision-loop lineage is `decision_ledger → fn_detect_patterns → learned_patterns/learned_pattern_members → admin_pattern_review/revoke`; do not insert new domain preferences blindly. Live review found44 decision rows, two proposed patterns and no approved_preference. The current pattern schema lacks domain scoping, while Number dossier reads approved preferences generally: an owner-qualified domain adapter is a prerequisite to reusing this pathway for World narrative preferences. `researchLearningPolicy.js` exists as a pure evaluator; this is not evidence of production invocation. Private memory and approved research preference remain distinct.

Learned procedure/policy candidates must carry the example/correction, exact scope, counterexamples, version and approval/revocation lineage. Evaluate against held-out examples through the existing Champion/Challenger contract before approval. A display preference must not alter engine results, source text, access or publication. Saving this plan/work_log preserves coordination provenance; it does **not** train Raziel, store user memory, or activate a ranking preference. Those product writes require the existing authorized consumer and readback. The useful G4 path does not wait for full adaptive automation.

**Bounded acceptance / delivery:**

- G4 now: consume the existing Source/Path integration and prove the FZ1073 + Wisdom calibration with source, exact typed next steps, available profile dimensions, Explain-Why and mobile/exact return. Review the old PR1010 World stream overlap before eventual release. No broad corpus rescan.
- One source in several galleries must keep the same independent-evidence count;216→2160 adds a rule step, not evidence. A new genuinely independent source may change the profile. Same-source lineage uncertainty must remain visible.
- The same Finding must retain profile semantics across surfaces while contextual ordering may change. A popular event cannot gain verification merely from visibility. Calendar/source uncertainty remains visible beside exact calculation results.
- A positive and a rejected/corrected ZURIEL example must retain different reasons and scopes. Any future learned policy must pass another event/number case and be reversible through its existing owner; no silent promotion from chat praise.
- Number/Spatial task `NUMBER_SPATIAL_M3_METHOD_EXPERIENCE_20261009` owns its claimed stage/compiler/Number files. World consumes its delivered physical-method component contract; it does not copy it. S2 now, useful S3 later, fullscreen/3D remains a renderer of the same semantic Path.
- Later G5+ enrichment: wider topic/event coverage, fully populated profile adapters, curated/public Path acceptance and approved adaptive grammar. Existing plan gates control English/spatial scheduling. No new administration or agent coordination system is required.

#### Two-session execution boundaries

The coordinator owns only this plan/map update, dependency reconciliation and work_log handoff. These are proposed execution scopes, not a claim that sessions were activated.

1. **Existing source-mapping session → source/context reader slice.** Reuse the India/source report (e04a35a0), the 1237 checks and current-main adapters. Before WRITE, ACK in work_log and claim only the concrete source/media projection files needed (starting review: galleryMediaEnvelope, entityHubProjection, topicGoldenProjection/topic2029Projection). Deliver source/placement/relation refs and exact-reopen cases with tests. Do not edit ResearchProvider, researchPathRuntime, Number/Post/SystemFrame/ELS UI, historical content, rules or product DB. Existing Post and ELS owners receive adapter needs through work_log. If a necessary shared adapter is claimed, remain read-only on that file and return the precise handoff.
2. **Existing implementation session, after its PR #1010 scope is handed back → Journey/Number integration preparation.** First reconcile PR #932, the closed-unmerged #928 reader and existing Workspace/Number claims. While session 1 works, prepare a read-only acceptance/path contract using existing owners. Then claim a nonoverlapping branch slice in researchPathRuntime/ResearchProvider and Number consumers as needed, after live coordination. Consume session 1's exact references. Post edits stay with the existing Post builder; ELS/PR #965 edits stay with the existing ELS writer; header/rails stay with Chrome. Do not build a parallel guided module or public-path reader. A required lower-owner change is a bounded handoff, not permission to seize its files.

Each session returns actor/task_key/owner, exact touched paths, baseline/head/PR, tests, blockers, state and next owner through work_log. ACK/claim is not merge/deploy authority. Record actual dispatch/receipt if available; otherwise DELIVERY_UNVERIFIED. No agent-management system is introduced.

---

## PHASE 9 — ELS Golden Experience first

ELS is an early differentiating Golden because it exercises almost every lower layer.

G4 core order (the renderer ladder is not a prerequisite for basic Journey acceptance):

1. canonical server ELS result;
2. ELS native 2029 surface;
3. source/replay/coordinates/Trace;
4. Research Context integration;
5. exact Journey save/resume/return and source/method/Finding transitions;
6. Raziel contextual text and `Explain what I am looking at` using the current occurrence/selection/context;
7. bounded negative/partial/unavailable and source-preserving replay cases.

Carry forward to the existing later activation gates: layered 2D/2.5D and meaningful spatial/3D projections, guided spoken ELS, advanced adaptive research, and Research Dossier / Research-to-Media reuse. Their already-built primitives remain usable; their complete activation is not silently made a G4 prerequisite. Preserve the historical capability inventory through §8A.

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

**Entry semantics:** G4 begins only after the mandatory G3 implementation/compaction gate says the foundation is sufficiently closed. Changing G3→G4 does not itself switch on deferred capabilities.

Run real/replayable acceptance journeys, not simulated UI demos. G4 validates the whole path across the already-released 2029 stack; a failed Golden returns to its owning lower layer for repair. G4 does not grant automatic activation to G5 Product/Entitlements, G6 localization rollout, later Voice/Multimodal, Spatial/3D, Research-to-Media, Pulse or XR.

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

- the G4 Journey foundation in §8A: source/gallery fidelity, Number/method crossing, ELS exact occurrence, same-path save/resume/return and contextual Raziel;
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
