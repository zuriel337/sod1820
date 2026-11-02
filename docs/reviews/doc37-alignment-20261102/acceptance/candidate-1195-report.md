# Candidate1195 measured acceptance and reproduced CLS failure

Product: `1195394007feee96482bb4f0e3cff642df4d7980`.
Preview: https://sod1820-o4q0hop2q-sod1820-s-projects.vercel.app

All12 native cold/warm visits completed with the actual SW, same headed Chromium and exclusive local resources as979c. This is **not a stability acceptance**: one desktop Home→Post transition exceeded the unchanged CLS0.1 threshold. Browser page errors and denied Follow/telemetry/credit attempts were zero. All compared clicks used the same public Post.

## Matched timing comparison

Seconds, median of3; actual range per cell retained in `headed-summary-1195.json`. Desktop is unthrottled1440×900; mobile390×900 is CPU4×, RTT150ms, download200000B/s/upload100000B/s.

### Mobile390

| Metric | Cold before | Cold after | Warm before | Warm after |
|---|---:|---:|---:|---:|
|Hero/title usable|4.8801|4.8132|1.4121|1.0595|
|First card (after: secondary series, changed semantics)|4.8801|5.5428|1.4121|1.4347|
|Hero image complete|5.4618|5.5582|1.6765|1.3080|
|Initial admitted reads complete|6.4391|6.3482|2.4159|1.8774|
|Home→same Post|1.3295|0.8784|0.7007|0.6662|
|Post→Home exact return|0.7607|0.4221|0.6711|0.5963|

### Desktop1440

| Metric | Cold before | Cold after | Warm before | Warm after |
|---|---:|---:|---:|---:|
|Hero/title usable|1.3715|1.8882|0.5692|0.5588|
|First card (after: secondary series, changed semantics)|1.3715|2.1090|0.5692|0.8873|
|Hero image complete|1.7834|2.1090|0.8121|0.8686|
|Initial admitted reads complete|2.6532|2.9810|1.4661|1.4334|
|Home→same Post|0.4953|0.5722|0.4461|0.4510|
|Post→Home exact return|0.3887|0.3624|0.3909|0.3309|

No broad cold-Home improvement is claimed. Desktop cold hero and Post medians regressed; mobile cold image regressed slightly. One mobile warm secondary-series request lasted5.261s (818→6079ms, HTTP206), with primary ready1.123s and series ready6.109s. This slow sample is retained; primary content was not blocked by it.

## CLS: real failure, controlled reproduction

Native fresh1/1440: documentCLS0.3097203. Home→Post click3859ms; public Post GET3930→4654ms; Post-ready4720.8ms; dominant shift4734.5ms=0.30938596. Source is `.sod29-ambient-field` in the Post shell. Shift precedes completion of the background image/video poster and has `hadRecentInput:false`. It must not be excluded merely because the user navigated. All other11 native samples stayed≤0.05334.

A dedicated controlled diagnostic kept genuine public response bodies and actual SW, delaying delivery of only the selected public Post GET by800ms. Natural diagnosticCLS0.0105263; delayedCLS0.3102188. Before content: root1440×900/ambient1440×900/main1368 wide. After content: root1425×4927/ambient1425×900/main1353. A scrollbar appears; root/parent transforms are none. This implicates late loading-frame→Post geometry, while the exact corrective CSS remains the runtime lane’s responsibility. Controlled delay results are excluded from native timing.

## Functional acceptance and limits

- Home320/390/1440 passed primary event readiness, top-only public closure, real public series/dates, availability map, first-mobile-viewport card count, no horizontal overflow, compact centered desktop dock and Now open/close/reopen.
- Real approved newsletter OPTIONS contract is probed only after explicit click. No initial OPTIONS. Empty form appears; consent unchecked and submit disabled. No email entered, POST sent, subscription created or Auth/model/write invoked. This is not actual email-delivery acceptance.
- Privacy link renders on its own line. Sequential390 scroll reveals deferred lower Home sections; no horizontal overflow. Full-page pre-scroll black reserves are not lost content. The lower latest-movie thumbnails visibly show broken-image icons and need classification/fallback review; source/gallery media render.
- Final public journeys on1195 paused after the genuine CLS finding; prior4798 journey receipt remains separate. No claim that Isolation/A3 or full gate passed from these browser checks.
- `native-1195-evidence.zip` preserves every sample, screenshots, functional results and controlled diagnostic. Configs, cookies and profiles are excluded. `native-1195-manifest.json` lists SHA256 per file; JWT/share-token scan returned0 findings.

## Bounded cause experiment and thumbnail transport classification

The separate gutter-only diagnostic injected `html { scrollbar-gutter: stable; }`
without changing the deployed source. With the same800ms public Post delivery
delay, documentCLS fell from0.3102188 to0.0078212. The root and fixed ambient
layer remained1425px wide through the loading→ready transition. Main content
still changed x86.5→322/y178→130, so context layout was not hidden or excluded.
All shift sources/input flags remain in the raw report. This supports a narrowly
scoped 2029 document gutter correction; acceptance still requires the actual
new deployment without experimental CSS injection.

An additional request-failure observation, separate from timing, identified all
three broken YouTube thumbnails as `net::ERR_TUNNEL_CONNECTION_FAILED`:
`i.ytimg.com/vi/Jp0pxGofPjQ/hqdefault.jpg`,
`i.ytimg.com/vi/PAzHf6Flzsk/hqdefault.jpg`, and
`i.ytimg.com/vi/9L8KHXPdcxI/hqdefault.jpg`. No HTTP failure response arrived and
the deny-only guard recorded no denial. This is observed environment transport
failure, not proof of invalid public content or an image-decode failure. A
visible fallback should preserve the card, title and genuine destination.

Future native runs now expose `navigationOk` and `stabilityOk` separately and
fail combined acceptance when documentCLS exceeds0.1. The original1195 reports
remain unchanged: their `ok` field denoted completed navigation only.
