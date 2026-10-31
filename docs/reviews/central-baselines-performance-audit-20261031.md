# Central baseline and performance carry audit — 2026-10-31

Read-only inspection under central integration claim `4afddf4c-08f6-4bba-92bc-fb8736a167bc`.
No other session worktree, source branch, live flag, product data or domain changed.
Exact source inventory, 34 historical groups / 55 commits and path comparisons are
in the adjacent JSON. This is evidence attached to the existing plan, not a new plan,
performance contract or owner.

## Current deliveries

- Central starting point 14b3b14fa09ee7c0654b1431b8792d45b61170fc remains clean.
- Books 23e03e82 and spatial contract b352aa39 are ancestors of the integrated code.
- Posts b65ef210 is included through real merge 8c9e0140.
- ELS/Raziel 4ea9ac37 is received through the audited explicit cumulative delta;
  absence of source ancestry is expected and is not permission to import it again.
- World d52ff6b8 is pending separate acceptance; earlier central World work is not
  the same claim as receiving this later Gallery/source/story/gate handoff.
- Claude river/design branch advanced beyond the earlier supplied a0a51d807;
  remote observed 510bd8b20f5918432b3ce0e83e9432e35c1510b4. This active source
  is not adopted automatically, nor replaced with older central files.
- Ticker branch `gpt/2029-global-living-ticker-v1-20261031` exists locally at
  `5971a534819cb8ca15c6d67f3e771366011c9a33`, is not in current central ancestry,
  and its exact branch was absent from the fresh remote-head listing. Its receipt
  describes isolated local testing and no hosted deployment. Keep this as an explicit
  pending integration item; no old Marquee/Frame version was imported automatically.
- origin/main remains 2195c9784c5c9f0b1ec3cd3c1137fbd76045845b.
  Remote metadata is not a proof of Production deployment identity.

## Same-profile build measurement

Built baseline 14b3b14 separately into `/tmp/central-baseline-14b-dist`, preserving
its worktree and the running integrated build. Real dependencies, default Vite build,
same Node zlib gzip settings as the mandatory graph gate:

| Metric | Before | Integrated |
|---|---:|---:|
| Eager JavaScript gzip | 420,781 bytes | 437,834 bytes |
| Eager manifest records | 16 | 29 |

Delta: **+17,053 bytes / +4.05%**. Chunk reorganization changes entry sizes and
record count; it is not itself a measured latency regression or improvement.
The fixed recovery gate still passes: 20,908 bytes recovered against 458,742,
required minimum 12,288; only **8,620 bytes of headroom** remain. No budget increased.
Submit adapter/conversation resolver and Research Plan remain lazy. No hosted
cold-cache browser timings, real-device INP or production p75 are claimed.

## Historical performance carry — meaningful open gaps

Read the 19.10 handoff sections 1–8 and its receipt from exact ref f19f7cfcb5530d9632c99d345c22c8b0124b6292.
It records 34 fix groups and 55 integration commits, not a verified count of 62.
None of those exact commits was proven by ancestry or whole-patch equivalence here.
The JSON adds file-level evidence to every group. This does **not** prove 34 lost
features: files may have been superseded, adapted or moved. It does mean the old
receipt cannot be treated as acceptance of the current central tree.

Concrete checks requiring a controlled port or proof of replacement:

1. F13: historical `StoryViewerOnDemand2029`, `onDemandLoader2029`,
   `OrGeulaStoryColumnCore` are absent. Current CompanionPanel statically imports
   OrGeulaStoryColumn, which statically imports StoryViewer. Lazy viewer separation
   from the 2029 shell is therefore not preserved in that path. Legacy consumer
   behavior must remain unchanged in any later port.
2. F18: historical shared navigation-scoped `siteFlagsReadScope2029` and
   `runtimeSwitches2029` are absent. Current `useSiteFlag` calls `getSiteFlags`
   independently per hook; that reader has no in-flight/navigation scope sharing.
   Permission/lock semantics and refresh boundaries must be retained when fixing it.
3. F20: the old `realtimeLazy2029` implementation and its acceptance tests are
   absent; current client statically imports `@supabase/supabase-js`. Effective
   built dependency separation is not preserved: the eager Supabase manifest chunk
   contains `phx_join`, `phx_reply` and `RealtimeClient`. This proves payload presence,
   not an automatic live socket connection.
4. F24: the generated ELS template/build still embeds `__VERSE_TEXT__` through
   `gz64(vtext)`. Historical deferred verse-payload artifacts/test are absent.
   Port only this payload boundary to the current template if adopted; never
   replace the current cumulative ELS engine/tool with the historical HTML.
5. F23: the old `postBodyMedia2029` helper is absent, while the new Post page does
   use IntersectionObserver for research. That observation does not prove deferred
   body media, reserved dimensions or wheel/touch admission: inspect those paths
   separately before declaring the old media fix carried.

Do not replay the whole old branch, widen route preload, revive the rejected
staged-results experiment, or replace the current Companion. Scope and measure
one retained behavior at a time under the existing owner.

## Historical Posts metrics A

