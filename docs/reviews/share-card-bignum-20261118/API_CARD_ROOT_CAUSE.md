# /api/card — the 300 s timeouts: what is proven, what is not, what this branch changes

Status: BRANCH-ONLY (`ccr-dcadb071-v1z5ol-card`, base `origin/main` 270bfab6a). Not merged, not deployed. Live: dpl_E2969 (270bfab6a).

## Owner chain

Publication/meta owners (`project_codex.publishing_conventions`, `api/og.js` emits `og:image`) → `api/card.js` (renderer, @vercel/og 0.11.1,
Heebo 800 + logo embedded) → `public-reading-deploy/api/card.js` (public wrapper: origin, method, deadline, cache) → CDN → crawlers
(WhatsApp, Facebook, Telegram, Google) and the site's own share buttons (unit card, world finding, thumbnails).

## Proven (live data, 18.11.2026)

| # | Fact | Source |
|---|---|---|
| P1 | **33 timeouts in the last 7 days**, 8 in the last 24 h, 14 between 11.11 21:00 and 15.11. The "first seen 21.9" is the age of the error group, not the start of the count. "33 since September" is wrong. | `get_runtime_errors` with three windows |
| P2 | /api/card invocations are recorded as **runtime `edge`**. The single runtime log line says `nodejs24.x`; the invocation metric, not the log label, is the runtime evidence. | observability `function_invocation` grouped by runtime |
| P3 | 44,238 invocations in 14 days, **all status 200; no 504 at all**. The 10 s deadline never fired in production. Max duration 300,027 ms, also under status 200. p50 1.03 s, p99 3.4 s. | observability |
| P4 | The timed-out request at 20:31:36 logged nothing else (no "render exceeded" line). | `get_runtime_logs` by request id |
| P5 | **98.8 % of /api/card requests are CDN MISS** (44,214 of 44,737; 510 HIT, 12 STALE): about 3,000 renders a day. | observability `incoming_request` by cache result |
| P6 | A render takes 0.2–0.5 s warm (1.5 s on the first, cold WASM start); the longest allowed text (4 × 240) is 0.3 s, story 0.44 s; the event loop is never blocked for long. PNGs are 143–268 KB. | local lab, real renderer |
| P7 | On main, if the logo load fails, the 👑 stand-in makes @vercel/og fetch `cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f451.svg` with no timeout. With that host hanging the wrapper answers 504 at 10.0 s and the render keeps running. | local lab |

## Not proven (hypotheses)

- **H1 (leading): the 300 s is spent after a 200 started, i.e. delivering the body, not rendering it.** Supported by P3 (status 200, no 504),
  P4 (no deadline log) and P6 (renders are short). An edge function's duration includes streaming its response; a client that stops reading a
  150–270 KB body would hold it. Not confirmed: the request's client, bytes sent and query are not visible in the logs available here.
- H2: a platform-side stall after the response. Not distinguishable from H1 with the data available.
- Refuted for the observed cases: slow render (P6), blocked event loop (P6), the deadline itself failing (P3: it never fired), DB read (bounded at 4 s).
- P7 is a real, reachable, unbounded network read, but P3 shows it did not cause the observed timeouts (it would have produced 504s).

## What this branch changes

1. **Request policy** (`public-reading-deploy/card-request.js`): only the keys the site builds (`n w t sub cap sig v nums format`), each once,
   with value checks that match the renderer; anything else → 400, no-store, before font/logo/DB/render work. Arbitrary parameters can no
   longer create renders or cache entries.
2. **Cache classes**: query-only cards (the picture is a pure function of the address) 7 days + 1 day SWR; number cards that read the published
   phrases 1 hour + 1 day SWR (unchanged). Errors and refusals no-store (unchanged). Aimed at P5: fewer renders means fewer function deliveries.
   A changed post title is a new address (og.js), not a stale card; an unpublished post stops pointing at its card; a card carries only public text.
3. **Cancellation and memory**: the body is read through a held reader; a render that misses the deadline is cancelled; a body over 2 MB is refused.
4. **No network fallback** for a missing logo (P7): the card is drawn without the logo instead of fetching a twemoji.
5. **Diagnostics for H1**: `Server-Timing: render;dur=…` on every card and a warning line for renders over 5 s. After release, a 300 s timeout
   with no slow-render line and a short `render` time confirms that the time was spent delivering, not rendering.

Not changed: the 10 s deadline, the renderer's design, fonts, the DB read, og.js. No DB change, no new service.

## Open decisions (ZURIEL)

- D1: signed card addresses (og.js signs, the card verifies) would stop anyone rendering arbitrary text on the domain. It needs the client-built
  cards (unit, world finding, thumbnails) to get their address from the server. Not done here.
- D2: if H1 is confirmed, the next step is a smaller card body (PNG 143–268 KB today) or a pre-rendered static card for number pages.

## Tests

`test/api-card-request-policy-2029.test.mjs` (new), `test/api-card-bounded-cacheable-2029.test.mjs` and `test/api-card-deadline-glyphs-2029.test.mjs`
(cache expectation updated to the two classes) — 29/29 locally.
