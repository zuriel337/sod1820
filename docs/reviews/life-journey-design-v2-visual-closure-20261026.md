# Life Journey 2029 · Design V2 visual closure — 26.10.2026

Task: `LIFE_JOURNEY_2029_DESIGN_V2_VISUAL_CLOSURE_20261026`
Base: `gpt/2029-central-life-journey-synthesis-integration-20261026` @ `33c8644c3f8654734f63b340fd4c87d796db1366`
Branch: `claude/2029-life-journey-design-v2-20261026` (created at exactly the base SHA; no cherry-pick, no reset, no Raziel/Life Journey cut re-applied)

## BEFORE (bounded to display paths and tests)

- `PersonJourney` in 2029 shared `person-journey.css` with Legacy and had no `.is-2029` layer. The Name, Date and ELS capability roots did not carry `is-2029` at all.
- Computed-style scan against the real tokens found sizes of 8–13px, weights 800–900, `font: inherit` controls rendering in Noto instead of Rubik, map tabs at 11px, 36–38px controls, and counters/progress in Noto/Rubik rather than IBM Plex Mono.
- The previous browser PASS used a mock colour palette: no System Frame CSS, no `--s29-type-*` / `--s29-font-*` tokens and no real fonts. It was not Design V2 evidence.
- Live coordination read (`work_log_current`, read-only, 3 days): no overlapping active writer on Life Journey scope.

## What changed (display only)

- `person-journey.css`: a single scoped `.person-journey.is-2029` layer (Legacy rules unchanged). Specificity is raised with `:not(#pj-v2)`, not `!important`. It owns:
  - Noto Sans Hebrew for reading, Rubik for controls/tabs/headings/UI labels, IBM Plex Mono for counters, dates, progress and ordinals;
  - Design V2 tokens: micro/support ≥14–15px, UI 16px, body 18px, lead 21px, section title 28px, display up to 46px;
  - weights 650–700 only (no 800–900); controls ≥44×44; focus ring; wrapping map tabs; reduced-motion;
  - per-selector floor corrections generated from the Legacy rules (sizes <14px, weights ≥800, controls <44px).
- Same floor corrections applied in place to the 2029-only `life-journey-maps-2029.css`, `life-journey-time-map-2029.css`, `birth-map-studio-2029.css`.
- Hierarchy (`PersonJourney.jsx`, Name/Date views): top of screen shows identity, state chip and one primary action ("פתח את המחקר שלי" or, before save, "מלאו את הפרטים שלכם"). The duplicate research buttons were removed. Personal details fold after the first save. Member birth place/time/source fold into "פרטי לידה ומקור" (account verification stays visible). Engine/method lists in Name and Date sit in an "שכבת המנוע" disclosure. Invitations/sharing/delivery render last in the family section. Decorative orbit is hidden on narrow screens. ELS stays a visible, disabled "ממתין לחיבור" branch in the guided path; nothing activates it.
- No engine, data, Research Context, provider, transport, DB, RLS, site flag or Production change.

## Tests

- `test/fixtures/life-journey-fixture-plugin.mjs` — fixture plugin extracted unchanged from the existing browser test so both tests share it.
- Fixture entry now builds the shell from the real `DESIGN_V2_PALETTES`, `designTokens.js` type scale/typefaces, `sod2029*.css`/`systemFrame2029.css`, the real `/fonts` files and the real `sod29-sidebar/main/content` wrapper (replacing the mock palette).
- `test/life-journey-design-v2-typography.browser.test.mjs` (new) + `test/fixtures/life-journey-typography-audit.mjs`: asserts real fonts load; token values are 14/16/18/21/28/46px; then walks Person (empty/saved), family, all 13 map tabs, time-gate lenses, birth-studio lenses, Name and Date at 320/390/1440 in Light/Parchment/Dark with every disclosure opened, checking per visible text node: ≥14px floor, controls ≥16px, desktop support text ≥15px, Rubik controls, Noto Sans Hebrew prose, IBM Plex Mono numeric sequences, no weight ≥800, multi-line weight 650–760, targets ≥44×44, no horizontal scroll, reduced motion.
- `life-journey-person-context.browser.test.mjs`: panel assertion checks the real surface (gradient or colour); one step opens the new "פרטי לידה ומקור" fold. All privacy, exact-return, refresh and no-auto-research assertions are unchanged.

```sh
CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome node --test test/life-journey-design-v2-typography.browser.test.mjs test/life-journey-person-context.browser.test.mjs
node --test src/lib/research/lifeJourney*.test.js src/lib/research/researchPathContinuity.test.js test/life-journey-2029-chain.test.mjs test/life-journey-hint-reference.test.mjs
node --test src/lib/research/razielSession2029.test.js src/lib/research/razielSavedSession2029.test.js src/lib/research/razielSessionRequestLoader2029.test.js test/raziel-session-frame-seam-2029.test.mjs src/lib/research/razielActionContract.currentMain.test.js test/els-raziel-context.test.mjs
npm run build
node scripts/build-integrated-preview.mjs
node scripts/test-integrated-preview-auth-guard.mjs
node scripts/test-2029-isolation.mjs
node scripts/test-legacy-production-lock.mjs
node scripts/test-2029-built-graph.mjs
node scripts/test-2029-cheap-hardening.mjs
git diff --check
```

## Results