Exact source 10e4a9e2940a5ace81809cde253adeb161df658e is not an ancestor or exact
patch match. The new PostConvergenceMeasures component explicitly contains four
separate readings (card strength, editorial quality, coverage, calculation check),
so claiming that all metrics UI is missing would be false. It is now a later
source-aware implementation. `PostAfterReadingTabs2029` is absent, and the new
page uses `post-sources` / research sections rather than proving the old `meeting`
anchor contract. Full semantic compatibility of after-body order, anchors and
cross-surface return therefore remains **PARTIAL / NOT_ACCEPTED_AS_EQUIVALENT**.
No old Post file was copied over the newer rewrite.

## Plan and next small cuts

Plan37 was checked read-only (updated_at observed 2026-10-31 02:30:32.659031 UTC).
Its loading hierarchy remains L0 essential first result, L1 approach, L2 deliberate
open, L3 explicit deep/archive. p75 LCP≤2.5s / CLS≤0.1 / INP≤200ms are planning
criteria, not PASS from the measurements here. Main content, identities, source
access and depth must not be removed to meet a budget.

Priorities after this integration receipt:

1. Close the 17 source-suite assertions against the accepted current runtime,
   preserving privacy/replay/no-hit behavior. Current run is not globally green.
2. Port/retest the concrete lazy viewer and flag-sharing gaps above in isolated
   scopes; compare initial transfer and meaningful content readiness under the
   existing authorized performance harness.
3. Receive latest World/design handoffs without resetting them to an older base;
   complete source→finding→view→exact return acceptance and the pending admin path.
4. Resolve historical Posts metrics anchors/order semantics with the Posts owner.
5. For personal relevance, verify a current-principal bounded activity reader;
   never substitute admin/global traffic data. Detailed interface gap is recorded
   in the integration receipt. No new audience database or automatic subscription.
6. A future hosted unified Preview requires its own authorized exact SHA; no
   Preview or backend/schema/Production action is part of this task.

## Next integration overlap map

This is a file-overlap scan, not a merge or conflict resolution. World d52ff6b8
and current central share base 71e9cb9061870f5e8124b25eb33fd08a8a2ba5e4. World adds
46 changed paths; four also changed centrally: package.json, SystemFrame2029.jsx,
razielSessionSeam2029.js and supabase.js. Preserve the central single bar and
ELS/saved-session changes; receive World exact-context links and public gallery
reader updates by function, and compose build/CI gates without weakening Legacy.
Its 2029-only source gate still requires an explicit call in the integrated Preview
builder until the source's remaining wiring scope is accepted.

The current Claude design branch has 21 changed paths from the same base and no
path overlap with this integration delta. That is not proof of visual acceptance
or transfer of an active writer's ownership. The Ticker branch diverges from
ec6610ae4e481427fadcb66052e8e38dc356bf87, changes eight paths and overlaps centrally
only on SystemFrame2029.jsx; its older frame must not replace the current one.

Fresh detached source checks of World d52ff6b8: One Tree acceptance **78/78** and
gate-wiring **4/4**, no skips, no network permitted by the runner. Dependencies
were installed from its lockfile; the source checkout stayed clean. These are
source-only checks, not a central integration or browser/data-intake acceptance.

A further duplication risk is now resolved: World d52ff6b8 and Claude 510bd8b2
share `fba5cf573d69acd57e0f01845b7b4141a4a2835d`. World already carries the initial
Claude river plus all-source findings chain. Only three regular commits are
exclusive to the latest Claude side: 32974e832 (proposal), b2ddae4f8 (read-only
calculator evidence script), 510bd8b2 (river treatment-resolver colours/tests).
After receiving World, do not replay the original river or discovery chain.
Latest 510bd8b2 addresses the palette through the shared treatment resolver;
its older proposal's description of local-colour debt is not proof that the same
debt still exists unchanged at that latest HEAD. Visual/browser acceptance of
that later source remains separate.

## Uncommitted work preserved, not adopted

25 accessible worktrees were inspected without modifying their contents. Apart
from this integration's pending test/receipt edits, one old World worktree is dirty:
`/workspace/sod1820-central-world-rebuilt-20261029`, base
`ff23ae685dcae824c4cdb45830fc1578820bcf1d`. Eight tracked source/test files differ
from its HEAD (28 insertions / 66 deletions) and do not have exact blob matches
in central 37db7b61, World d52ff6b8 or Claude 510bd8b2. That does not establish
whether they are new accepted work, an unfinished experiment or semantic duplicates.
No ownership of that work is assumed, and its contents were not imported.

A read-only binary patch and a local archive of the eight files plus the existing
source-focus evidence JSON were captured under `/tmp/central-world-dirty-preservation-20261031.*`.
The archive hash and path/blob inventory are in the JSON. Generated node_modules
link excluded. This is a local recovery copy, not a remote product integration or
an assertion of permanent cloud backup. Its source worktree remains unchanged.
Do not reset/clean that worktree or delete the branch before its owner resolves
this pending delta.

World source's fresh actual Legacy+2029 builds, graph/lazy and isolation also pass;
source eager gzip 422,679 bytes with 36,063 recovered. These source figures are
not the integrated branch's measured 437,834 bytes and must not be substituted.

The unpublished Ticker chain is also captured as a verified incremental Git bundle:
`/tmp/sod1820-ticker-5971-20261031.bundle`. Its exact SHA-256/size are in the JSON.
Prerequisite ec6610ae4e481427fadcb66052e8e38dc356bf87 must be available to the receiver.
No ticker source branch was pushed or changed, and it is not part of current central.
This is a local transfer/recovery artifact, not a claim of hosted or remote backup.
