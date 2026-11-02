# Doc37 alignment acceptance — evidence lane

Base: `979c25aa2a91fa96de3a50db8fc93425a183c694`.
Coordination parent: `5ce04c53-2a9e-46ce-a36d-e6be51e7de71`.
This directory contains acceptance evidence/scripts only. It is not a product
branch, capability registry, new telemetry collector or replacement benchmark.
The central integrator owns builds, deployment and the exclusive browser window.

## Retained evidence and limits

The complete native evidence is preserved on evidence-only commit
`c63850d9b108533b2476a0bcac46721d56032d10`, under
`docs/reviews/public-launch-closure-20261102/central/evidence/`.
Use `native-clean-979c` for timing claims. The other 14 trials overlapping CI
remain functional evidence and must not enter the performance comparison.

Existing clean acceptance: 14 trials, 0 failed; actual SW and real public data;
no fixture responses; max CLS 0.046223. Mobile: 390×900, CPU 4×, RTT150ms,
200000B/s download,100000B/s upload. Desktop:1440×900 unthrottled.
The mobile warm useful-Home outlier3.163s remains part of the sample.

`baseline-derived.json` is reproducibly derived by `analyze-retained.cjs`; it
contains all three fresh-mobile trials, rather than selecting a fast trial:

| Observed phase | Fresh mobile range |
|---|---:|
| Last of four local font downloads completes | 1.542–1.585s |
| Primary Posts request starts | 2.411–2.480s |
| Primary Posts request completes | 3.207–3.292s |
| Existing useful-Home DOM criterion | 4.817–4.920s |
| Primary-read completion → useful Home gap | 1.610–1.668s |

These observations establish chronology, not exclusive causal time buckets.
Font network completion is not FontFaceSet activation/await completion. Resource
Timing is not JavaScript evaluation. Request wall times include the controlled
network and cannot be presented as database CPU time. Different Posts/topic
queries are not identical duplicate calls; possible row overlap remains separate.
Seven pulse reads begin near the useful-Home transition and continue afterward;
these traces do not establish them as the cause of the entire five-second wait.

The original historical stalled visit remains **UNPROVEN** as to cause. The
previously reproduced stylesheet boot dependency and its accepted correction are
separate evidence. Do not reopen that diagnosis merely because a retry succeeds.

## Missing measurement only

`native-startup-diagnostic.cjs` adapts the already accepted native harness. It
adds passive timing around existing `document.fonts.load` calls, Long Tasks,
shared-shell/primary DOM milestones and CDP Script/Task/Layout duration snapshots.
It retains the actual SW, original positive/negative assertions and independent
read-only boundary; there are no mocked responses in native mode.

Before an exclusive window, it is syntax checked only, not browser validated.
A single baseline diagnostic is sufficient to establish the missing font-await
and execution chronology; matched timing comparisons still require ≥3 cold/warm
runs per viewport on both exact SHAs using the same harness and conditions.
No timing comparison is valid while builds/tests run on the same resources.

Example invocation (configuration arrives on stdin; never persist an access URL
or credentials in this directory):

```sh
SOD_COLD_OUT=/tmp/doc37-acceptance/baseline-diagnostic \
  node docs/reviews/doc37-alignment-20261102/acceptance/native-startup-diagnostic.cjs
```

Configuration keys: `origin`, exact40-character `sha`, optional ephemeral
`accessUrl`, `widths:[390,1440]`, `trials:3`, `warm:true`, `post:true`.
320px uses the same mobile throttling for whole-page visual acceptance; no old
320px native timing baseline exists, so do not imply one. Optional fault injection
is explicitly tagged and excluded from native timing aggregates.

## Acceptance scope after integration

- Retain historical Home DOM metric for comparability and record the explicit
  new primary-documentation ready metric separately; a secondary-series link must
  not silently redefine primary readiness.
