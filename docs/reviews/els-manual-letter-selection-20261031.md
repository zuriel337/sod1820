# ELS manual letter selection — bounded restoration

GPT · ELS_MANUAL_LETTER_SELECTION_20261031 · passive BEFORE to ZURIEL.
Base `32dc50bae53c3c3f04464af5d11c8fc3b673cfc9`, exact origin verified.
Branch `gpt/els-manual-letter-selection-20261031`. Origin main observed only at
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; no import or reset.

Dedicated canonical read-only connection verified; bounded live coordination
read. Recent ELS experimental scopes have AFTER receipts. Older BEFORE records
are not treated as proof of ongoing overlapping work; the user-supplied later
handoffs and current source already contain those delivered cuts. No new active
overlap on the manual-selection UI/control scope found. No live claim written:
the read-only connector cannot record BEFORE/AFTER.

Historical source `248c10ecaceb48c044833c86f9a46c4b7faf5581` has `st.selMode`,
`st.selCells`, toggling individual cells and `updateSelBar`. These still exist in
the canonical tool, but Native only opens letter-context on click. Extend that
same selection and control bridge, not a second selection store/ELS engine.

Scope: canonical tool's 2029 controls and serialization, Native projection/CSS,
focused tests and this receipt. Free marks are presentation only, not findings.
Explicitly searching selected letters uses the existing regular search and its
verification; it does not claim those arbitrary selected positions form an ELS.
Source/known-occurrence actions reuse existing lens/scan controls. No AI/lexicon
on selection, mode changes, pan or zoom. No DB/RLS/Providers/transport changes.
No Preview/deploy in this implementation cut.

## Implemented behavior

- `סימון חופשי` lives with the existing matrix controls in all Native profiles.
  Existing `st.selCells` / `st.selMode` own the ordered selection, capped at 64.
  Native sends only a scoped canonical index; wrong axis/scope, non-integer,
  out-of-corpus and out-of-window requests cannot alter the selection.
- Tapping/Enter/Space toggles a letter. Turning the tool off keeps the marks;
  clearing removes only the free marks. Profile switches do not clear them.
  A committed new occurrence/search uses the existing selection reset. Nothing
  auto-saves, synchronizes, calls AI or downloads a dictionary.
- Marking mode uses at least 44px cells and keyboard buttons; the ordinary
  matrix density/fit preference remains unchanged outside this mode. Dashed
  outline/underline preserve the original axis/finding colors in all presets.
- The selection bar shows canonical letters in click order, temporary/local
  scope and an explicit regular-search action. This is not manual ELS admission.
- In normal inspection, the canonical letter lens reports verified displayed
  occurrences through that cell. The existing selected-target action supports
  same-line scanning; exact matrix opening reuses `buildJourneyPromotion` and
  the existing research-load/replay path. The previous term and exact anchor
  are passed in the Journey load item. The canonical tool shows that anchor
  only if it fits the new-width window; retaining the term does not guarantee
  its old occurrence is visible. No fabricated/candidate hit can activate this.
- A full persistent journey/back stack and saved free-marker annotations are
  not introduced by this cut. The UI explicitly says free marks are temporary.

Changed files: canonical `tools/els/els-code.template.html` and generated
`public/tzofen.html`; `ElsNativeClassic2029.jsx` and its CSS; existing Native
browser tests; this receipt. No historical-branch bulk checkout/import.

## Verification and bounded gaps

- Final immutable-source Native browser census: **63/63**, zero skips, every
  named test run exactly once across three isolated Vite caches. The earlier
  full run also passed 63/63; the final repeat includes the corrected promotion
  contract assertion and final accessibility label. No HMR/source regeneration
  occurred during the final repeat.
- Focused ELS projection/context/share/engine/bridge/Raziel seam suites: 49/49
  and 42/42. Additional geometry/presentation/return/continuation suites:
  26/27. The one failure is the existing static assertion at
  `els-2029-visual-representation.test.mjs:122` expecting direct Native markup
  in Els2029Page instead of its existing Raziel wrapper. An archive of the exact
  clean base reproduces the same failure (4/5 in that file). No expectation or
  existing test was weakened to hide it.
- Connected browser checks: advanced page and global Raziel passed; background
  research passed parchment/dark. Its light case timed out awaiting the COMPLETE
  panel during a concurrent run, then passed alone unchanged (63.9s). The timeout
  and retry are retained in the verification record; the root cause of that
  intermittent wait is not established. No timeout increase or product fix.
- New selection checks cover 320/390/1440, all three presets, tap/Enter/Space,
  44px cells, canonical ordered letters, 64-mark cap, wrong-scope/stale requests,
  clear/profile switches/zoom and explicit new search. Opening/selecting a known
  occurrence uses one iframe and no AI. Mobile and desktop screenshots inspected.
- A new exploratory assertion that the old axis must be visibly highlighted
  after promotion was disproved: the exact promoted fixture uses width 20132,
  whereas the old axis uses 10065 and falls outside the new 80-column window.
  The test now asserts the actual Journey contract: the exact old anchor is in
  the load item, its term remains, but it is not fabricated as a visible hit.
  This does not change the engine's existing window/admission semantics.
- Both real `build:legacy` and `build:2029` pass without dependency stubs.
  Built graph/lazy budget passes (142 reachable, 16 eager; 419763 gzip bytes,
  38979 below the reference). Source isolation, cheap hardening, Legacy
  Production lock and `git diff --check` pass.
- External product IO/model calls were intercepted in browser tests. No paid
  scan, live product write, deployment, main merge or Provider change occurred.
- Source branch/main reconfirmed via the GitHub connector at the same SHAs;
  live bounded coordination reread found no new overlapping scope. Git transport
  subsequently returned HTTP 503 from the managed upstream tunnel. This is not
  evidence that any new commit has reached origin.

## Passive AFTER to ZURIEL

IMPLEMENTED / TESTED, branch-only. Manual-selection implementation scope is
complete; remote publication depends on working Git transport. Preview remains
the previously deployed runtime `7a60ab009284c347cbc268f134dce26901a8b6ec`, not
this cut. No claim of a live AFTER row: the coordination connector is read-only.
Future work is limited to publishing this exact tested branch and a separately
authorized protected Preview; saved annotations or a persistent Journey remain
separate features rather than implicit parts of free marking.
