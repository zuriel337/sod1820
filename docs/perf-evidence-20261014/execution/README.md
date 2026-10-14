# 2029 performance execution — review report

**Branch-only implementation; speed acceptance remains OPEN.** PR [1100](https://github.com/zuriel337/sod1820/pull/1100) targets the integrated preview branch. No merge, production deployment, Legacy entry change, product-data write, index, migration, cache, RPC replacement or message to another agent was performed. Protected static Preview builds are the explicitly requested review artifacts.

## Ownership, baseline and DRIFT

The user explicitly transferred all performance execution ownership after the initial checkpoint. Passive BEFORE `8fe3aa84-ab54-4f57-bc14-ee3009ce0571` records the bounded 2029 performance scope. Other sessions' journal entries and unrelated ownership were not altered. Active v17, Owner Index, frame contracts and the relevant 48-hour journal were read. No ACK was requested.

- Initial/live `origin/main`: `12fea7a33ea2367f590050f8e499389b7e508561`, DRIFT from handed-off `5dd7032e`.
- Immutable integrated application base: `18821815e4e7addf9d09f19b2d4eeff6a71ca77a`, app-equivalent to `0e4e2d57`/`13fccd0b`.
- Integrated remote moved to `d9d809654d29e3eca06f151a1f41cdfb8d4a85ca` during execution: three performance documentation files only, zero application changes. The measured base remains immutable; no savings from the new experiment report are added.
- Prior Claude performance branch verified at `2059292d5082991d9aefc9264372e20ec2f0c7e0`, DRIFT from handed-off `13fccd0b`.
- Reused font experiments `8fd9c701`/`ef8a51ad`, lazy World projection `c642d448`, frame/trail patch, existing lazy boundaries/bundle budget and DB drafts. The persistent-shell prototype was already measured and rejected: larger cold entry, slower FCP and worse navigation/CLS. It was not restarted or adopted.

## Implemented behavior

1. Replace render-time `innerWidth` with the existing responsive breakpoint via `matchMedia`, with cleaned-up change listener. Reserve the trail row height without changing content.
2. Remove the font wait and retain only Noto body-font preloads, reusing completed experiments. No mobile Post image preload.
3. Start only canonical anonymous Home/Post/World primary GETs in the head. Query definitions, limits and slug handling are shared with the existing readers. One-shot promises are consumed by the same Supabase client, not a second request. Stored auth/blocked storage, changed auth/profile/headers/route, abort, failure and expiry all fail to the normal reader. No persistent result cache.
4. Separate Home primary cards from World availability changes, removing repeated reads. Fetch bounded card columns, not every body; retain the admitted language highlights through one guarded body read. The captured Home bodies drop **582,534 → 74,717 bytes (87%)**, with zero selected-column differences. Extra singleton request is included in counts.
5. Use the installed, permission-checked arrivals v2 directly. v3 is absent; no function was created. Load the World post projection lazily and defer a local compact source story's reads until it is actually visible. This removes six hidden World reads without removing visible content.
6. Render admitted public World source content before optional canonical verification/context finishes. Pending/error state is explicit; original verification functions, rules, claims, permissions and final content remain. Private stage data cannot take this path. A two-second extension delay plus six failed trace reads leaves primary content ready well before extensions end.
7. Keep fallback snapshot bytes out of ordinary post reading and load golden executors only after existing golden-pack admission. Same executors and arguments, parallel trace reads. Timing differences inside noise are not claimed as wins; deterministic bytes/chunk reductions justify these boundaries.

## Measurement validity

The original GET-only harness fulfilled every POST RPC as 204 and substituted empty external assets. Its old 19-Post-resource count is **not** product proof. It is retained in `initial-checkpoint.md` and rejected by the product evidence gate.

Corrected replay captures real anonymous public GET/read-RPC responses and real external assets. Private fixture bodies remain outside Git; committed files contain status, query, hashes and raw timing samples only. Anonymous capture has a 200-request/asset ceiling and audited RPC allowlist. Product mutations, telemetry and auth calls are blocked. The only expected baseline 404 is the absent arrivals v3 followed by v2.

Mobile: 390×844, DPR2, CPU×4, cold contexts, Chromium 141.0.7390.37 / Playwright 1.56.1; RTT150ms, download209715.2B/s (1.6MiMbps), upload96000B/s. Each matched comparison uses exactly the same captured union and browser conditions, median of seven plus full range. Replay deliberately fixes RPC delay and does not reproduce REST body bandwidth, live DB duration or CORS OPTIONS. It is separate from hosted live measurements; numbers and isolated savings are never summed.

### Combined matched replay

Final table is generated from `combined-before.json` and `combined-final.json`; all times are milliseconds. The baseline includes complete content, not the invalid GET-only shortcut.

| Surface | FCP before→after | LCP before [range]→after [range] | READY before [range]→after [range] | First primary before→after | Last REST before→after | Audited REST reads | CLS before→after |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 1780→1584 | 4520 [4460–4856]→3988 [3956–4036] | 4283 [4209–4564]→3747 [3727–3804] | 3953→209 | 5537→5539 | 60→59 | 0.02052→0.01995 |
| `/world` | 2028→1840 | 6196 [6108–6296]→4772 [4652–4868] | 6102 [5991–6177]→4788 [4565–4888] | 4617→213 | 6050→5989 | 62→55 | 0.00024→0.03709 |
| `/post/seventh-to-tenth-sefirot-2027` | 1780→1592 | 4152 [4092–4240]→3884 [3796–4072] | 3895 [3834–3969]→3606 [3512–3736] | 3567→213 | 4311→3870 | 7→6 | 0.00849→0.00008 |

### Navigation and layout

Five cold source sessions per transition; READY is relative to actual client navigation. Navigation FCP/LCP entries belong to the initial document and are not used as transition metrics.

| Transition | READY before [range] | READY after [range] | REST before→after |
|---|---:|---:|---:|
| עולם→בית | 1016 [964–1085] | 949 [874–963] | 54→52 |
| בית→עולם | 2638 [2617–2737] | 1514 [1510–1516] | 57→50 |
| בית→פוסט | 858 [808–921] | 790 [777–800] | 6→6 |

Desktop Post trail: matched seven samples, 1366×768/DPR1/CPU1/40ms/10MiMbps. CLS **0.17936 [0.06791–0.18103] → 0.07815 [0.06436–0.07959]**. All live source-query fixtures succeed; zero misses/errors; same primary source/text hash. Initial missing desktop assets were captured anonymously and both sides remeasured; invalid earlier runs are not used.

World source-first isolated run: READY6025 [5967–6115] →4789 [4747–4847]; same read body hashes and links. Functional delay/failure run: READY4760 versus last REST11882, six deliberate trace failures, successful primary source, no runtime errors or missing fixtures. This is functional evidence, not a normal timing result.

### Hosted live verification

Protected, noindex, static, read-only Preview; product GET and audited read RPCs use the live Supabase database. An existing deployment protection was retained. Temporary sharing is limited to these preview aliases; no project-wide protection, production alias or environment setting changed.

- After artifact: `64b303e4e69c43f56b59d80ccbcdbd7b300ce9dc`, [Preview](https://sod1820-git-64b303e4-sod1820-s-projects.vercel.app), deployment `dpl_D1nqrMbLtZhFCJ1gm5o2BX6Nbigr`, READY, target=null (Preview), region iad1.
- Baseline artifact: `6deea84c46efbc8449fd39decbc5cae1e46d8b4f`, deployment `dpl_7H2eeus6TRTmeSfQ3JvAqQp3pBrT`. Baseline runtime (`src`, `public`, 2029 HTML, Vite, package/lock) is verified byte-for-byte against `18821815`; only review guard/build metadata are newer. This is a disposable baseline branch, not a proposed application rollback.
- Exact source SHA and manifest hash are read from `/preview-build.json`. Service-worker read guard must control every measured page. Seven new contexts per surface, matching CPU/network/browser/theme; no fixture interception. PostgreSQL cache and upstream time vary and are not claimed cold.

| Surface | FCP before→after | LCP before [range]→after [range] | READY before [range]→after [range] | First primary before→after | Last REST before→after | REST incl. OPTIONS | CLS before→after |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | 2004→1820 | 6176 [5832–6284]→5284 [5176–5444] | 5131 [4979–5530]→3950 [3839–4016] | 4060→200 | 6929→7154 | 123→123 | 0.01817→0.01825 |
| `/world` | 2304→1944 | 7544 [7512–8012]→4984 [4804–5144] | 7455 [7418–7883]→4897 [4742–5062] | 4885→205 | 7394→7007 | 124→110 | 0.03165→0.03132 |
| `/post/seventh-to-tenth-sefirot-2027` | 2000→1780 | 5680 [5616–5824]→5228 [5136–5336] | 4264 [4168–4417]→3765 [3707–3882] | 3786→202 | 4780→4518 | 15→13 | 0.00862→0.00008 |

Original Home baseline sample2 did not settle its network within30s. Its full raw run remains in `hosted-before.json`, excluded from accepted Home statistics. `hosted-before-home-repeat.json` is a complete repeat of all seven Home samples, with zero settle/runtime errors; World and Post use the original complete seven-run baseline. All accepted samples have the read guard and zero horizontal overflow. The known baseline v3 404 and Preview guard403 for `ingest_event` / unaudited `notification_prefs_guest_get_v1` are explicit. No other failed REST status was observed. These guard restrictions mean hosted verification covers primary public content and the admitted readers, not every optional product flow.

Post hosted READY improves498ms, meeting the400ms criterion in this method; LCP5228ms misses3600ms. Live Preview Post REST15→13 includes preflight; this does not establish the production count because the review guard rejects telemetry/unaudited operations. Home REST123→123 remains high and last REST6929→7154ms does not improve, despite primary READY and payload improvement. World REST124→110. No proxy or SQL savings are assumed.

Hosted REST counts include observed OPTIONS and blocked preview telemetry; they are not comparable to replay's audited product-read counts. Raw files record methods/status/errors. Preview guard rejection of telemetry is expected. Any other denied/missing read is reported separately and cannot be silently accepted as content equivalence.

## Regression enforcement and checks

- Bounded metadata columns, existing card limits and single admitted body; Home reader limit cannot drift independently from the head registry.
- CI builds exact base/head independently, captures one bounded anonymous union, runs seven matched replay samples and rejects timing/read-count/CLS regression. Artifact upload excludes fixture bodies.
- CI additionally injects delayed/failed World extensions and rejects a primary-content barrier. Test evidence validates successful primary requests, non-missing content, request/condition equivalence, auth fallback, cancellation and one-shot reuse.
- Relative replay budgets: at most 10% plus100ms timing noise, zero additional REST reads, CLS≤0.1. These are regression budgets, not absolute production targets.
- Relevant auth/readers/budget/golden-pack/public-connection tests: **37/37 PASS**. Earlier focused feature/public-admission/privacy/placement checks:32/32 PASS. Both isolated builds, built dependency graph, frame and four bundle budgets passed. Final CI status is recorded in `verification.json`; no local-build-only speed closure.

The original `measure-2029-v2.mjs` hardcodes a different Post (FZ1073), compression/protocol and runner. Its completed live experiments were reused as evidence, not mixed with the seventh-to-tenth table. New live acceptance uses the corrected protected-hosted harness with the requested three routes and exact source metadata. The production deployment was reread as READY/main12fea7a3, unchanged.

## Human gates and deliberately open work

`public-enrichment-batch.DRAFT.sql` is guarded, bounded, invoker-security SQL with grants disabled and an unconditional execution stop. No function was created or called. Twenty native anonymous read calls gave zero native-value/wrapped-value differences and identical JSONB MD5 in `batch-native-value-parity.json`; this does **not** prove an unapplied batch wrapper's execution/errors, signed-in permission behavior or live batching savings. Existing index/read-model and number-helper drafts remain unexecuted. No RPC client replacement.

Same-origin proxy, bot controls/edge cache, rate limits and number-helper rewrite remain evidence/approval gated. No infrastructure change or speculative cache. Persistent shell/provider/feed consolidation and idle chunk prefetch remain deferred following the documented shell regression and unproven state/freshness compatibility. The existing engines and their independent state owners are preserved.

Still OPEN: physical phone in Israel; measurement from near Israel; true mobile interaction/INP; controlled cold PostgreSQL cache; proxy jump/OPTIONS benefit; signed-in complete end-to-end parity; Number transition acceptance. Post LCP≈3.6s and 17–20 live requests are not automatically satisfied by six replay reads; use the separate live table. Post READY improvement≥400ms is assessed per measured method, never inferred from first-request lead or summed experiments. Production AFTER requires a separately authorized release, followed by the same protocol.

## Rollback and state

Small commits isolate responsive frame, fonts, head handoff, repeated cards, lazy projection, v2 fallback, narrow cards, trail, hidden story, source-first rendering and byte boundaries. Roll back a runtime change by reverting its commit and rebuilding the protected Preview; do not undo another session's branch or apply SQL. Head handoff can be reverted independently because existing readers and defaults remain the fallback. Source-first can be reverted independently to await the full canonical projection. No data migration needs reversal.

DOCUMENTED / IMPLEMENTED / BRANCH-ONLY / TESTED: yes for the listed changes. PREVIEW-DEPLOYED: exact artifacts above. HOSTED-VERIFIED: use recorded browser evidence and its limitations. MERGED / PRODUCTION-DEPLOYED / LIVE-VERIFIED / SPEED-CLOSED: **no**. Passive final work_log record and its readback are referenced in the PR; no automatic reviewer/agent activation.
