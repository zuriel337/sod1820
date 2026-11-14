# Sitemap source-read reuse — 14 November 2026

The site release from `4c9630db48958417796948b32031f06eb22ed3f1` failed its unchanged 15,000 ms canary while requesting `/sitemap.xml` ([run 43649928806](https://github.com/zuriel337/sod1820/actions/runs/43649928806)). Home, entry JavaScript, robots and the health heartbeat passed. All three production aliases were restored to `dpl_89Men3jqSi3pAJ5jGMpp75iZqDzx`, source `9c4cad1372200759e9afe6e9c38709209d4ee02a`. Foundation merge/SQL/check-setting steps did not start.

This patch changes the existing sitemap implementation only. The owning public-source readers, publication predicates, URLs, XML order, cache policy and canary budget remain unchanged. No law, table, RPC, permission, persistent cache, cron, or public surface is added.

## Measured bottleneck and change

The existing handler reads the public post census, then discovers video assets, then re-reads the same admitted posts in batches for video admission. A read-only local execution against the actual public sources made 40 network requests, including 12 avoidable post-source reads. The post and video discovery pagers also waited for one another unnecessarily.

The patch starts those two independent pagers together (at most two reads at that stage), adds the title needed by the existing video reader to the first post projection, and supplies video post-source batches from that request's admitted post map. Other video sources still use their existing bounded reads. The map is discarded with the request; source admission runs again on subsequent requests. The existing three-request peak is unchanged.

| Diagnostic run, before → after | Requests | Elapsed time |
|---|---|---|
| First pair | 40 → 28 | 10,053 → 6,982 ms |
| Second pair | 40 → 28 | 7,907 → 5,550 ms |

All four outputs were byte-identical: 4,219,395 bytes, 16,790 `loc` entries, SHA-256 `b4e6c5016e678d05441686d5216a377093646ebf65fd63edd5b689ff90dae501`. Maximum simultaneous HTTP reads was three in every run. Measurements cover full response bodies, not just headers; only public GET/HEAD and the existing read-only `sitemap_numbers` POST were allowed.

These are two diagnostic pairs from the execution workspace, not hosted latency percentiles or production acceptance. They identify removable work but do not prove the exact cause of the original hosted timeout. The sitemap and deployment configuration files themselves did not change between the old and failed site commits. Hosted acceptance at the original 15-second budget is still required.

## Regression evidence

`test/sitemap-source-reuse-2029.test.mjs` exercises the real handler with more than one post page, duplicate video references and an absent source. It verifies complete URL retention, exact source titles, no redundant post HTTP reads, overlapping discovery, fresh visibility on the next request, and uncached 503 on either or both discovery failures. Non-production behavior remains sequential.

Before the patch: 3 passed, 2 failed (request budget and discovery overlap). After: all five pass. The six focused sitemap/video suites pass 36/36, zero skipped; the complete edited CI step passes 76/76 locally and G1 passes 51/51. Existing cache, book admission, phrase paging, public-video admission and canonical-address checks remain intact. The new suite and the previously existing sitemap cache/reader suites are included in the existing live-contracts CI step. Initial broad local runs lacked files in the sparse checkout; those files were restored and the whole step was rerun successfully.

## Release status and coordination

Base is `main` `4c9630db48958417796948b32031f06eb22ed3f1`; work is on `codex/sitemap-source-reuse-20261114`. Codex owns this narrow implementation scope, recorded in the existing passive journal `d558163b-900a-4a06-9ad5-0d13dbac09ea`. Foundation #1342 remains unchanged. The workflow line shared with #1342 must be preserved when integrating both patches.

There are two existing release-evidence issues to distinguish from this patch's tests:

- The old/new browser proof on this base has the known baseline error fixed in reviewed #1341/#1342. Do not weaken or remove that proof.
- GitHub still lists deployment `7795009894` (failed site source `4c9630db4`) as successful even after the Vercel aliases were rolled back. The failed canary on that SHA must remain failed. The previous deployment `7789759332` is already successful and matches the actual aliases. Attempting to mark only the rolled-back deployment inactive was denied by GitHub with HTTP 403, `Resource not accessible by integration`; no deployment status changed. A deployment-status writer can reconcile that exact record, without changing commit statuses, canary thresholds or bypass settings.

No merge or new deployment is authorized by this document. The failed release evidence remains preserved. No additional release attempt has been made.
