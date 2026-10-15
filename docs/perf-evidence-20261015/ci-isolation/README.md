# CI isolation — dependent on PR1110

Base: `gpt/perf-cold-measurement-20261015` at `8965f1b6c10f3c6acd39f8c3ab05e658b10d0b19`. Integration remains `14e239b47e5ec6b95eaad4e1b368520512642217`; main remains `503b52ef169b6e51f967187491398d153090aa45`. Task: `GPT_PERF_CI_ISOLATION_20261015`. Passive BEFORE: `cf6da7f5-b002-4c4f-b6d5-38d7754b2a50`, to ZURIEL, dispatch fields NULL.

Implemented test boundaries; local source/build and focused positive/negative controls pass. **Full browser/product replay acceptance remains BLOCKED by missing frozen snapshots. No remote PASS or live A3 acceptance is claimed.** No product source, public configuration, flags, database schema/data, permissions, deployment or performance thresholds changed. The cancelled run 38783045975 was not rerun; its trace/spans were not modified or deleted.

## Reachable network paths

`network-map.json` records the original workflow roots, 449 reachable local imports, network API sites and install hooks. This is an egress map of the three jobs, not a performance scan. Static matches include mocks and source assertions; runtime controls are separately tested.

| Boundary | Existing path/risk | Isolated behavior |
| --- | --- | --- |
| Install | Root and base `npm ci`; test tools; lifecycle hooks in fsevents/sharp/esbuild | All package installs use `--ignore-scripts --no-audit --no-fund`. Browser CLI downloads and system dependencies are explicit setup operations, before tests. No app/test/build code runs during networked setup. The npm update notifier is disabled for the isolated command (the initial blocked registry probes and correction are retained). |
| Build | Vite/React build, integrated Preview generator, pinned esbuild child process | Repository and base build hooks run inside the offline namespace and native/Node guards. Root scripts/config have no pre/post install/build hooks. Packaging uses preinstalled esbuild 0.28.2, never npx download in isolation. |
| Node | A3 imported public production client and invoked research-run; other tests import real libraries and execute VM handlers | A3 uses the actual SDK request path, correlation helper, complete Edge handler and canonical composer/executors, with synthetic credentials and per-test memory storage. Node preload plus inherited native socket checks cover fetch, http/https, DNS and subprocesses. |
| curl | Three runners captured arbitrary upstream GETs/allowlisted RPCs; preview health check | Live capture is rejected before serving/navigating. Curl capture implementations are removed. The one remaining health curl is to the explicitly registered loopback preview, after its ready file exists. |
| Browser | fetch/XHR, parser preload/preconnect, images, Workers, WebSocket, analytics and popups | Context-level routes are installed before navigation. Only exact frozen responses and the local static origin are admitted. Unknown RPC/requests and table writes record violations; there is no production fallback. WebSockets are denied. The native layer blocks any route bypass. |
| Service workers | Existing generated Preview SW allowed broad GETs and some named RPC/auth paths | All test contexts block service workers. The disposable static server unwraps only the generated Preview boot loader in the served copy, loading the same entry module under the stricter context policy. Build artifacts/product code are untouched. |
| Telemetry/beacon | Public production config exists even with no secrets; beacon can disappear during shutdown | Known fire-and-forget first-party telemetry has an explicit local 204 test substitute with no response-content contract. Other beacon calls record through a controller binding before shutdown and are denied. Unknown third-party traffic requires a real frozen fixture or fails. |
| Teardown | Late callbacks, pagehide/beforeunload, child processes | Checks run after context/browser close and after command exit. Forbidden attempts fail independently of application error handling. Preview startup/cleanup share one shell and wait for the owned process; no detached nohup server remains. |

No public capture is used. GET, anon credentials and RPC names are not treated as evidence of no writes. Replay cannot contact a live service. UDP route selection emits no packet; native checks also guard connected/unconnected datagram sends, tested against a local UDP trap. GitHub job descendants additionally have no external route (`unshare --net`, loopback only). This extends existing test guards, not product authorization or observability.

## A3 evidence

The historical script filename is retained for callers, but its output is explicitly `A3_ISOLATED_CLIENT_CORRELATION`, `liveAcceptance=NOT_RUN`. Server-generated trace IDs are verified against saved root, parent-linked spans, matching interaction, final state, caller/server credential separation and nonempty Findings from the actual canonical composer. Five saved spans cover root, gate, composer and both requested capabilities.

