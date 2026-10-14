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
