# Independent Post enrichment — 15 November 2026

Branch-only follow-up to merged #1345. Base `3843af126f21ae58cf033fe808eaa2821b7a3362`.
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

Prepared on a separate branch; not merged or deployed. The independently prepared publication request for already-merged #1345 is `../post-speed-measurement-20261115/release-request.md`; it excludes this follow-up. Both are collected for the user's later decision, with no approval question during the overnight preparation.
