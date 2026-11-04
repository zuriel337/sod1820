# Public writer identity and actions — branch review, 23 October 2026

Scope: extend the public writer gateway and preserve source-native Legacy content. This follows the [Legacy parity review](writer-legacy-parity-and-identity-seal-20261023.md), rather than replacing the canonical World, inbox, subscription or personal workspace.

Branch: `claude/2029-writer-identity-actions-20261023`. Exact integration base: `49477e6baed4f078ffb194732e85c77de9e263fd`. Current remote main verified separately: `e73687221aa2ab639930643e5cc8c99666adce88`. Required World base `cfa786c186b449c6a616566724666937d415d508` remains an ancestor. No merge, main push, Production deployment or product database mutation.

## Delivered behavior

- Meaningful CSS 3D identity medallion: approved public portrait or canonical initial, existing authoritative five-level rank, keyboard-operated public bio/navigation panel, reduced motion. Tzvi has no public portrait; the initial remains **צ**. No generated face, account-photo fallback or new ranking formula.
- Membership comes from the linked account's public `users.created_at`, separately from the contributor-page creation date. Full anniversaries use `Asia/Jerusalem`; the actual date uses the existing Hebrew + Gregorian formatter. Tzvi's public registration is **16 July 2026**, so his current tenure is **less than a year**, not an invented multi-year history.
- Last connection is explicitly unavailable. There is no anonymous, exact contributor-to-Person presence binding; neither Auth last-sign-in nor private activity is used as a substitute.
- Existing `WatchButton` and `ShareActions` are reused. Follow identity stays `author:<canonical display_name>`, including source attribution `writer-2029`. Existing floating-share placement remains authoritative.
- Direct message action uses a server-resolved canonical account binding and the sender's verified JWT with existing `dm_send`. Public responses contain no account IDs. Guest, self, unlinked, private, locked, invalid body and cross-origin requests cannot send. Sending is an explicit click, never an automatic login continuation or retry. An uncertain acknowledgment instructs the visitor to check their inbox before retrying. No silent team-contact fallback.
- The existing frame opens the personal area. Verified owners receive native links to existing page-editor and messages modules, with the canonical public page as return destination. No new editor, private area or inbox.
- Public about/current focus and native `studio_list` content are available for every writer. Anonymous client, null access code, public/non-personal flag check and exact contributor binding; bounded 20-item pages with stable ordering. Media-only galleries, link-only blocks and native item IDs survive.
- Tzvi retains the mandatory `fetchContributorSourceCatalogProjection("tzvi-opoc")`, PUBLIC_VIEW and SOURCE_LIBRARY. Recent shows at most 20; all catalogue items remain reachable by pagination. Paired media and every source reference survive; exact World occurrence links remain the destinations. Community writing remains separate.

## Two real-data regressions caught

1. All **1,053** public native catalogue publications have publication state **`live`**. The prior page-local whitelist omitted `live`, rendering an empty catalogue despite a successful canonical read. The adapter now accepts this existing published state; off/private/candidate/unknown states remain excluded. Fixtures and a regression test now use the actual state.
2. Legacy public visibility defaults to public when unset. Christina has unset visibility and **two explicitly public, non-personal studio items**. The new overview preserves that existing default, with independent studio flags and anonymous RLS; explicit nonpublic values still fail closed. A live anonymous read confirms both items remain available.

## Files

Claude visual commits `09354b33` and `c5da74b6`, integrated as `94ff11f0` and `dc0adcf7`, touch only `ContributorRankSeal2029.jsx`, `contributorRankSeal2029.css`, `ContributorPublicExtras2029.jsx`, `contributorPublicExtras2029.css` under `src/components/contributor2029/`.

Technical integration adds `api/contributor-public-overview.js`, `api/contributor-interactions.js`, and page-local `ContributorActionsController2029.jsx`, `contributorOverview2029Model.js`, `contributorInteractions2029.js`. It updates only `PublicContributor2029Page.jsx`, `PublicSourceCatalog2029.jsx`, its presentation model, the public loader, focused fixtures/tests and this review. App2029, shared frame, Auth/providers, World, Home, Post, Number, Researcher2029Page, database/RLS/site_flags and menus are untouched by this increment.

## Verification

- **35** focused Node cases pass: exact attribution, visibility and publication states, recent/pagination, paired references, rank, membership anniversaries, studio filtering, server recipient resolution, sender verification, message bounds, private/self/guest/cross-origin rejection and no automatic retry.
- Canonical source-catalogue and World-locator test files pass. Date-display rule passes. `npm run build:2029` passes; existing shared-bundle warnings remain.
- Browser action coverage: 320/390/1440 × day/parchment/night, reduced motion, no horizontal overflow, keyboard medallion, gallery/link preservation, guest/member/owner paths, explicit mocked message success and uncertain-acknowledgment state, focus restoration. All external requests intercepted; no live messages/follows sent.
- Built App2029 + real existing frame + World: nine viewport/theme combinations, recent 20, no initial research query, canonical numeric writer route, exact image/text occurrence → reload → back, precise returnTo, existing me/editor document handoffs. No runtime errors.
- Anonymous and simulated-admin loader cases preserve anonymous content requests, private-marker exclusion, automatic-profile noindex and curated indexing.

Local evidence stays under `work/evidence/writer-actions`, `work/evidence/writer-routes`, `work/rank-evidence` and the loader browser report. It is test evidence, not a live product data store.

## Measurements and remaining limits

Live anonymous full Tzvi page-reader sample after the publication fix: **2,798 ms**, **688,469 bytes** for the serialized page view, **1,053** catalogue publications, **20** recent, research deferred. A traced canonical-reader run made zero full research queries. Separate overview sample: **772 ms**, **294 bytes**, no public studio items for Tzvi. These are single server-side read samples, not browser paint percentiles or transferred compressed bytes. Initial catalogue loading still reads the canonical catalogue, as required; only card rendering is paginated.

Hosted Preview browser automation was previously rejected by the existing bot middleware. Local browser evidence and authenticated hosted HTTP checks are reported separately; no security rule is weakened to claim a live browser pass. Existing fragment-bearing Legacy self/editor handoff limitation remains outside this scope.

Public community likes/replies aggregates and public last-connection data are not supplied by the approved reader; the page does not invent zeros or infer them from research/source volume. Shared WatchButton's existing optimistic-error handling is not changed in this writer-only scope; follow verification establishes reuse and the normal successful RPC flow, not a shared-component failure-path repair.

Recommended next additions through the existing owners: writer-selected public introduction/featured writings with native references; saved reading and resuming in the existing personal area; public reactions/replies aggregates from the canonical community reader; an explicit visibility preference before any public presence feature. These are recommendations, not additional stores or completed capabilities.
