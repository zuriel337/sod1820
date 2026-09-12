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
