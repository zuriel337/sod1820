# Numeric media publication repair — 16.10.2026

**Central-session update:** the user confirms that the original private corpus
exists in the central environment. No private reacquisition is needed. The
central session owns full acceptance. See [the current handoff](central-handoff.md)
and [changed request contracts](changed-requests.json). The initial no-push
decision below is historical: renewed trigger review permits publishing only
this new branch; opening a PR remains blocked by the live Number gate.

The focused repair is implemented and locally verified. **Full World/Entry
acceptance remains blocked. No remote PASS, push, PR, merge or deployment.**

Branch: `gpt/numeric-media-publication-20261016`.
Exact base: `129056338c8d5cd10d6a124953c51f62bd39084a`.
Implementation and initial verification: `8e485a8ede585593b3ec7d5a708032263861152e`.
Subsequent documentation does not alter the product or regression-test blobs;
the final head and its verification receipt are supplied in the session handoff.

## Baseline and ownership

GitHub connector and `git ls-remote` independently confirmed the requested base
branch still points to `12905633`. Main remains
`503b52ef169b6e51f967187491398d153090aa45`; integration remains
`14e239b47e5ec6b95eaad4e1b368520512642217`; PR1111 remains `778400b6`.
Both integration and PR1111 are ancestors of the chosen base. This is unmerged
work, not Production. The checkout's old `origin/main` tracking ref was stale;
it was not used as current evidence or moved by this task.