- Public Home: only top updates closed; real primary documentation and public
  secondary series including DimensionFive; date/source/relative time; compact
  first viewport320/390; no blank clickable source cards.
- Home→Post→World→Number1820→milui3928→back→phrase913→back→World→Post→Home;
  exact duplicate query parameters/hash and scroll; calculator old parameters,
  share URL verification without sending, correct913 and exact return.
- Protected public routes and real public content run with actual SW and deny-only
  guard. Synthetic admin/identity/account-switch tests are labeled separately and
  must not be presented as a real-account login acceptance.
- Now open→close: detail fetch cancellation/retry and no continuing closed-panel
  detail refresh; ticker and public base stream remain active.
- Closed model/write/mail/credit operations: negative tests only, no live product
  writes, actual signup, email, payment or model calls.
- Revalidate the changed Auth/availability/worker surfaces. Existing A3 isolated
  receipt remains relevant while server tracing/DB contracts stay unchanged;
  passing targeted checks is not a claim that a full gate passed again.

The original full public journeys and old URL/calculator route receipts remain
usable evidence for unaffected code. Root chooses focused repetitions based on
the actual integrated diff. Real DB/media recovery and final hosted Production
activation acceptance remain distinct gates and are not implied by this work.

## Executed baseline diagnostic and Legacy access attempt

Root granted an exclusive browser window after all builds/tests were paused.
One native979c diagnostic completed with actual SW. It measured four font-load
calls starting2.3245s and settling2.3266s: approximately2.1ms of actual await in
this run. Home code requested2.433s→3.694s; shared shell2.436s→4.264s, shell DOM
4.481s and useful Home4.791s. ScriptDuration0.556s and TaskDuration1.381s are CDP
cumulative execution durations. This supports investigating the late shell code
chain; it does not justify attributing five seconds to fonts or to all shell code.
A denied `notification_prefs_guest_get_v1` call was retained. It was not forwarded
by the independent guard. It must be accounted for as an attempted guest-follow
read, not as a successful operation or hidden test pass.

The first protected-preview preflight failed because its private access URL had
a query-key typo. Root corrected the private input; a single justified retry
verified the exactSHA and passed. No product startup trial existed in the failed
preflight. The access URL/configuration is never committed.

Legacy identity was independently reverified by root:
`dpl_BFpwZGiYL3Qpdy9nCuGKGb9Xmko2`,
`d1837efcf5a978d10a514010f3695680f231e116`. The benchmark uses separate meaningful
Legacy milestones: enabled search control, first real update card, and loaded
hero image; these are not claimed to be the same DOM semantics as new Home.
However, the canonical hostname returned HTTP403 and plain `Access denied` before
application code or SW. Three completed attempts and one interrupted attempt
remain in `legacy-access-block.json`; **zero valid Legacy performance samples**.
The remaining batch was stopped. No Legacy code, domain or protection changed.

The harness now stops immediately on document HTTP failure instead of spending a
content timeout on a known denied page. Both benchmark modes block analytics
network destinations and retain denied write/model/telemetry attempts; a guarded
Legacy benchmark therefore is not a claim about unrestricted production telemetry
cost. Browser screenshots and raw reports remain at `/tmp/doc37-acceptance/` for
the central integrator's safe archival. Private access inputs are separate and
excluded. The exclusive window was released after the blocked Legacy batch.

## Headed access diagnosis and candidate acceptance preparation

Exact Legacy `middleware-core.js` equals979c source and explicitly classifies
`headless` as BAD_BOT, which can lead to the observed403. Country blocking shares
that response, so source matching alone is not sole-cause live proof. Root
separately fetched Legacy successfully through the platform tool. No protection
change or User-Agent spoof is proposed. An existing Xorg dummy driver provides an
isolated display: run Chromium with `headed:true` and `DISPLAY=:99`. Compare
Legacy,979c and candidate in this same headed mode; keep earlier headless samples
separate. Root must grant a new exclusive window before browser execution.

