# 2029 lazy Realtime hardening

## Scope and decision

- Exact input: `gpt/perf-realtime-entry-split-20261018` at `12e85699440108da55d5da80573306d4ed8f1843`.
- Implementation commit: `834508f2c1a9bf1f242f5fd9d8afb983c3c72510`.
- Branch: `gpt/perf-realtime-entry-split-hardening-20261018`.
- Decision on this implementation and its bounded contract: **GO**.
- Scope is limited to the 2029 lazy Realtime adapter and its tests. Legacy, UI, database, RLS, flags, deployment and Production are unchanged.

This is not a replacement facade for the complete `@supabase/realtime-js` package. It is a browser/Vite-only implementation of the exact Realtime subset used by this repository. A source contract test fails if another runtime Realtime export, `supabase.realtime` method, new channel consumer or unsupported channel method enters the repository.

## Correctness changes

- Operations issued while the SDK chunk is loading are replayed in source order. In particular, a broadcast `.on(...)` added after `.subscribe()` remains after the real `.subscribe()` call.
- Presence and Postgres bindings added after subscribe retain the installed SDK's synchronous rejection. A repeated subscribe is the SDK 2.116 no-op.
- `connect()` is serialized with `disconnect()` and `removeAllChannels()`. A stale pending connect cannot reconnect after cleanup.
- A failed module materialization clears both client and channel promises. Binding declarations are safe to retain for an explicit retry; sends, presence mutations and cleanup are never replayed.
- Channel declaration and removal before a triggering action remain transport-free. Pending subscription removal is ordered after subscribe and before the final disconnect.
- The existing access-token callback remains attached to the one eventual Realtime client. The real SDK loopback test observes the initial token in `phx_join`, then refresh and logout messages in order.
- Native Node/SSR materialization now rejects with `SOD_2029_REALTIME_BROWSER_ONLY` and resets for a later attempt, instead of reaching the package's browser ESM subpath and failing with an internal module-resolution error.

The existing consumers are unchanged: `joinEvents.js`, `presence.js`, `supabase.js` and `AdminPage.jsx`. The loopback test exercises the same subscribe → broadcast → remove path used by `joinEvents`, including the `CLOSED` callback and zero channels after cleanup.

## Installed SDK and real-browser proof

Both lockfile packages are exactly `2.116.0`:

- `@supabase/supabase-js@2.116.0`
- `@supabase/realtime-js@2.116.0`

The focused browser test builds the adapter with the installed Vite and SDK, serves it locally, launches Chromium, blocks non-loopback requests and talks to a local Phoenix-protocol WebSocket server. It proves that the Realtime chunk is absent before the first subscription, is requested on demand, subscribes, broadcasts, receives the event, refreshes and clears auth, removes the channel and disconnects. The companion native SDK test injects the installed CommonJS build into the same adapter and runs the same local protocol flow.

Official API references reviewed for the installed behavior:

- [Subscribe to channel](https://supabase.com/docs/reference/javascript/subscribe)
- [Remove a channel](https://supabase.com/docs/reference/javascript/removechannel)
- [Remove all channels](https://supabase.com/docs/reference/javascript/removeallchannels)

## Verification

- `npm run build` — PASS for Legacy and 2029.
- Focused adapter/source/build suite — 14/14 PASS.
- Installed SDK + browser-build loopback suite — 2/2 PASS, no skips.
- Existing early-read/runtime-switch suites — 25/25 PASS.
- Integrated Preview auth guard — 8/8 PASS, including sign-in, refresh and local logout.
- 2029 System Frame acceptance — PASS.
- 2029 bundle budget — 5/5 PASS; entry graph 9 chunks / 173.2 KB gzip.
- `src/lib/supabase.js`, `src/lib/AuthContext.jsx`, `src/lib/joinEvents.js` and `src/lib/presence.js` are byte-unchanged from the exact input commit.

All protocol tests used loopback and memory only. No CI, PR, hosted Preview, Supabase data, flags, deployment or Production were touched.

## Bundle and Legacy measurements

Clean builds of the exact input and implementation were compared with the same installed dependencies and gzip level 9.

| Measurement | Input split | Hardened | Delta |
| --- | ---: | ---: | ---: |
| Static 2029 entry closure | 176,345 B | 177,373 B | +1,028 B |
| Static closure vs. pre-split base | 191,697 B | 177,373 B | -14,324 B |
| Deferred Realtime chunk | 16,355 B | 16,355 B | 0 B |
| Realtime/Phoenix transport in static closure | no | no | unchanged |

The 1,028-byte gzip cost is the lifecycle state, ordered queue, explicit boundary and recovery logic. The original split still removes 14,324 bytes gzip from the static entry relative to the pre-split base. This remains a byte result; no hosted speed claim is made.

Legacy builds contain 293 files on both sides and are bit-identical. Both tree hashes are `b953da73f80deeca3aa72db0ae45ca22dfac3bc57bc47eaf1817896fa991f81b`.

Machine-readable measurements are in [`verification.json`](./verification.json).

## Boundary and remaining limits

- Only the repository's current browser subset is supported. Importing Realtime classes/constants through `@supabase/supabase-js`, calling `supabase.realtime`, or adopting another channel method requires removing the guard only after extending the adapter and real-SDK tests.
- The default loader intentionally does not support Node/SSR transport materialization. Factory injection remains available for isolated tests.
- Browser engines may cache a rejected dynamic-import URL for the document lifetime. The adapter clears its own failed promises and permits a safe retry, but a genuine missing/corrupt deployed chunk can still require a page reload.
- Chromium and the installed SDK were exercised locally. No Firefox, Safari, hosted Preview, user account or real Supabase Realtime service was used.

No `work_log` row was written because the available connector had broader write capability than this task required. This file is the handoff for the central session.
