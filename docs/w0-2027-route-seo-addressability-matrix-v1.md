# SOD1820 — W0 2027 ROUTE / SEO / ADDRESSABILITY MATRIX V1

**Status:** W0 SPECIFICATION · DOCS ONLY · BRANCH ONLY · NOT IMPLEMENTED  
**Verified main:** `cf4d8df54cde53a22f5d217d2f79c11f0f734e13`  
**Owner check:** `EXTEND_EXISTING` — existing React Router + SEO owners + Reality Graph identity registry; no new route/SEO registry.

## 0. Live facts

- `src/App.jsx` currently contains **118** `<Route path>` registrations, independently enumerated by Claude and re-read in this W0 pass.
- Root-level `/:slug` is the canonical post catch-all.
- Final `*` currently redirects silently to `/`.
- The existing SEO build gate requires every in-scope route to have either exact `ROUTE_META` coverage or a page-level `applySeo()` call.
- Current reviewed SEO baseline contains 13 known legacy gaps: `/ניסיון`, `/experience`, `/חישוב`, `/reveal`, `/sulamot5..11`, `/cheder/:n`, `/home-classic`. New gaps fail the existing CI gate; this W0 contract does not weaken that gate.
- Live collision check across all 98 current literal top-level route segments vs `posts.slug` returned **0 current collisions**. This is a snapshot, not permission to stop checking future routes.

## 1. Route classes

| Class | Meaning | 2027 migration rule |
|---|---|---|
| **A** | public identity/content/SEO address | preserve address where practical; otherwise deliberate canonical redirect after inbound/SEO + identity continuity audit |
| **B** | public product/navigation address | may consolidate into 2027 views, but only after capability parity and inbound/SEO/deep-link audit |
| **C** | tool/workspace/deep-link address | may become stateful entry into Heichal/World, but tool/input/context/return semantics must survive |
| **D** | internal/admin/preview/experimental address | may retire aggressively after unique-capability/security/coordination check; never silently redirect to unrelated Home |
| **L** | legacy/alias address | keep as deliberate alias/redirect while inbound value exists; must not become a second canonical identity |
| **T** | terminal/fallback | 2027 replaces silent `* → /` with an honest terminal projection |

Classification is migration/continuity guidance, not truth/access state.

## 2. Exact current route ledger — 118 registrations

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
| `/beit-midrash` | A — public identity/SEO |
| `/beit-midrash/:method` | A — public identity/SEO |
| `/languages` | C — research/language deep-link |
| `/קשרי-שפות` | L — alias/legacy address |
| `/post` | A — public content/SEO |
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
| `/topic/:slug` | A — public Topic identity/SEO |
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
| `/:slug` | A — root canonical post identity/SEO catch-all |
| `*` | T — current terminal fallback; must change from silent Home redirect |

## 3. Root-post slug reservation law

Because `/:slug` is a high-value public post identity, any new **literal top-level product route** must run a live collision check against `posts.slug` before registration.

- If no collision: route may be registered after normal owner/SEO review.
- If collision exists: do **not** silently shadow the post. Choose a namespaced product route or an explicit, Human-Gate-approved migration preserving the post’s canonical/inbound value.
- Current snapshot: 0 collisions across the 98 current literal first segments. Future additions must re-run the check.

Do not create a new reserved-slug table merely for W0. The route list + live post lookup is sufficient until scale/operational need proves otherwise.

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

## 5. Identity addressability matrix

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

## 6. SEO / deep-link migration gate

Before any route is removed/repointed during W1–W9:

1. identify current route class and canonical identity;
2. check inbound/SEO/indexability role;
3. verify replacement capability parity;
4. verify exact deep-link/context/return obligations;
5. choose preserve / deliberate redirect / honest terminal;
6. update existing `ROUTE_META` or page-level `applySeo()` owner;
7. run the existing observability/SEO build gate;
8. if protected, test signed-out / wrong-user / wrong-tier negative paths;
9. never use client hiding as authorization.

Legacy aliases may survive indefinitely when cheap and harmless. Clean architecture does not justify breaking good inbound URLs.

## 7. W0 closure verdict for this matrix

**ROUTE/SEO LEDGER:** CLOSED AT SPECIFICATION LEVEL.  
**IDENTITY ADDRESSABILITY MATRIX:** CLOSED AT SPECIFICATION LEVEL.  
**HONEST TERMINAL:** SPECIFIED, implementation belongs to W1 acceptance.

No route code was changed by this document.
