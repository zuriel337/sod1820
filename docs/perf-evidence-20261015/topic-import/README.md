# Topic optional-source import — 15 October 2026

**NOT_ADOPTED.** Preserve this isolated experiment and its evidence; do not
cherry-pick the product change into the shared integration. The corrected tests
confirm smaller code, but do not establish faster navigation or non-regression
for the enabled story and warm return. The central coordinator accepted this
decision. No further experiment or production change is part of this task.

Task: `GPT_PERF_TOPIC_IMPORT_20261015`, under the central passive coordination
claim `02b54549-7d36-4d55-bc76-43df7158f47d`. Personal branch
`gpt/perf-topic-import-20261015`; exact base
`a1f7cd0b08674daf89c98a666fc9676efca80998` (the World sources-hash repair).
This task changes only Topic's technical code-loading boundary and its own
regression test/evidence. No World/Home/reader/SQL/flag/global-scroll/permission
change; no prefetch; no bundle-budget exception.

## Cause and change

The prior full World unsplit experiment reported a shorter first Topic
navigation under the inherited response-clock harness; that timing is not
accepted or reused here after discovering the instrumentation bias. Its built
graph exceeded World's 265 KiB / 37-chunk guard regardless. Both World
boundaries remain.
Instead, Topic had a static import of WorldSourceStory, which itself statically
imports SpatialMethodStage2029 and its scene/glyph dependencies. The built graph
confirmed those modules remained in the ordinary Topic path even when the
production discovery flag compiled false. This was not just a source-graph guess.

Topic now loads WorldSourceStory with React.lazy under the existing public-body
and preview/development conditions. The existing DISCOVERY_TOPIC_SLUGS check
is lifted from that component to the calling gate too: for other slugs the old
component returned null and skipped its reader; they now request no optional
code and show no transient loading message. No new eligibility rule is added.
Enabled stories keep the same component, props, reader and method Stage. A local
boundary uses the existing FrameState/button presentation and explicit reload
recovery; the loading paragraph uses the existing World's wording. A failed
optional module leaves the primary Topic available. The reload uses the current
location, preserving its path, query and fragment. No route-key remount is added.

A bounded selector/dependency review found no consumer outside the optional
subtree relying on its deferred Stage/glyph/method CSS. Topic still directly
imports topic2029.css; NumberCore imports its own Stage and associated CSS.

## Verification scope

Two production-build profiles are tested independently: ordinary native 2029
(flags false), and the integrated-preview/kingdom flags true. True flags here
mean local builds, not a deployed read-only service worker or hosted acceptance.
The current previously supplied preview was confirmed centrally as native 2029;
a future read-only preview can use the other profile.

The previous session's unpublished response snapshot was unavailable. New bounded
public captures were recorded separately for the two profiles and frozen before
measurement. Their hashes are in provenance. They must not be described as the
old session's snapshot or mixed with its timing results. Captures only allow
public reads; auth endpoints, telemetry and non-allowlisted writes are answered
locally. The known research_objects 401/42501 denial remains a real denial in
both arms, not an empty successful response. This lane does not certify current
authenticated grants or fix reader access.

Chromium / Playwright versions and exact profile are recorded in the raw reports:
390×844, DPR2, CPU×4, 1.6 Mbps, 150 ms RTT, reduced motion, new cold context per
sample. Within each sample, actual click / browser Back / Forward remain warm.
Seven matched pairs alternate AB/BA; requests include duplicate multiplicity,
status, content hash and ordered visible text/topic identity. Ordinary-topic identity is checked
against the existing source-story allowlist, and the experimental arm must issue zero
Story-module requests for that path. The enabled 1237 story is tested separately
through full witness readiness and opening its real method disclosure, so a fast
primary heading cannot conceal a slow or missing source story.

Raw response bodies and unredacted reports remain local. Published reports hash
live text, source IDs, dynamic routes and request signatures. Instrumentation corrections: use the direct-child disclosure summary (the panel
also contains nested summaries). The inherited runner also awaited a renderer
clock inside response interception; under CPU throttling that can delay fixture
responses and confound timing. The central reviewer caught this before results
were accepted. All 16 completed samples from that version (14 native, 2 preview), plus
one interrupted preview sample, are kept only under `superseded/` and excluded from conclusions. The corrected response
path uses the host monotonic clock and no renderer round trip before the fixed
response delay/fulfillment. A later corrected-clock batch failed full text equality once: the fixed
1200ms identity snapshot caught A while its Topic prominence layer was still
loading. That batch is also retained as superseded, without speed conclusions.
A new explicit identity phase waits for the actual Topic loading marker to
disappear, fixture responses to remain idle for 700ms, and visible text to remain
unchanged for 600ms. A diagnostic AB pair first passed all three identities and
exact read multiplicity before the final seven-pair batches began. This checks
text identity, not complete layout/render settlement. Primary-ready timing stays
separate; the later identity-observation time includes those explicit waits.
First navigation starts at the recorded trusted
click; Back/Forward use the host action clock. CPU windows cover the action and the initial 1200ms, ending before the
identity-settling phase. They are diagnostic, not claimed interaction CPU or
total work through final text identity. No failed capture is included in
accepted timing results.

## Results

The final protocol contains 21 matched pairs: seven native navigation pairs,
seven true-flag navigation pairs, and seven enabled-story pairs. The smoke AB
pair and single injected-failure/reload test are functional diagnostics only.
No superseded sample contributes to the following figures.

Milliseconds; paired bootstrap 95% intervals describe B minus A. Seven pairs
are not enough to certify equivalence. A confidence interval crossing zero is
neither a speedup nor proof that regressions are absent.

