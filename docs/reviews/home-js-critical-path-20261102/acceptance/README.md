# Home JavaScript critical-path evidence

Current comparison: [25709d70 acceptance](candidate-2570-report.md) and
[all-stage before/after tables](matched-tables.md). The baseline sections below
are historical, retained evidence; their provisional medians are not the final
paired aggregate. Both final targets use the explicitly matched external-toolbar
control documented in the acceptance report.

Task: `PUBLIC_HOME_JS_CRITICAL_PATH_20261102`.
Evidence BEFORE: `151e786a-c442-4e66-966d-6f973188ccd4`.
Product baseline: `0d4ad83644a74abe5d990f7a628dd955fd0c638a`.
Protected baseline: https://sod1820-mqamksdab-sod1820-s-projects.vercel.app
Deployment: `dpl_GS12MCQnDxXFfVLiPgxNeaSRYeKa`.

This lane owns only evidence/harnesses in this directory. The central integrator
owns source, builds, Preview deployment, coordination and Doc37. The canonical
readonly connection and current BEFORE scope were independently verified; the
remote product matched0d4 and remote main was2195c978. No live data/server/setting
changes or positive login, model, mail or playback are part of these measurements.

## Measurement separation

- `native-home-js-diagnostic.cjs` collects CDP CPU samples, precise coverage,
  compile/evaluation trace, sanitized request initiator stacks, fonts and DOM
  milestones. Instrumentation adds overhead; its time must not enter the matched
  timing series. Coverage is execution evidence, not permission to remove code.
- `native-matched-journeys.cjs` uses no Profiler/Debugger/Tracing/coverage. Three
  fresh contexts per width run a cold visit and an actual reload in the same
  context, with actual SW and public data. Primary DOM readiness is the unchanged
  `[data-home-primary="ready"]` plus real hero title; it is not claimed to be
  full-opacity paint. The primary Post is clicked without first waiting for all
  admitted Home data to settle. Every transition and return is timed separately.
- `native-hero-motion-diagnostic.cjs` passively records the h1/link rectangles,
  visibility and effective opacity including ancestors. This is a separate
  diagnostic, not another latency series or a change to the approved motion.

All use the existing independent read-only guard, actual protected Preview SW,
headed Chromium154, localehe-IL and height900. Mobile390 uses CPU4×, RTT150ms,
download200000B/s and upload100000B/s. Desktop1440 is unthrottled. Private access
config arrives on stdin and remains outside Git; no request headers, cookies,
browser profiles or raw source text are archived.

## Baseline causal evidence

The successful instrumented mobile visit records:

| Phase | Navigation-relative time |
|---|---:|
| Initial entry script download |0.587–2.085s|
| Render requested |2.227s|
| Local font warm settled |2.236s|
| Home/static dependency wave begins |2.436–2.531s|
| Home launch-reader module finished |2.927s|
| Primary Posts request |3.014–3.829s|
| numberTierSignals download complete |4.216s|
| shared Shell download complete |4.335s|
| Asynchronous Post prefetch begins |4.457s|
| First Shell DOM |4.826s|
| Primary real-content DOM |5.216s|

The primary data is available before the late static Home graph finishes. Source
imports and browser initiator stacks together identify the gate; a download start
alone is not proof of a render dependency. `dayContext` is56,291 compressed bytes
in the initial eager wave. The late Home wave also includes entityHub/book-related
modules despite their consumers being outside initial primary content. Post
prefetch is asynchronous and begins after Home import resolution; its cost must
not be confused with a direct Home import prerequisite.

At the instrumented driver checkpoint after primary DOM, CDP ScriptDuration is0.911s, TaskDuration2.115s,
LayoutDuration0.251s and RecalcStyleDuration0.119s. These counters overlap and must
not be added as independent time buckets. CPU-profile self samples include entry
(runtime plus application)327ms, numberTierSignals59ms, Shell38ms and dayContext21ms; sampled idle is
3.055s. Native/program and observer/tool work are retained, not attributed to a
product module without evidence. This does not prove five seconds of JavaScript
execution or slow database CPU. Font warming takes about6ms in this diagnostic.

## Baseline matched observations and preserved interference

All12 loops complete their13 public transitions with no pageerror and CLS≤0.1.
The primary Post is `/post/sprites-lightning-over-france` in every loop. This is
different from the earlier secondary-series Post metric; those timings are not
mixed. Primary Home is followed by that Post, World,1820, milui3928,913 and exact
returns, plus repeat World entry. There are no mocked public data responses.

