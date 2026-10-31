# ELS matrix controls — mobile hierarchy

GPT · ELS_MATRIX_MOBILE_TOOLBAR_20261031 · passive BEFORE to ZURIEL.
Base: `533749adf737b3994d4b2d9505ed914a03c13e5a` (previous tested local cut,
not yet published). Its remote ancestor remains
`gpt/els-language-preview-20261031@32dc50bae53c3c3f04464af5d11c8fc3b673cfc9`.
New branch: `gpt/els-matrix-mobile-toolbar-20261031`.
Remote main observed at `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`, not imported.

Canonical dedicated read-only connection verified; bounded current work-log
read finds no active overlapping UI writer. Claude experiment scopes are closed;
older allocation BEFORE rows are followed by delivered additive-depth work and
do not own this UI scope. No live BEFORE/AFTER write is claimed.

Presentation only: existing Native matrix footer, existing matrix-share control,
free-selection presentation, CSS and browser acceptance. No canonical engine,
Provider, SystemFrame, theme/palette owner, AI, DB/RLS or transport changes.
Design V2 (26 October balanced-RTL revision), canonical UI v11 and mobile
acceptance v1 govern readable tokens, 44px targets and progressive disclosure.

Four stable primary controls: selection, fit, existing sharing, more display
options. All former options remain reachable; manual marking keeps its existing
canonical state. Explanations become explicit progressive help, not removed.
No second floating dock, new global listener or new store. No deployment in this
cut; publishing code is not a Preview/Production release.

## Implementation and visual verification

- The existing footer has four equal-width icon-and-label actions (סימון,
  התאמה, שיתוף, עוד). The same fit/selection/share handlers are retained.
  More contains height, heatmap, axis visibility, classic glyphs, verse
  highlighting and camera presentation; none were removed.
- Selection is one compact strip: letters/count, temporary/not-account-saved
  status, search, clear and explicit help. The help retains all previous
  limitations, including a new search not guaranteeing the selected position.
- Sharing still uses the existing private-safe exact-replay URL builder. Its
  inline disclosure now shares the toolbar layout; Escape/close restore focus.
- No UI state creates a scan, dictionary load or model request. The React
  best-practices review keeps this as local disclosure state and event handlers,
  not another effect, provider or data owner.
- The first visual pass caught the floating update/date chip obscuring part of
  the search action at 320px, despite clearing the dock itself. Local ELS scroll
  clearance now accounts for the existing update/selection cue. SystemFrame and
  its styles remain untouched. The acceptance assertion checks the *entire*
  strip against both overlays, not just a button center.
- Final targeted browser pass: 320/360/390/768/1440px, each in light/parchment/
  dark. All 15 screenshots captured at `/tmp/els-toolbar-final-screens`; 320px
  light and 1440px dark inspected. No horizontal overflow, four >=44px targets,
  >=16px control text, keyboard disclosure and focus return. Closed footer
  <90px high and three-letter selection <190px high.
- The first full Native run was 62/64: mobile inline scan after a height change
  and completed results visibility failed. The extra *root bottom padding*
  introduced in this cut prevented the existing end-of-document scroll clamp;
  at 320x568 the scan panel began at y=-80.22. A browser-only CSS isolation
  probe removing that padding passed both the toolbar clearance and inline
  scan cases. The final source removes the extra padding, retaining only the
  control scroll margins. All three affected cases then passed on actual final
  source, without the probe, changed expectations or extended timeouts. The
  full Native census was repeated after this correction; both cases passed.

Design routing note: the live canonical UI owner is v11; the older local owner
pointer to v7 is not treated as the current presentation contract. This cut
uses the existing V2 semantic tokens and single frame; it does not update the
owner index or create another design contract.

## Final verification

- Focused toolbar/manual-selection/sharing browser: 3/3, plus the final toolbar
  clearance/inline-scan/results pass: 3/3 (toolbar: 15 viewport/preset combinations).
- Relevant ELS/Raziel/share/projection/label contracts: 42/42, zero skips.
- Both actual builds pass without a dependency stub. Built-graph/lazy gate:
  PASS; 142 reachable records, 16 eager, 419759 eager JS gzip bytes.
