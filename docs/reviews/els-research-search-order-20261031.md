# Research search organization and optional third term

Task ELS_RESEARCH_SEARCH_ORDER_20261031. Actor GPT; report to ZURIEL only.
Base `50d0a299a28010e78b9e8d3a9227dfe354ed3b53`, remote verified.
Branch `gpt/els-research-search-order-20261031`.

## BEFORE

Canonical read-only connection and bounded live coordination checked. No active
overlapping ELS UI/engine writer found; experimental scopes have AFTER receipts.
The read-only connector cannot write work_log. This is a passive receipt for the
authorized coordinator, not a claim of a live BEFORE row.

User explicitly assigns Research UI organization to GPT. Classic stays intact.
One search surface: regular / crossed / advanced; move the existing advanced
component, not duplicate it. Explain actual reversal/order transformations.
Remove the redundant Research unified-axis button and old full-tool entry; retain
matrix tools, discovery, sources, pair/occurrence planners and saving.

Optional third term defaults unchecked: the two required terms generate pairs;
the third is locally checked around those pairs by the canonical matcher and
verifier, without excluding pairs when absent. Checked retains the existing
three-required-terms path. No inferred speed guarantee or exhaustive coverage.
Test continuation, verification failure, cancellation and Classic isolation.

No Providers/Frame/Raziel/AI, DB/RLS, main, old-branch imports or deployment.

## Implemented

- One Research search surface: regular, crossed axes, advanced. The existing
  `ElsAdvancedSearch2029` is passed as a stable slot into the Native workspace,
  with no second mount or nested form. Drafts/results persist across mode changes.
  Leaving the advanced local form aborts/invalidate its pending work so late
  results cannot replace a later matrix. The separately owned background task is
  not cancelled. Classic's search and full-tool fallback remain available; entering
  Research closes that fallback so the user cannot become trapped without an exit.
- The former upper advanced rectangle is now inside Advanced. The wording names
  reversal of the phrase, individual words, final word, and the canonical two-token
  order/reversal combinations. No arbitrary permutations or automatic AI implied.
- Research no longer shows the redundant unified-axis button or the old full-tool
  entry. Whole-phrase regular search, range/exact/forms, explicit pair/occurrence
  planners, dictionary/structure discovery, sources, saving and the AI card remain.
  No historical capability code was imported or deleted.
- Third-term checkbox is initially unchecked. Optional mode uses the first two
  terms as anchors, the same bounded matcher for their pairs, and the same matcher
  locally for the third term. ELS matches are attached only after canonical replay;
  exact literal-source matches retain the existing corpus check and are labelled
  separately, never as ELS. Adding an optional term does not discard an existing
  pair containing a literal-source companion. An absent/unverified third does not
  remove the pair. Results distinguish local not-found from not-verified.
  Unknown global frequency remains unknown, not a
  fabricated count; optional enrichment does not alter the pair's original score.
- Checked mode retains the existing three-required-term search. Omitted protocol
  flags preserve existing Guided behavior. Continuation keeps the frozen geometry,
  policy and processed-pair identity; stale operations cannot commit. The invalid
  duplicate pair-continuation button is suppressed for three-term wave results.

This does not guarantee exhaustive search or a speedup for required-three searches.
Current term/geometry/wave/replay caps remain. Optional-third matches are local to
the admitted first/second pair, not a separate corpus-wide third-axis scan.

## Verification

- New engine-policy tests 6/6: optional absent, verified/rejected/error, required
  compatibility, mandatory failure, continuation identity, supersession and
  exact literal-source pair/third-term preservation. Connected/window regression
  tests pass together with them: 10/10.
- Focused ELS/Raziel/relationship tests 19/19. Advanced-page browser verifies
  range, exact skip, canonical forms, stop, mode-switch cancellation and replay.
- Library tests for Advanced Page/Batch, Automatic Plan, exact journey reopening
  and the existing Life Journey ELS adapter pass 48/48.
- Final canonical-truth census and deterministic template/public/lexicon parity
  pass 9/9; regeneration produces exactly the already-tested public artifact.
