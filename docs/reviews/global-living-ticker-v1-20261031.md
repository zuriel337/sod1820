# Global Living Ribbon v1 — isolated preview implementation

Base: `ec6610ae4e481427fadcb66052e8e38dc356bf87`; branch
`gpt/2029-global-living-ticker-v1-20261031`. Scope is the existing 2029
System Frame and feed. The protected hosted preview was not deployed by this
task; a local development preview and screenshots are test evidence only.

The frame supplies its existing `useSystemFeed2029` result to one ribbon and
uses its existing Now sheet for the selected item. No new watcher, model call,
product table, second sheet or Legacy data mutation was added. Existing
`Marquee.jsx` has opt-in pause and accessibility behavior; its default props
preserve existing callers. Repeated visual units are hidden from assistive
technology and removed from tab order while remaining clickable. The ribbon
offers manual pause, keyboard focus pause, a quiet mode, a mobile item cycle
and reduced-motion handling.

The four supplied excerpts reference one preview-only message, loaded only
when `VITE_INTEGRATED_PREVIEW=true`. It is attributed to an unnamed speaker,
not to a named person or a verified forecast. Full quoted wording appears in
the existing Now sheet, with the Psalms reference and the difference between
the speaker's quotation and the canonical verse. The video is not referenced.
No row was inserted into `ticker_messages`, `news_ticker`, `channel_updates`,
`site_updates`, or `announcements`. Inspection of table names/columns did not
establish a suitable 2029-only authorized editorial content path, so a live
message is deliberately not claimed.

The feed uses the existing authorized stream and safe local links. Its compact
rows expose only the data already supplied by the feed: when full feed content
is not provided, the Now sheet explicitly offers to open the original source.
This remains an acceptance gap for the requirement that every existing stream
item's complete message be shown directly in Now. Sharing is not introduced
for the mock message because it has no approved public URL.

Local browser tests exercise 320/390/1440 across light/parchment/dark using
preview mock data, with external requests blocked. They check full quotation,
pause, quiet mode, repeated-unit accessibility, reduced motion, overflow and
basic public link filtering. This is not a hosted real-data/privacy acceptance
and does not prove every route, screen reader, or source policy. The chosen
base must be reconciled with the concurrently advancing central branch before
integration. No production, main, schema, RLS, Edge function, source media or
published content was changed.

## Local verification and reproduction

The initial eager 2029 JS was 417,463 bytes gzip at the exact base and 419,374
bytes after the change (+1,911 bytes); the existing built-graph gate passes.
Legacy and 2029 builds, isolation, cheap hardening, Legacy Production Lock and
`git diff --check` passed. A local static SPA test opened `/2029`, `/world` and
`/2029/posts` once each, with GET reads allowed and all POST/write methods
blocked; each had one ribbon, no horizontal overflow, no JS errors or model
calls. This is not a hosted preview or a production-route test.

For browser reproduction, with dependencies already installed:

1. `SOD_BUILD_TARGET=2029 VITE_INTEGRATED_PREVIEW=true VITE_UNLOCKED_2029_PREVIEW=true npm run dev -- --host 127.0.0.1 --port 5187`
2. `VITE_INTEGRATED_PREVIEW=true VITE_UNLOCKED_2029_PREVIEW=true npm run build:2029 -- --outDir /tmp/ticker-local-static`
3. `python3 test/global-living-ribbon-preview-server.py`
4. `python3 test/global-living-ribbon-2029.browser.py`

The local static fallback deliberately serves the 2029 document; it is only a
review harness and is not evidence of any public production rewrite.

## Sticky header follow-up

The user's follow-up keeps the ribbon immediately below the existing 2029
header while scrolling. They share one sticky stack so a variable-height
header does not conceal the ribbon. On surfaces with the ribbon, horizontal
clipping no longer creates an implicit vertical scroll container; other
surfaces retain the existing header positioning. The browser acceptance checks
scroll beyond 100px, the ribbon remains at the header bottom, no horizontal
overflow and the pause, quiet mode and opening the full mock quotation remain
usable at 320/390/1440 across all three themes. This remains local branch-only;
existing source-admission and hosted-preview gaps above are unchanged.