Read current main AGENTS/CLAUDE/Owner Index, the live canonical project and
bounded current ownership, relevant historical closure evidence, and the
[canonical handoff at a77260c9](https://github.com/zuriel337/sod1820/blob/a77260c96f943fc3e4acaf00bd315bd700980434/docs/perf-consolidation-handoff-20261015.md).
No overlapping active writer was identified. The old shell claim `75ebfac4` was
explicitly documented as superseded by `8a3d9c6d`, closed by `048514de`, in
`d7697414`; it was not silently treated as an ongoing media assignment.

Owner verdict: EXTEND_EXISTING Truth Axes v3 publication/access, publishing
conventions, Research Workspace v5, and the existing 2029 public-media contract
in `docs/2029-media-performance-delivery-map-v1.md` §1.2 and
`entityHubProjection.js`. Readability under RLS is not publication consent;
`published=2` is not equivalent to `published=1`. No new owner or agent.

## Change and shared callers

The numeric-gallery `ord` helper in `getEntityBundle` now adds
`.eq('published', 1)`. Both primary-value and all-values requests use it before
their 24/40-row windows, so the server filters before the exact secondary count
and truncation. Hidden filtering, `min_tier=0`, importance/occurrence/creation
ordering, primary precedence and ID deduplication retain their existing behavior.
The existing count remains the secondary population's exact count, with its
existing item-count fallback; this is not a new union-count definition.

Shared callers reviewed: `entityHubProjection` (the 2029 `surface` projection),
`NumberDrawer`, `engine.getBundle`/`getTree`, and `BeitMidrashPage`'s pulse.
Their numeric media/items/counts now exclude non-published rows. The new test
exercises the real reader and `engine.getBundle`; existing Number/projection
contracts were rerun. No Legacy surface conversion, cache policy, non-numeric
branch, numeric engine or other media reader was changed or declared cleared.

## Local evidence

| Check | Result |
| --- | --- |
| Same synthetic suite on byte-identical base source | Expected FAIL: 5 publication failures; 8 controls PASS; 13 cases, zero skips |
| Fixed suite | PASS 13/13 |
| Original Number owner semantic/progressive/projection/numeric tests | PASS 43/43 |
| Topic source / World discovery / World group source tests | PASS 41/41 |
| Shared follow/verification contracts | PASS 8/8 |
| World, Entry, Number source contracts; source isolation; Legacy containment | PASS |
| Both original builds, built dependency graph, bundle budget | PASS; budget 5/5, zero skips |
| Actual SDK → isolated research-run A3 | PASS: five saved spans, eleven persistence-failure cases; no live acceptance |
| Trace-finish regression inherited from base | PASS 22/22 |

The regression replaces only HTTP transport. The real Supabase query builder,
reader and count decoding run against synthetic records. It covers published
0/1/2/null independently in both queries, hidden true/false/null, restricted and
null tiers, oversized populations, exact counts, primary-first/dedup order,
empty/no-admitted populations, count fallback, HTTP failures and query-construction
failure. Text-query shape and empty-term behavior remain controls.

Red and green used the same test blob and locked dependencies. Runs used Docker
`--network none`, inherited native/Node guards, and independent `strace -f`
network-syscall observation. All three final audit logs are empty; independent
logs show zero IP connect/send calls. Unix name-service probes and build-time
netlink interface inspection are classified separately in `evidence.json`.
An initial build attempt found incomplete preinstalled dependencies. A separate
`npm ci --ignore-scripts --no-audit --no-fund` restored the unchanged lockfile;
both builds and dependent gates then passed. No package/lockfile change or
install hook was used. Container Node: 24.22.0; preliminary host Node: 24.19.0.

## Full original World/Entry is blocked

`/workspace/private-perf-20261016` does not exist here. Its manifest, receipts and
the final private 799-signature browser/803-signature navigation corpus cannot
be read or verified. No private families were collected again.

The unchanged original suite lists **48 cases: 2 Entry + 46 World**.
The original `hard-browser.sh` was invoked under the same isolation with the
available reviewed public snapshot, SHA256
`33c9469ac6a667f25fa57670fd9fadd650a087705dbd196691090e807e9098e9`.
It stops before preview/browser startup with:
`BLOCKED: incomplete semantic snapshot coverage: complete authored Bennett body and verified focus`.
**Zero of these 48 browser cases executed.** No subset or source test is reported
as full acceptance. Restoring that source alone would not prove the rest of the
missing corpus complete.

Performance/navigation entrypoints were also attempted with the available public
snapshots: their coverage preflight completed, then they stopped at unprovisioned
matched-baseline directories, before browser/sample collection. New matched
performance/navigation measurements are NOT_RUN. No seven-sample comparison,
image acceptance or acceleration percentage is claimed by this repair.

Separately, the exact corrected numeric-media branch was executed read-only for
878 with anonymous public access. Both genuine new GETs returned HTTP200; primary
returned 16 rows, secondary exact count 29. Raw responses and acquisition receipts
are local only in `work/public-media/`, keyed by the actual requests containing
`published=eq.1`, including observed count/profile/range headers. They were never
attached to old request keys or uploaded. These two responses do not reconstruct
the missing private corpus or all eight intentionally unmapped request patterns.
There was no live fallback in any test process and no fabricated data response.

## Publication and release boundary

All 19 workflow definitions and their triggers were reviewed against the narrow
change and intended base `gpt/research-run-trace-finish-20261016`. No push workflow
matches. A PR would trigger the 2029 isolation, Follow Identity isolated DB and
Number owner gates. The latter uses ordinary Playwright, continues live GETs and
prefix-selected RPC POSTs, and lacks the frozen-corpus/OS/native/Node/audit
boundary. Its comment saying read-only is not proof of isolation or authorization
for its full live request closure. Therefore **no push and no draft PR**; the
change stays locally committed. Workflow repair is outside this bounded task.
Vercel's existing `gpt/*` deployment disablement remains unchanged.

Read-only flag verification: `fx_number_lookup_page=false`, `lock_number=true`.
No product DB, RLS, switch, permission, deployment configuration or public-site
change occurred. No main/integration/other writer branch was moved.
Remote CI and authenticated/admin/physical-device acceptance: NOT_RUN.

Task: `GPT_NUMERIC_MEDIA_PUBLICATION_20261016`. Passive BEFORE:
`13468bc7-8d39-4675-bcb4-c7c8ea35df6d`, TO=ZURIEL, dispatch kind/state NULL.
One passive AFTER releases only this bounded scope; its exact ID is in the final
session handoff. No dispatch, ACK wait or new agent activation.

Reproduction: `node scripts/ci-isolation/run.mjs -- node --test test/entity-bundle-media-publication.test.mjs`
inside an OS-isolated environment. For red, use a detached checkout of `12905633`
with this same test and dependencies, leaving its product source unchanged.
The adjacent JSON and red/green logs contain only synthetic or aggregate evidence.
