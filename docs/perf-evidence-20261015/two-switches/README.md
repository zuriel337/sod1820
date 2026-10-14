# Two independent opt-in performance switches — Claude handoff

Task: `GPT_PERF_TWO_SWITCHES_20261015`. User priority: World/Number navigation and scrolling, Home last. On 15 October 2026 the owner requested that Claude take the next implementation/measurement shift.

## Exact provenance

- Delivery branch: `gpt/perf-two-switches-20261015`.
- Parent: `claude/sod-perf-continuation-838w4h@6b72698e525e74bbe72d8c591d63a49066817da9`, which already has the existing control-panel switch mechanism.
- This is an incremental patch on that parent, not acceptance of all inherited Claude experiments and not a change to PR1100. Integrate only after reconciling the destination's current switch implementation and file owners.
- DRIFT at handoff: the Claude parent branch advanced to `84f6f7f040c9bbcc0a3826c4d90b3ffd38c15324`, adding freeze behavior to four existing controls. This delivery deliberately retains its tested `6b72698e` parent. Claude must apply the incremental delivery onto its current head, preserve `frozenOr`, the expanded snapshot limit and freeze tests, and reconcile the World import. Do not overwrite entire files from this older parent.
- PR1100 observed head: `01ac7706409e488f4d503ad9a86a848c9e0f33b0`; main observed head: `503b52ef169b6e51f967187491398d153090aa45`. Recheck before integration.
- Passive work-log BEFORE: `89ed77e2-2459-451d-a105-e96434eceb29`, TO=ZURIEL. A journal record is not a message delivery or remote session activation.

## Delivered behavior

| Existing control panel label | Flag | ON | OFF/default |
|---|---|---|---|
| מעבר קל בין קשרים בעולם | `fx_world_relation_identity` | Resolve only the target node identity in World `deepenRelation`, then let the existing destination projection load content | Original full target projection before context change |
| האצת חיפוש המספרים | `fx_number_lookup_page` | Route 2029 number lookups to additive `fn_number_lookup_2029_page`, enriching only the selected result page | Unchanged current secure `fn_number_lookup` |

Both flags reuse `site_flags`, the admin-only `admin_set_runtime_switch` RPC, and the existing Control Plane. They default OFF, are independent, and have behavior isolated from Legacy (Legacy never reads these flags and sends no new RPC; their code may still be present, inert, in Legacy chunks because the shared World component and number reader import it), including the World component that Legacy also imports. Existing 13 capability switches retain their defaults. No result cache crosses users or requests.

The DB switch cannot be enabled through this UI until a NULL-value RPC probe succeeds. Missing candidate RPC (`PGRST202`) during a research call falls back once to the current lookup; permission, SQL, and timeout errors are not hidden. A successful flag write is verified with a fresh strict read. Failed verification displays an unverified state and leaves explicit return-to-baseline available.

Switch changes affect subsequent reads; they do not cancel work already in flight. The existing 30-second settings cache is not a polling system. Refresh the tested surface after changing a switch. No live flag was changed in this task.

## Verified, and limits

- 62 JavaScript tests passed: new switches/rollback, Legacy isolation, missing RPC and permission errors, strict write verification, actual numericResearch pagination, existing projection/progressive behavior, and existing switch contracts.
- Legacy + 2029 production builds passed. Final 2029 build and existing bundle budget passed. Existing Control Plane contract script passed.
- Independent read-only review found two defects that were fixed: Legacy World exposure and false OFF reporting after failed readback. Other controls are disabled while one state is unverified.
- SQL: 93 exact ordered comparisons over all 37 fields under anonymous/member/admin RLS contexts; see `SQL-EVIDENCE.md` and `sql-parity-results.json`.
- Synthetic SQL work count: 212 composite calculations → 20 for a 20-row page. This is not a website speed measurement. Native PostgreSQL 17.6, representative production corpus, load, and route performance remain unmeasured.
- Deferred computation intentionally defers errors in non-selected rows; selected-row and permission errors remain visible. See the explicit SQL test and caveat.
- The complete family-count path can still request an unbounded population; this patch preserves that behavior and does not promise savings on every number read.
- Browser fixture verification and its exact scope are in `browser/README.md`; a fixture is not a hosted acceptance test.

## Next shift — one writer and one read-only reviewer

The implementing Claude should inspect the exact diff from the parent, read current canonical owners/work_log, claim only the relevant free files, and continue in a new branch from this delivery. Reuse the supplied tests and established performance harness. Do not rebuild the app or repeat the broad audit.

Measure baseline, World-only ON, lookup-only ON, and both ON on identical commits/conditions. Prioritize World relation deepening into a number and a non-number; Number pagination; back/forward and scrolling. Seven comparable repetitions per timed scenario; report median and range, click-to-real-content, RPC counts/arguments, long tasks/blocking, and CLS. Confirm same content, counts, selection, journey, returnTo and permissions. Do not add savings across metrics or claim synthetic SQL counts as elapsed time.

Before any shared DB installation, prepare the exact migration and activation/rollback evidence for the owner's release authorization. Existing dossier/journey optimizations and encrypted exclusions are already live and must not be replayed or rolled back. If production measurement is unavailable, keep the candidate OFF, record the exact blocker, and finish all locally testable work.

Read-only reviewer: inspect the implementation, compare exact SHAs/results, challenge RLS/pagination/Legacy/rollback/measurement, and return PASS/FAIL with concrete evidence. Do not become a second writer. Findings go through the existing passive journal/document protocol, not an invented dispatcher.

## State

IMPLEMENTED=yes; TESTED=bounded local evidence above; BRANCH_ONLY=yes.
MERGED=no; LIVE=no; DB_MIGRATION_APPLIED=no; LIVE_FLAGS_CHANGED=no; HOSTED_PERFORMANCE_PROVEN=no.

No production deployment or merge is authorized by this handoff. Follow the explicit repository release gate, and keep unrelated experiments out of integration.
