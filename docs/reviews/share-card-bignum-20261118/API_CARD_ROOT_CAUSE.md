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

## Corrections after review (18.11, evening)

- **"All timeouts were recorded as 200" proves nothing about completion.** `@vercel/og` creates a 200 response object at once and renders inside
  the stream's `start()`; a 200 status exists before the body has a byte (`node_modules/@vercel/og/dist/index.edge.js`, `ImageResponse`). The
  public wrapper only builds its own 200 after buffering the whole body, but what status the platform records for an invocation it kills at 300 s
  is not documented to us. So: the observed 200s do not show that the render finished, nor that the client stopped reading.
- **A fast local render does not rule out a stuck render in production.**
- **"Cancel" was overstated.** On a lost race the wrapper stops waiting (504 at 10 s) and releases the body. It does **not** stop the render
  already running in `start()`, nor a network read it started; those end on their own bounds (font/logo 8 s, DB 4 s), and the glyph filter + no
  emoji fallback keep @vercel/og's own unbounded font/emoji fetches unreachable. Proven by test (`cancel boundary`).

## Not proven (hypotheses)

- **H1: the 300 s is spent after the response started (delivery to a client that stops reading).** Hypothesis only.
- **H2: a render stuck in production** (an input path not seen in the lab). Not ruled out.
- **H3: a platform-side stall.** Not distinguishable with the data available.
- P7 is a real, reachable, unbounded read; the observed 200s make it unlikely as the cause (it would end in 504), but it is fixed regardless.

## Measurement after release (what decides between H1/H2/H3)

Every card now reports its phases separately: `Server-Timing: response;dur=…, body;dur=…, total;dur=…` (response object returned / last body
byte read / handler returned), plus a log line with the same phases for any card over 5 s and for every 504. The platform's own completion time is
the invocation duration in Vercel observability. Read together, per card type (number / query cards):
- a 300 s timeout with a short `total` in our log → the time was spent outside the handler (H1/H3);
- a 504 log line with `response` short and `body` missing → the render stalled (H2);
- request volume, timeouts, body-complete times and CDN hit rate per type over a representative period (a quiet day is not proof).

## What this branch changes (hardening and fixes for proven gaps; not a proven fix for the 300 s)

1. **Size bound only** (`public-reading-deploy/card-request.js`): a query over 8,192 characters or one text value over 2,000 characters → 400,
   no-store, before any work (the longest post title is 375, the longest published phrase 200; the renderer trims to 240 drawable characters).
   **Compatibility:** every other parameter is ignored, never refused, and unknown values draw the default card as before. Checked against the
   builders on main, every card address added in git history, and card addresses stored in the database (posts, insights, els_records, stories,
   hint_sets, share_events, visitor_events: only w/sub/cap/sig). Real request query strings are not in the logs available here.
   Image-changing keys: `n w t sub cap sig v nums format` (first value counts). Everything else is ignorable.
2. **Cache classes**: query-only cards (the picture is a pure function of the address) 7 days + 1 day SWR; number cards that read the published
   phrases 1 hour + 1 day SWR (unchanged). Errors and refusals no-store (unchanged).
   - Why 7 days is safe for content: a changed post title is a new address (og.js), not a stale card; a card carries only text that was public.
   - Template / brand / font change: it is not assumed that a new deployment empties the CDN. Every cached card carries
     `Vercel-Cache-Tag: api-card,api-card-<class>`; a release that changes the card's look includes a purge of tag `api-card` (a production
     action, with approval). Without that purge, old-look cards can persist up to 7 days (+1 day stale).
   - Content that must disappear at once (legal/privacy): purge by the same tag. Crawler-side caches (WhatsApp, Facebook) are outside our control.
3. **Release and memory**: the body is read through a held reader, capped at 2 MB; a lost body is released and never reported as complete.
4. **No network fallback** for a missing logo (P7).
5. **Phase diagnostics** (above).

Not changed: the 10 s deadline, the renderer's design, fonts, the DB read, og.js. No DB change.

## Open decisions (ZURIEL)

- D1: signed card addresses — not added (ZURIEL 18.11: signing needs issuance, compatibility, cache and expiry design, and a signature anyone can
  obtain does not stop misuse). Abuse by arbitrary text remains bounded per request (size bound, ~0.3 s render); rate limits are a firewall decision.
- D2: if H1 is confirmed, the next step is a smaller card body (PNG 143–268 KB today) or a pre-rendered static card for number pages.

## Tests

`test/api-card-request-policy-2029.test.mjs` (new: compatibility, size bound, cache classes and tag, phases, cancel boundary, no network
fallback), `test/api-card-bounded-cacheable-2029.test.mjs` and `test/api-card-deadline-glyphs-2029.test.mjs` (cache expectation updated to the two
classes; the wrapper call shape accepts the progress argument) — 32/32 locally.
