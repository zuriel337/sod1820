# Global forward-navigation scroll reset

BRANCH ONLY. Base: `d1f1e3252100afe14719a4eeb96c791dd29b7d51` (#1366).

On the deployed source, a footer Link changes the SPA pathname without resetting
scroll. The browser clamps the old offset when the destination is shorter:
community → `/contact` and tag → `/contact` both ended at y=1346 on a 2190px
page with an 844px viewport. The tag case replayed complete public-read fixtures
(0 cache misses). Home → community retained y=9623. These are local browser
reproductions, not instrumented live-user sessions.

`RouteScrollReset2029` starts a different page at the top for PUSH/REPLACE.
It leaves initial entry, fragment destinations and same-path query changes to
their existing owners. Back/Forward restores an in-memory position for the
history entry, waiting up to four seconds for late content. User input or another
navigation cancels it. The map is capped at60 entries and is not persisted. Mounting outside ResearchProvider keeps
account changes from resetting reading. No research state, source anchors,
Post/SystemFrame files, permissions or measurement semantics change.

The real component runs with React/BrowserRouter in Chromium at 390px and 1440px.
The browser test covers the short-page footer regression, Back position,
path-changing replacement, a page-owned anchor, query edits and a keyed child
remount, delayed-content Back/Forward, input cancellation and navigation
cancellation. Removing the reset reproduces the PUSH failure at both widths.
The first forward-only implementation also failed delayed-content Back at both
widths; that regression was caught before merge and is fixed in this head.
The separate route-navigation workflow avoids editing Claude's active workflow.

Local verification: browser 4/4 (zero skips), related URL/context/entry/journey
suites 23/23, G1 51/51, and the reading build pass. On the full app, tag footer
→ contact now ends at y=0 (heading y=202.39, footer y=1024), versus y=1346
on main. Both use complete public-read fixtures, zero misses, width390/height844.

The initial PR CI caught my omitted advisory-job inventory entry; the new browser
job itself passed. The definition is updated without changing any required check,
threshold or ruleset. Final CI is attached to the PR head.

Historical cross-check: the 19.10 package F03 and the 31.10 reconciliation already
documented the absent global restorer. The original
forward-only patch failed the historical delayed-content scenario. This version
adds a bounded restoration and its browser tests. The historical restorer is not
copied over current source-identity/anchor owners.

Coordination: fresh PR #1358 file list and passive journal checked before writing.
Claude owns Post/SystemFrame/researchContext changes. The original navigation change adds the component, its App mount and tests/workflow.
For the coordinated release this branch now also includes #1368, unchanged; see
[RELEASE_REQUEST.md](RELEASE_REQUEST.md). No Post/SystemFrame file is edited.
