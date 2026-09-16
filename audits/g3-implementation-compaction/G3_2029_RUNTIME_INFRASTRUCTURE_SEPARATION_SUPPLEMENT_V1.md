# G3 — 2029 Runtime / Infrastructure Separation Supplement v1

**Date:** 2026-09-16  
**Human Gate:** ZURIEL  
**Canonical Supabase:** `linswmnnkjxvweumprav`  
**Main baseline:** `22b18c900ac616d5c021d335efd94b810b753918`  
**Parent:** `G3_2029_EARLY_LEGACY_SEPARATION_BASELINE_V1.md`  
**Owner:** existing `foundation_closure_protocol_law` / G3 Implementation Compaction gate  
**Status:** EARLY G3 BASELINE SUPPLEMENT · BRANCH-ONLY · NO RUNTIME MUTATION · NOT RELEASED

## 1. Purpose

This supplement extends the early G3 legacy-separation baseline **below the visible UI layer**. It does not create a new Legacy System, migration registry, runtime owner or truth store.

It answers one bounded question:

> Which live database/runtime mechanisms are valid 2029 capabilities, and which are legacy/transition implementations that must not silently define the greenfield system?

Canonical disposition vocabulary remains unchanged:

- `KEEP_CURRENT`
- `ABSORB_THEN_ARCHIVE`
- `TEMPORARY_COMPATIBILITY`
- `RETIRE_REMOVE`

## 2. Live infrastructure census

Live canonical DB at this pass:

- public base tables: **288**
- public views: **31**
- public functions: **887**
- public trigger event rows: **32**
- RLS policies: **197**
- active cron jobs: **27**

These totals are inventory only. Age, row count or being live does **not** make an object 2029 authority.

Rough discovery families by table name:

- Research: 28 tables
- Content / Media / Source: 28
- Gematria / Numeric: 20
- Analytics: 19
- Person / Identity: 18
- Config / Access: 9
- Follow / Delivery: 6
- ELS: 4
- other: 156

Rough function-name discovery families:

- Research: 86
- Gematria / Numeric: 88
- Content / Media / Source: 42
- Follow / Delivery / Dispatch: 32
- Person / Identity: 20
- Access / Security: 19
- Analytics / Search: 19
- ELS: 18
- Agents / Ops / Admin: 126
- other: 437

These regex-based families are **discovery aids only**, never owner routing.

## 3. Runtime family dispositions

