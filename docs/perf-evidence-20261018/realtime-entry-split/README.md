# 2029 Realtime entry split

## Scope and base

- Exact base: `origin/gpt/perf-unified-wave3-20261018` at `6124db8d7ddac82654a09c49abf8ed60fe999d47`.
- Candidate branch: `gpt/perf-realtime-entry-split-20261018`.
- Scope is limited to the 2029 build graph. Legacy, product UI, database, RLS, runtime flags, Functions, Storage, deployment and Production are unchanged.
- The installed SDKs used by the build are `@supabase/supabase-js@2.116.0` and `@supabase/realtime-js@2.116.0`.

## Change

The 2029 Vite target aliases the exact `@supabase/realtime-js` package entry to a small lazy adapter. `SupabaseClient` still constructs exactly one client and exactly one existing `AuthClient`; only the Phoenix/Realtime transport module is deferred. Declaring a channel is side-effect free. The real module is imported when code subscribes, sends, tracks/untracks presence or explicitly connects.

The adapter retains the SDK channel contract used by this repository: queued `.on(...)` bindings, same-topic channel reuse, subscribe/send/track/untrack, presence state, single/all-channel cleanup and auth-token updates. The real module is loaded once and a single real Realtime client is shared by every channel.

The build alias is conditional on `SOD_BUILD_TARGET=2029`. The Legacy build resolves the SDK normally.

## Preserved contracts

- `src/lib/supabase.js`, `src/lib/AuthContext.jsx`, `src/lib/siteFlagsReadScope2029.js` and `src/lib/earlyPrimaryRead2029.js` have no diff from the exact base.
- The existing storage key, lock, session initialization, login, logout, refresh and cross-tab Auth behavior therefore remain owned by the same `AuthClient`.
- The existing access-token callback is passed unchanged to the eventual real Realtime client. Tokens received before load are coalesced to the latest token; INITIAL_SESSION/login/refresh/logout updates after load are forwarded in order. PostgREST continues to use the original client and JWT path.
- Site-flag invalidation, early reads and RLS behavior are unchanged. No second Supabase or Auth client is created.
- A final Legacy build was hashed per file against the exact-base Legacy build: all 293 files are identical, with no added, removed or changed file. See `legacy-parity.json`.

## Manifest measurement

Both sides were clean production 2029 builds from the exact base/candidate. The manifest entry closure was traversed recursively, and each JavaScript file was compressed with Node `gzipSync(..., { level: 9 })`.

| Measurement | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Static 2029 entry closure | 191,697 B gzip | 176,345 B gzip | -15,352 B (-15.0 KiB) |
| Static Supabase chunk | 63,543 B gzip | 48,191 B gzip | -15,352 B (-15.0 KiB) |
| Realtime/Phoenix in static closure | yes | no | removed |
| Deferred Realtime/Phoenix chunk | n/a | 16,355 B gzip | on demand |

The earlier approximately 19.8 KB estimate was a forecast, not a gate. The complete Realtime/Phoenix implementation produced by the installed 2.116.0 package is 16,355 B gzip, and the measured static-closure reduction is 15,352 B gzip after shared compression/tree-shaking. `before.json` and `after.json` contain the complete entry closures and exact chunk names and sizes.

This is a byte measurement only. No hosted timing or user-speed claim is made.

## Verification

- `npm run build` — PASS for the full Legacy and 2029 production builds.
- `node --test test/realtime-entry-split-2029.test.mjs test/early-primary-read-2029.test.mjs test/site-flags-inflight-2029.test.mjs test/runtime-switches-2029.test.mjs test/runtime-switch-navigation-scope-2029.test.mjs` — 31/31 PASS.
- `node scripts/test-integrated-preview-auth-guard.mjs` — 8/8 PASS, including sign-in, refresh, local sign-out, governed reads and blocked writes.
- `node scripts/test-2029-system-frame.mjs` — PASS.
- `node scripts/test-2029-server-seo-ai-parity.mjs` — PASS.
- `node --test test/public-launch-seo-gates.test.mjs` — 20/20 PASS.
- `npm run test:2029-bundle-budget` — 5/5 PASS; entry graph is 9 chunks / 172.2 KB gzip under that test's reporting method.
- Focused tests prove no transport load during construction/auth events or channel declaration; one load/client on first action; queued and late bindings; INITIAL_SESSION/login/refresh/logout forwarding; cleanup; build alias isolation; and absence of Realtime/Phoenix from the static 2029 entry closure.

No PR, CI run, merge or deployment was created by this task.
