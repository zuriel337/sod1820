# SOD1820 — W0 2027 ROUTE / SEO / ADDRESSABILITY MATRIX V1

**Status:** EXISTING MIGRATION INVENTORY · HISTORICAL W0 + CURRENT 2029 RECONCILIATION · DOCS ONLY · CUTOVER NOT ACCEPTED
**Historical W0 verified main:** `cf4d8df54cde53a22f5d217d2f79c11f0f734e13`
**Owner check:** `EXTEND_EXISTING` — existing React Router + SEO owners + Reality Graph identity registry; no new route/SEO registry.

**Read current status first:** [§8](#8-current-2029-reconciliation--2026-11-03)
is the 3.11.2026 reconciliation. §§0–7 retain the dated W0 snapshot and its
continuity rules. Counts, “current/live” wording and specification closure in
that snapshot are not assertions about today's runtime or a cutover acceptance.
The explicit modern-post exception in §8 supersedes only the old blanket
all-post-root wording; it does not migrate protected old root addresses.

## 0. Historical W0 live facts

- `src/App.jsx` currently contains **118** `<Route path>` registrations, independently enumerated by Claude and re-read in this W0 pass.
- Root-level `/:slug` is the canonical post catch-all.
- Live canonical `posts` verification on 2026-09-09: **1288 total · 1288 non-empty slugs · 1288 distinct slugs · 0 missing slug**.
- Final `*` currently redirects silently to `/`.
- The existing SEO build gate requires every in-scope route to have either exact `ROUTE_META` coverage or a page-level `applySeo()` call.
- Current reviewed SEO baseline contains 13 known legacy gaps: `/ניסיון`, `/experience`, `/חישוב`, `/reveal`, `/sulamot5..11`, `/cheder/:n`, `/home-classic`. New gaps fail the existing CI gate; this W0 contract does not weaken that gate.
- Live collision check across all 98 current literal top-level route segments vs `posts.slug` returned **0 current collisions**. This is a snapshot, not permission to stop checking future routes.

## 1. Route classes

| Class | Meaning | 2027 migration rule |
|---|---|---|
| **A** | public identity/content/SEO address | preserve address where practical; otherwise deliberate canonical redirect after inbound/SEO + identity continuity audit |
| **POST-A** | individual root post identity/SEO address | **root URL `/:slug` is immutable by default**; ordinary 2027 redesign does not move it under `/post/` or another namespace |
| **B** | public product/navigation address | may consolidate into 2027 views, but only after capability parity and inbound/SEO/deep-link audit |
| **C** | tool/workspace/deep-link address | may become stateful entry into Heichal/World, but tool/input/context/return semantics must survive |
| **D** | internal/admin/preview/experimental address | may retire aggressively after unique-capability/security/coordination check; never silently redirect to unrelated Home |
| **L** | legacy/alias address | keep as deliberate alias/redirect while inbound value exists; must not become a second canonical identity |
| **T** | terminal/fallback | 2027 replaces silent `* → /` with an honest terminal projection |

Classification is migration/continuity guidance, not truth/access state.

## 2. Historical W0 route ledger — 118 registrations

| Route | W0 class |
|---|---|
| `/enter` | B — public product/navigation |
| `/stream` | D — internal/experimental/admin |
| `/ניסיון` | D — internal/experimental/admin |
| `/experience` | D — internal/experimental/admin |
| `/חישוב` | D — internal/experimental/admin |
| `/sulamot5` | D — internal/experimental/admin |
| `/sulamot6` | D — internal/experimental/admin |
| `/sulamot7` | D — internal/experimental/admin |
| `/sulamot8` | D — internal/experimental/admin |
| `/sulamot9` | D — internal/experimental/admin |
| `/sulamot10` | D — internal/experimental/admin |
| `/sulamot11` | D — internal/experimental/admin |
| `/cheder/:n` | D — internal/experimental/admin |
| `/reveal` | D — internal/experimental/admin |
| `/היכל` | L — alias/legacy address |
| `/heichal` | D — legacy/experimental Heichal surface |
| `/galaxy` | D — internal/experimental/admin |
| `/galaxy/:slug` | D — internal/experimental/admin |
| `/research` | C — tool/workspace deep-link |
| `/meaning-lab` | D — internal/experimental/admin |
| `/research-viewer` | D — internal/experimental/admin |
| `/entity-hub-preview` | D — internal/experimental/admin |
| `/entity-hub-preview/:type/:key` | D — internal/experimental/admin |
| `/explorer-preview` | D — internal/experimental/admin |
| `/מעבדת-משמעות` | D — internal/experimental/admin |
| `/` | A — public identity/SEO |
| `/reality` | B — public product/navigation |
| `/world` | B — public 2029 discovery/SEO hub; canonical hub URL, not identity URL for contained Convergences |
| `/home-classic` | D — internal/legacy preview |
| `/start` | A — public identity/SEO |
| `/privacy` | B — public/legal address |
| `/unsubscribe` | B — public/account action |
| `/join` | B — public/account action |
| `/welcome` | B — public/account/onboarding |
| `/map` | B — public product/navigation |
| `/timeline` | B — public product/navigation |
| `/numbers` | B — public product/navigation |
| `/name-lab` | C — tool/workspace deep-link |
| `/מעבדת-השם` | L — alias/legacy address |
| `/spatial-gematria` | C — tool/workspace deep-link |
| `/גימטריה-מרחבית` | L — alias/legacy address |
| `/gematria-3d` | C — tool/workspace deep-link |
| `/גימטריה-תלת-ממדית` | L — alias/legacy address |
| `/code` | A — public identity/tool SEO entry |
| `/codes` | A — public identity/SEO |
| `/codes/מחקר` | B — public/unlisted product address |
| `/codes/:slug` | A — public identity/SEO |
| `/beit-midrash` | B — independently addressable Beit Midrash / research-method surface; **must not auto-redirect to `/world`**; calculator intents keep their canonical calculator routing |
| `/beit-midrash/:method` | B — independently addressable Beit Midrash method/deep-link; **must not auto-redirect to `/world`** |
| `/languages` | C — research/language deep-link |
| `/קשרי-שפות` | L — alias/legacy address |
| `/post` | A — public Posts listing/navigation/SEO; **not parent path for individual posts** |
| `/archive` | B — public product/navigation |
| `/gallery` | B — public product/navigation |
| `/gallery-updates` | L — alias/legacy address |
| `/verified` | B — public projection/filter |
| `/community` | B — public product/navigation |
| `/community/chat` | B — public communication |
| `/community/calculator` | B — public legacy tool surface |
| `/community/comments` | B — public communication |
| `/community/researcher/:slug` | A — public identity/SEO |
| `/community/researchers` | B — public product/navigation |
| `/community/whatsapp` | B — public/authorized communication surface |
| `/888` | L — alias/legacy address |
| `/members` | B — public/access projection |
| `/about` | L — alias/legacy address |
| `/contact` | B — public/legal/contact |
| `/login` | B — account/auth |
| `/profile` | B — account/personal |
| `/credits` | B — account/access |
| `/buy` | B — account/access legacy alias-like surface |
| `/admin` | D — admin |
| `/dev/torah-occurrence-scene` | D — dev/internal |
| `/editor` | D — authoring/internal-authorized |
| `/editor/:slug` | D — authoring/internal-authorized |
| `/traffic` | D — admin/ops |
| `/numbers-report` | D — admin/ops |
| `/theme-preview` | D — internal preview |
| `/category/:slug` | A — public taxonomy/SEO |
| `/tag/:slug` | A — public taxonomy/SEO |
| `/number` | A — public Number/Phrase entry |
| `/name` | C — Name tool/search entry |
| `/שם` | L — alias/legacy address |
| `/number/:phrase` | A — public Number/Phrase identity/SEO |
| `/book` | A — public Library/SEO |
| `/book/:slug` | A — public Book identity/SEO |
| `/topic/:slug` | A — public **Convergence** identity/SEO; canonical address preserved; Hebrew product label = `התכנסות` |
| `/theme/:slug` | B — public semantic projection |
| `/forum` | B — public product route; **surface not protected** |
| `/or-geula` | A — public content/SEO |
| `/or-geula/video/:id` | A — public content/SEO |
| `/אור-הגאולה` | L — alias/legacy address |
| `/forum/:id` | B — public thread route; surface not protected |
| `/gematria` | C — tool deep-link/redirect semantics |
| `/גימטריה` | L — alias/legacy address |
| `/home-new` | L — legacy/preview home address |
| `/בית-חדש` | L — legacy/preview home address |
| `/cross` | C — tool/workspace deep-link |
| `/verse-gematria` | C — tool/workspace deep-link |
| `/פסוקים` | L — alias/legacy address |
| `/broadcasts` | B — public updates/navigation |
| `/whats-new` | B — public updates/navigation |
| `/הצלבה` | L — alias/legacy address |
| `/journey` | C — Journey deep-link |
| `/מסע` | L — alias/legacy address |
| `/journey-beta` | C — experimental Journey deep-link |
| `/lab` | D — internal/experimental |
| `/lab/els` | C — ELS work-area deep-link |
| `/sulamot` | D — experimental |
| `/sulamot2` | D — experimental |
| `/sulamot3` | D — experimental |
| `/sulamot4` | D — experimental |
| `/פוסטים-אחרונים-2` | L — legacy redirect |
| `/פוסטים-אחרונים` | L — legacy redirect |
| `/צור-קשר` | L — legacy redirect |
| `/דף-צאט-ראשי` | L — legacy redirect |
| `/chat` | L — legacy redirect |
| `/:slug` | **POST-A — root canonical individual post identity/SEO; immutable by default** |
| `*` | T — current terminal fallback; must change from silent Home redirect |

## 3. Root-post URL immutability + slug reservation law

**Current scope:** apply this protection to durable old/imported root addresses.
For the later approved native-publication `/post/:slug` policy, see §8 and the
[same invariant's reconciliation](w0-2027-post-url-immutability-gate-v1.md#current-scope-reconciliation--2026-11-03).
The historical blanket wording below is retained, not reapplied to modern posts.

Because SOD1820 is a long-lived site and `/:slug` is the canonical identity of the public post corpus, individual post addresses receive a stricter rule than ordinary Class A.

### 3.1 Individual post address

**INDIVIDUAL POST URL = ROOT `/:slug` — PRESERVE.**

Ordinary 2027 Shell/World/navigation redesign does **not** migrate posts to:
- `/post/:slug`;
- `/world/post/:slug`;
- `/content/:slug`;
- or any other new parent namespace.

`/post` may be the Posts listing/Discover/Sidebar entry, but opening a post returns to its existing root URL:

`Sidebar → פוסטים → /post → /<existing-slug>`

The renderer may be redesigned; the canonical root address, slug identity, inbound value and canonical metadata continuity remain protected.

A future exceptional post-URL migration requires a separate explicit ZURIEL Human-Gate decision plus inbound/SEO/canonical-redirect audit. It is not implied by W0/W1/W2 or by a general route cleanup.

### 3.2 New top-level route collision gate

Before registering any new **literal top-level product route**, run a live collision check against canonical `posts.slug`.

- If no collision: route may continue through normal owner/SEO/release review.
- If collision exists: **do not silently shadow or rename the post. The new product route changes by default** — choose another name or a namespaced path.
- Only a separate explicit Human-Gate post migration may override this default.
- Current snapshot: 0 collisions across the 98 current literal first segments. Future additions must re-run the check.

The check must happen before registration/merge/release and fail loudly on collision.

### 3.3 Live state beats static slug snapshot

Do not create a second authoritative reserved-slug registry. A static list/export may be audit evidence only; it becomes stale when a new post is published.

Canonical collision source:

`public.posts.slug` in canonical Supabase `linswmnnkjxvweumprav`.

If CI cannot safely query canonical production, a generated snapshot may assist CI only when paired with a release-time live check. Snapshot ≠ SSOT.

Detailed hardening addendum: `docs/w0-2027-post-url-immutability-gate-v1.md`.

## 4. Honest terminal projection — required W1 capability

Current `* → /` behavior must not survive as the universal terminal behavior.

The 2027 Shell needs one route/access-aware terminal projection capable of representing:

- `NOT_FOUND` — identity/route genuinely absent;
- `MOVED` — deliberate canonical redirect exists;
- `ACCESS_GATED` — known target, caller lacks current entitlement/authorization;
- `CAPABILITY_CLOSED` — site-flag state says unavailable;
- `SOURCE_CHANGED_OR_STALE` — exact return points to a changed/removed version;
- `NO_PERMISSION` — authenticated caller is not authorized;
- `INVALID_RETURN_TARGET` — malformed/stale exact-return reference.

Rules:

- never replace these states with unrelated Home content;
- never reveal protected object existence/content beyond the caller’s authorized response shape;
- `ACCESS_GATED` is not `NOT_FOUND`, and neither is a truth/governance statement;
- deliberate redirects must preserve query/hash/context when semantically valid;
- locale changes translate the terminal copy, not the access state.

This extends existing routing/access/UI owners; no new owner/store is required.

## 5. Historical W0 identity addressability matrix

Live `entity_types` has 14 rows; six declare a `route_pattern`.

| Entity type | Declared route | Current live App route | W0 verdict |
|---|---|---|---|
| `entity` | — | no generic canonical entity route | address through known projection/World state; no invented route |
| `number` | `/number/:value` | `/number/:phrase` | **ADDRESSABLE**; semantic identity works, parameter-name drift is documentation/adapter detail |
| `verse` | `/verse/:ref` | none | **NOT DIRECTLY ADDRESSABLE YET**; do not emit generic verse URLs until route is implemented/adapted |
| `name` | `/name/:name` | only `/name` + `/שם` | **DECLARED/NOT LIVE**; current Name search is not the declared identity route |
| `word` | — | no identity route | no generic URL promised |
| `person` | `/person/:id` | none | **DECLARED/NOT LIVE**; public Person projection remains separately gated |
| `event` | — | no identity route | use existing event/time projections until explicitly promoted/addressed |
| `place` | — | no identity route | no generic URL promised |
| `object` | — | no identity route | no generic URL promised |
| `image` | — | gallery/post representation routes only | representation addressability != canonical image identity route |
| `research` | `/research/:id` | only `/research` shell | **DECLARED/NOT LIVE**; never construct `/research/:id` today |
| `fieldmap` | — | no identity route | no generic URL promised |
| `relationship` | — | no identity route | inspect through World/Inspector, no direct URL promised |
| `book` | `/book/:slug` | `/book/:slug` | **ADDRESSABLE** |

**Current declared-route parity:** 2/6 declared entity route families are live (`number`, `book`); 4/6 are not (`verse`, `name`, `person`, `research`).

A type being listed in `entity_types` is an identity capability, not permission to auto-create nodes or public pages.

### Convergence / World migration note

- `/world` is the discovery hub; it does not replace Convergence identity URLs.
- `/topic/:slug` remains Class A and canonical; native Topic 2029 now owns that production route.
- Do not mint `/world/topic/...` or query-state duplicate canonicals.
- Historical PR #555 redirected public `/beit-midrash` routes to World, but that cutover is **superseded by Human Gate**. Live intent: Beit Midrash remains independently addressable; World remains a separate discovery surface. Topic data/identity/provenance were not deleted.
- Temporary internal calculator compatibility may still use legacy implementation detail, but public calculator intent resolves to `/gematria`.
- Full execution order: `docs/2029-world-convergence-seo-ai-discovery-plan-v1.md`.

## 6. SEO / deep-link migration gate

Before any route is removed/repointed during W1–W9:

1. identify current route class and canonical identity;
2. check inbound/SEO/indexability role;
3. if the target is an individual Post, apply **POST-A root immutability first**;
4. verify replacement capability parity;
5. verify exact deep-link/context/return obligations;
6. choose preserve / deliberate redirect / honest terminal;
7. update existing `ROUTE_META` or page-level `applySeo()` owner;
8. run the existing observability/SEO build gate;
9. if protected, test signed-out / wrong-user / wrong-tier negative paths;
10. never use client hiding as authorization.

Legacy aliases may survive indefinitely when cheap and harmless. Clean architecture does not justify breaking good inbound URLs.

## 7. Historical W0 specification closure verdict

**ROUTE/SEO LEDGER:** CLOSED AT SPECIFICATION LEVEL.  
**POST ROOT URL IMMUTABILITY:** CLOSED AT SPECIFICATION LEVEL; implementation/build gate belongs to W1 routing acceptance.  
**IDENTITY ADDRESSABILITY MATRIX:** CLOSED AT SPECIFICATION LEVEL.  
**HONEST TERMINAL:** SPECIFIED, implementation belongs to W1 acceptance.

No route code, post row, post slug, canonical URL or redirect was changed by this document.

## 8. Current 2029 reconciliation — 2026-11-03

This file remains the migration inventory named by the existing global cutover
contract. It is not a runtime routing registry. Product inspected:
`9d3a09689a05bd0b72ca484335c1fbce8b538170`; protected Preview
`dpl_1Jyk6PdVpSaygjuD5E64CH5FiBez`. Production remains Legacy
`d1837efcf5a978d10a514010f3695680f231e116`; main is `2195c978`.
The documentation/privacy branch is `gpt/2029-url-continuity-plan-20261103`.

**Detailed current inventory and evidence, subordinate to this map:**

- [36 family/exception rows](reviews/url-continuity-plan-20261103/transition-matrix.md):
  old pattern, existence evidence, meaning, existing/proposed target, state,
  treatment, permission, parameters/anchors, acceptance and open implementation.
  Its CSV/JSON are the same review table, not separate route owners.
- [Collected URL union](reviews/url-continuity-plan-20261103/url-inventory.json)
  and [coverage/limits](reviews/url-continuity-plan-20261103/README.md): 33,667
  distinct URL strings/templates, 376 not yet assigned. These are not counts of
  real pages, defects or accepted addresses. No complete historical coverage is
  claimed. Current code has 125 Legacy patterns and 45 2029 patterns plus four
  dynamic services; the live sitemap contains 21,911 locations. Existing 92
  literal redirect sources are preserved; content/parameter/runtime parity is
  still a separate obligation.
- [Actual 9d observations](reviews/url-continuity-plan-20261103/hosted/receipt.json):
  36 observations at 390/1440 with the real SW, retaining 404/closed results.
  This is diagnostic evidence, not 36 accepted routes or Production acceptance.

**Decisions and unresolved state:**

1. Old/imported post URLs remain at their durable root addresses. Approved native
   publications use `/post/:slug` through the existing `publicPostUrls.js`
   provenance adapter, not a moving date window. Its immutable import boundary
   and reviewed exceptions are evidence for that implementation, not another
   reserved-slug registry. Root aliases, identity, query/hash and exact return
   remain; ambiguous provenance does not authorize a move.
2. Existing community/chat, forum, taxonomies, public code/book libraries,
   calculators, media and services need a precise continuation. An unfinished
   new engine does not authorize closing published material or a working
   existing service. The current candidate still has proven missing/closed
   destinations. Proposed targets in the review table are **not implemented**.
3. Preserve the requested item/filter/author/source and parameter meaning.
   Community calculator parity is not established by the general calculator;
   person, contributor and source collection are distinct. Signed/private and
   unpublished URLs retain their authorization and terminal behavior. No generic
   Home/World/building fallback or fabricated public record is approved.
4. [Existing family parity/rollback checklist](g3-2029-cutover-acceptance-checklist.md)
   still applies, including automated URL-by-URL browser/crawler comparison and
   zero unapproved regression. Existing fixture/Preview successes are reused
   within their scope, not counted as this missing full-family acceptance.
   One combined candidate does not itself waive deployment units or rollback.
5. Current acceptance statuses and remaining P0/Skeleton/security/operations/
   recovery conditions are in the [coverage table](reviews/url-continuity-plan-20261103/coverage.md)
   under the existing Roadmap. G3/H1 are accepted; formal G4 and cutover are not.
6. **Later tag-page clarification from ZURIEL:** the restored `/tag/:slug`
   family and missing public content continuations require finished visual
   quality at launch, matching the approved Posts language through existing
   cards, typography, media and shared actions. Design V2 §§5/8.2 already govern
   a centered bounded content plane, balanced mobile padding and usable controls;
   do not create another design contract. A precise tag heading and its actual
   published results must survive, including pagination, loading/empty/failure
   and exact return. Compare 320/390/desktop and supported themes. A plain
   placeholder list or generic World redirect is not acceptance. Consult Legacy
   for missing content/behavior evidence, not as an instruction to copy old
   styling. This requirement is planned; the current tag route is still missing.

Doc37 §12.29 preserves the decisions and later overrides. Evidence provenance:
AFTER `e18c1cb9-0ea0-4e6c-9617-232bb296d31b`; documentation BEFORE
`2b9004b6-5285-4aee-93e2-4b1174ec06cf`. No routing, product-data, deployment or
permission change was made by this synchronization. Historical W0 closure
above remains a specification receipt, not an exemption from current acceptance.


### 8.1 Priority 1 implementation delta · 3 November 2026

The planning statuses in §8 are historical at product `9d3a0968`. The same
[family table](reviews/url-continuity-plan-20261103/transition-matrix.md) now
records the bounded implementation on `gpt/2029-public-url-continuity-20261103`,
runtime checkpoint `78275d17`, preserving its original planning values in JSON
and Git history. [Receipt and limits](reviews/public-url-continuity-20261103/README.md).

Tag/category paths retain exact membership and approved Posts presentation;
chat aliases preserve thread/reply/path; the existing community calculator,
public source libraries and service/status continuations are mounted. The
hosting rewrite no longer adds an internal `path` parameter to visitor queries.
Old post identities and canonical URL policy are unchanged; draft/missing
content still returns 404. Updated XML selects only publicly admitted items.
The notice and direct-share UI are not new URL/source owners.

The collected 33,667 records were reconciled against adapters without another
crawl. This proves neither 33,667 live pages nor complete HTTP cutover parity.
Residual media/attachment/entry ambiguities, real-account and action/service
acceptance remain explicit. No redirects or settings were changed on Legacy
Production. Contract history, G3/H1 acceptance and formal G4 distinction remain.
Coordination BEFORE: `5fbf9e75-b445-4da4-bf24-dfc485387b8f`; Doc37 §12.30.

### 8.2 Acceptance count correction · 3 November 2026

[Complete inventory classification and its limits](reviews/public-acceptance-closure-20261103/README.md) supersedes the 33 application-alias count for total redirect coverage: 641 hosting/application redirects, including 258 unmatched target routes; 211 additional direct unmatched routes. No full HTTP acceptance or blanket missing-content waiver. Original inventory and post address contract unchanged.


### 8.3 Exact source exceptions · 3 November 2026

The existing transition table now references [per-original exception acceptance](reviews/public-url-exceptions-20261103/README.md).
All469 unmatched candidates and2140 direct Post lookups are preserved:2352 exact-identity/route resolutions,
48 intentionally closed,4 invalid,205 source-evidence gaps. This supersedes the current *unclassified* status
of those rows, not the frozen33667 inventory or its earlier acceptance receipt. Exact source media, Post/embed
and nested-category identity are separate from public admission and hosted browser acceptance. No fuzzy-title
matching, blanket category redirect, draft publication, route-history rewrite or full-HTTP claim.
193 audio sources,8 unmatched Post identities,3 external video references and one lecture remain individually
listed with launch impact. No cutover or formal G4 closure follows from this bounded repair.

### 8.4 Owned-account continuity · 3 November 2026

F25 in the existing transition table is implemented/controlled-tested on7937f084,
continuing product73dc. Known private modules admit an existing verified account
independently of admin role. Public HTML remains generic/noindex; each private
reader/write uses the caller JWT and owned identity. Public contributor creation
is explicit and separate. [Evidence and real-account limits](reviews/personal-continuity-glass-number-20261103/README.md).
The two requested real accounts still require user login acceptance; no private
content was copied into public evidence. Social/signup and held shared proposal
b21ed1ff remain open/held. No new inventory, public identity, route schema or cutover.

### 8.5 Frozen205 live review and adopted books · 3 November 2026

[Focused continuation](reviews/public-url-exceptions-20261103/residual205/README.md), BEFORE1db8d430.
All205 originals now have live HTTP/source review in the existing reconciliation:2355 resolved by exact identity/route,52 intentionally closed,5 invalid,197 pending.
193 audio paths already return HTML on Legacy;2 named links already404. Recovery/explicit deferral remains open. One exact public ForumPost and the historical lecture-index page need a valid continuation/decision; denied browser access is not deletion evidence. Three exact Facebook source links do not prove playback.
Book23e03e82 is already an ancestor of b80; no reimport. Adopted cards/meters and Ahavat's source-bound prototype are reused; other unfinished public books stay closed. Seven anonymous active identities do not imply an eighth static preparation record is published.
The user reports a successful real-account DM on b80; full save/edit/switch acceptance remains per-action open. WhatsApp stored consent is distinct from verified phone binding/delivery, whose2029 connection is not accepted. Sharedb21 remains held. Prior§8.3/8.4 are dated checkpoints superseded only for these facts; inventory/routes/P0 and G3/H1 unchanged. No cutover/G4 completion.

### 8.6 Bounded continuity closure · 3 November 2026

[Same transition table](reviews/url-continuity-plan-20261103/transition-matrix.md) and [evidence](reviews/public-url-exceptions-20261103/residual205/continuity-closure-20261103.md) supersede§8.5 only for these facts:195 existing failures are explicitly deferred by ZURIEL; the proven Forum arrivals continue to /community/chat; exact WP pages2481/3798/3288 retain recovered historical content, self canonical/XML and provider links. The original2609 strings remain,2357treated/52closed/5invalid/195deferred; no pending identity decision in this subset and no per-URL HTTP coverage claim for33667. User-reported two-account personal acceptance on7360 is accepted for the listed actions; bounded return/WhatsApp/session changes tested separately on76cf61e6. S2 shared-source proposal and CP1/recovery/activation remain open; H1/G3 retained. Root Legacy configuration, old Post policy and shared data remain unchanged.

### 8.7 Final preparation checkpoint · 3 November2026

[Existing transition table](reviews/url-continuity-plan-20261103/transition-matrix.md) and [bounded preparation](reviews/public-url-exceptions-20261103/residual205/final-preparation.md) updateF08/F25/F26/F27/F30 only. The two-owned-account acceptance is retained; Auth/mail are split by actual dependency, not a blanket b21 block. The guest invitation reuses the existing site-updates form and suppression hints; its shared server remains unactivated. CP1 projections distinguish failed/empty/stale reads; genuine operator acceptance and S2 remain open. Recent chat import was deferred by ZURIEL; zero messages imported. Frozen original URLs, P0 and old Post policy unchanged.

ZURIEL accepts the unverified freshness/media coverage risk for continuing preparation: code and historical H1 are verified, current DB/media coverage is not. This overrides only the demand to delay preparation for more backup inquiry. It is not a backup PASS, deletion authorization or cutover approval. Protected Preview acceptance is distinct from staged Production and exact activation/rollback; no formal G4/Isolation closure.


### 8.8 — S2/health applied; new-account mail decision supersedes old A (3 November 2026)

[Same transition table](reviews/url-continuity-plan-20261103/transition-matrix.md), F25/F26/F27/F30 only: approved shared migrations20261103175116/175126 are applied and their source/ACL/count/anonymous boundaries and four affected hosted routes verified. This is not a full S2/CP1/G4 seal. The user superseded identity-only A: a future verified new account receives site-updates by default with effective opt-out. The exact A2/B/D proposal passed22 isolated PostgreSQL groups, not live signup. Shared apply, truthful active signup notices (also Legacy), OAuth callback/owner acceptance remain pending. Existing account acceptance, original URLs/195 deferrals and backup-risk decision are retained; no site Production deployment. Canonical subscription ownerv22 records the decision only.


### 8.9 — Auth continuity on the same candidate, not a new URL inventory

אותהטבלהומלאיהכתובותנשמרים. חיבורGoogle/Facebook/OTPמחדשמשתמשבשרתAuthהקייםבלי עדכוןהעדפות. callbackPreviewקבועזקוקלאימותדשבורדוקבלהאמיתית. A2עתידיאינופררקוויזיטלכניסה; B/Dממתיניםבנפרד. [צעדי קבלה](reviews/public-url-exceptions-20261103/residual205/four-completions.md) ותוכניתהמעבר/חזרהבאותותיקהראיות, ללאProduction/G4או בקשותחשבוןחוזרות.


### 8.10 — Public-config proposal prepared, accepted runtime unchanged

[Exact combined proposal and49 local checks](reviews/public-url-exceptions-20261103/residual205/evidence/final-preparation/production-activation/public-candidate/README.md) fill the code-preparation gap after stage-only review. It is not applied. Product/Preview01662, all original URLs and public source eligibility remain unchanged. Canonical serving/indexing is prepared only in a separately selected Production candidate; immutable host, API, private/missing and noneligible pages stay noindex. Public-capable code would serve if canonical traffic were routed, so safe protected/unrouted creation and final exact cutover remain separate requirements. No HTTP inventory or runtime acceptance is reclassified as fullG4. OnlyF32 preparation status changes.