The existing guard blocks48 attempts to `POST /rest/v1/rpc/lang_links_list`
(four per loop) during later Number transitions. They are retained and were not
forwarded or added to the allowlist. Navigation/calculation assertions passing
therefore do not claim unrestricted acceptance of that RPC or all Number data.
The Home-only diagnostic has no denied calls; this limitation is separate from
the Home and immediate-Post critical-path measurements.

The final desktop warm loop overlaps a root filesystem checkout at
18:47:47.650–18:47:49.081UTC; the batch finishes18:47:57.591. Its functional
success remains retained, but the whole loop is excluded from clean performance
aggregates. A predetermined one-context exact-baseline repeat will supply its
warm replacement; the conditioning cold loop will remain separate. No sample is
selected or discarded because it is fast or slow.

Provisional medians, seconds; desktop warm currently has only2 clean samples:

| Primary DOM/route | Mobile cold n3 | Mobile warm n3 | Desktop cold n3 | Desktop warm n2 |
|---|---:|---:|---:|---:|
| Home primary DOM |4.8103|1.2364|1.6516|0.6361|
| Immediate primary Post |0.6684|0.5469|0.6042|0.3907|
| Post→World |2.1207|1.3463|0.5878|0.4014|
| World→Number page, useful primary header |2.9884|1.9268|1.7984|1.4719|
| World→Number, material and methods ready |7.925|6.305|6.137|4.851|

The Number page becomes useful before all its material/method sections finish.
The cold mobile material interval is7.905–8.131s; the2.9884s primary-header number
must not be presented as completion of that full work. Milui cold mobile is
0.332s primary versus1.936s material; phrase is1.100s versus3.650s.

All ranges, late stages and outliers remain in rawJSON. Mobile cold Home spans
4.7961–5.0142s. Full-loop maximum CLS is0.054220 mobile and0.050441 desktop.

The separate motion diagnostic shows why DOM readiness must be labeled clearly:

| Single diagnostic | Primary DOM | h1 opacity≥0.95 | Primary action opacity≥0.95 |
|---|---:|---:|---:|
| Mobile390 |4.8945s|5.3696s|5.6811s|
| Desktop1440 |1.6519s|2.2978s|2.5864s|

The475/646ms title and787/935ms action gaps are observed approved animation,
not inferred network/server work. This single diagnostic is not an aggregate
readable-paint benchmark, and no CSS or motion was changed for the test.

## Failed setup/diagnostic attempts remain evidence

The first diagnostic stops before browsing because the newer guard path exists
only in the separate evidence branch. It is corrected to the already present
product guard, without changing permissions. The second diagnostic uses the
default5s Playwright assertion timeout and stops before its more heavily
instrumented Home completes. The successful diagnostic uses the same45s
functional timeout as the existing acceptance harness. This does not weaken the
separate performance goal or convert either prior attempt into a passing run.

Baseline browser window is released and all browser processes are closed.
Candidate comparison, the prescribed replacement, and the three bounded import
admission/failure/cancellation checks are complete. See the current acceptance
report; the final fresh paired cohort supersedes the provisional aggregation.


## Final exact-source smoke and evidence reproduction

[Final c8 product and protected Production-config review](final-c8-release-smoke.md)
records the final exact SHA, URLs, actual served asset parity, active worker
identity and public route/calculator/gallery results. Its functional smoke is
not relabeled as the earlier measured257 performance series.

`comparison-0d4a-2570-final-c8-evidence.zip` contains the new raw sanitized JSON,
screenshots, failed platform diagnostic, paired cohorts, interrupted visible
attempt and resumed pair, controlled import checks, exact final smoke, and
bounded Number-chain diagnostic. `comparison-evidence-manifest.json` hashes
every member and records the secret scan. The earlier baseline archive remains
separate, including its failed setups and confounded historical sample.

To reproduce summaries after extracting the comparison archive to a directory:

```sh
python3 analyze-paired.py EXTRACTED_EVIDENCE_DIR OUTPUT_DIR
python3 verify-cpu-summary.py EXTRACTED_EVIDENCE_DIR cpu-summary-0d4a-2570.json
```

All browser processes for this lane are closed. Root owns final integration,
remote preservation and coordination release. No product files, shared settings,
server/database resources or Production deployment were changed by this lane.
