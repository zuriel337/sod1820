# Public contributors 2029 — isolated local review

Actor: GPT. Handoff to: ZURIEL. Task: PUBLIC_CONTRIBUTOR_PAGES_20261023.
Owners: existing Experience/Design V2, Research Intake/attribution and public-reader owners; no new store/identity/graph.

Status: IMPLEMENTED_LOCAL / TESTED_WITH_SYNTHETIC_DATA. Route proposal only. No push, merge, hosted Preview, Production action, DB write, RLS/grant/migration/site_flags change or inter-agent dispatch.

## Bases and reconciliation

The initial required visual branch was remotely verified at `7e71450fced1f3a763d8d1d46ca9621222b4005d`. Initial isolated draft: `claude/2029-public-writer-pages-20261023`, commit `997282c07a44f56ae2041794367dda1b5e94616d`.

ZURIEL then supplied the Tzvi-specific source-catalog contract. The source-reader branch was remotely verified at `cfa786c186b449c6a616566724666937d415d508`. Final isolated branch: `claude/2029-public-writer-pages-catalog-20261023`, based directly on that commit. Commits `320c2082`, `43309c22`, `cfa786c1` are ancestors in the required order; they were not reapplied or modified. The new draft files alone were transferred as `2669ee0c`; the final completion commit follows this handoff.

Current origin/main was verified at `e73687221aa2ab639930643e5cc8c99666adce88`. During final checks the World branch advanced to `10f5be05d01d59056c765b89675d8d524769a750` (exact source research facets). It is not consumed: requested cfa786c1 remains the base; no optional research enrichment on entry.

Live bounded work_log_current checks used the dedicated sod1820_supabase_readonly connector, with transaction_read_only=on; no conflicting active writer found for the newly created page/component paths. No ledger writes were attempted; this is the passive handoff for the authorized coordinator, not a claimed work_log row.

## Implemented

- New public page, canonical code/slug identity lookup via the anonymous client, canonical contributorHref, SEO and public profile fields only. Private profile visibility is rejected. /researcher/:slug and its noindex remain unchanged; me is left to Legacy in the route proposal.
- General public page reuses fetchContributorFindingsProjection in PUBLIC_VIEW and the existing ContributorFindingsLens for source disclosure; every admin/session read path is excluded. Exact attribution only; source without Findings remains a source; partial/unavailable is distinct from zero. Community messages are never relabelled as articles. No invented strength/quality/comment score.
- Tzvi uses fetchContributorSourceCatalogProjection('tzvi-opoc') in PUBLIC_VIEW. Its canonical SOURCE_LIBRARY wrapper defers research. No research_objects/world_contributor_research_v1/lexical request on entry. The canonical wrapper also reads attributed contributions internally; no extra reader was invented. These same results supply the separate community section.
- Tzvi opens catalog.recentItems, capped at 20. Complete loaded catalogue is reachable in 20-item pages; format/topic/page/item survive URL reload. Paired image+text remains one card and retains native linkedSourceRefs/sourceRecordCount. No independent-source claim is made from record count.
- Categories use structured channel_updates.topics evidence only. Source cards link to their exact canonical World occurrence; no private Tzvi route or local research corpus. Missing exact locators are labelled unavailable. off/private/candidate/public_candidate sources are excluded.
- Shared theme/token consumption, RTL, bilingual real dates, 44px controls, wrapping long titles, missing avatar/bio handling, keyboard focus and progressive disclosure. No standalone shell/global navigation/bottom bar.
- Same-origin, known-surface return context validation preserves query/hash for World, posts, topics, numbers, books, sources, community and search.

## Recommendation after the community clarification

One public contributor identity and shared visual template, with source-led emphasis for Tzvi. Header: public identity/description plus independently verified counts only. Never add source-upload and community-writing totals.

Maintain two visible content families: **כתיבה בקהילה** (messages, replies, authored community content) and **כתבי מקור וחומרים שהועלו** (native source catalogue). They share the contributor identity, not their content type or count. Add a compact **בקהילה** filter to the shared general page in central integration; the catalogue variant already has a distinct community entry.

A community card should show a short message, its actual bilingual date, a direct link to the exact thread/message, received likes and received replies where the existing authorized reader provides them. Replies the writer authored are a separate filter from replies received. Do not publish a person's list of liked items by default.

Reuse the existing community/ReactionBar capabilities with an anonymous public read seam, not a second reaction system. The public result should contain aggregate counts and the viewer's own selected state, not raw liker account IDs. Imported historical counters must be labelled as archive history; administrator boosts must not be represented as a count of distinct people. Likes measure community engagement, never research strength or correctness.

Tzvi: source catalogue first; optional approved research picks only from public World readers. Keep introduction, 20 recent publications, gallery, structured source topics and an explicit World research entry. No full research table or admin inventory on entry. Other writers may foreground genuine authored articles/community writing when those exact source types are provided. Empty families collapse or explain unavailability rather than acquiring dummy cards.

## Validation

PASS:

