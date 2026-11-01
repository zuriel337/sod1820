# Matched public route measurements

Source candidate: `06751b7277232c11400988192d4a3738432675ad`.
Comparison: `7649e46c199ade990fd75ea8400f60f93522ef82`.
Later test/receipt commits do not change these application sources.

The complete client runs against immutable real public response snapshots shared
between both variants. No product writes, model requests, emails or live follow
operations are forwarded. Both variants use the same explicit operand
`אחת ארבע שבע ושתיים`, canonical Regular1820/Milui3928, and the same real Home
Post. The user's saved default expression order is validated separately.

The eleven primary-ready transitions cover Home entry, Post, World, the existing
Number tool and its full page, Milui, Back, phrase913, Back, World, Post and Home.
World readiness requires a real featured Topic card; Number readiness requires
the matching expression and an enabled canonical method. A static page heading
does not satisfy readiness.

| Profile | Visit | Before median | After median |
|---|---|---:|---:|
| Desktop1440, no throttling | First cycle | 5778 ms | 6403 ms |
| Desktop1440, no throttling | Repeat cycle | 3986 ms | 3818 ms |
| Mobile390, 150 ms / 1.6 Mb/s / 4x CPU | First cycle | 25852 ms | 24438 ms |
| Same mobile conditions | Repeat cycle | 11621 ms | 11095 ms |

Three counterbalanced pairs per profile, two visits in each context: 24 cycles.
First means a fresh context entering Home; the other surfaces are first visited
along that journey. Repeat returns to Home from World in the same SPA. This is
not four independently cold direct-document measurements or field LCP.

Desktop first-cycle results are mixed: paired changes are -335, -360 and +662 ms.
There is no evidence of a consistent desktop first-visit improvement. Mobile
first-cycle changes are -1137, -2872 and -1185 ms; repeat changes are -107, -1190
and -402 ms. These small controlled samples are not a field percentile.

Mobile median primary-ready steps (before → after): Home entry6359 →6416 ms;
Home→Post1153 →1099; Post→World2528 →2457;
World→Number tool→full page6851 →6081;
Number→Milui2350 →2198; Number→phrase3225 →3076.

The Number-only five-step phase, before World integration, independently produced
24 cycles: mobile first16152 →14467 ms and repeat6766 →6384 ms; desktop
first4017 →4036 and repeat2727 →2506. Those results are retained in
`evidence/number-phase` and are not substituted for the unified product results.

## Diagnosis and remaining latency

The Number consumer previously serialized independent graph/media and canonical
numeric readers. Its opt-in scheduling starts the same bounded readers earlier
and awaits the complete result. Tests prove equal output, default-call behavior
and early-error propagation. Public navigation also reuses the canonical profile
already selected in the current page, with stale-route/reader cancellation.

Cold Home remains the larger unresolved cost. One matched mobile candidate run
delivered about1254 KiB in its Home entry phase, including static assets and
public responses. The first Number tool/full-page phase delivered about1132 KiB;
two deliveries used the same large cover-image path, which does not by itself
prove duplicate URLs or uncached network transfers in an ordinary browser.
These are transfer diagnostics, not request-count evidence of faster loading.

The broker caches same-context local static assets/fonts, while intercepted API
and public-storage requests are modeled per request. Native HTTP image caching,
backend latency, actual phone CPU and field network behavior are not reproduced.
Browser interception disables native HTTP cache behavior. Real native-cache/RUM
measurement remains necessary; do not interpret these lab totals as live LCP.
No content, source link, shared feed or accepted animation was removed to improve
the numbers, and no build/performance threshold was increased.

## CLS and rapid navigation

The 24-cycle run observes each primary-ready step for a fixed additional600 ms,
excluded from its primary-ready timing. Layout-shift entries use their actual
timestamps and standard1-second-gap/5-second session windows; queued entries
from the preceding action are not assigned to a later step.

Maximum step CLS: baseline0.078303; candidate0.078515. Both are below the
unchanged0.1 threshold. An additional eight-cycle run removes the600 ms window
and flushes rendering with two animation frames. Its maximum candidate CLS is
also0.078515; all tested actions remain below0.1. Animations stay enabled.

Earlier per-step counter resets had attributed pending Home entries to Number
Back actions, with values above1.0. The timestamped standard-window measurements
resolve that ambiguity; they do not silently raise or remove the threshold and
do not certify site-wide field p75 or every scroll position.

All32 cycles completed with zero measured snapshot misses and zero transport
errors. Raw step timings, shift attribution and bounded read-audit summaries
are permanent in `evidence/public-loading*.json` and `evidence/public-rapid*.json`.
The complete coordinate-level traces are retained losslessly in the corresponding
`*-full.json.gz` artifacts, whose hashes are recorded in the readable JSON.
Synthetic fault/privacy tests are separate from these real-data timing runs.
