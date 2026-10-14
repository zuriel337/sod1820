# 2029 causal diagnosis — 14 October 2026

**Result:** on the already corrected PR1100 runtime, the dominant remaining primary-content delay is the static JavaScript/font delivery path and client execution/render preparation. API round trips substantially delay the extension tail, but the early primary response is usually available long before the page renders. This is not evidence that every database operation is cheap or that all API overhead is network.

Diagnostic branch from immutable PR1100 head `5dd4afaacd9ead2fef5ff43d4c1adec4e4a0ed75`; application/runtime files are unchanged. Own claim `9bfa2d4a-30ad-4526-854e-114176e79bb9` covers only the unique diagnostic scripts/evidence. Passive ZURIEL reporting only, no agent messages/ACK. No migration, index, product write, cache, proxy deployment, production release or merge.

## What was actually run

- **105 accepted cold browser contexts:** five one-factor cases × three routes × seven samples, current corrected runtime, real anonymous RPC/GET/assets capture, same union/hash. Primary-content status/error checks and response/argument-set parity PASS; zero errors/misses. 390×844/DPR2, Chromium141.0.7390.37 / Playwright1.56.1, dark, baseline CPU4/RTT150/download1.6MiMbps. Exact medians, ranges and samples are committed.
- Calibration: local continued requests take ~5/155/304ms at CDP RTT0/150/300; fulfilled fixture responses remain ~3–4ms. **CDP does not throttle fulfilled fixtures.** The separate API delay is therefore explicit. Static bandwidth applies to continued local code/fonts; replay API body bandwidth and external-image bandwidth are not modeled. This is a corrected diagnostic model, not live Postgres or an Israel proxy simulation.
- **15 anonymous-role native primary-query plans:** five rounds per Home/World/Post query, RLS enabled and caller role anon, read-only transaction, including JSON aggregation/serialization. All reads hit warm buffers. No signed-in identity or cold-cache claim.
- **15 native existing read-RPC plans:** five each for the exact representative meter1820, regular-method trace and40 source arrivals. Existing functions are STABLE and anon-executable; meter/trace invoker-security, arrivals retains its existing definer/sanitization contract. No function or permission changed.
- **40 real sequential anonymous HTTP2 GETs:** five rounds of a trivial one-row request plus the three primary queries, new curl connections versus one reused connection. TLS verification retained; inherited agent proxy; not a browser/Israel benchmark. No stored response bodies.
- **9 exact hosted diagnostic contexts:** three per route to identify LCP element/resource. Two extra single contexts recorded response-header/body phases for Home and Post. These are diagnostic observations, not a new seven-sample performance acceptance table.

## One-factor results (milliseconds)

| One changed factor | Home READY [range] | World source READY [range] | Post READY [range] |
|---|---:|---:|---:|
| Baseline: CPU4 / static150 / API150 / 1.6MiMbps | 3781 [3706–3965] | 4817 [4533–4920] | 3571 [3532–3645] |
| API response delay150→450ms | 3810 [3781–3890] | 4919 [4833–5023] | 3534 [3494–3607] |
| CPU4→1 | 3243 [3188–3262] | 4154 [4102–4182] | 3134 [3112–3154] |
| Static latency150→300ms | 5054 [4954–5112] | 6279 [6179–6348] | 4791 [4662–4846] |
| Static bandwidth1.6→10MiMbps | 2447 [2407–2527] | 3112 [2867–3172] | 2311 [2240–2339] |

Ranges separate from baseline for static latency, static bandwidth and CPU. API-delay ranges overlap the baseline on all three routes, so its small primary READY differences are not accepted as wins/regressions beyond noise. Independent savings are never added.

The API delay case nevertheless moves the last REST response about two seconds later on Home/World. Request counts stay59/55/6 audited product reads in every factor. OPTIONS/blocked telemetry are excluded in replay and are separate from hosted totals.

The fixture model releases the primary response around0.36–0.38s, while baseline primary content is ready around3.78/4.82/3.57s. This observation concerns response delivery, not completion of later client JSON/projection processing. `jsBeforeReadyEnd` means the last JS resource ending before the marker; it is not a measured dependency-graph depth.

### Invalid runs retained, not accepted

`pre-union/` preserves the initial runs. At high static latency, eight additional lazy/offscreen public images were requested and missing from the original capture. Home/World cells were rejected; actual200 responses were captured and all five factors re-run on the augmented union. Existing fixture entries were copied unchanged. `fixture-union.json` records hashes and the added assets. Body fixtures remain outside Git. Timestamp-dependent bounds are normalized by the inherited capture/replay protocol; numeric/method/slug arguments and returned content stay fixed.

## Native SQL and API separation

| Existing query/function | Anonymous execution median | Range, n=5 |
|---|---:|---:|
| Home21 primary metadata rows + JSON | 2.965ms | 2.851–13.697 |
| World flight post + JSON | 0.938ms | 0.877–1.056 |
| Post reading row + JSON | 0.616ms | 0.534–0.741 |
| convergence_meter1820 | 35.171ms | 33.233–55.057 |
| regular-method trace | 9.889ms | 9.486–13.474 |
|40 source arrivals | 11.917ms | 10.633–18.410 |

Native primary planning medians were about2ms, recorded separately. The Home outlier is retained. Five samples are not p95/concurrency evidence.

Real API TTFB: new connections ~223–237ms medians across the trivial and primary reads; reused connections ~186–214ms. A trivial one-row result is not much faster than the primary reads. TLS in new connections is ~22–33ms, reused connections correctly report zero new TLS time. There is no Server-Timing header: **network, gateway, JWT/Auth, connection-pool/queue and PostgREST overhead cannot be individually assigned** by these measurements. Native SQL numbers cannot simply be subtracted from an unrelated API sample as an exact network duration.

