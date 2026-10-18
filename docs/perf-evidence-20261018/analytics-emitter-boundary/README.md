# 2029 analytics emitter boundary

Date: 2026-10-18
Branch: `gpt/perf-analytics-emitter-boundary-20261018`
Exact base: `gpt/perf-wave3-integration-20261018@6124db8d7ddac82654a09c49abf8ed60fe999d47`

This change moves the network-capable 2029 telemetry emitters behind the existing `fx_analytics` decision. It does not claim a timing or LCP improvement. Timings are **NOT_MEASURED**.

## Boundary and behavior

- Before React paints, bounded collectors install synchronously for runtime errors and hard-load LCP/CLS/INP. Shared-shell tracking calls also enter a bounded memory queue. These paths have no analytics transport or identity import.
- While `fx_analytics` is loading, observation remains memory-only.
- When the flag resolves OFF, the pending queues and RUM collector are discarded. The analytics emitter chunk is never requested and no telemetry write starts.
- When the flag resolves ON, one shared dynamic import starts GA, marketing, identity, internal visit/engagement, runtime-error delivery and RUM delivery. Pending items flush in their original order. Route visits and engagement still precede the delayed 350 ms GA/marketing pageview.
- A missing row or failed flag read retains the existing fail-open `fx_analytics` default. A failed emitter import is silent and retryable by a later owner/path effect.
- Vercel Preview, Integrated Preview, and the Kingdom Preview route discard the memory collectors and request no emitter chunk even when the switch state is ON.
- The hard-load RUM envelope and SPA usable-navigation envelope remain the v2 schema. SPA navigation still publishes no destination-route CWV.

The 2029-only Vite resolver preserves shared source files while replacing first-load tracking imports with either the canonical pure visitor ID owner or a memory-only facade. A build-graph test verifies that the entry and Home, World, Post and Number static closures contain none of `analyticsEmitter2029`, `webVitalsEmitter2029`, `tracking`, `marketing`, `visits` or `engagement`.

## Byte measurement

`bundle-measure.json` compares production-build manifest closures. Values are exact per-file raw bytes and gzip level 9 bytes for JavaScript. They are transfer-size evidence, not elapsed-time evidence.

| Graph | Before raw / gzip | After raw / gzip | Delta raw / gzip |
|---|---:|---:|---:|
| Static 2029 entry | 630,681 / 192,009 | 624,835 / 189,914 | -5,846 / -2,095 |
| Home including entry | 1,100,692 / 348,477 | 1,093,367 / 345,254 | -7,325 / -3,223 |
| World including entry | 1,453,636 / 453,168 | 1,445,678 / 449,490 | -7,958 / -3,678 |
| Post including entry | 1,167,420 / 372,741 | 1,159,917 / 369,433 | -7,503 / -3,308 |
| Number including entry | 1,265,294 / 400,981 | 1,257,661 / 397,565 | -7,633 / -3,416 |

The authorized emitter adds three chunks totaling 9,066 raw / 4,018 gzip bytes. Those chunks are requested only after an ON decision outside Preview.

The separate Legacy production build is byte-for-byte identical: 293 files, 24,504,416 bytes, zero changed files, tree hash `cdc717c9db647ef97309cf6db7d40b4e12294387c8e9843b9c41251ff6044e64` before and after.

## Verification

Passed locally:

- Boundary unit and real Chromium loopback tests: early memory capture, cold OFF no chunk/no writes, Preview no chunk/no writes, ON one shared chunk, exact runtime-error envelope and visit/engagement/pageview order, retryable load failure, StrictMode remount, slow import/navigation replacement and OFF-before-import races.
- RUM v2 unit and Chromium suites: hard-load versus SPA schema, Preview zero writes and zero identity reads, final/checkpoint ordering and content-readiness truth.
- Runtime-switch, navigation-measurement, one-tree analytics and reliability suites.
- Full Legacy + 2029 production build.
- 2029 bundle budget: 5/5.
- Built-graph boundary test: 1/1.

The browser harness serves only `127.0.0.1`, uses its own in-memory emitter, and makes no live service call. No DB object, migration, RLS, live flag, UI/CSS, Realtime, auth source, Preview binding, deployment, PR or CI was changed.

## Limits and release notes

- No hosted Preview, Production, authenticated user, physical phone, Firefox or Safari run was performed.
- A third-party analytics script already loaded during an ON period cannot be unloaded if the flag changes to OFF in the same document. Cold OFF and all Preview modes load none of those scripts. First-party collectors, route starts and an open engagement tracker are stopped without a final write when the owner turns OFF.
- The memory queues are deliberately bounded: 50 shared-shell calls plus the existing runtime-error dedupe and per-minute/session caps.
- No canonical `work_log` write was made because this session had no narrow approved writer. The central session must record the passive BEFORE/AFTER handoff if required.

Reproduce the bundle report with:

```bash
BEFORE_DIST=/tmp/sod1820-shared-shell-audit-6124/dist \
AFTER_DIST=dist \
node docs/perf-evidence-20261018/analytics-emitter-boundary/tools/measure.mjs
```
