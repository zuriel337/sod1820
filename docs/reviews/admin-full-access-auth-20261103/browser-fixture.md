# Controlled Home and bottom-bar acceptance

Command: `node test/admin-home-dock-2029.browser.mjs`

Result: **10 cases passed** using Chromium. Actual HomeComposition2029,
HomeUpdatesPreview2029, SystemFrame2029, MaintenanceLock, ResearchProvider,
Raziel session UI, and their CSS are mounted. Identity and read adapters are
explicit fixtures. All external network requests are blocked. This is not a
real administrator login, a newsletter acceptance, a service-worker test, or
a performance comparison. Exact source hashes are retained in
`browser-fixture.json`.

## Verified

- Widths 320, 390, and 1440 in day, parchment, and night themes.
- Construction notice and symbol are visible; the Claude panel is first,
  series immediately follow it, and the previous event lead remains below.
- The Home card offers site-update signup and privacy information without
  unsubscribe wording. No subscription was attempted.
- The purple Raziel orb and Here button display construction badges. Public
  and ordinary-member projections cannot open them. A synthetic AuthContext
  admin projection opens the actual panels. Revoking that role closes both
  panels and disables their triggers.
- Public locks persist when the actual Frame moves to World and Post
  surfaces. Now remains open to public interaction.
- No horizontal overflow; dock centered, bounded on desktop, and each button
  at least 44 × 44 CSS pixels. The Here label and its badge do not overlap.
- Reduced motion has no running illustration animation. Normal motion uses
  one iteration and finishes within the observation window; no repeating
  loop.
- No browser JavaScript errors, external requests, model calls, or unexpected
  fixture IO occurred.

| Viewport width | Dock width × height | Home update-card height |
| --- | --- | --- |
| 320 | 296 × 60 | 346.1 |
| 390 | 330 × 60 | 346.1 |
| 1440 | 330 × 62 | 225.6 |

Dimensions are CSS pixels using controlled content. The table is a layout
check, not a loading-speed measurement. The nine screenshots use synthetic
series/post content and contain no real account details.

An initial visual review found the construction badge covering Here’s text;
the central implementation moved it to the upper corner. Final screenshots
and the explicit rectangle-overlap assertion verify the correction.

## Remaining acceptance

The central task still owns final hosted public acceptance, real-admin login,
real provider return paths, newsletter activation, and all release approvals.
No source outside this fixture/harness/report was changed in this acceptance
subtask. No independent commit, push, database write, or deployment occurred.
