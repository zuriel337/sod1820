# CL-16 - the rule guard: a separate database step

Status: **PROPOSAL, NOT APPLIED.** Nothing in this package applies SQL. Every statement below needs ZURIEL's explicit approval of the exact
file and its sha256 (CLAUDE.md 0.4). This step is documented, tested, planned and rolled back **on its own**; it is never bundled with the
code half of the package (the G1 rules, the dated records, the scenarios), which does not need it.

Source: PR #1321 commit `4a406fed2` (`supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` and friends). Changed in this extraction:
comments and the apply plan only (the function body, and so the md5 `90b5917b1412be02f66d1f805241018c`, is untouched), plus the runner's
static check (it used to read the M0 apply plan, which lives in another package).

## 1. What it is

It extends the **same** live function `public.fn_rule_compaction_integrity_guard_v1()` and the **same** trigger on `public.nodes`
(EXTEND_EXISTING; no new function, table or store), and adds one `BEFORE TRUNCATE` trigger on the same function. For rule rows only
(`type = 'rule'`) it refuses: a type or id change, an in-place change of `rule_id` / `rule_version` / `supersedes_version` / `identity_key`,
a body or owner change without a new version (active or not), DELETE, TRUNCATE, a new or newly activated v1 without an owner-creation
verdict, a revival of a retired family without verdict + approval reference, an owner move without `SUPERSEDE_EXISTING` + approval, an owner
that is retired / missing / a cycle / longer than 16 links, a document owner that no active rule names and no approval authorizes, a rule row
without `rule_id`, and an approval reference that is not `work_log:<uuid>` of an existing journal row naming the rule. It records the
successor of a retired rule in `metadata.retired_routing_v1` only. Rows that are not rules are not blocked.

| File | sha256 (checked by the runner) |
|---|---|
| `supabase/proposed/20261112200000_g1_rule_guard_cl16.sql` | see `docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json` |
| `supabase/proposed/ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` | same plan |
| `docs/reviews/g1-rule-guard-cl16-20261112/apply-plan.json` | the one apply plan of this step |

## 2. Exact dependencies: the objects it reads and changes

| Object | Access | Evidence (file:line in this branch) |
|---|---|---|
| `public.fn_rule_compaction_integrity_guard_v1()` | **replaced** (CREATE OR REPLACE; owner, ACL, SECURITY DEFINER (off), `search_path`, volatility compared before and after) | `...cl16.sql:95` (function), `:73-74` (md5 before / after), `:413-427` (postcondition block) |
| trigger `trg_rule_compaction_integrity_guard_v1` on `public.nodes` | **replaced** with CREATE OR REPLACE TRIGGER (adds DELETE and the columns `description, label, type, id, identity_key`) | `...cl16.sql:410` |
| trigger `trg_rule_compaction_integrity_guard_v1_truncate` on `public.nodes` | **created** (BEFORE TRUNCATE, statement level) | `...cl16.sql:411` |
| `public.nodes` | read inside the guard (siblings of the same rule family, owners, chains); **written** only through `NEW.metadata.rule_guard` (a stamp on a real retirement) | guard body `:108` (`pg_current_xact_id()`), stamp `:164` |
| `public.work_log` | **read** (`id`, `topic`, `what_we_did`) to check an approval reference | `:219`, `:374` |
| `public.project_codex` | **read** (`slug`) to check a codex owner or successor | `:212`, `:330` |
| catalog (`pg_proc`, `pg_trigger`) | read by the preflight, fail-closed | `:66-91` |
| roles | none changed. The guard is not SECURITY DEFINER: it runs as the **writing** role, which needs SELECT on `work_log` and `project_codex`; a writer without it is refused (fail-closed, not silently allowed) | `...cl16.sql:52` (header), live ACLs **not re-read here** |
| locks | `lock_timeout 5s`, `statement_timeout 30s`; CREATE OR REPLACE TRIGGER takes a brief SHARE ROW EXCLUSIVE lock on `public.nodes`; readers are not blocked | `:63-64`, `:51` |
| preconditions | continues only on the exact live state (md5 `56b90b0a...`, the old trigger, no TRUNCATE trigger) or the exact applied state; every other state, including a **missing or disabled trigger**, stops it before anything changes | `:68-92`; 25 lifecycle cases |

## 3. Dependency table: M0, main and CI

