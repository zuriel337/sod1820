# 2029 `site_flags` navigation-scope coalescing

## Scope and baseline

- Baseline: `gpt/perf-unified-candidate-20261018` at `8f78c0c7ced835849a816a815abf05a7247ceead`.
- Change is branch-only. It does not change `site_flags`, DB/RLS, live flags, workflows, Legacy product behavior, deployment, or Production.
- Canonical owner check: `site_flags_lock_law` v3; coordination check: `inter_agent_coordination_law` v17. No active writer overlapping `src/lib/supabase.js`, `src/lib/AuthContext.jsx`, or the shared flag reader was found before writing.

## Exact callers and semantics

The verified two-wave pattern is:

1. `App2029.jsx` mounts `RouteEffects2029`, whose `useRuntimeSwitch("fx_analytics")` calls `readRuntimeSwitches()` and then `getSiteFlags()` before the lazy route is ready.
2. The lazy route arrives later. `Locked` / `useFeatureState`, Home's three launch gates, and System Frame's six launch gates call `getSiteFlags()` again. World and secondary readers also consume `readRuntimeSwitches()`.

The existing reader already shared one in-flight request among simultaneous hooks. It deliberately discarded the result when the request settled, so the later lazy-route wave opened a second identical GET. The hosted baseline usually recorded four `site_flags` network events; the loopback harness confirms those represent two logical GETs in every tested cold route.

`lock_*` rows are capability availability/access input. Required missing rows stay fail-closed. `fx_*` rows are owner controls and optimization selection, not authorization; their documented defaults remain unchanged. Both families now share one successful public snapshot only for the current 2029 navigation.

## Bounded implementation

- Navigation identity is the React Router history key plus pathname, query, and hash.
- A successful 2029 result may be reused by staggered consumers in that identity.
- A new navigation bypasses both the `site_flags` result and the 30-second runtime-switch cache.
- A real viewer identity transition invalidates the scope. Initial session discovery and same-user token refresh do not create a duplicate startup request; access projection still recomputes from current Auth context.
- A failed read is never cached. The next call retries the canonical table.
- A late response from an old navigation cannot populate the current scope.
- Legacy continues to use its prior in-flight-only reader.
- Admin runtime-switch writes invalidate the read scope before verified readback is projected.

## Measurement

`measurement.json` was produced from production builds of the exact baseline and candidate, with Chromium on a local static server. Every non-loopback request was fulfilled from a synthetic fixture or aborted. No live fallback or write was possible.

Across 3/3 runs for each route, logical `site_flags` GETs changed:

| Route | Baseline | Candidate | Delta |
|---|---:|---:|---:|
| `/` | 2 | 1 | -50% |
| `/world` | 2 | 1 | -50% |
| `/number/718` | 2 | 1 | -50% |
| `/post/flydubai-fz1073-363-14000-remzei-geula` | 2 | 1 | -50% |

The Home → World internal-navigation probe changed from 2+2 GETs to 1+1. The second candidate GET proves that a new navigation receives a fresh snapshot rather than reusing Home's state.

The 2029 static entry closure remains 9 chunks. It changed from 187,586 to 188,333 gzip bytes (+747 B, +0.40%). The shared Supabase chunk changed from 62,899 to 63,462 gzip bytes (+563 B).

This measurement proves request removal and navigation freshness. It does not claim an LCP improvement; hosted timing acceptance must be repeated after integration.

## Verification

- Focused flag/runtime tests: 32 passed.
- Public launch/SEO gates: 20 passed.
- Integrated Preview auth guard: 8 passed.
- 2029 System Frame acceptance: passed.
- Full Legacy + 2029 build: passed.
- 2029 bundle budget: 5 passed.

The focused tests cover simultaneous and staggered consumers, navigation refresh, auth/viewer invalidation, error retry, late-response isolation, no cross-user reuse, existing defaults, admin readback, and unchanged Legacy in-flight semantics.

## Reproduction

```bash
BEFORE_DIST=/tmp/siteflags-before \
AFTER_DIST=/tmp/siteflags-after \
PLAYWRIGHT=/workspace/private-perf-20261017/unified-tools/node_modules/playwright/index.mjs \
CHROMIUM=/usr/bin/chromium \
OUT=/tmp/site-flags-measurement.json \
node docs/perf-evidence-20261018/site-flags-fanout/tools/measure.mjs
```

Limit: the snapshot intentionally remains stable while a single navigation is open. The canonical law already defines open clients as non-realtime unless they refetch or subscribe; route change, reload, explicit fresh retry, auth identity transition, and runtime-switch write all break the scope.