| Runtime family | Live evidence | Disposition | 2029 boundary |
|---|---|---|---|
| Reality Graph data (`nodes`, `edges`) | live One Reality substrate | `KEEP_CURRENT` | Current identity/relation owners decide semantics; old UI never does. |
| Research Objects + revision triggers | `research_objects` + before-update/delete snapshots | `KEEP_CURRENT` | Provenance/revision behavior is current Research OS capability. |
| Universal Finding / Result Bundle libraries | `universalFinding.js`, `researchResultBundle.js`, `researchPlanV2.js`, `researchComposerW2.js` on main | `KEEP_CURRENT` Foundation library | Composition owns no engine truth/access/persistence. Product orchestration is not inferred merely from library presence. |
| Durable `research_paths` / `research_plans` | both live tables currently 0 rows | NOT LIVE AS DURABLE CAPABILITY | Do not advertise persisted Plan/Journey runtime until replay/persistence is proven. |
| Universal Intake owner | `research_intake_foundation_contract_law v9` active | `KEEP_CURRENT` semantics | Owner semantics are current. |
| Universal Intake transport runtime | `researchIntakeTransport.js` exists only in draft PR #464, absent from main | BRANCH-ONLY / NOT CURRENT | Do not claim One Input Fabric runtime is live until merged/released/verified. |
| Supabase Auth / RLS | current identity/access substrate; owner-bound policies | `KEEP_CURRENT` capability | Client persistence/sync is classified separately. |
| Research client persistence/sync | shared local key + guest/account adoption and stale/failure risks remain | `TEMPORARY_COMPATIBILITY` | Harden before My Workspace depends on it. |
| Server Gematria execution | Registry → `fn_method_value` → `gematria_api` / `gematria_method_trace` | `KEEP_CURRENT` | Canonical 2029 calculation authority. |
| `bidim_sync` | Registry-driven `v_method_states` + `fn_method_value`, method/dependency/run provenance | `KEEP_CURRENT` as governed index/write path | Preserve provenance; it does not authorize presentation truth beyond owners. |
| `gw_enforce_engine` | hard-coded fixed set of legacy calc functions/physical columns | `ABSORB_THEN_ARCHIVE` / revalidate write path | `gematria_words` data may survive; fixed trigger cannot define future method universe. |
| Client-local Gematria (`gematria.js` / `method.fn`) | legacy calculators and analysis components still calculate locally | `TEMPORARY_COMPATIBILITY` | Never use as automatic 2029 calculation authority. Server/Registry parity must replace it where 2029 depends on calculation. |
| ELS owner / Result semantics | v3 + single-engine v2 active | `KEEP_CURRENT` semantics | One engine/result lineage, many projections. |
| ELS current mixed execution (`tzofen.html` + worker logic + `fn_els_search`) | multiple current consumers; callable/versioned core parity not yet proven | `ABSORB_THEN_ARCHIVE` until one core exists | Extract/reuse unique logic; no second engine. |
| `els_fill_numbers` trigger | derives primary/anchor numbers from skip, ragil search term and findings terms | `TEMPORARY_COMPATIBILITY` / revalidate | Useful legacy indexing only; cannot upgrade ELS result/evidence truth automatically. |
| Person / Identity (`persons`, `identity_edges`) | live foundation | `KEEP_CURRENT` | Privacy/authorization remains current owner boundary. |
| Agent-dispatch DB runtime | work_log triggers + recovery/reconcile cron; real GPT↔CLAUDE challenge executed | `KEEP_CURRENT` coordination capability | Never grants WRITE/release/publish authority. |
| Agent image upload | ticketed `agent-upload` v25, real-file E2E and wrong-hash rejection previously live-verified | `KEEP_CURRENT` image transport | Upload ≠ domain placement/publication. Private Books/Documents remain separate. |
| G0-hardened Edge/root-of-trust fleet | current hardened workers/webhooks, Vault-backed boundaries | `KEEP_CURRENT` operational capability by owner | Worker/channel topology does not define 2029 product IA. |
| G0 410 endpoint set | 11 retired endpoints live-return 410 incl. `wa-christina`, `smart-search`, `system-watchman` | `RETIRE_REMOVE` | Keep only compatibility/provenance until safe cleanup. |
| Follow intent + audit (`watch_toggle`, `notification_prefs`, `subscribe_events`) | explicit Follow/Unfollow and append-only event record | `KEEP_CURRENT` | Explicit consent truth survives. |
| Notification dispatcher (`dispatch`, `notification_events`, `user_notifications`) | stable fan-out + dedupe/audit | `KEEP_CURRENT` capability | Attention UI can be rebuilt; dispatcher does not define relevance/Raziel suggestion. |
| `resolve_topics` legacy aliases/display-name mapping | author/category label-based; cipher emits `codes:new` + old `els` alias | `ABSORB_THEN_ARCHIVE` / revalidate identity adapter | Move to stable canonical identities before 2029 Attention Center relies on topic strings. |
| Legacy publication/ticker producers | posts/anchors/findings/ELS auto-write to `channel_updates` | `TEMPORARY_COMPATIBILITY` | Old-site update/ticker projection only; not Global Now truth owner. |
| SEO / sitemap / OG / card infrastructure | current shared delivery capabilities | `KEEP_CURRENT` capability | Brand/templates/publication policy revalidated independently. |
| Current SEO/OG/PWA `/logo.png` defaults | favicon, SEO fallback, card/OG asset, manifest, service-worker icons | `TEMPORARY_COMPATIBILITY` for brand projection | `/logo.png` is Heritage Mark. 2029 Primary cutover must use approved Master Crown family. |
| Traffic events/read models | `events`, `site_visits`, `search_log`, traffic cache/history, GSC | `KEEP_CURRENT` measurement substrate | Event semantics survive UI redesign; legacy dashboards do not. |
| `legacy_traffic` | explicitly legacy table | archive/provenance only | Never 2029 measurement truth. |
| `site_flags` mechanism | active owner + live flags | `KEEP_CURRENT` availability mechanism | Specific legacy keys/messages are transitional product state, not future IA. |
| Internal entitlement seam (`fn_user_entitlement`) | service-role/postgres only; reads users.role + profiles.tier | `KEEP_CURRENT` bounded internal seam | Exact product allocation remains G5 decision. |
| Credit/reward automation | signup grant + contribution award triggers/functions live | `TEMPORARY_COMPATIBILITY` / G5 revalidation | Preserve current product behavior; do not bake exact rewards/tiering into greenfield G3 UX. |
| Backup/dated legacy tables | numerous `_backup`, `legacy_traffic`, dated content/gematria backups | archive/provenance | Not normal 2029 routing/runtime dependencies. |

## 4. Decision-changing hidden legacy findings

### H8 — OCR media auto-wiring currently crosses Extraction → Graph without the 2029 truth boundary

Active `gallery_images` OCR flow runs `feed_image_to_search()` and `wire_image_meaningful()` when OCR completes.

