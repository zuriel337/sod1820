# Missing per-route timings,979c→9e1d

Before: `979c25aa2a91fa96de3a50db8fc93425a183c694`.
After: `9e1d876e0f04ed0cffe8d97a63b3ae564e43898e`.
Exact after Preview: https://sod1820-b4penw27t-sod1820-s-projects.vercel.app
Deployment: `dpl_6eirH5H3oP57AEemk9GmQvpDKxwQ`.

## Conditions and honest limits

Same headed Chromium, real preview SW, real public data, existing deny-only transport guard. Root granted one exclusive local window; baseline then candidate were sequential. Three independent browser contexts per width per version, first route loop and repeat in the same loaded document. Width390×900 uses CPU4×/RTT150ms/download200000B/s/upload100000B/s;1440×900 is unthrottled. This is viewport/network/CPU emulation on desktop Chromium, not a physical phone.

The same Home URL/hash does not create another document on the second loop. Its enter-Home measurement is excluded; repeat rows measure warm route reuse in the same document. Actual-reload warmHome remains in the separate f420 native benchmark. First-loop World→Number includes opening the existing bottom Number panel, entering the same1820 expression and clicking fullpage; it is not a single direct-link timing. The number, method, expression, no-dialog-on-fullpage, URL and scroll assertions are retained.

Observation budget45s on both versions is not a latency acceptance. Useful>1.5s is a target miss; material>30s would fail even if observed later; CLS threshold remains0.1. The initial calibration accidentally used Playwright’s implicit5s expectation timeout despite its longer page timeout. All partial failures and one intentional interrupt are preserved separately; that batch is excluded from matched timing. One shared expectation configuration corrected the harness.

Matched functional results: before12/12 completed; after12/12 completed. Before had1 desktop document overCLS0.1 (max0.309388); after0, max0.050441. Warm snapshots retain cumulative documentCLS, so baseline failure in both loop snapshots is one document, not two independent failures. Useful target misses: before14, after15. Material>30s: before0/after0.

## Every measured transition

Seconds, medians of3. U=actual useful DOM state; M=Number public material ready plus existing milui method enabled. M does not mean every unrequested lower section has loaded. Exact ranges, sample counts and initial observed REST-read completion are in `stage-summary-979c-9e1d.json`. “—” means that M is not defined on that surface.

### 390px · first-loop

| Transition | Before U | After U | Before M | After M |
|---|---:|---:|---:|---:|
|Home entry|4.970|4.884|—|—|
|Home→Post|1.254|0.807|—|—|
|Post→World|2.130|2.006|—|—|
|World→numberpanel→full1820|2.760|2.752|7.608|7.350|
|1820→milui3928|0.316|0.312|1.922|1.859|
|milui→1820 back|0.094|0.089|0.094|0.089|
|1820→phrase913|1.209|1.020|3.975|3.688|
|phrase→1820 back|0.105|0.081|0.147|0.114|
|1820→World back|0.478|0.392|—|—|
|World→Post back|0.627|0.575|—|—|
|Post→primaryHome back|0.514|0.699|—|—|
|Home→World (already visited)|1.139|1.196|—|—|
|World→primaryHome back|0.409|0.665|—|—|

### 390px · repeat-same-document

| Transition | Before U | After U | Before M | After M |
|---|---:|---:|---:|---:|
|Home→Post|0.736|0.728|—|—|
|Post→World|1.028|1.052|—|—|
|World→numberpanel→full1820|1.415|1.423|1.645|1.659|
|1820→milui3928|0.333|0.334|0.333|0.334|
|milui→1820 back|0.085|0.083|0.085|0.083|
|1820→phrase913|1.113|1.165|1.113|1.165|
|phrase→1820 back|0.074|0.078|1.117|0.984|
|1820→World back|0.408|0.436|—|—|
|World→Post back|0.653|0.620|—|—|
|Post→primaryHome back|0.474|0.644|—|—|
|Home→World (already visited)|1.086|1.190|—|—|
|World→primaryHome back|0.467|0.661|—|—|

### 1440px · first-loop

