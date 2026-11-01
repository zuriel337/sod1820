# Exact final-source public route measurements

Product: `056c50f9ac1f9cbc7203027d3fe7ce814ac9c36d`.
Comparison: `7649e46c199ade990fd75ea8400f60f93522ef82`.
The old Number and World checkpoint measurements remain historical evidence;
they are not substituted for this final fixed-source run.

| Profile | Visit | Before median | Final median |
|---|---|---:|---:|
| Desktop1440, no throttling | First cycle | 6126 ms | 6038 ms |
| Desktop1440, no throttling | Repeat cycle | 3161 ms | 3535 ms |
| Mobile390, 150 ms / 1.6 Mb/s / 4x CPU | First cycle | 27101 ms | 24391 ms |
| Same mobile conditions | Repeat cycle | 12235 ms | 11050 ms |

These are sums of eleven primary-ready interactions, excluding the additional
600 ms observation window after each interaction. Three counterbalanced pairs
per profile, first and repeat visits, give 24 cycles. The mobile first-cycle
paired differences are -2710, -1095, -3215 ms; repeat differences are -926,
-750, -1470 ms. Desktop first-cycle differences are +302, -185, -88 ms;
repeat differences are +374, -500, +912 ms. Desktop is mixed, including a slower
repeat median. No claim of a general desktop speed improvement is supported.

| Mobile interaction | First before → final | Repeat before → final |
|---|---:|---:|
| Home entry | 6350 → 6368 ms | 576 → 484 ms |
| Home → Post | 1131 → 1120 ms | 582 → 606 ms |
| Post → World, actual featured Topic ready | 2550 → 2524 ms | 1445 → 1500 ms |
| World → existing Number tool → full Number page | 7021 → 6117 ms | 4118 → 3709 ms |
| Number → Milui full page | 2317 → 2135 ms | 676 → 666 ms |
| Back from Milui | 546 → 406 ms | 487 → 375 ms |
| Number → phrase full page | 3991 → 3062 ms | 1171 → 1041 ms |
| Back from phrase | 1049 → 831 ms | 910 → 799 ms |
| Number → World | 980 → 905 ms | 926 → 893 ms |
| World → Post | 442 → 460 ms | 442 → 447 ms |
| Post → Home | 408 → 413 ms | 713 → 432 ms |

The median total need not equal the sum of the individual step medians.
First means a fresh browser context entering Home and first visiting the other
surfaces along that journey. Repeat returns from World to Home in the same SPA.
This is not four independently cold direct-document measurements.

## Data, transport and readiness

Both actual compiled clients receive identical immutable real public response
bodies. They use the same real Home Post and explicit operand `אחת ארבע שבע ושתיים`
with canonical Regular1820/Milui3928. Default Legacy lead-rank ordering is checked
separately on the hosted Preview, rather than changing operands between variants.
World readiness requires a real featured Topic; Number readiness requires the
matching expression and enabled canonical method. A static heading is insufficient.

The independent broker forwards only bounded public GET/HEAD reads. Reviewed
read RPC requests are encoded as GET; all mutations, models and emails are denied.
All twelve context audits show zero measured snapshot misses, zero transport
errors, zero non-2xx responses, zero writes and zero model calls. Denied guest
preference and ancillary icon requests are recorded, not hidden or used as proof
of working subscription/account actions. Request counts do not prove speed.

This model includes shared delivery latency/bandwidth, Brotli-equivalent bytes
and mobile CPU slowdown. Server bodies are pinned after warmup. Native HTTP
caching is disabled by interception; local static assets/fonts are cached by
the broker, while public storage/API delivery is modeled per request. This is
not actual backend latency, real-phone CPU, field LCP, native-image caching or RUM.
The exact hosted Preview is tested separately for functional acceptance.

The improvement targets actual serialized work: the existing Number reader opts
into overlapping independent readers while awaiting the same complete result.
Default compact consumers are unchanged. Current canonical profiles are reused;
stale results and delayed root actions cannot clear the selected operand.
No engine, store, new RPC or less restrictive permission was introduced.

Cold Home remains about6.4 seconds in the slow model. Earlier transfer attribution
on the same public journey found about1254 KiB at Home and about1132 KiB around
the first Number tool/full-page transition, including large cover media. Two
deliveries sharing a path do not establish duplicate ordinary-browser transfers.
Native-cache media profiling and existing Home fanout remain follow-up work.
No adopted content, link, feed, animation or performance threshold was removed.

## CLS: unchanged 0.1 threshold and an honest baseline caveat

Final candidate maximum per-action CLS is **0.0858400563**; every candidate
measurement in the24-cycle run stays below0.1. Entries use their actual timestamps
and standard1-second-gap/5-second session windows, including the fixed600 ms
post-readiness observation, with two rendering frames flushed between actions.

The baseline maximum is **0.4759399916**. Desktop pair3 first Home includes a
real late Hero/layout shift of about0.446. Home source was not changed by this
task. The candidate did not reproduce that large shift in the sampled schedules;
this is not proof that Home's historical layout risk was fixed causally.

The earlier checkpoint correctly identified some queued-entry attribution errors,
but **not every historical large Home value was a measurement artifact**. This
final run preserves the true baseline failure. Field p75, late shifts beyond the
bounded window and other scroll positions remain unverified. The earlier rapid
eight-cycle check belongs to06751b72; it is not relabeled as the final056c run.

Readable raw timings/shift summaries: `evidence/final-public-loading.json`.
Lossless coordinate-level trace: `evidence/final-public-loading-full.json.gz`,
with its SHA-256 in the readable file. Read audit: `evidence/final-public-read-audit.json`.