| Question | Answer | Evidence |
|---|---|---|
| Does CL-16 depend on any M0 SQL step? | **No.** | The 23 SQL files of the M0 apply plan (PR #1321 `4a406fed2`) contain no statement that reads or writes `public.nodes`, `public.work_log`, `public.project_codex`, the guard or its triggers (`grep -E 'nodes\|fn_rule_compaction\|trg_rule\|project_codex'` over the 23 files: 0 hits; `work_log` appears twice, in comments of DEF-005, lines 8 and 13, about audit functions it makes server-only). No M0 step uses `ALTER DEFAULT PRIVILEGES`, an event trigger, `DISABLE TRIGGER` or `ALTER FUNCTION`. |
| Does any M0 step depend on CL-16? | **No.** | Same grep over the M0 tests (`m0a_db_permissions_v1`, `m0b_ai_quota_fail_closed_v1`, `m0d_world_contributor_research_candidates_v1`, `def004_*`, `def005_*`) and `tests/live/m0_post_apply_verification.sql`: 0 hits. |
| Does the CL-16 test need an M0 file? | **No.** | `scripts/run-g1-rule-guard-sql-test.sh` copies four files (`tests/sql/g1_rule_guard_cl16_v1.sql`, the proposal, its rollback, the fixture); `run-db-scenarios.sh` uses the fixture and the proposal; `run-g1-laws-snapshot-reader-test.sh` uses four files. The only M0 reference was a **static scan** in the lifecycle runner (it read the M0 apply plan to prove independence). It is replaced here by a scan of every SQL file that can reach the live database against the reviewed list `cl16-rule-tree-writers.json`. |
| Does any other file of the repository touch the same objects? | **Yes, four, all about one law.** | `supabase/proposed/20261111120000_admin_suggestion_decide_*` and its rollback only **read** `public.nodes`; `20261111120100_system_suggestions_law_v7_*` and `ROLLBACK_20261111120100_*` **write** it. See section 4. |
| What in main or in CI depends on CL-16 being applied? | **Nothing.** | CI never reads the live guard: the G1 smoke reads dated repository records; the SQL runners test the **proposal file** on a throwaway database. No Edge function, `src/` or `api/` code calls the guard (the functions that read `nodes` only read: grep of `from('nodes')` in `src`, `api`, `supabase/functions` shows reads only). The snapshot reader `scripts/sql/g1_laws_snapshot.sql` is one SELECT and works with or without CL-16; it only *knows* the keys `retired_routing_v1` and `rule_guard` that CL-16 is the only writer of. |
| Which live database functions write `public.nodes`, and does CL-16 affect them? | Nine are known; none should be affected, **not run after apply**. | The closure list (R-9, read on 12.11.2026) names `add_entity`, `get_or_create_entity_node`, `graph_wire_number`, `project_contribution_to_graph`, `project_language_bridges`, `sync_convergence`, `wire_image_meaningful`, `wire_number_to_images`, `admin_verify_bridge`: fixed non-rule row types, none writes a rule row. CL-16 returns at once for rows that are not rules (case D23 of the matrix). Only some of the nine are defined in `supabase/migrations`; their live bodies were not re-read here. The post-apply check in section 5 asks for one run of each. |
| Does the code half need CL-16? | **No.** | The code half can be merged before, after or without this step (apply plan, `sequencing.code_side`). |
| What does CL-16 change for the readers of the rule tree? | Nothing for existing rows. | `fn_active_method_rules` (Raziel context) still reads every active rule row marked `propagate` without filtering `rule_id`; CL-16 only prevents new rows without `rule_id` (18 inactive ones stay as history). The reader fix is CL-06, not in this package. |

**Checked with the real M0 files in the tree.** The two apply plans of M0 and CL-13 and the SQL files they name (28 files; six of them overwrote older
versions that main has) were taken from PR #1321 `4a406fed2` and placed on top of this branch for one run (then removed again): the rule-tree scan of
`scripts/run-g1-rule-guard-sql-test.sh` read 56 SQL files and found exactly the 4 reviewed ones that mention `public.nodes`, and the G1 smoke
(which scans every `docs/reviews/*/apply-plan.json` for tables created without `-- OWNER-CHECK:`) passed 51/51. So the M0 and CL-13 packages can
land before or after this one without a conflict in these checks, provided their SQL stays as it was in #1321.

### Order, in each direction

| Order | Result | Why |
|---|---|---|
| M0 steps, then CL-16 | no interaction | disjoint objects (table above) |
| CL-16, then M0 steps | no interaction | disjoint objects; M0 writes no rule row, so the new guard is never invoked by M0 |
| CL-16 between two M0 steps | no interaction | each file is guarded by its own state preconditions; neither changes what the other compares |
| law v7 supersession (`20261111120100`) **after** CL-16 | **fails** (its own post-check) | CL-16 stamps `metadata.rule_guard` on a deactivated row, so the "v6 kept unchanged" md5 check (lines 79-81 of that file) raises. The 12.11.2026 laws snapshot already shows `system_suggestions_law` v7 active (md5 prefix `a594e1fe21d4` = that file's text), so this order **has already been satisfied live**. |
| law v7 **rollback** (`ROLLBACK_20261111120100`) **after** CL-16 | **refused** | it reactivates the retired v6; CL-16 treats that as a *revival* (needs `owner_routing.resolution` + a `work_log` approval reference). The rollback therefore runs only before CL-16 (or after CL-16's own rollback), or after a separately approved revival. |

The two bold rows are demonstrated on a throwaway database with synthetic rows of the same shape, four runs with an expected outcome each:
`bash docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/run.sh` (PostgreSQL 16.15 and 17.12). The real 11c / 18c files were
**not** executed (they need the live rows and hard-coded md5 values); the mechanism, not the data, is what the evidence shows.

## 4. The old rule "apply after M0": what is right and what is not

Where it comes from: the closure list put the database guard after the M0 SQL steps "to avoid a circular dependency" (section 2, track G'),
and the contract handoff repeated it ("after A2", sections 9 and 13.2: live application only after the M0 SQL steps and a DDL approval).
It was copied into three files: the header of the proposal, `depends_on` of the apply plan, and the header of the lifecycle test.

* **Right:** M0 closes live exposures (permissions, quotas); the guard closes a governance gap. Doing the urgent step first is a sensible
  **scheduling preference**, and each step needs its own approval anyway.
* **Right:** the lifecycle test simulates "the state after M0". That is correct, but for a different reason than stated: M0 does not touch
  these objects, so the post-M0 state equals the live 12.11.2026 state for **any** order.
* **Not right:** that CL-16 *depends* on M0, or the reverse. Read from the files: no shared object, no shared test, no shared role. The
  statement is removed from the three files; the apply plan now says `depends_on: []` and explains the real constraints.
* **What actually constrains the order** is not M0 but the law v7 supersession and its rollback (section 3), and, in general, any later
  change of a rule row: after CL-16 it must satisfy the guard (resolving owner, approval reference that names the rule, no revival).
* **Open decision for ZURIEL (one line):** keep "after M0" as a scheduling policy, or release it. The files no longer force it either way.

## 5. Apply, verify, roll back

1. Approval of the exact files and sha256 values in the apply plan. 2. Apply the proposal in one transaction (it stops on any drift).
3. Verify: function md5 `90b5917b1412be02f66d1f805241018c`, the two trigger texts in the file header both `enabled=O`, owner / ACL /
`search_path` / volatility unchanged (all checked inside the file; the md5 is the same on PostgreSQL 16.15 and 17.12; the live server is
17.6 and was **not** run). 4. After applying, run each of the nine `public.nodes` writers of the previous table once on a test input (the row types they write are not rules, so the guard must let them through); a refusal means roll back. 5. Rollback: `ROLLBACK_20261112200000_g1_rule_guard_cl16.sql` restores the live 12.11.2026 body (md5
`56b90b0a...`) and drops the TRUNCATE trigger; it also stops on any drift. **Not undone by the rollback:** `metadata.rule_guard` stamps and
`metadata.retired_routing_v1` records written while the guard was applied (audit metadata; the old guard ignores both keys).

Risks, stated plainly: `postgres` (the owner, and the role of the MCP tools) can still disable the trigger or replace the function; the
guard is not run against the live database anywhere in this package; a role without SELECT on `work_log` / `project_codex` is refused when
it writes a rule row; the live ACLs of those two tables were not re-read here.

## 6. Tests (local, throwaway PostgreSQL only)

```
G1_PG_BIN=/usr/lib/postgresql/16/bin bash scripts/run-g1-rule-guard-sql-test.sh                                      # 25 lifecycle cases + sha256 + rule-tree scan
G1_PG_BIN=/usr/lib/postgresql/17/bin bash docs/reviews/contracts-enforcement-20261113/enforcement-proof/run-db-scenarios.sh   # 72 cases x 2 variants
G1_PG_BIN=/usr/lib/postgresql/17/bin bash scripts/run-g1-laws-snapshot-reader-test.sh                                 # 18 end-to-end checks
G1_PG_BIN=/usr/lib/postgresql/17/bin bash docs/reviews/contracts-enforcement-20261113/cl16-order-evidence/run.sh      # 4 order cases
```
