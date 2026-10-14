# SOD1820 — AGENT HANDOFF

Status: coordination / provenance pointer only. It does not replace live verification, the Owner Index, or the active `inter_agent_coordination_law`.

## When to read this file

Read this file when:
- an active assignment/handoff points here;
- reconciling branch provenance, stale documentation, or agent-to-agent transfer;
- investigating whether work is missing, duplicated, superseded, or already landed elsewhere.

Do **not** treat this file as a mandatory startup read for every task.

## Default task start

The active entry contract is the current `inter_agent_coordination_law`.

Default sequence:
1. natural-language task → intent / capability / domain;
2. resolve the current canonical owner from `SOD1820_MASTER_OWNER_INDEX.md` + live owner infrastructure;
3. load the owner + minimum direct dependencies under the active Read Budget;
4. inspect recent relevant `work_log` / assignments;
5. verify the live source appropriate to the task;
6. execute → verify → handoff.

Full Master State, full Roadmap, all rules, all `project_codex`, this file, and broad branch archaeology are loaded only when the task actually requires them.

## Authority boundaries

- live DB + `origin/main` + relevant Production = live reality/evidence;
- current domain owner = domain semantics;
- Master State = documented state;
- Roadmap = navigation/priority;
- work_log = coordination/provenance;
- Owner Index = routing map;
- adapters, codex pointers, prompts, memory and conversation = context/pointers only.

Documentation lag is not parallel architecture. If an active adapter conflicts with a current owner/live state, mark DRIFT and follow the live owner/state.

## Assignment / claim protocol

A claimable handoff should identify:

`actor · FROM/TO · task_key · primary_owner · priority · mode=WRITE|READ_ONLY · scope · dependencies · do_not_touch · verification · stop_condition · expected_output · release_authorization_state · handoff_to`

Before `CLAIMED_WRITE`, reverify current main/DB/owner and scan for overlapping active writers.

### Structured dispatch and receiver receipts

The branch proposal `agent_dispatch_preflight_ack_v16` extends existing `work_log` functions;
its availability must be checked live before use. Until an authorized migration rollout,
the legacy sender remains live; do not claim new enforcement is deployed.

Use the existing `work_log_assign_agent` structured overload with `p_governance`:
`base_sha` and `expected_head_sha` are full 40-character Git SHAs; `branch` is an isolated
authorized branch; `authorization_ref` points to the actual user/owner decision;
`dependency_ids` contains prerequisite assignment UUIDs (use an explicit empty array when none).
Supply `p_github_paths` as exact repo-relative files or directory `/**` scopes,
plus objective, verification, stop condition, expected output and
`BRANCH_ONLY_NO_MERGE_NO_DEPLOY`. An authorization reference is provenance, not a grant.
The receiver must resolve the referenced decision, current owner, file reservations,
remote branch head and allowed write scope before acknowledging or writing.

`ASSIGNED` means persisted, not sent. `FIRE_REQUESTED` means a transport request only.
`SESSION_STARTED` proves a session was created (delivery), not that the task was read.
Only receiver-originated `agent_dispatch_ack` with a real session ID proves ACK;
WRITE ACK must include the independently observed base/head. Never manufacture another
session's ACK. `agent_dispatch_claim` then acquires the lease. Record `WORKING` and
`TESTED` with `agent_dispatch_progress`; TESTED requires test evidence. The transport
state stays CLAIMED while these lifecycle receipts are in `dispatch_context`.
Progress is the bounded heartbeat and renews a valid lease for 15 minutes; it cannot
revive an expired lease. Dependencies require an accepted PASS/AFTER_TESTED result,
not merely a transport outcome COMPLETED. BLOCKER results never satisfy dependencies.
`agent_dispatch_finish` records a parent-linked AFTER; completed WRITE requires TESTED.
Claude results remain passive TO=GPT, with no RESULT_WAKE.