The reusable display config is `xorg-dummy.conf`; it listens on no TCP socket.
Only the task-owned Xorg process/display may be stopped during cleanup.
Automatic server access/crawl logging cannot be suppressed by a browser guard;
that is distinct from intentionally issuing product-data writes in a test.

Prepared, syntax-checked only until exact-candidate runs:

- `native-home-functional.cjs`:320/390/1440 first viewport and full-page evidence,
  primary event ready, top-only public closure, three public series links with
  publication times, availability map, no horizontal overflow, multiple real
  content cards in first mobile viewport, compact centered desktop dock, Now
  open/close/reopen and absence of guest-follow/telemetry/credit attempted writes.
- `native-journeys.cjs`: original exact-return public journey/calculator assertions
  fromc638 retained, explicit primary-Home readiness added, headed support.

Use the same stdin private config convention and distinct `SOD_COLD_OUT` folders.
Full-page screenshots, real-data results and synthetic admin proofs remain
separate. Neither prepared scripts nor a syntax check establish browser acceptance.

## Executed headed comparison on candidate4798

Candidate `4798b4b85cabb8da8c000e512197fde9cab16cdd`, protected Preview
`https://sod1820-qrbgbzznx-sod1820-s-projects.vercel.app`, deployment
`dpl_2QLEqiP4pjkLguphZvrd9MKNL6gf`. Exact preview identity verified before each
context. Root granted one exclusive window: Legacy6, baseline979c12, candidate12
native runs sequentially, then focused Home and public journeys. No competing
builds/tests. All30 native visits completed; the earlier denied headless visits
and corrected preflight are preserved, not silently counted as native successes.

All timings below are seconds, medians of3 per cell, same headed conditions.
`heroContent` uses the same actual hero/title DOM criterion on both new-site
versions. The new primary state hook is additionally recorded. Series/card
readiness changed meaning with the approved Home hierarchy and is reported apart.

| Metric | Mobile cold before | Mobile cold after | Mobile warm before | Mobile warm after |
|---|---:|---:|---:|---:|
| Hero/title content |4.8801|4.9614|1.4121|1.1293|
| First post-card content (new after: series card) |4.8801|5.5589|1.4121|1.2343|
| Hero image complete |5.4618|5.3992|1.6765|1.3119|
| Initial admitted reads complete |6.4391|6.2579|2.4159|1.9100|
| Home→same public Post |1.3295|0.8364|0.7007|0.7108|
| Post→Home exact return |0.7607|0.4959|0.6711|0.4647|

| Metric | Desktop cold before | Desktop cold after | Desktop warm before | Desktop warm after |
|---|---:|---:|---:|---:|
| Hero/title content |1.3715|1.6237|0.5692|0.5554|
| First post-card content (new after: series card) |1.3715|1.9013|0.5692|0.9056|
| Hero image complete |1.7834|1.8053|0.8121|0.7229|
| Initial admitted reads complete |2.6532|2.5314|1.4661|1.4616|
| Home→same public Post |0.4953|0.4730|0.4461|0.4795|
| Post→Home exact return |0.3887|0.3251|0.3909|0.4000|

Cold hero/card regressions and small warm-Post/desktop-return regressions remain
visible. There is no claim that fewer requests proves an opening-time improvement.
Candidate maxCLS0.0533478 stays below unchanged0.1. All compared Post clicks used
`/post/mah-kore-elections-mutual-responsibility`, so that timing is same-content.
Candidate guest notification-preferences attempt disappeared. Four canonical
Follow-subject GET attempts still occur in each Home→Post→Home journey and were
independently denied; root has identified their Post-only component for follow-up.