Typography audit **1/1 PASS**; expanded browser chain **1/1 PASS**; Life Journey + continuity **77/77 PASS**; Raziel provider/session/seam/action tests unchanged and PASS (no Raziel/System Frame/App2029/provider/transport file is in the diff); normal dual build and integrated Preview build PASS; auth/read-only guard, hard isolation, Legacy lock, cheap hardening and `diff --check` PASS; eager gzip recovery **73,270 bytes** (≥12,288 required).

Known unrelated failure: `test/els-2029-raziel-consumer.test.mjs` ("accepts bounded ELS context…") fails identically on the untouched base SHA. It tests System Frame/Raziel source, which is out of scope here, and was not touched.

Fonts: Noto Sans Hebrew and Rubik are the repo's self-hosted files and are verified loaded. IBM Plex Mono is loaded from Google Fonts in `2029.html` and is not self-hosted, so the sandbox asserts the computed font-family stack (`'IBM Plex Mono'` first), not glyph rendering.

## AFTER

No hosted Preview, merge, Production, DB, RLS, grant or site-flag action. Legacy Production remains pinned.

Status: IMPLEMENTED + TESTED + branch-only PR_READY.

## Addendum — interactive research tree and centered actions (branch `claude/2029-life-journey-tree-20261026`, stacked on `15a6a43`)

Review of `15a6a43` found no structural blocker (display-only diff; no provider/transport/System Frame/engine file touched), so the tree followed immediately.

- `LifeJourneyTree2029.jsx` + `life-journey-tree-2029.css`: the "מפת־על" panel opens with one research tree. People come from the existing `generations` and `coverage` projections (parent → child, each person once). A node expands to branches: שם → matrix, תאריך → time gates, משפחה → generations, Human Design / שמיים → birth studio lens, ELS → a visible, disabled "ממתין לחיבור". A branch only calls the existing `selectMap(tab, {memberRef, lens})`. No new store, graph or engine; no research, Raziel, ELS or chart calculation is started.
- Action alignment (`person-journey.css` §11–12): primary actions are centered at a shared width; member and selection actions are equal-width grids; the hero action is full width and centered on mobile.
- Tests added to the typography browser test: one tree for person + family, child under parent, ELS disabled, date/sky branches keep the focused person, return keeps the open node, call counters unchanged across tree navigation, primary buttons centered within 2px. The typography audit also scans the tree.
- Results: both browser tests PASS; Life Journey 77/77; Raziel/session 51/51; normal and integrated Preview builds, auth guard, isolation, Legacy lock, cheap hardening, built graph (73,263 gzip bytes recovered ≥ 12,288) and `diff --check` PASS.

Status: IMPLEMENTED + TESTED + branch-only PR_READY. No Preview, merge, Production, DB/RLS or site-flag action.

## Addendum 2 — visible research tree + capability atlas (same branch)

Direction approved by ZURIEL: a visible tree and a visible atlas of every capability, no hidden "all maps" layer and no 13-tab row.

- **Placement (2029 only):** hero → research tree → capability atlas → map panel (when a card is opened) → personal details → family. The old "החיבורים הראשונים" card was removed from 2029 (the atlas covers it) and the family section is now "02". Legacy keeps the tabs and its original position.
- **Tree** (`LifeJourneyTree2029`): person + family in one tree (each person once, child under parent), selection via `aria-pressed` buttons in nested labelled lists (no `role="tree"`, so no unsupported keyboard contract). Vertical on mobile; layered stage with CSS perspective on desktop (flattened under `prefers-reduced-motion`). CSS only: no WebGL is used, so there is nothing to fall back from. Selecting a person only moves the existing map focus in Research Context.
- **Atlas** (`LifeJourneyAtlas2029`): five visible groups of cards without any accordion — personal research (name, date, time gates, personal picture), family and connections (family tree, generations, relationships, convergences, family timeline), deep maps (Human Design, sky, creation, Sefer Yetzirah), evidence and sources (matrix, strength/gaps, sources, coverage, guided path) and "soon" (ELS, hints decoding, Raziel preview). Each card has its own inline SVG illustration (no personal data), a title, one sentence, a real state chip (זמין / ממתין לנתון / נבדק / בבנייה / ממתין לחיבור) and an action when available. Royal Blue marks available actions, gold marks checked findings, future cards are dashed, grey and have no action. Hover/lift transitions ≤220ms.
- **Routing:** "מסע השם" → `openCapability(member,"name")`; "מסע התאריך" → `openCapability(member,"date")` (disabled with a reason when the date is missing); family cards open generations/relationships/convergences/timeline; Human Design and sky open the existing studio lenses; the family-tree card focuses the tree. Opening a map shows the existing panel under the atlas with "חזרה לאטלס". The selected person and open view live in the existing map position, so exact return keeps them.
- **Nothing new:** no engine, Context key, provider, transport, Raziel, ELS, DB or data change; the Raziel/ELS/hints cards are display-only. Internal method lists stay inside the existing disclosures.
- **Tests:** the typography browser test now proves every group and card is visible without a click, no tab row/accordion, per-card illustrations, ELS/hints/Raziel are action-less, tree order and nesting, no research on tree selection or map cards (call counters unchanged), name/date capability routing with exact return of the selected person, all 15 map cards opening their existing view, and the full computed-style audit over atlas, tree and every opened map. The chain test uses atlas cards instead of tabs.
- **Results:** both browser tests PASS; Life Journey 77/77; Raziel/session 51/51; both builds, auth guard, isolation, Legacy lock, cheap hardening, built graph (73,262 gzip bytes recovered ≥ 12,288) and `diff --check` PASS.

Status: IMPLEMENTED + TESTED + branch-only PR_READY. No Preview, merge, Production, DB/RLS or site-flag action.