The canonical project is currently ACTIVE_HEALTHY, Postgres17, `ap-northeast-1` (Tokyo). Runner/proxy geography and CDN edge are unverified; a deployment's build region does not locate its static CDN delivery.

## Hosted LCP and correlated clocks

Measured protected Preview: `64b303e4e69c43f56b59d80ccbcdbd7b300ce9dc`, deployment `dpl_D1nqrMbLtZhFCJ1gm5o2BX6Nbigr`. Build identity and read-only guard checked in every context, zero runtime/settle errors and zero overflow. Raw CDP resource clocks are relative to the document request. No fixture interception.

- **Post:** primary response request208ms → headers521ms → end550ms; primary content3759ms. Cover image starts3779ms → headers3948ms → end5148ms → LCP5196ms (single phase context). The preceding three observations agree on the same image: LCP5176–5292ms, `loading=lazy`, `fetchPriority=auto`, initial network priorityLow; about214KB on the wire, natural1586×992 versus rendered354px at DPR2. The principal late image request is caused by late DOM discovery/rendering; its body transfer then costs about1.2s under the matched network profile. Lazy/priority and image-size improvements are candidates, not proven isolated savings. No mobile image preload was added.
- **Home:** primary request215ms → headers686ms → end771ms; primary content3982ms. LCP image starts3982ms → headers4562ms → end5183ms → LCP5292ms. It is only~17KB, eager/auto with initial priorityLow, natural360×640 and rendered280px. In this one phase observation a new connection took~290ms and body delivery another~621ms; the delay is not explained by image size alone. Late discovery, connection/setup, shared bandwidth/priority and scheduling need a targeted image experiment. Do not apply the Post image-size diagnosis to Home.
- **World:** LCP is the actual source lead paragraph (`sod29-flight-lead`), not an image; three observations4892–4956ms. Its main lever is earlier safe render/code preparation.

World also waits for a fresh `site_flags` response before `MaintenanceLock` allows children. In the controlled baseline first flags start around1594ms, release1746ms and first root1801ms; with API delay450, flags start1590/release2042 and first root2114. This is a real policy gate, not an optional enrichment to suppress. A later experiment may prepare only the route code in parallel while preserving the fresh lock decision; no cached flags, bypass, blanket prefetch or state-provider replacement is justified here.

## Reused work and current states

- Newly completed tiered World experiment: journal `c375c6fe-a202-4fd2-bc05-9d2ac9820af9`, verified branch commit `5811b339d12ff2a4776e0609d3e21673ecb04181`. Three rotated seven-run invocations per variant, first-real-topic-card marker. Tier alone5299→5099ms, requests71→58; tier+early4652ms. It is the old RPC-stubbed harness and its patch changes ratings/timeline/content. Reused as directional evidence, not duplicated, adopted, compared or added to current results. First-ready code coverage does not prove unexecuted code can be removed.
- Existing×100 synthetic query/index proofs (including new gematria_words/research_contributions) were already completed and preserved at integrated docs commit `a924cd4b`; no need to reproduce or apply their drafts. Current cheap primary SQL does not establish bounded future cost. Number helper/backend costs and burst failures remain separate genuine risks.
- Existing extension-delay/failure and bounded-data/regression CI was reused. All six exact-head PR1100 checks PASS. Code/data-permission changes were not needed for this diagnostic branch.

## Next changes justified for separate measured experiments

1. Reduce/parallelize code needed before the real page mounts, using route-specific critical resource traces; move optional imports only with engine/content parity. Do not revive the rejected persistent-shell/provider rewrite or broad prefetch.
2. Address Post cover late discovery, lazy/priority policy and a faithful mobile-sized rendition, and Home hero priority/connection competition. Compare each isolated change, then the combined tree; retain the prior rejection of blanket mobile Post preload.
3. Schedule optional API work after primary content, remove true duplicates, and review bounded batch drafts for different-argument RPC fanout. This mainly protects tail/interaction/server load after the primary path is decoupled.
4. Keep growth query/byte/limit and nonblocking-extension budgets. Calibrate route-specific static bytes and pre-primary serial resource budgets from valid evidence; a generic count of chunks alone is not a dependency-depth budget.

Still unavailable/unproven: physical phone or runner near Israel; true field INP; same-origin proxy with a real geographic hop; signed-in full-flow measurement; controlled cold PostgreSQL cache and high-load p95. No production cache flushing, fake user identity, proxy settings or DB changes were used to manufacture these conditions. The low-load warm measurements do not rule out backend pressure under bots/concurrency. Diagnostic findings are VERIFIED in their stated scope; production speed closure remains OPEN.

## Reproduction and artifacts

- `scripts/perf-causal-2029/calibrate.mjs`, `run.mjs`, `sensitivity.mjs`, `analyze.mjs`, `api-probe.mjs`, `hosted-lcp.mjs`.
- Private capture paths are required for local replay; credentials/fixture bodies are not committed. Hosted access uses a temporary scope-limited Preview share URL, never a project-wide protection change.
- Data: `analysis.json`, `run-manifest.json`, `calibration.json`, five accepted factors, native SQL/RPC plans, `api-transport.json`, `hosted-lcp.json`, `hosted-phases.json`, reused tiered evidence and rejected `pre-union/` runs.
- Application tree is byte-identical to PR1100. Main was reread at `12fea7a3`; PR1100 at `5dd4afaa`. Integrated branch moved documentation during the diagnostic window; no runtime was substituted and no merge/release performed.
