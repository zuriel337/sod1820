# Combined release candidate: sitemap partitions and readable Home fallback

Branch: `codex/royal-palace-shared-intro-v1-20261121`, draft PR #1469.
Base: `886f80db20a6cf21d655a7766d1595766cbd32cd`.
Includes requested PR #1476 head `240e71e4e4167a7c9958d65f830f6211fa704b03` (local merge `64379e9`) and canonical Home series-name correction `0c5b6b2`.

## Sitemap correction

The public endpoint now returns a dynamically counted index with content, catalog and bounded 1,000-row phrase maps. Existing public-source predicates, URL encoding, metadata, video admission and six-hour CDN cache policy are retained. No SQL, snapshot, new RPC, cron, client dependency or budget changes. A missing count or unavailable source returns uncached 503. Every child is checked by the canary with the unchanged 15-second deadline; it cannot pass on the index alone.

Real readonly source diagnostic: the former single handler took 20,726 ms, 28 reads, 4,229,091 XML bytes. Partitioned root: 1,883 / 2,439 / 2,944 ms, one HEAD, 1,454 bytes. Content: 4,976 / 5,658 / 4,668 ms. Catalog: 5,168 / 5,215 / 6,078 ms. Phrase pages: 1,001–2,247 ms across the recorded reads. All 16,808 URL entries, including their metadata, matched the old handler exactly in the captured-source parity replay.

These are local handlers using real public readonly sources through the environment proxy, not Vercel cold/warm benchmarks or proof of live recovery. The 4,280 ms full-map row in source-read-results.json is a parity replay with reused responses, NOT a speed measurement. The first round overlapped a local build; subsequent rounds did not. Full crawler discovery still downloads all entries; this fixes bounded response time, not the size of all content combined. Source changes across crawls/cache ages remain possible, as with any offset-paged sitemap.

## Readable Home fallback

On worker admission failure, preserve existing server first words and working public links with a status message. Do not start the app without worker admission or bypass Auth. Existing article preservation remains. This addresses an observed failure path, not a verified diagnosis of the user's live browser report. PR #1476 supplies Home first words; the combined tests verify both normal replacement and worker-unavailable preservation at 320, 390 and 1440 pixels.

## Validation

- `npm run build`: PASS, including fixed shell budget.
- `node scripts/build-public-reading-production.mjs`: PASS, including public shell budget.
- Final focused unit/contract suite: 67/67 PASS (partition parity, source failure, all-child canary, cache, worker fallback, content-first Analytics and CI references).
- Home real Chromium: 6/6 PASS, zero skipped, normal and worker-unavailable paths at all three widths.
- Additional Auth/artifact/content-first Chromium and remote CI: recorded in the delivery after completion.
- Existing reader timing/CLS evidence and limitations: ../reader-demand-20261121/README.md. No claim of universal page-speed improvement.

Release status: branch-only. Production has not been modified. Existing production canary on main fails on sitemap timeout; that failure is not silently waived by local tests. No gates, thresholds or baselines were relaxed. No product database changes, deployments or aliases were made. Coordination read found no overlapping active sitemap/transport writer. The readonly ledger connector cannot record an AFTER entry; handoff is to ZURIEL.
