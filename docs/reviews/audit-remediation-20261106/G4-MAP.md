# G4 closure map for the audit RC (mapping only — nothing was run)

> **Mapping, not acceptance.** No CI, Preview, merge, deployment or DB/Storage action. Prior evidence comes from the failure-correction session (branch `claude/sod1820-ci-failures-diagnosis-6z9ej6`, HEAD `f9d55248e`, unchanged; it is **waiting**, and its Edge Function scan has not returned a finding yet). A passing G4 workflow is **not** the closure of G4 in the plan (CLAUDE.md).
> RC: `claude/sod1820-audit-rc-g93w32`. Base: `main` `cfda877a1`.

## 1. What the failure-correction session checked (its doc 09, branch-only)

| Gate / item | Exact SHA | Result | Independently confirmed here |
|---|---|---|---|
| G4 Public Core | `394a2ba8` | success, run 42232445987 | yes (Actions API) |
| 2029 Isolation | `394a2ba8` | success, run 42232450988 | yes (Actions API) |
| Release Visual / Live Contracts / Observability-SEO / ELS Core | `394a2ba8` and `cfda877a` | success (4 of 4 on each, per doc 09) | not re-read |
| G4 Public Core, 2029 Isolation | `cfda877a` | **not run** | consistent with the runs listed |
| PG2 workflow step (7 orphan consumer tests) | proof branch `5bcbebaf6` | success 71/71 on Node 24 | not re-read; not merged, not in the RC |
| SK1, SK3, SK4, PG1, synthetic SK2 | local build of `394a2ba8` | passed — application layer only | not re-run |

## 2. Open G4 / S2 obligations (all open per doc 09)

SK2 (session-expiry indication and exact sign-in return — requirement recorded, gaps G-SK2-1…6, no implementation); PG2 (owner decision to wire the proven step, consumer receipts for the delta, no direct test for P0-C); PG2/Zvi (`world-corpus-continuation-2029` — neither PASS nor obsolete); S2 (public RPC classification and negative tests, SECURITY DEFINER views, edge regression, required checks, CSP, rollback/backup evidence). The RC adds its own pending S2 items: DEF-001, DEF-001b, DEF-004, DEF-005 (SQL ready, not applied) and DEF-026 (`page_views` anonymous INSERT, [`DEF-026-PAGE-VIEWS-SERVER-SIDE.md`](DEF-026-PAGE-VIEWS-SERVER-SIDE.md)).

## 3. What must be re-run because the base/branch changed

The RC differs from `main` in 49 files. Matching each workflow's `paths` filter against that diff:

| Gate | Why it applies to the RC |
|---|---|
| G4 Public Core | filter matches `api/og.js`; never run on `cfda877a` |
| 2029 Isolation | filter matches 13 changed files (river component/CSS, video reader, `supabase.js`, new tests); never run on `cfda877a` |
| 2029 Live Contracts | only run on the RC is on `02f437f5c` — before the merge with `cfda877a1` and before the CSS commit |
| Release Visual | no path filter, so it applies to any dispatch/PR; the RC changes gallery layout; it also requires the latest exact-SHA production canary to be a success |
| Observability-SEO | no path filter; the RC changes sitemap, route allow-list, `/api/card` |
| ELS Core | no overlap with its path filter — no re-run needed for the RC |

Not to be duplicated: the SQL suites (passed on `02f437f5c` and locally after the DEF-001 move) and the Node contract tests.

## 4. Smallest next step

No single technical step closes G4. Recommended order (each needs explicit approval):
1. Dispatch G4 Public Core, 2029 Isolation, Live Contracts, Release Visual and Observability-SEO on the exact RC SHA — evidence only, not closure.
2. Owner decision to let the failure-correction session wire its proven PG2 step (a workflow-gate change; separate approval).
3. SK2 implementation approval; the Zvi decision.