At start and before idle, bounded-read `work_log_current` for this actor's pending tasks
and passive AFTERs for its active task keys; resolve original assignments by ID when
supersession removes them from the current view. Correlate parent ID plus task key,
not free-text similarity. Independently verify result evidence before adopting it.
There is no proven tool here to address arbitrary already-open external chat sessions;
Routine delivery starts its supported receiver. Never promise all chats are notified.

Invalid envelopes persist as DEFERRED/BLOCKED with a specific reason before transport.
BLOCKED requires owner/dependency repair; DEFERRED is not a retry authorization.
An unknown delivery/ACK timeout must not fire a second session automatically.
Expired WRITE leases retain their file reservation until the owner reconciles and
cancels/transfers explicitly; agents must stop writes when their lease expires.
READ_ONLY retries reuse the same assignment ID and bounded attempt budget.
FAILED is terminal with retained evidence; an explicit authorized retry revalidates
the envelope, ownership and current head. Do not unstick blocked tasks by status alone.

Before applying the proposed migration, reconcile legacy CLAIMED_WRITE rows without
file paths through their real owners; never bulk-archive or infer abandonment by age.
Also update and verify the actual Routine prompt to ACK-before-claim before rollout.
Record that verification under existing task `SESSION_COORDINATION_ACK_PROTOCOL_ROLLOUT_V16`
with `ACK_PROTOCOL_ROLLOUT_VERIFIED` and the receiver protocol/test evidence. The migration
refuses application while either prerequisite is missing. This record is not release authority.

For a user decision affecting several known owners, make bounded READ_ONLY notification
assignments per existing owner with a stable key containing the decision reference and
recipient scope. Use the existing ledger/Routine path, verify persisted IDs, and collect
receiver ACKs. Notifications do not grant WRITE. A repeated key/payload reuses its ID;
a changed payload is a conflict requiring a versioned decision, not silent overwrite.

**ONE TASK KEY / ONE SCOPE — ONE PRIMARY WRITER.** A second agent may challenge READ_ONLY unless ownership is explicitly transferred in `work_log`.

## Provenance before recovery

An unmerged branch never proves lost work.

Required order when recovery is actually relevant:
1. inspect branch provenance;
2. compare payload with current main;
3. check whether equivalent work landed elsewhere;
4. classify `ARCHIVE | INSPECT | RECOVER | SUPERSEDED`;
5. never merge an old branch wholesale merely because it exists.

Historical examples and old audit notes are evidence only; they are not startup authority.

## Before declaring missing / duplicate

Use only the smallest relevant evidence set:
- current-main implementation evidence;
- live DB evidence when the claim depends on DB state;
- recent work provenance for the active scope;
- the current canonical owner/contract.

If evidence is incomplete, use `UNKNOWN / NEEDS RECONCILIATION` rather than inventing a new system.

## Closing protocol

After meaningful work:
1. record exact implementation/release states separately;
2. preserve branch/PR/commit/query evidence;
3. record real blockers/open threads;
4. update canonical docs only when canonical documented state changed;
5. preserve superseded history additively;
6. rescan main/DB/work_log before declaring DONE/LIVE/CLOSED;
7. leave `handoff_to` for any dependent actor.

## Release boundary

`DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`.

No handoff, branch, audit, or AFTER row grants release authority. Merge/deploy requires explicit ZURIEL authorization such as `תעלה` plus fresh release gates.

## G1 fresh-agent acceptance

A materially different active adapter/runtime is not G1-reconciled until a fresh session can, without prior conversation/project memory:
- resolve the right current owner;
- load minimum dependencies only;
- find relevant work_log context;
- verify the correct live source;
- report stale-pointer conflicts;
- avoid unrelated bulk reads;
- avoid inventing a parallel owner/context system.

Static wording alone is not acceptance evidence.

Rule: Reconciliation before construction · Provenance before recovery · Evidence before interpretation.
