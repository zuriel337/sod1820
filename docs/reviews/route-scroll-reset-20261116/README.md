# Global forward-navigation scroll reset

BRANCH ONLY. Base: `d1f1e3252100afe14719a4eeb96c791dd29b7d51` (#1366).

On the deployed source, a footer Link changes the SPA pathname without resetting
scroll. The browser clamps the old offset when the destination is shorter:
community → `/contact` and tag → `/contact` both ended at y=1346 on a 2190px
page with an 844px viewport. The tag case replayed complete public-read fixtures
(0 cache misses). Home → community retained y=9623. These are local browser
reproductions, not instrumented live-user sessions.

`RouteScrollReset2029` starts a different page at the top for PUSH/REPLACE.
It leaves initial entry, POP/Back/Forward, fragment destinations and same-path
query changes to their existing owners. Mounting outside ResearchProvider keeps
account changes from resetting reading. No research state, source anchors,
Post/SystemFrame files, permissions or measurement semantics change.

The real component runs with React/BrowserRouter in Chromium at 390px and 1440px.
The browser test covers the short-page footer regression, Back position,
path-changing replacement, a page-owned anchor, query edits and a keyed child
remount. Removing the reset reproduces the PUSH failure at both widths.
The separate route-navigation workflow avoids editing Claude's active workflow.

Local verification so far: browser 4/4; source/context/entry suites 14/14;
G1 51/51. The public URL suite requires the generated reading build and will be
rerun after that build. Full-app confirmation and CI results will be added below.

Coordination: fresh PR #1358 file list and passive journal checked before writing.
Claude owns Post/SystemFrame/researchContext changes. This branch adds only the
navigation component, its App mount, tests/workflow and this evidence.