| Transition | Before U | After U | Before M | After M |
|---|---:|---:|---:|---:|
|Home entry|1.427|1.610|—|—|
|Home→Post|0.488|0.500|—|—|
|Post→World|0.612|0.638|—|—|
|World→numberpanel→full1820|1.674|1.779|5.620|5.899|
|1820→milui3928|0.084|0.085|1.555|1.549|
|milui→1820 back|0.033|0.032|0.033|0.032|
|1820→phrase913|0.643|0.620|3.026|2.889|
|phrase→1820 back|0.028|0.031|0.035|0.041|
|1820→World back|0.281|0.290|—|—|
|World→Post back|0.408|0.379|—|—|
|Post→primaryHome back|0.346|0.550|—|—|
|Home→World (already visited)|0.353|0.335|—|—|
|World→primaryHome back|0.370|0.487|—|—|

### 1440px · repeat-same-document

| Transition | Before U | After U | Before M | After M |
|---|---:|---:|---:|---:|
|Home→Post|0.470|0.433|—|—|
|Post→World|0.342|0.355|—|—|
|World→numberpanel→full1820|1.214|1.182|1.222|1.202|
|1820→milui3928|0.084|0.098|0.084|0.098|
|milui→1820 back|0.025|0.023|0.025|0.023|
|1820→phrase913|0.629|0.630|0.629|0.630|
|phrase→1820 back|0.022|0.024|0.033|0.032|
|1820→World back|0.264|0.291|—|—|
|World→Post back|0.408|0.389|—|—|
|Post→primaryHome back|0.402|0.589|—|—|
|Home→World (already visited)|0.367|0.359|—|—|
|World→primaryHome back|0.384|0.504|—|—|

## Remaining wait, regressions and interpretation

Mobile first World→1820: useful2.760→2.752s, material+methods7.608→7.350s, last observed initial REST read9.437→9.463s. Repeat: useful1.415→1.423s, material1.645→1.659s, reads6.586→6.290s. Thus secondary completion still trails usable content and total observed read time did not improve on first entry. The retained first candidate trace shows request batches around+2.95,+4.89,+7.66s; longest individual calls are about1.2s. This is chronology, not proof that one database query or all JavaScript execution causes the wait. No shared server/DB change was made.

PrimaryHome return regresses consistently in this route harness: mobile first0.514→0.699s/repeat0.474→0.644s; desktop first0.346→0.550s/repeat0.402→0.589s. Earlier native Home-return measurements wait for `.h29-card-open`, which now represents a secondary series card; both receipts remain valid for their different target. Do not report the earlier faster card as a faster restored primary hero. All these primary returns remain below1.5s. Desktop first World→Number material5.620→5.899s also regresses. All other small regressions remain visible in the tables.

No broad coldHome improvement is established: same-harness stage sample4.970→4.884s versus earlier native sample4.880→4.954s varies around five seconds. Target1.5s remains unmet. No new startup freeze, calculation failure, privacy breach or exact-return failure occurred in24 matched loops. Bounded first-entry latency remains a launch experience limitation; the central integrator still owns final launch tolerance and separate infrastructure gates.

Guarded-read limit: the original guard continues to deny unreviewed `lang_links_list` RPC, and baseline Follow calls remain denied; no guard widening was used. There was no real sign-in, email subscription, model invocation or live product-data test write.

## Exact9e smoke and runtime equivalence

A separate exact9e identity/SW/Home→samePost→exactHome smoke passed. Its88 observed content-hashed asset paths are all present in f420 captures. The central integrator’s separate local dormantProduction artifact comparison verifies all291 asset names andSHA256 equal betweenf420 and9e; only two Isolation assertion files changed. These are distinct proofs: observed hosted paths are not a complete downloaded-hosted SHA256 manifest. Identity/SW envelope sourceSHA intentionally advances.

The subsequent user-approved Home curation change is not included in9e. Its affected Home acceptance must be repeated on the new exact Preview; unchanged World/Number phase receipts remain pinned here.

Artifact: `native-stage-evidence-979c-9e1d.zip`; perfileSHA256 and scan0 findings in `native-stage-manifest-979c-9e1d.json`. No private configs/cookies/profiles/headers are included.
