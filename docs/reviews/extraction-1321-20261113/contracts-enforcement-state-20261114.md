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

`supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` (SHA-256 `a66d98d4cbd28f503d58c5b31406d384f2e66dcad80fbc4a0a91b3d568b8b4bd`), rollback `ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` (`367ccb01384f8594c5c8f973bc47a84df0348e314b9c5d7d737c68b21364c51c`) — **the files of #1343, the fix of Codex's CR-F1 (14.11.2026)**; the pair before the fix (`0d77259…` / `60aa076…`) must not be sent. Read on the canonical project, 14.11.2026:

| Precondition of the file | Live |
|---|---|
| `md5(pg_get_functiondef('public.fn_rule_compaction_integrity_guard_v1()'))` = `56b90b0ae0f9c5915b730314d13ca7a0` | **equal** |
| the single trigger on `public.nodes` is `trg_rule_compaction_integrity_guard_v1 BEFORE INSERT OR UPDATE OF is_active, metadata, rule_id, rule_version, supersedes_version … FOR EACH ROW`, enabled `O` | **equal** (the only non-internal trigger of the table) |
| no `*_truncate` trigger | **none** |
| owner `postgres`, not SECURITY DEFINER, `search_path=public, pg_temp`, volatile, ACL `{postgres=X/postgres}` | **equal** |

So the file would pass its own full-match guard today. The file runs as one transaction (`lock_timeout 5s`, `statement_timeout 30s`), refuses on any other state, and its postcondition requires the function md5 `90b5917b1412be02f66d1f805241018c`. **CR-F1 (Codex, 14.11.2026):** the first version read the trigger before it held a table lock and so overwrote a trigger change committed by another session (`ALTER TABLE public.nodes DISABLE TRIGGER`), in the apply and in the rollback alike. Both files now take `LOCK TABLE public.nodes IN SHARE ROW EXCLUSIVE MODE` as their first statement after the timeouts, so such a change is either committed first (the unchanged checks refuse on drift) or still open (the file waits for at most the lock timeout and then fails with nothing changed); readers of `public.nodes` are not blocked, writers queue, and in the rollback `DROP TRIGGER` needs `ACCESS EXCLUSIVE` (measured). Nine concurrency cases with a synchronisation barrier cover the race for the apply and for the rollback, clean runs after waiting, atomic lock timeouts and the `CREATE OR REPLACE FUNCTION` control; they fail on the files before the fix. The 25-case lifecycle test, the 72 DB cases × 2 variants and the order evidence (law v7 supersession before CL-16; its rollback refused after CL-16 as a revival) pass on the integrated tree.

**Adopted by ZURIEL (14.11.2026, preferences, not execution approval):** CL-16 is part of the reviewed package; an ordinary future law correction uses a **new version** rather than reviving a retired one (so the refusal of the old law v7 rollback after CL-16 is a stated fact, not a defect, and it is **not** claimed that the old law-supersession rollback works under the new guard); this is conditional on a **controlled rollback of the guard itself**, which the lifecycle (G6: exact live state, then a no-op) and the concurrency cases R1–R4 exercise.

**GAP-05 answered (the permissions query of the contracts handoff, E4), read-only:** the table `public.nodes` and the guard function are owned by `postgres` (the role of the SQL editor and the MCP tools); `postgres` has no member roles; the only superuser is `supabase_admin`; no parameter grant exists for `session_replication_role`. So **only `postgres` (and the superuser) can disable the trigger or replace the function**; `service_role` cannot. **New finding F2:** `service_role` holds the `TRIGGER` privilege on `public.nodes` (and `postgres` as owner): it cannot disable or drop the guard (ownership is needed) but it can add another trigger to the rule tree. Closing it is `revoke trigger on public.nodes from service_role` — a permission change, not made, a separate approval.

**GAP-11 (the nine live writers of `public.nodes` after the guard is applied)** stays a post-apply step of D10: one write of each class through its normal path, or a list of those not exercised.

## 3. Required checks

* The nine contexts of RC-1 were derived again from the workflows of the integrated tree (`node scripts/derive-pr-check-names.mjs`): all nine run on every pull request to `main`, names unique, timeouts and triggers unchanged (the only workflow edit of the package, in `live-contracts-2029.yml`, adds steps inside existing jobs and keeps every job name and timeout; the pin test of #1336 would fail otherwise). `gate` is still the name of two jobs, `Production Canary Gate` and the path-filtered gates are still excluded, as in the request.
* **Ordering constraint (new): K1 comes after R1 (#1341).** `auth-browser-acceptance-2029` is one of the nine. Until #1341 is merged it fails on every pull request opened after #1335 (shown again on #1340 and #1334 today). Required while red, it would block every merge, including the merge of its own fix, unless the admin bypass is used.
* The ruleset itself was **not read by me** (no tool of this session reads repository rulesets). **Codex read it freshly on 14.11.2026 (20:48 UTC):** `protect-main` (id `19635630`) is active, has a linear-history rule, administrator always-bypass and **no required status checks yet**; the nine proposed names match the integrated workflows and the GitHub Actions integration id 15368. **Adopted by ZURIEL (O-3/O-4):** required checks after the CI fix (K1 after R1), the administrator bypass kept only for a documented emergency on ZURIEL's explicit instruction. **No non-bypass identity was supplied or inferred**, so the verification of K1 is "rule present and read back; enforcement not exercised on a non-bypass identity".

## 4. The contracts-session handoff mapped to what exists

Source: the handoff record `3c50f485-144c-4562-a569-fb571b0b2456` (round 5) and its README, read through the journal and `gaps.md`; the handoff README itself was not copied or re-audited here.

| Handoff item | State on 14.11.2026 | Owner / next |
|---|---|---|
| §13 acceptance A1–A5, B1–B7, C1–C4, E1–E3: owner, ownership chain, version integrity, create/activate/revive, DELETE/TRUNCATE | CI half merged (#1336); database half = CL-16, **not applied** (D10, the post-CR-F1 files of #1343); all cases proved on throwaway PostgreSQL 16/17, including the concurrency cases | D10 after approval |
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