| Profile / observation | A median | B median | Change | 95% interval (ms) |
| --- | ---: | ---: | ---: | --- |
| Native cold World ready | 5735.5 | 5750.8 | +0.3% | [-688.4, 412.8] |
| Native World→Topic | 1766.7 | 1738.4 | -1.6% | [-225.3, 77.0] |
| Native Back→World | 1026.2 | 1096.1 | +6.8% | [-130.0, 551.3] |
| Native Forward→Topic | 980.8 | 988.5 | +0.8% | [-115.6, 141.1] |
| True flags cold World ready | 5675.3 | 6094.2 | +7.4% | [135.5, 836.4] |
| True flags World→Topic | 1799.9 | 1748.5 | -2.9% | [-652.4, 135.4] |
| True flags Back→World | 930.0 | 1134.3 | +22.0% | [-167.4, 488.2] |
| True flags Forward→Topic | 1020.5 | 975.9 | -4.4% | [-113.6, 97.3] |
| Enabled 1237 primary ready | 5721.9 | 5495.8 | -4.0% | [-582.7, 629.0] |
| Enabled 1237 source witness ready | 7000.6 | 7337.2 | +4.8% | [-151.7, 1526.8] |

The source witness metric is taken only after its actual data-backed witness
appears. The same loaded Story includes the method Stage; the test then opens
the existing disclosure and verifies its full text, method identities and Stage
presence. The +4.8% median is below the 10% rejection threshold, but its interval
allows a material slowdown. Warm Back in the true profile also has a higher
median (+22%) with a wide interval. True-profile cold World also regressed
+7.4% in this run with an interval wholly above zero. Its nearly identical World
code graph does not establish the cause; the result is retained as observed,
not dismissed. Combined with no proven first-click gain, these results are
insufficient reason to adopt this additional loading boundary.

Final identity observation includes the explicit wait windows and is not a
direct user latency measure. Native World→Topic observation medians were
4324.7→4223.3ms; true flags were
4254.1→4224.9ms. Complete tables include cold LCP/CLS
and the diagnostic CPU window in the two navigation summary JSON files.

| Built graph beyond entry | Native A → B | True flags A → B |
| --- | --- | --- |
| World | 260.101→260.131 KiB; 37→37 chunks | 259.790→259.791 KiB; 37→37 chunks |
| Topic | 214.986→188.415 KiB; 32→28 chunks | 215.185→188.846 KiB; 32→28 chunks |
| New Topic JS after World | 37.371→10.782 KiB; 6→2 chunks | 37.766→11.423 KiB; 6→2 chunks |

Both profiles remain within the unchanged World 265 KiB / 37-chunk guard.
Gzip is Node gzip level 9, matching the repository guard; the graph is code
loading evidence, not a measured speed claim.

Verification passed:

- Exact request/response multiset, including duplicates/status/body hashes: 159 reads per navigation sample and 60 per story sample.
- Ordered visible text, target and topic identities at all three navigation checkpoints; full enabled-story/method identities match.
- Every ordinary Topic sample in B requests zero Story modules; all samples have zero fixture misses, page errors or unexplained read failures.
- CLS medians match in both navigation profiles and enabled story; no screenshot-based visual acceptance is claimed.
- One injected optional-module failure leaves the primary Topic available; reload restores the source witness and working method disclosure/Stage.
- Source import tests 2/2; existing isolation, World surface, route legitimacy, built-graph and bundle guards pass. Both native and true-flag built graphs are tested. See validation.json and the adjacent text logs.

The preserved superseded diagnostics contain 39 samples: the renderer-clock
version has 14 native + 2 completed preview + 1 interrupted preview; the
corrected-clock/fixed-1200ms identity version has 14 native + 7 completed preview
+ 1 interrupted preview. All 37 completed and 2 interrupted samples are excluded
from conclusions. Exact counts/reasons are indexed in superseded/index.json.

Provenance records the exact parent, product Git blob and SHA256, lockfile hash,
build profiles, four manifest hashes (graph.json), fixture hashes, Chromium and
Playwright versions (raw reports), and Node v24.19.0. The repository requires
Node >=24.9.0 <25; this runtime satisfies that range. No other Node/engine
comparison is implied. Public anonymous replay does not replace real signed-in
hosted acceptance.


## Reproduction

Use exact base A above and the product patch accompanying this evidence. Install
from the same lockfile; build each arm to a separate directory using
`SOD_BUILD_TARGET=2029 node node_modules/vite/bin/vite.js build --outDir <dir>`.
For the true-flag profile additionally set `VITE_INTEGRATED_PREVIEW=true` and
`VITE_KINGDOM_PREVIEW=true`. No preload injection or budget change is used.

`measure.mjs --mode replay --a <baseline-dist> --b <patch-dist> --runs 7
--flows navigation --fixtures <local-public-snapshot.json.gz> --out <raw.json>`
requires `PLAYWRIGHT_DIR` containing Playwright 1.56.1 and Chromium (`PERF_CHROME`
can override `/usr/bin/chromium`). Run `--flows story` on the true-flag builds for
the enabled story; run `--flows story-error --b <patch-dist> --runs 1` for module
failure/reload. Capturing a fresh snapshot uses `--mode record` but constitutes
new live input and must never be relabelled as this frozen capture.

Published `raw/*.json.gz` can be verified without local response bodies using
`analyze.mjs <navigation-report> <summary-output>` and
`verify-story.mjs <story-report> <recovery-report> <summary-output>`. `graph.mjs`
recomputes gzip static closures from the four build manifests. Exact browser
replay requires the local frozen response snapshot; its bodies are intentionally
not published. Published hashes/statuses/counts allow result verification, but
do not reconstruct those bodies. The source graph
regression test is `node --test test/topic-source-import-boundary-2029.test.mjs`.