HTTP and thrown storage failures at begin, gate-span, compose-span and engine-span persistence suppress the bundle. A ninth failure case proves the independent witness rejects an unfinalized trace. **Existing product limitation:** research-run ignores the return value of `op_trace_finish_v1` and can still return `ok` when finalization fails. This task does not change product code or claim that behavior is fixed. It is exposed in the test output; a valid UUID alone cannot pass the witness.

## Validation and unchanged measurement

- The complete preserved hard-isolation source gate, packaging, both production build graphs, dependency graph and bundle budgets ran under the native no-egress runner. The three source-fidelity suites that formerly ran only after replay also run explicitly, preserving their coverage while snapshot preflight is blocked.
- Focused cold measurement tests include the real paused Chromium renderer, document clock calibration, real-content readiness, current network quiet, immutable reads and session-window CLS. Original clock/readiness/CLS implementations and all numerical thresholds are unchanged.
- Replay validator rejects missing, null, string, NaN, infinite and negative observation boundaries; a negative test uses valid saved PR1110 evidence. Old valid evidence still validates. Isolation is recorded as a comparison condition, so historical and isolated network conditions cannot silently compare.
- Navigation callback/regression tests preserve trusted input, parity and mixed-version rejection. Both comparison sides use the same head runner and the same hash-pinned input in the workflow.
- 17 local trap controls cover Node fetch/http, inherited child Node, curl, UDP, browser table write, unknown RPC, unapproved research-run, beacon, early script, navigation teardown, browser close, Worker and WebSocket. Positive controls verify approved local HTTP, actual nonempty replay bodies and blocked service-worker registration. Forbidden traps received zero requests/packets; swallowing errors still made the enclosing command fail.
- Snapshot configuration tests reject absent configuration, empty/malformed input and hash mismatch. Browser/World/Entry assertions and mobile image fidelity/64KiB tests remain in their original reachable suites; they have not been replaced by empty content or skipped.
- A3, four real Chromium measurement controls, seven replay-validator tests and the production build also ran in a separate Docker **network=none** namespace. The exact native guard was compiled on the host and copied into that image (which lacks a compiler); the full source gate used the normal host compiler. `offline-subset.txt.gz` records that separate subset accurately.
- Both local base/head builds used the same dependency lock and produced identical 403-file trees; see `build-receipt.json`. This proves source/build preservation, not a new speed result.

## Explicit input blocker

The prior private snapshot path `/workspace/work/perf-cold-measurement-scratch-20261015` does not exist in this environment. Its recorded SHA256 is `224ebd7b6232c72fb9003fb27f90938e2be36372752728ac7ef10cea001c6c9f`. Stored measurement JSON contains fingerprints and observations, not the missing response bodies. It cannot reconstruct a representative dataset.

The workflow requires reviewed complete `performance.json.gz`, `navigation.json.gz` and `browser.json.gz` under `test/fixtures/ci-2029/`, with exact SHA256 entries in `manifest.json`. These can be distinct snapshots for their different headers/coverage; each comparison must use one immutable input on both sides. The prior performance snapshot alone may need additional already-approved frozen browser/navigation responses. They must contain representative content, source bodies, numeric/RPC data, catalog pages and original/rendition image bytes used by existing assertions. No placeholder manifest or empty dataset was committed. Missing inputs fail explicitly before app/network execution. The local missing-manifest negative is retained.

Consequently the full matched seven-sample performance/navigation runs, 16 mobile image cases and complete World/Entry browser suites remain **BLOCKED_INPUT_MISSING**. Saved PR1110 evidence is validated, not relabeled as a new run. Live service acceptance remains separate and unperformed.

## Publication safety

`trigger-review.json` maps the changed paths. Push has no matching push workflow; the unchanged Vercel configuration disables deployments for `gpt/*`. A draft PR into the specified cold-measurement branch matches only `2029-isolation-gate.yml`. Pull-request workflow definitions come from the merge ref containing this patch; all three jobs explicitly check out the exact PR head. No pull_request_target or workflow_run handler exists in the reviewed repository. Base build source is archived and used only inside the isolated boundary; base CI scripts/A3 are never executed. Dependency setup is the only networked phase.

A draft can therefore run the updated isolated jobs safely. With the current absent inputs, replay/browser preflight will fail honestly; it is not a CI PASS, and no skip-ci or continue-on-error is used to manufacture one. No merge, main/integration push, live probe, deployment or new agent/session is authorized here.