Current behavior includes:

- OCR numeric candidates are matched against Gematria values;
- `gallery_images.all_values` is populated;
- when exactly one candidate exists, `primary_value` may be set automatically with source `auto_single_candidate`;
- a graph `image` node may be created;
- a `number` node may be created if absent;
- an `edges(... relation_type='contains')` row may be inserted automatically.

This is useful legacy automation, but under current Reality/Media/Truth owners:

`OCR Extraction ≠ verified intrinsic media payload ≠ canonical relation ≠ Human curation`.

**Disposition:** `ABSORB_THEN_ARCHIVE` for semantic auto-promotion; preserve OCR/extraction capability and historical provenance. Before 2029 consumes these relations, re-admit through typed extraction/verification/provenance logic. Do not bulk-delete or rewrite existing graph rows in this baseline.

### H9 — Legacy Post convergence trigger still manufactures verification-looking presentation state

Active `posts.trg_convergence_promote → fn_convergence_promote()` derives:

- `convergence_score`
- `has_1820`
- `tree_priority`
- `verify_signature`

from legacy `convergence_axes` / `verify_level`, including strings such as:

- `✓ חותם 1820 — התכנסות מאומתת`
- `✓ אומת ע"י 1820`
- `✓ גימטריה אומתה`

This predates current Truth Axes and cannot own Verification/Governance in 2029.

**Disposition:** `TEMPORARY_COMPATIBILITY` for old Post behavior; `ABSORB_THEN_ARCHIVE` as semantic authority. Any future convergence verification must be composed from current Calculation/Evidence/Truth owners.

### H10 — Old ticker/publication fan-out is still active in DB triggers

Active producers include:

- `posts_to_ticker`
- `anchors_to_ticker`
- `findings_to_ticker`
- `els_published_to_ticker`

They write directly to `channel_updates` based on old source-specific events/statuses.

**Disposition:** `TEMPORARY_COMPATIBILITY`. Preserve old-site delivery while needed. 2029 Global Now / Home change projection must not use these producers as publication/truth authority merely because they are active.

### H11 — Gematria write path is split between a current Registry path and a fixed legacy trigger

Two different responsibilities coexist on `gematria_words`:

- `bidim_sync()` is Registry-driven, uses `v_method_states` + `fn_method_value`, preserves method/dependency/run provenance;
- `gw_enforce_engine()` hard-codes a fixed list of method-specific functions into physical columns and rebuilds `all_values`.

The second implementation can remain for current compatibility, but it violates the 2029 “Registry-first / no fixed method count” direction if treated as engine authority.

**Disposition:** Registry/server engine = `KEEP_CURRENT`; `gw_enforce_engine` fixed trigger = `ABSORB_THEN_ARCHIVE` / revalidate before future write-path reliance.

### H12 — ELS legacy record enrichment is not the 2029 ELS Result contract

`els_fill_numbers()` currently enriches legacy `els_records` with:

- skip distance as primary/anchor number;
- ragil of search term;
- ragil of `positions.findings[].t` terms.

This may support discovery/navigation, but it does not preserve the full v3 replay/search-budget/dependency/result lineage required for evidential 2029 ELS.

**Disposition:** `TEMPORARY_COMPATIBILITY` enrichment only. It must never be interpreted as “the ELS result has been verified/canonicalized”.

### H13 — Follow storage/dispatcher is reusable; topic identity is not fully future-safe

The current Follow substrate is strong enough to keep:

- explicit follow/unfollow via `watch_toggle`;
- durable `notification_prefs`;
- append-only `subscribe_events`;
- notification dedupe/audit in `dispatch` / `notification_events`.

But current topic resolution still includes transition identity:

- author/category keyed by display label/name;
- `cipher_feed` resolves to `codes:new` plus legacy alias `els`;
- new-follower/writer notifications locate authors using display names.

**Disposition:** Follow intent + dispatcher `KEEP_CURRENT`; label/alias resolution `ABSORB_THEN_ARCHIVE` into stable identity mapping before the 2029 Attention Center depends on it.

### H14 — Access seam exists, but current credits/rewards must not become a G3 product decision

`fn_user_entitlement` is a server-side internal read seam with EXECUTE restricted to postgres/service_role, currently deriving public/subscriber/admin from `users.role + profiles.tier`.

That is compatible with the G3 requirement for server-authoritative access composition, but exact Free/Registered/Premium/Credits allocation belongs to G5.

Current automatic credit behavior includes:

- profile signup grant;
- contribution-event XP/credit award;
- payment/credit purchase functions.

