# S2 inventory entries raised by the audit RC (entries only — no change applied)

> **Documentation only.** No SQL, ACL, RLS, DB or Storage change; the failure-correction session's branch (`claude/sod1820-ci-failures-diagnosis-6z9ej6`, `f9d55248e`) is not touched. No file named "S2 inventory" exists in the RC, on `main` or on that branch, so the entries are kept here for the owner of the S2 inventory to copy. They are **gaps to schedule, not gate results**: S2, SK2, PG2 and G4 remain open.
> Stage S2 definition: `docs/2029-security-hardening-gate-plan-v1.md` ("intended public writes have explicit validation, bounded side effects and abuse/rate controls"; "admin actions prove an explicit admin boundary").

| Entry | Object | Class | Severity | Detail |
|---|---|---|---|---|
| S2-A | `public.page_views` — policy `pv_insert` | PUBLIC_WRITE, unvalidated | P2 | [`DEF-026-PAGE-VIEWS-SERVER-SIDE.md`](DEF-026-PAGE-VIEWS-SERVER-SIDE.md) |
| S2-B (new) | `public.fn_name_research_stats(int)` | internal read without an admin boundary | P3 (DEF-027) | below |
| S2-C | `public.fn_log_name_research(jsonb,int)` | PUBLIC_WRITE, kept public by DEF-005 (class C) | P3 | below — already planned for retirement by the other session (RP-3b) |

## S2-B — `fn_name_research_stats` (DEF-027)

| Field | Value |
|---|---|
| Source | `supabase/migrations/20260728_namelab_quality_log.sql` (see [`CORRECTION-fn_log_name_research-migration.md`](CORRECTION-fn_log_name_research-migration.md)) |
| Function | `create or replace function public.fn_name_research_stats(p_days int default 30) … stable security definer set search_path=public`; reads `public.name_research_log` |
| Intent | the migration header calls it the "NameLab — internal quality board … dev telemetry" |
| Gap 1 | **no admin (or any caller) check in the body** — verified by reading lines 44-66 of the file; the only access control is the grant |
| Gap 2 | file grants `execute … to authenticated`; the function is created with the default PUBLIC `EXECUTE` which the file never revokes. The failure-correction session's capture of the live ACL on 7.11.2026 is `{=X, postgres=X, authenticated=X}` (document 08 §6) — `=X` is PUBLIC, i.e. **`anon` can call it too**. Taken from that capture; not re-verified here (no SQL allowed in this step). |
| What it returns | aggregates only: total searches in the window, counts with surname / birth date / question, literal-hit rate, averages of track counters and `elapsed_ms`, per-track fire percentage. **No searched names and no identifiers.** |
| Parameter | `p_days int` is not validated (a very large value reads the whole log; the log size was not measured here) |
| Consumers | none in `src/`, `api/`, `supabase/functions/`, `public-reading-deploy/`; document 08 states the reader "is called by nothing" |
| Impact | information disclosure of aggregate product-usage telemetry to unauthenticated and any signed-in caller; no personal data; no integrity impact; small availability exposure through the unbounded window |
| Proposed severity | **P3** — "admin actions prove an explicit admin boundary" is not met; scheduled, non-blocking for cutover (low-risk, outside the active public dependency graph) unless an owner says the numbers are sensitive |
| Option 1 (recommended) | revoke `EXECUTE` from `PUBLIC`, `anon`, `authenticated` (keep `service_role`). No consumer → no functional change. |
| Option 2 | if an admin dashboard will use it: keep the function, add an explicit admin guard in the body, in the pattern of the existing admin-only readers (e.g. `admin_infra_load`: SECURITY DEFINER + `select (role='admin') … from public.users where id = auth.uid()`, `supabase/migrations/20260808_admin_infra_load.sql`), and revoke from `PUBLIC`/`anon`. |
| Rollback | ACL restore from document 08 §6: `grant execute on function public.fn_name_research_stats(integer) to public, authenticated;` (reproduces `{=X, postgres=X, authenticated=X}`); a guard added in the body is rolled back with the function text taken from git after the drift check. Nothing is deleted, no row changes. |
| Test plan | throwaway PostgreSQL only (same harness as the DEF-001/004/005 suites): before — `anon` and `authenticated` can execute; after Option 1 — both get `permission denied`, `service_role` still works; rollback restores the grants. |
| Not done | no SQL, no ACL change, no live read of the ACL or of the function body in this step. |

### Process finding about DEF-005 (stated plainly)

DEF-005's method listed every SECURITY DEFINER function executable by `anon` (295), removed those with an admin / `auth.uid()` guard or judged to be public reads (209), and classified the rest (classes A–F in `STORAGE-RPC-APPROVAL.md` / README §5). `fn_name_research_stats` is **not named** in any class in the RC documents. A guard-less read of internal telemetry would have fallen into class E ("public reads, ≈110, kept"), which was kept as a bucket and **not reviewed function by function**. The RC documents do not let me confirm the bucket; the consequence is that class E may contain other internal-telemetry reads (`*_stats`, `*_status`, quality boards) that were treated as public by default. Recommended read-only follow-up (needs approval for the live query): list the ≈110 class-E functions with their body's table dependencies and flag those that read `*_log`, `*_cache`, telemetry or admin-named tables.

## S2-C — `fn_log_name_research` (already tracked)

* `SECURITY DEFINER`, `set search_path=public`, `grant execute … to anon, authenticated`; kept public by DEF-005 class C.
* Unbounded input shape: `p_doc jsonb` of any size feeds `left(…, 80)` for the name but builds `track_status` from the `tracks` array without a size cap; no rate control. Same family of gap as S2-A, smaller.
* **Call chain is unreachable in the product** (the deep-name panel never mounts because `passive` is always set; the RPCs are also outside the worker allow-list) — details and line references in the correction document §5. So a revoke of the writer has no client impact, and the retirement plan (document 08, stage 2) is a dead-code removal plus an ACL change.
