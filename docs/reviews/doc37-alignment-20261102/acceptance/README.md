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