**Disposition:** access seam `KEEP_CURRENT`; exact reward/tier product behavior `TEMPORARY_COMPATIBILITY` / `DEFER_PRODUCT_DECISION_G5`.

### H15 — Universal Intake semantics are closed, but the universal transport is not on main

Current owner `research_intake_foundation_contract_law v9` is active and authoritative.

However the concrete `researchIntakeTransport.js` implementation is present in draft PR #464 and absent from current main.

**Disposition:** Intake Foundation `KEEP_CURRENT`; Universal Intake transport **BRANCH-ONLY / NOT CURRENT**. A 2029 UI must not pretend that arbitrary file/URL/text/multimodal One Input Fabric is already callable end-to-end.

### H16 — Research Plan / Result Bundle composition library exists; mounted orchestration is not equivalent to persistence/runtime closure

Current main includes:

- `researchIdentityResolver.js`
- `researchPlanV2.js`
- `researchResultBundle.js`
- `researchComposerW2.js`
- executor/adaptor tests

The code explicitly says Plan/Bundle are composition/policy contracts and own no engine truth/access/persistence.

Search of main finds the composer primarily in tests rather than the greenfield product routes, while live `research_plans` and `research_paths` remain empty.

**Disposition:** composition library `KEEP_CURRENT`; do not claim durable Plan/Journey runtime or broad mounted orchestration until a real owner-qualified runtime call path is verified.

### H17 — Heritage branding is embedded below the visible shell

`/logo.png` remains the default in multiple infrastructure projections, including:

- favicon / `index.html`;
- `seo.js` default social image;
- `api/og.js` fallback;
- `api/card.js` embedded asset;
- PWA manifest;
- service-worker notification icon/badge;
- legacy authors/share surfaces.

Therefore a clean 2029 brand cutover is **not only a Navbar change**.

**Disposition:** keep these as current legacy/Heritage projection until controlled brand cutover; no 2029 Primary claim until the approved Master Crown asset family is placed and wired through all required representation channels.

### H18 — Legacy static Heichal remains a current compatibility representation, not the 2029 product

`public/heichal.html` is still referenced by legacy `HeichalPage.jsx` and `HomePage.jsx`. The current greenfield `/heichal` route uses `Heichal2029Page` instead.

**Disposition:** old static Heichal = `TEMPORARY_COMPATIBILITY`; it must not re-enter 2029 architecture as a spatial/root owner.

## 5. Current operational cron posture

27 active jobs remain. Their presence is not legacy by itself.

Current owner-qualified examples to retain as operations include:

- security spike checks;
- RLS / Edge grant audits;
- health watch;
- traffic daily refresh;
- GSC sync;
- media thumbnail workers;
- Vault-authenticated current WhatsApp/ingest workers;
- G3 agent dispatch recovery/reconciliation.

Current product-specific or legacy delivery jobs may continue while their old product projections remain live, but they do not define 2029 architecture. Examples include welcome/page-ready/reply-email/research-nurture/share queues and a bounded content-observation watch.

G3 final compaction must decide each surviving job only after the replacement product path is live and replayed.

## 6. Current `site_flags` fact

Live flags at this pass include:

- `lock_convergence_tree` = locked for all
- `lock_cross` = locked for all
- `lock_els` = locked for all
- `lock_forum` = locked for all
- `lock_galleries` = registered-only
- `lock_reality` = currently not enabled

`site_flags` itself is a current capability-state owner and is `KEEP_CURRENT`.

The names/messages of individual legacy surfaces do not become 2029 IA or product identity merely because their flags exist.

## 7. Archive/provenance-only objects

Live schema contains numerous explicit backup/history tables, including dated Post/Gallery/Gematria backups and `legacy_traffic`.

They remain useful for rollback/provenance but are not normal 2029 routing/runtime authority.

No deletion is authorized by this baseline.

## 8. Build-order consequence

This supplement strengthens the G3 sequence without creating a new phase:

1. keep current semantic owners and safe canonical engines;
2. harden access/privacy/personal-state runtime seams;
3. extract/prove one callable ELS core;
4. ensure 2029 calculation paths use Registry/server authority, not local method functions;
5. re-admit legacy media/OCR/relationship automation through current truth/provenance boundaries where needed;
6. separate Follow intent from legacy topic identity aliases;
7. build the clean System Frame only over owner-qualified capabilities;
8. then build World / Number / Books / ELS / Heichal projections;
9. rerun the mandatory end-of-G3 compaction and retire compatibility only after replacement replay is verified.

## 9. Release boundary

This supplement performs no runtime/schema/data/trigger/cron/Edge changes and authorizes none.

`DOCUMENTED · COMMITTED · BRANCH-ONLY` only.

No merge/deploy/release without explicit ZURIEL `תעלה`.
