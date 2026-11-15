# Independent Post enrichment — 15 November 2026

Follow-up to #1345, integrated onto live/main `fec22ca072ce48114beab161988620d47b7392b8`. The original comparison base is `3843af126f21ae58cf033fe808eaa2821b7a3362`.
Existing Post reading/source admission and governed Context Pack owners remain authoritative. No law, schema, cache, truth calculation or reader is added.

## Change and scope

The real reader previously awaited Bennett focus checks before starting independent saved-story checks. It also waited for the FZ topic lookup before starting the ID-scoped pack's canonical traces and compiler downloads. These branches now overlap. Rendering still waits for all required results; the same canonical verification determines which equalities are interactive, and related links still reopen through the existing access-controlled readers.

An early pack rejection is observed immediately and rethrown at the final join. If another dependency fails or the source read is cancelled first, the pack cannot leave an unhandled rejection behind. Source invitations still fetch no pack; ordinary posts still fetch no traces; denied sources remain denied. No shared cache crosses visitors or routes. Successful reads use the same total query set. On an earlier failure, independent read-only pack work may already have started; it is bounded by the same registered claims.

This improves scheduling in specific enriched posts. It does not change document TTFB, ads, ordinary-post layout, source text, SEO destinations, privacy rules or the canonical engine. Bennett's live URL returned 404 in the earlier audit; its fixture benefit is not evidence of a current public-page improvement.

## Reproduction and tests

- Before the change, three of the five initial scheduling cases failed: story calls and pack traces had not started while the prior independent operation was blocked. After the change, all scheduling cases pass.
- `test/post-projection-parallel-20261115.test.mjs`: actual reader, controlled I/O/pack boundary; starts work before dependencies complete, waits before exposing success, refuses false equalities, observes early/late failures, preserves cancellation and denied/invitation behavior. Wired to the existing Live Contracts workflow; no new gate or changed threshold.
- Existing real pack/compiler/number-executor owner suites remain unchanged and pass. The scheduling fixture does not claim to validate those compilers itself.
- `compare.mjs` builds the base and current reader, runs three alternating pairs per scenario, and asserts identical full projection and total query set. Each simulated I/O takes 250 ms. `controlled-comparison.json` holds every result.

| Scenario | Median before | Median after | Interpretation |
|---|---:|---:|---|
| Bennett focus + story | 502 ms | 251 ms | Independent verification waits overlap. |
| FZ1073 topic + traces + connections | 502 ms | 502 ms | The later connection lookup remains the longest dependency chain in this fixture. |

These are controlled **reader** timings, not browser LCP, production p75 or a forecast. Pack compiler I/O is stubbed only in this scheduling comparison; no live data or Google event is written.

```sh
node docs/reviews/post-projection-parallel-20261115/compare.mjs /tmp/post-projection-comparison.json
node --test test/post-projection-parallel-20261115.test.mjs
```

## Release state

ZURIEL instructed Codex to continue after #1355 was released. #1346 now integrates the preserved heads of #1347 (GA evidence only) and #1348 (authenticated no-import preview), on current main `fec22ca072ce48114beab161988620d47b7392b8`. There were no merge conflicts. Source behavior is unchanged from the separately reviewed candidates; the final integrated head and CI outcome are recorded in #1346 and the existing passive journal.

The old `../post-speed-measurement-20261115/release-request.md` and `production-request-3843af12.json` describe the earlier #1345 preparation. They are historical and must not be executed: #1345 is already live through #1355, deployment `dpl_5zVyxXPYNf7tH4jaovi7C4So2FEf`.

This continuation has separate operational effects despite one integrated code review:

1. Squash the exact green integrated #1346 head; verify the resulting main tree.
2. Build and verify that exact main through the existing public-production-candidate command, then publish the website and run the unchanged post-alias canary. The currently live deployment above is the rollback candidate, subject to a fresh alias read. Website publication does not deploy Edge functions.
3. Re-read `ga-sync-server` source/version/JWT/bundle against the baseline in its own README. Deploy only that function's reviewed file with unchanged `verify_jwt=false`; download and compare exact bytes. Its authenticated dry-run does not import, while ordinary scheduled calls retain their existing behavior.
4. An authenticated preview requires the existing server credential mechanism. No secret is copied to the workspace, chat or browser. If that execution channel is unavailable, report preview pending; do not invoke the import path or create a wrapper/schedule to work around it.
5. The narrow Google history-events setting remains a separate action: this session has no callable signed-in GA interface. Do not claim that repository integration changes that setting, corrects historical counts or restores GA ingestion.

No new schema, store, law, permission, cron, public activity field or measurement classifier is introduced. No full identity expansion, data import/backfill or GA setting is bundled into the website release. Actual merge/deployment results and limitations belong in the PR/journal so the verified head is not edited after testing.