Legacy headed access succeeded without UA/protection modification: all6 visits
completed. Median first search-control DOM4.892s cold/1.089s warm; first real
update8.942s cold/3.759s warm. These are separate Legacy semantics, not the new
hero metric. Its current homepage did not register a controlling SW in the
observed window. Cold hero-image completion was not observed; report unknown,
not zero. The existing Legacy read-only boundary denied unreviewed readRPCs,
WhatsApp/function and tracking calls; this is a guarded browsing comparison,
not unrestricted full-site completion. Exact denied paths are retained.

Focused actual-public-data acceptance on4798:

- Home320/390 passed primary/public-series/top-only-closure/date/availability,
  >1 content card visible in first viewport, no document overflow and Now reopen.
- Desktop1440 passed after fixing the harness's reference width: headed Chromium
  reserves15px for the scrollbar, and CSS centers in clientWidth1425, not
  innerWidth1440. Dock330px was already centered exactly. The failed assertion
  is retained; tolerance remains2px and overflow assertion became stricter.
- Public journeys390/1440 passed: Home→Post→World→1820→milui3928 and back,
  expression913 and back, exact repeated query/hash and scroll50→50/18→18,
  calculator actual913, share URL inspected without sending, old calculator
  parameters and refresh/back preserved.
- No live signup/login/model/payment/product-write test. No claim of a new full
  Isolation/A3 gate, real-account admin acceptance or data restore.

`headed-summary-4798.json` includes ranges, counts and every distinct denied path.
`native-4798-evidence.zip` includes rawJSON/screenshots and failed attempts;
`native-4798-manifest.json` pins every included file. Private configs/profiles are
excluded; rawJSON scan found no JWT or share-token value. All browser processes
closed before root resumed work; isolated display remains for final candidate.

## Follow-up1195: completed navigation with a real stability failure

See [candidate1195 report](candidate-1195-report.md), matched
[summary](headed-summary-1195.json), and retained
[artifact manifest](native-1195-manifest.json). The12 visits completed, but one
desktop Home→Post transition reachedCLS0.30972 and was not accepted. A genuine
Post response delayed800ms reproduced it; a separately labeled stable-gutter
experiment reduced it below0.1. Original failures are retained. No production
source was changed by this evidence lane. Root is integrating the narrow fix
and image-error fallback; final acceptance is still pending.

## Final f420 acceptance

The reproduced late-Post CLS failure is fixed in deployed product
`f420180dc7918353baeaef0a74339c1574e9bd8d`. See
[final report](candidate-f420-report.md), [before/after summary](headed-summary-f420.json)
and [manifest](native-f420-manifest.json). All12 native samples passed;
maxCLS0.046223. The800ms late-data reproduction passes0.007847 with actual
deployedCSS and no injection. Home/forms320/390/1440 and both full public
journeys pass. About5seconds cold-mobile hero and desktopcold regression remain
explicit. No real-account login/email/model/write/Production acceptance is implied.

## Missing stage measurement completed

[Matched per-route report](stage-report-979c-9e1d.md) and
[summary](stage-summary-979c-9e1d.json) now cover every public journey step,
first and repeated loop at390/1440,3contexts each. This supersedes the earlier
statement that no new route durations existed. All24 loops complete; before has
one desktopCLS failure, after max0.050441. PrimaryHome-return regressions and
1.5s target misses are explicit. The second same-document Home entry is excluded;
actual-reload Home evidence remains separately valid.

## Approved source checkpoint5bbd: Home passes, affected series route fails

[Checkpoint report](candidate-5bbd-report.md), [matched timing](headed-summary-5bbd.json)
and [archive manifest](native-5bbd-manifest.json) retain12/12 native Home runs,
three-width Home/form acceptance, and the newly proven video-surface crash and
direct-seriesCLS failures. Overall affected-route acceptance is **not passed**.
The source identity, rank, credit and narrow reads worked; privacy/failure/cancel
fixtures remained safe. Root must fix the demonstrated route/stability issues
and obtain focused exact-Preview acceptance. The old f420 card-return timing
has an explicit semantic correction; primaryreturn is measured separately here.