- 2029 isolation, cheap hardening, Legacy Production lock and diff check: PASS.
- Connected-page/background/Raziel acceptance: 5/5, zero skips. This covers
  Guided/advanced entry, context reset/sharing/background cancellation across
  all three presets, and the actual global Raziel at 320/390/768/1440 including
  Hebrew/English labels, keyboard/touch and no automatic AI.
- Full Native final census: **63/64**, zero skips, three disjoint named shards
  with exact test-name coverage (22/22, 21/21, 20/21). The remaining failure is
  the pre-existing exact-skip response-history race described below. This is
  **not** an all-green full-suite claim; its focused rerun passed unchanged.
- Fresh bounded ownership recheck before delivery finds no new ELS UI writer;
  new Gallery/World records concern other scopes and are not imported.

## Files and integration boundary

This cut edits only:

- `src/components/experience2029/ElsNativeClassic2029.jsx`
- `src/components/experience2029/ElsMatrixShare2029.jsx`
- `src/components/experience2029/elsNativeClassic2029.css`
- `test/els-native-ui-browser.test.mjs`
- `test/els-background-research.browser.test.mjs`
- this receipt.

The branch also carries the previously tested manual-selection commit
`533749adf737b3994d4b2d9505ed914a03c13e5a`, which was unpublished when this cut
started. Its separate receipt describes its canonical control changes.
Integrate the cumulative range from remote
ancestor `32dc50bae53c3c3f04464af5d11c8fc3b673cfc9` only once. No historical branch
was re-imported in this cut. Existing experiments/journal and previous work are
preserved.

The new branch has no Preview deployment authorization. The old Preview is not
evidence for these controls. Do not present its URL as this branch's release.
Browser checks use the real components and canonical tool with explicit fixture
network adapters; they are not a live AI or account-write check.

## Existing failure, reproduced on the clean base

`Research exact skip above the page ceiling loads a canonical verified axis
without remounting Classic` failed at the assertion that every response for
request 1 is successful. This is different from the two layout regressions
fixed above. The no-hit assertions for requests 2 and 3 passed.

- A detached baseline worktree at the exact cut base `533749adf` retained its
  original tracked files/tests. Eight focused sequential baseline runs passed.
- The first three-lane baseline batch reproduced the identical assertion in
  one lane. The diagnostic loader only printed the existing history/host
  messages before the original assertion; it did not alter input, waits or
  expectations. No source edit or injected extra `ready` event was used.
- Failing baseline trace: two `ready` events, two host `probe-exact-skip`
  messages for request 1 (skip 10065); responses `ok:true`, then `ok:false` with
  reason `CANDIDATE`. Requests 2 and 3 at skip 400000 each returned
  `ok:false/LOCAL_NO_HIT`. A passing lane also received duplicate request 1 but
  both responses were successful. The exact asynchronous cause still needs a
  separate focused repair; duplicate readiness replay is an observed lead,
  not a claim that all of the verification race has been isolated.
- `TzofenEmbed.jsx` and the canonical tool were not changed in this UI cut.
  Do not weaken the response-history assertion or claim this cut repaired it.
- Evidence: `/tmp/els-toolbar-final-browser-census.log`, final shard 3 log,
  `/tmp/els-toolbar-exact-focus.log`, `/tmp/els-toolbar-base-exact-1.log` through
  `-8.log`, `/tmp/els-toolbar-baseline-parallel.log` and
  `/tmp/els-toolbar-base-parallel-1-1.log`. The clean baseline worktree is
  `/tmp/els-toolbar-baseline-8JQwyb` (shared dependency symlink only).

## Passive AFTER handoff to ZURIEL

GPT · ELS_MATRIX_MOBILE_TOOLBAR_20261031 · existing ELS Native presentation owner.
Status: IMPLEMENTED / UI_ACCEPTANCE_PASSED / TESTED_WITH_EXISTING_FAILURE /
BRANCH_ONLY / NOT_DEPLOYED. No PR, main merge, deployment, live product write,
AI call or new provider/store. Current cut scope is released on delivery.

The read-only coordination connector cannot write an AFTER record; this is the
bounded receipt for the authorized coordinator, not a claimed live work-log row.
Remaining work: resolve the separately reproduced exact-skip history race and
obtain explicit Preview release approval. User visual acceptance of the new
toolbar remains separate from passing automated layout checks.
