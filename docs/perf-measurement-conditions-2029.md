# 2029 load measurement — shared base and conditions (14.10.2026)

Status: measurement protocol only. Not a product contract. Branch-only, no merge/deploy.

## Shared base
- Base = the commit that adds this file on top of PR1092 head `91a4c925` (`gpt/shared-preview-integration-20261014`).
  Product code is byte-identical to `91a4c925`; this commit adds only `scripts/perf/*` and this file.
- All three perf sessions (load-before-data, world/posts dependency, DB read cost) branch from this commit and report deltas against it.
- Not main: main `5dd7032e` does not contain the already-approved lazy hebcal / lazy calculators / bundle-budget commits.

## Conditions (fixed — change none without recording it)
- Harness: `node scripts/perf/harness.mjs run --dist <dist> --label <name> --routes /,/world,/post/seventh-to-tenth-sefirot-2027 --runs 7 --out <file>`
  (build first: `npm run build`; Playwright from `PLAYWRIGHT_DIR`, default `/opt/node-tools`; Chromium `/opt/pw-browsers/chromium-1194`).
- Profile: mobile 390x844 DPR2, CPU x4, network 1.6 Mbps down / 750 kbps up / 150 ms RTT, cold HTTP cache (fresh context per run), brotli on static server, immutable `/assets`.
- Supabase: GET responses replayed from `scripts/perf/fixtures.json.gz` (recorded from production public reads, read-only, against this base) with a fixed 150 ms delay; non-GET writes are answered 204 and never leave the machine. Re-record (`record` mode) is needed when a change alters a query URL — fixture misses are printed. Record on the base AND on the variant, otherwise misses return `[]` and distort data timing.
- Third parties (Google Fonts CSS, GA) answered empty after 400 ms (`--extdelay`).
- Statistic: median of 7, plus min–max range in the JSON (`spread`). A difference smaller than the range is noise.
- Never conclude from TBT alone: report FCP, LCP, root-render, first CONTENT request (not telemetry RPCs `link_identity/track_visit/ingest_event`), last REST end, script/task ms, JS KB, request count.
- Content request = anything under `/rest/v1/` other than the three telemetry RPCs above (see `sbList` in the output).
- Routes: home `/`, world `/world`, post `/post/seventh-to-tenth-sefirot-2027`.

## Scope split
- Session A (this lane): everything before data arrives — JS fetch/parse, fonts, React boot, auth, flags, shell, first content request timing.
- Session B: World's dependency on Posts.
- Session C: DB read cost (query count/shape/size).
- Do not edit another lane's files; report to the coordinator; no integration of a lane's change before its report is collected.

## Correction (same day)
The first revision used `/2029` as the home route. On this base `/2029/*` is an alias redirect and home is `/`; the first fixtures and any Home number measured via `/2029` are INVALID. Use route `/` and the re-recorded fixtures in the correcting commit.

## Runs table (lane A is the only writer)
Experiment key = base SHA + route + change + metric. Check here and in work_log (task_key) before repeating a run; re-run only if base or conditions changed, and say why.
Base for all rows below: product code of `91a4c925` (== `13fccd0b` product; tool commits differ only in `scripts/perf`). Harness `scripts/perf/harness.mjs` / `nav.mjs`, conditions above, median of 7 (nav n=5), range in `docs/perf-evidence-20261014/load-before-data/res-*.json`. Journal: `PERF_LOAD_BEFORE_DATA_2029_20261014` (AFTER row 048514de).

| key (change) | routes | result vs base (median; non-overlapping range = real) | comparable |
|---|---|---|---|
| base | `/` `/world` `/post/…` | Home FCP 1940 / READY 4746 · World 2184 / 4660 · Post 1912 / 4305 | yes (main baseline) |
| F1 no font wait | all | neutral | yes |
| F2 Google CSS non-blocking | all | neutral in lab (3rd-party cost not modelled) | yes |
| F3 no font preloads (needs F1) | all | FCP −400, READY −170…−290; post CLS 0.008→0.038 | yes |
| s3a Noto-only preloads | all | CLS 0.009 kept; FCP −210 | yes |
| E4 early content read | `/`, post | first content req Home 4308→2513, Post 3880→2834; READY −180 / −350 | yes |
| E5 lazy ContactGateway | all | shell −8KB br; READY noise | yes (not on branch) |
| E7 lazy post projection (WorldFlightStory) | `/` | READY −220, LCP −290 | yes; lane B reports World −221 with same change |
| final stack (E4+E7+F1+s3a, tip `879ad70a`) | all | Home READY 4282, World 4398, Post 3904, CLS unchanged | yes (product differs from base: 4 commits) |
| persistent shell (patch only) | cold + nav | cold FCP +800; nav no gain; blocking/CLS worse | yes |

Other lanes' rows (not mine, cited): lane B `PERF_POSTS_WORLD_ISOLATION` (base 91a4c925, measure-2029-v2, n=14: small READY effect, CPU −21…−32%) — NOT comparable to this harness; lane B `PERF_POSTS_WORLD_FIXTURE_RERUN` (base 13fccd0b + patch, this harness, 3×7) — comparable; lane C live DB single-call EXPLAIN (anon) — DB time, different method, not comparable to harness numbers (the harness replays Supabase at a fixed 150 ms and does not measure DB time).