- New real Native UI tests cover default/checked semantics, absent third retaining
  pairs, verified optional projection, one engine and stable drafts. Layouts:
  320/390/1440, day/parchment/night. Screenshots visually reviewed.
- Actual built global Raziel browser passed at 320/390/768/1440 x three presets,
  including mixed-script labels, keyboard/touch and zero automatic AI calls.
- Real Legacy + 2029 builds pass without stubs; lazy/eager graph, isolation,
  hardening, Legacy Production lock and diff check pass. Built graph: 142 reachable
  records, 16 eager records, 419,459 eager JavaScript gzip bytes; the Raziel submit
  adapter/resolver and Research Plan remain lazy.
- Browser harness adjustments preserve the old assertions: the old full-tool
  fallback test now explicitly runs in Classic, while Research asserts its absence;
  returning to regular search uses the regular tab instead of toggling the cross
  tab off. The local-results-filter no-pan check first focuses its input: diagnostic
  capture confirmed native browser focus reveals the field after the taller form,
  whereas filtering after focus does not move the matrix or page. No timeout or
  privacy/verification/no-hit expectation was relaxed. Submit-button assertions
  count the visible active form, not the retained hidden Advanced draft form;
  the two updated mobile/desktop form checks pass 2/2 in isolation.

Final broad non-browser run: 362 tests, 351 pass, 7 fail, 4 skipped. The seven
historical source-regex failures reproduce on the exact clean base (25 tests:
18 pass, 7 fail), in classic-faithful-port (four), research-bar (one),
semantic-surface (one) and visual-representation (one). An unchanged matrix-reading
session timing test failed in an earlier concurrent run, passed standalone with
its related saved-result/replay tests (20/20), and passes in this final broad run;
it was not changed or given a longer timeout. Four PostgreSQL-dependent checks
skip because the local database/binaries are unavailable. No live database/model
calls are used as test proof.

Final full Native Browser acceptance: **58/58 pass, zero skipped**. All 58 unique
test names were partitioned into three isolated browser processes (19/19/20),
with independent Vite caches and an assertion that every test passed exactly once.
The preceding sequential run had 56/58 pass; its two failures were the old
submit selectors also counting the newly retained hidden Advanced form. Both
fixed checks first passed in isolation, then in the complete final run. Product
code was unchanged during this final test-only adjustment.

## Files

Product scope:
- `src/components/experience2029/ElsNativeClassic2029.jsx`
- `src/components/experience2029/ElsAdvancedSearch2029.jsx`
- `src/components/experience2029/elsNativeClassic2029.css`
- `src/pages/Els2029Page.jsx`
- `tools/els/els-code.template.html`
- `public/tzofen.html` (generated by the existing builder)

Tests and passive receipt:
- `test/els-optional-third-term.test.mjs` (new)
- `test/els-native-ui-browser.test.mjs`
- `test/els-advanced-page-browser.test.mjs`
- `test/els-guided-discovery.test.mjs`
- `test/fixtures/els-library-browser-fixture.mjs`
- `docs/reviews/els-research-search-order-20261031.md` (this receipt)

The existing Providers, SystemFrame, Raziel transport, backend functions, database
schema/RLS and experiment ledger are unchanged. No historical branch was imported.

## AFTER — passive handoff to ZURIEL

Actor GPT; task `ELS_RESEARCH_SEARCH_ORDER_20261031`; existing ELS UI/canonical
engine ownership; IMPLEMENTED / TESTED, branch only. Scope is the 12 files above.
Remote base still equals the full Base SHA above. Live coordination was rechecked:
the latest relevant UI scope has a RELEASED receipt; no newer overlapping UI or
canonical-engine assignment was found. No scope is retained after this handoff.

Open gaps: seven pre-existing source-test failures and four unavailable-local-PG
checks listed above. Optional third-term discovery is bounded and not exhaustive;
required-three mode is not promised to be faster. All real browser model/engine
network fixtures are test fixtures, not a paid/live AI acceptance run.

No Preview, Edge or Production deployment; no main merge/push or live product
database write. The old Preview does not contain this cut. The read-only connector
cannot write a live work_log AFTER; this document and the direct user handoff are
the passive receipt for the authorized coordinator. No dispatch or ACK is pending.
