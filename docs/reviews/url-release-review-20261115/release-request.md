# Prepared release request — historical URLs and client parity

**Preparation only. No approval has been consumed for this package.**

One combined PR contains exactly the five pinned source heads in [README.md](README.md) plus the bounded client/CI/review additions. Base: `3843af126f21ae58cf033fe808eaa2821b7a3362`. Use the final full head and green checks from this PR, not an earlier source PR. Do not merge #1349–1353 separately as well.

## Decisions presented together

1. Approve the W0 canonical representation change: WordPress URLs declare the slash-free endpoint already served by the edge; category/tag space aliases declare the existing hyphen representation, including after client hydration. Existing content identity, readable aliases and native Post routing remain intact.
2. Approve squash merge of the exact reviewed combined PR head after CI is green and fresh `main` still equals the reviewed base, or after a reviewed conflict-free integration with new main.
3. Include already merged #1345 in the subsequent website release. It is not currently live: background admission starts earlier and manual GA page identity changes. The unrelated #1346/#1347/#1348 packages are not imported.

The eventual deployment candidate does not exist yet. A deployment approval must identify the actual main commit, built candidate and current rollback deployment after the approved merge. This document does not pretend to pin those unknown values.

## Preparation and execution order

- Read current main, the PR head, all required checks and the three aliases. Preserve the current 2029 deployment as the rollback target, not a historical Legacy deployment.
- Squash only after the corresponding approval. Confirm main's product tree equals the reviewed candidate tree. A merge is not a publication.
- Build only through `node scripts/build-public-reading-production.mjs --public-production-candidate --review-source=<exact-main-SHA>`. Preserve `git.deploymentEnabled=false`, existing flags, required checks and the 15,000 ms canary threshold.
- Present the resulting exact candidate for the deployment/alias approval. Verify candidate metadata and UI before alias promotion; the production canary must be read for the actual promoted deployment, not used as a substitute for candidate checks.
- Perform a bounded post-release check, one request stream: representative historical WordPress paths, numeric researcher and corrected textual researcher location, both taxonomy spellings, source redirect samples with queries, `/WORLD`, native `/post/` and `?p=`. Compare raw server and hydrated canonical/OG tags. Verify normal and in-app manual measurement without the audit's deliberate tracking abort; a new live measurement test requires the approved test scope.
- Confirm the three aliases, candidate/source commit, canary and a small sitemap sample. Avoid a second bulk crawl during release. Log the release date as a measurement change, not an unexplained traffic fall.

## Acceptance and stop conditions

- All existing required checks pass on the reviewed integrated head. The new historical URL step executes 24 tests with zero skipped.
- WordPress canonical destinations are served directly, native `/post/` remains unchanged, and the category/tag canonical does not revert after client hydration.
- Sitemap emits `/community/researcher/israel-panzer`; do not claim the former `/community/researcher/panzer` has been redirected.
- Redirect sources that formerly took two hops take one; sources that first pass through the global trailing-slash redirect can still take two. All query parameters and other redirect properties remain identical.
- Any drift, unexpected destination/status, failed check or canary stops the sequence. Do not relax the gate, retry a bulk crawl or restore content to make the package pass.

## Rollback and evidence limits

For a publication failure, an approved alias rollback returns to the freshly observed current 2029 deployment (observed during preparation: `dpl_C5DBLrWYhELPFDDUaVRJs5W1T6Wj`). For merged source changes, prepare a revert PR; do not delete source branches or evidence. No database or Edge rollback is needed because this package changes neither. Keep the failed candidate and canary evidence.

No new Google indexing result, live speed improvement or complete historical URL coverage is asserted. The source evidence and outstanding URLs remain in #1354. The exact final head, CI result and user decisions belong in the existing PR/journal record.
