# Contracts and enforcement — state on 14.11.2026 and the contracts-session handoff, item by item

Scope: G1, the CL-16 proposal, required checks and the handoff of the contracts session (`claude/laws-alignment-20261112` @ `53bb72e134be403aa4f8d1a71e8b0832d5a6bb4d`, docs only, preserved, not merged). Everything here goes through the existing owners (the G1 gate and its dated records, the rule guard, the Owner Index, the ruleset definition of #1336); **no rule system, store or registry was added**. Reads were read-only; nothing was applied. The execution lines are D10 (CL-16) and K1 (required checks) in [`foundation-package-20261114.md`](foundation-package-20261114.md).

## 1. G1 (merged with #1336) on the integrated tree

| Check | Result |
|---|---|
| `G1_BASE_SHA=origin/main node --test scripts/test-g1-agent-routing-smoke.mjs` | 51 / 51 |
| `run-ci-scenarios.sh` (the real smoke on a real base per scenario) | every scenario behaved as expected (53) |
| `run-db-scenarios.sh` (live-fixture guard vs the guard after CL-16) | ALL 72 CASES AS EXPECTED, both variants |
| the "G1 base commit" step of `live-contracts-2029.yml` | untouched by #1341 (it still reads `github.event.pull_request.base.sha`; pinned by a test) |
| dated records against the live rule tree | `scripts/sql/g1_laws_snapshot.sql` read-only on 14.11.2026: **131 lines (87 active laws, 44 retired laws that an active law names), joined md5 `f79d9618ed6f0dca3dacf4a13443973a` = the dated record of 12.11** (`audits/g1-agent-entry/G1_LAWS_ACTIVE_SNAPSHOT_20261112.txt`): the rule tree did not change, so **no newer dated record is needed now** |
| database readers that still name a retired law (`tests/live/g1_rule_reader_conformance.sql`) | 27 rows, 10 functions, plus 13 "name is also a column" — **unchanged since 12.11** (GAP-09 stays as recorded) |

## 2. CL-16 (the rule guard extension) — preconditions read again

`supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` (SHA-256 `0d7725919540cb98ed344f9e9dd9f3d2ba217c4de30d9cf86a702156f66eff63`), rollback `ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` (`60aa076c22461b80c97f8d91ff28f9e8a2b5c98268ff8d6a0a6e8b8c1611a2c5`). Read on the canonical project, 14.11.2026:

| Precondition of the file | Live |
|---|---|
| `md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'))` = `56b90b0ae0f9c5915b730314d13ca7a0` | **equal** |
| the single trigger on `public.nodes` is `trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version … FOR EACH ROW`, enabled `O` | **equal** (the only non-internal trigger of the table) |
| no `*_truncate` trigger | **none** |
| owner `postgres`, not SECURITY DEFINER, `search_path=public, pg_temp`, volatile, ACL `{postgres=X/postgres}` | **equal** |

So the file would pass its own full-match guard today. The file runs as one transaction (`lock_timeout 5s`, `statement_timeout 30s`), refuses on any other state, and its postcondition requires the function md5 `90b5917b1412be02f66d1f805241018c`. The 25-case lifecycle test, the 72 DB cases × 2 variants and the order evidence (law v7 supersession before CL-16; its rollback refused after CL-16 as a revival, decision O-2) were re-run on the integrated tree and pass.

**GAP-05 answered (the permissions query of the contracts handoff, E4), read-only:** the table `public.nodes` and the guard function are owned by `postgres` (the role of the SQL editor and the MCP tools); `postgres` has no member roles; the only superuser is `supabase_admin`; no parameter grant exists for `session_replication_role`. So **only `postgres` (and the superuser) can disable the trigger or replace the function**; `service_role` cannot. **New finding F2:** `service_role` holds the `TRIGGER` privilege on `public.nodes` (and `postgres` as owner): it cannot disable or drop the guard (ownership is needed) but it can add another trigger to the rule tree. Closing it is `revoke trigger on public.nodes from service_role` — a permission change, not made, a separate approval.

**GAP-11 (the nine live writers of `public.nodes` after the guard is applied)** stays a post-apply step of D10: one write of each class through its normal path, or a list of those not exercised.

## 3. Required checks

* The nine contexts of RC-1 were derived again from the workflows of the integrated tree (`node scripts/derive-pr-check-names.mjs`): all nine run on every pull request to `main`, names unique, timeouts and triggers unchanged (the only workflow edit of the package, in `live-contracts-2029.yml`, adds steps inside existing jobs and keeps every job name and timeout; the pin test of #1336 would fail otherwise). `gate` is still the name of two jobs, `Production Canary Gate` and the path-filtered gates are still excluded, as in the request.
* **Ordering constraint (new): K1 comes after R1 (#1341).** `auth-browser-acceptance-2029` is one of the nine. Until #1341 is merged it fails on every pull request opened after #1335 (shown again on #1340 and #1334 today). Required while red, it would block every merge, including the merge of its own fix, unless the admin bypass is used.
* The ruleset itself was **not read by me** (no tool of this session reads repository rulesets); the facts in the request (`protect-main` id `19635630`, no required checks, `required_linear_history`, admin bypass) are Codex's reading of 13.11. The request's own condition stays: enforcement must be shown on a non-bypass identity, or reported as "rule present, enforcement not exercised against a non-bypass identity".

## 4. The contracts-session handoff mapped to what exists

Source: the handoff record `3c50f485-144c-4562-a569-fb571b0b2456` (round 5) and its README, read through the journal and `gaps.md`; the handoff README itself was not copied or re-audited here.

| Handoff item | State on 14.11.2026 | Owner / next |
|---|---|---|
| §13 acceptance A1–A5, B1–B7, C1–C4, E1–E3: owner, ownership chain, version integrity, create/activate/revive, DELETE/TRUNCATE | CI half merged (#1336); database half = CL-16, **not applied** (D10); all cases proved on throwaway PostgreSQL 16/17 | D10 after approval |
| §13 D1 (table in a migration or apply package) | in the G1 CI gate; covers 41 of 305 live tables (GAP-04, GAP-07) | design, not started |
| §13 D2 (a table created directly in the database) | **not built** (GAP-04: an event trigger of the `ensure_rls` family; DDL, approval) | one writer, not started here |
| §13 E4 (who can disable a trigger or replace the guard) | **answered above** (GAP-05, finding F2) | permission change = separate approval |
| §13 E5 (`project_codex` writes) | CI only (B5, dated slug record); no database gate (GAP-03) | design, not started |
| §15 item 9 / §16.4 `retired_routing_v1` (a recorded successor for a retired rule; G1 reads both sources) | implemented and tested (CL-16 cases D25–D25n; G1 cases R13/R13b; reader test) | with D10 |
| §8.1 RT-1…8 and ST-1…5 (what the assistant context returns; stale references) | ST-1 and ST-2 fail today because ten database functions still name a retired law (GAP-09, **unchanged**); the repository half is recorded in `G1_RETIRED_LAW_REFERENCES_20261112.txt` (25 pairs in 17 files; the list may only shrink) | DDL on ten functions, one writer, own approval; not started |
| §12.1 CL-03 (a shared eligibility function and projections by reference, A1–A13) | not started in this package; no `v2` was applied; it is a database function change set that needs its own designated writer | not part of this package |
| §14 CL-13 (the pause of the memory writers W1–W5, W4b excluded, M-1…M-15) | Edge side deployed on 13.11 (`wa-raziel`, `ai-analyze`, memory pause only); the database proposal of CL-13 was **not extracted** (Raziel; out of scope by instruction); branch `claude/cl13-db-step-20261113` preserved | outside this package |
| §16 CL-19, CL-20, CL-21 (proposed law formulations) | written, **not applied**, each needs ZURIEL's separate approval | decisions of ZURIEL |
| CL-17 row claim ("four active branches") correction | documentation only | not carried |

**Git disposition of the handoff:** it stays preserved on its branch at the SHA above (docs only; nothing depends on it; no merge proposed). This package links to it by exact SHA. No parallel owner map or contract was created.