- `node --test src/components/contributor2029/publicContributor2029.test.js src/components/contributor2029/publicSourceCatalog2029.test.js` (16 focused test cases when run directly).
- `node --test src/lib/research/contributorFindingsProjection.test.js src/lib/research/contributorSourceCatalogProjection.test.js src/lib/research/worldContributorSourceLocator.test.js`.
- `node scripts/test-contributor-findings-projection.mjs`.
- `node scripts/test-2029-world-surface.mjs`.
- `npm run test:public-2029-language`.
- `npm run build:2029` (existing chunk-size/ineffective dynamic import warnings).
- Separate review build importing the new, deliberately unrouted page, so the new component graph was compiled as well.
- `git diff --check` and `git apply --check docs/reviews/public-contributor-2029-route.proposed.patch`.

Browser evidence: 320/390/1440 × Day/Parchment/Night for general and Tzvi views (18 captures). No horizontal page overflow. Six additional generic loading/empty/error/unknown/partial/long-title scenarios. Focus indicators, accessible names/ARIA tree, minimum control sizes, supporting text size, section/item reload, pagination and separate community/source rendering checked.

Public data integration was exercised with intercepted synthetic HTTP responses and a simulated signed-in administrator. Generic path: 8 anonymous requests. Tzvi path: 6 anonymous requests (2 identity, 3 source, 1 canonical contribution request), **zero research requests**, 20 initial source cards, no request per card. Tzvi fixture render: ~814ms anonymous/~903ms simulated admin in the final run. These are local fixture measurements, not production/server/network benchmarks. No actual administrator identity, private corpus or raw production message was acquired for screenshots. No actual screen-reader session or hosted deployment acceptance was performed.

The requested base does not contain scripts/test-legacy-production-lock.mjs; no production-lock pass is claimed. No Production action was attempted.

## Boundaries and remaining central connections

Unchanged against cfa786c1: App2029.jsx, vercel.json, ContributorPage, SystemFrame, World/Home/Post/Number/Books/Researcher pages, existing readers, DB/config/Legacy.

The route patch is deliberately unapplied. It places the public component inside the existing frame at /community/researcher/:slug, leaves /community/researcher/me to Legacy, and preserves /researcher/:slug. Central document routing/hosting must continue serving me/editor routes from Legacy. No standalone route/hosting change was made. Consequently there is no hosted Preview or live exact Tzvi URL for this implementation.

Connect centrally, using contributorNavigation2029 with the actual current location and verified contributor identity:

1. World people/source bylines: preserve active filter, finding/sourceRef and anchor.
2. Post authors/credits: preserve precise source section and paragraph anchor.
3. Topic/number/book/source attribution: preserve the exact native object/selection.
4. Community authors/replies: exact contributor identity and thread/message return.
5. Search results and researcher index: canonical code/slug URL and exact result return.

Reader-owner follow-ups (not implemented by a visual session): injectable anonymous Topic reader; source-native authored-Post/fragment references; public aggregated likes/replies and exact community parent/message links; live public-data and real screen-reader acceptance. The current generic reader does not carry all these fields. Missing data is explicitly unavailable; no substitute reader, guess or score was introduced.

## Reproduce local review

Use the pinned lockfile in a writable cache location. Start `npm run dev -- --host 127.0.0.1 --port 5181 --strictPort`. With Python Playwright and Chromium installed, from this repository run:

1. `python test/public-contributor-2029.browser.py` (creates a localhost-only work/ HTML harness).
2. `python test/public-contributor-2029-loader.browser.py`.
3. `python test/public-contributor-catalog-2029.browser.py`.

Evidence is copied under this review's adjacent evidence directory. Fixture modules/harnesses are not imported by the production page; the production application route remains unmodified.

## Files

- `docs/reviews/public-contributor-2029-evidence-20261023/browser-results.json`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/1440-dark.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/1440-light.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/1440-parchment.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/320-dark.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/320-light.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/320-parchment.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/390-dark.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/390-light.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/catalog/390-parchment.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/1440-dark.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/1440-light.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/1440-parchment.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/320-dark.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/320-light.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/320-parchment.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/390-dark.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/390-light.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/general/390-parchment.png`
- `docs/reviews/public-contributor-2029-evidence-20261023/loader-browser-results.json`
- `docs/reviews/public-contributor-2029-evidence-20261023/results.json`
- `docs/reviews/public-contributor-2029-handoff-20261023.md`
- `docs/reviews/public-contributor-2029-route.proposed.patch`
- `src/components/contributor2029/PublicSourceCatalog2029.jsx`
- `src/components/contributor2029/contributorNavigation2029.js`
- `src/components/contributor2029/loadPublicContributor2029.js`
- `src/components/contributor2029/publicContributor2029.test.js`
- `src/components/contributor2029/publicContributor2029Fixtures.js`
- `src/components/contributor2029/publicContributor2029Model.js`
- `src/components/contributor2029/publicSourceCatalog2029.test.js`
- `src/components/contributor2029/publicSourceCatalog2029Fixtures.js`
- `src/components/contributor2029/publicSourceCatalog2029Model.js`
- `src/pages/PublicContributor2029Page.jsx`
- `src/pages/publicContributor2029.css`
- `test/fixtures/public-contributor-2029-review.jsx`
- `test/fixtures/public-contributor-catalog.svg`
- `test/public-contributor-2029-loader.browser.py`
- `test/public-contributor-2029.browser.py`
- `test/public-contributor-catalog-2029.browser.py`
