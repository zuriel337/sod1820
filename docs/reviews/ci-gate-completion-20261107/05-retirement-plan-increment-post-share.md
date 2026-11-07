# Retirement plan — `increment_post_share(bigint)` and `increment_post_share_by_slug(text)` (DRAFT; NOTHING EXECUTED)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only (`claude/sod1820-ci-failures-diagnosis-6z9ej6`), not in `main`. Contains aggregate numbers only: no personal data, no secrets, no addresses. Index: [README](README.md).

Status: plan and approval conditions only. No SQL, ACL, function, table, code or data was changed. Statements below are inert text for a later, separately approved step.
Evidence tags: **V** live read-only query/log (6–7.11.2026) · **C** repository (origin/main cfda877a) · **G** git history.

## 1. Facts
| Item | Evidence |
|---|---|
| Both functions | V: SECURITY DEFINER, owner postgres, `search_path=public`, VOLATILE. ACL `{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres}` = executable by **PUBLIC**, anon and authenticated. md5 of full definitions: `f2e4ecdc39e3ef822a25e3107f4125a9` (by id), `aa0112348997989f44d7c298f2a73708` (by slug). Exactly 2 overloads in total. |
| Behaviour | by id: upserts +1 for ANY bigint (no existence check). by slug: +1 only if the slug maps to an existing post. Neither limits rate or dedupes. |
| Table `post_share_counts` | V: 1,188 rows, sum 96,718, max 777; RLS on; policy `share_counts_read` SELECT for public; grants anon/authenticated `rm` (read), owner/service_role full; **member of publication `supabase_realtime`**; no dependent views; only constraint = primary key. Last update **2026-06-27 18:51 UTC**. |
| Inventory | V: `admin_canonical_data_inventory_v1` lists the table as `POST_SHARE_COUNTER`, `OPERATIONAL_RUNTIME`, "operational only". |
| DB-internal callers | V: no function, trigger or cron job references either function (checked pg_proc bodies, pg_trigger, cron.job). |
| Code callers | C/G: wrappers `incrementShareCount` and `subscribeShareCount` still **defined** in `src/lib/supabase.js`; every call site left with commit `623b8d38a` (5.11, "Remove the Legacy runtime"). No test references them. |
| Gateway | V: 0 calls to `/rest/v1/rpc/increment_post_share*` in 28 contiguous daily windows (10-10 → 11-07 05:00Z) and in probes 09-01, 09-15, 10-01. Log retention: windows 08-01, 07-15 and 06-27 contain no rows at all, so logs exist from somewhere between 08-01 and 09-01. **No positive control exists for this path** (the last real write, 06-27, is outside retention); the method itself was validated on other RPC paths in the same logs (`ingest_event`, `fn_log_name_research`). |
| Replacement metric | C/V: `tracking.js` emits `share/share` events (24 rows in 30 days, last 3.11). Since the cutover the public-reading worker refuses every `ingest_event` surface except `performance` and `issue_report` (transport.js), so **no share counting works today by either route**. |
| Docs referencing the counter | `docs/2029-data-placement-retention-crosswalk.md`, `docs/SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md`, `docs/audit-evidence/20261106/code-inventory.md`, `docs/bot-resilient-experience-projection-v1.md`, `docs/g3-community-core-2029-phase2-shadow-branch-notes.md`; migrations `20260923200000_…phase2_shadow.sql` and `20261001073844_…canonical_data_inventory_projection_v1.sql` mention the table. |
| Definitions in repo | V/C: the two function definitions are **not** created by any migration in the repository (live-only) → the captured text in §6 is the only source for recreation. |

## 2. Dependencies and what retirement does NOT touch
- Table, its 1,188 rows, policy, Realtime publication membership: untouched in stages 2–3 (a later, separate decision).
- `increment_post_share_by_slug` is independent of the by-id function (no shared helper).
- PR #1259 shares no object with these functions (no overlap on `ingest_event`, `events`, or the new tables).
- No client code path calls them, so a build or deploy is not required for stage 2; stage 3 removes dead wrappers (code change, separate approval).

## 3. Consumer verification (what is proven, what is not)
Proven: no code caller, no DB-internal caller, no gateway call in ≥28 days, last write 133 days ago.
Not proven: (a) any caller older than the log retention — mitigated by the last-write date; (b) an external caller using the project's public key from outside a browser — would appear in the gateway, none seen; (c) a future product need — product decision.
Re-verify immediately before approval (same-day): repeat the 7-day gateway count, the md5/ACL comparison, and `git grep` on current main.

## 3a. Same-day re-check — 7.11.2026 05:06 UTC (read-only; not an approval)
- Gateway: **0** calls to `/rest/v1/rpc/increment_post_share*` in **7 consecutive 24-hour windows** ending 7.11 05:06Z (each window held 222k–499k gateway rows). Together with the earlier 28 contiguous daily windows (10.10 → 7.11) and the probes: no call in at least 28 days.
- Definitions unchanged: md5 `f2e4ecdc39e3ef822a25e3107f4125a9` (by id) and `aa0112348997989f44d7c298f2a73708` (by slug); ACL unchanged (`{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres}` on both); 2 overloads.
- Table unchanged: 1,188 rows, sum 96,718, last update 2026-06-27 18:51:47 UTC.
- No DB-internal reference (functions, cron, triggers). Anon-executable SECURITY DEFINER functions still 295.
- Repository main@cfda877a: only the two wrapper definitions in `src/lib/supabase.js` (lines 2534 and 2542); no call site; no test references.
- Production: all three domains on main@cfda877a (`dpl_12JhDbtTkEiENigf3Wzy4sproY7E`) — the counter functions are independent of the two-file difference from 394a2ba8.
- Deployed Edge Functions: see the scan result recorded in section 3b below.
**Result:** every stage-1 condition still holds. Nothing was changed.

## 3b. Deployed Edge Functions scan (A — subagent, read-only; 7.11.2026)
- Method: listing of deployed Edge Functions of the project and retrieval of the source of each (read-only; nothing deployed or changed). **93 functions listed, all active; all 93 retrieved and scanned**, including the shared and sibling files each one returned; 0 unreadable.
- Four oversized bundles were returned as files and searched programmatically (case-insensitive); the other 89 were read inline by the subagent, not grepped.
- Search terms: `increment_post_share` (covers `increment_post_share_by_slug`), `fn_log_name_research`, `fn_name_research_stats`, `name_research_log`; also looked for near-variants (`name_research`, `post_share`).
- Result: **no match for any term in any function body or slug.**
- Limits: the evidence is the subagent's report and was **not independently re-run**; it covers deployed Edge Function source only (not SQL, cron or frontend — those are covered in sections 2 and 3 above); it is a point-in-time scan.
Consequence for this plan: the Edge Function dimension of consumer verification is clean on 7.11.2026. Re-run it in the stage-1 re-check immediately before any approval.

## 4. Staged plan
| Stage | Action (text only) | Needs | Reversible |
|---|---|---|---|
| 0 | Evidence (done) | — | — |
| 1 | Same-day re-check (gateway 7 d = 0, md5 and ACL unchanged, no new references on main) + record in work_log | — | n/a |
| 2 | Restrict execution: `revoke execute on function public.increment_post_share(bigint) from public, anon, authenticated;` and the same for `public.increment_post_share_by_slug(text)`; owner keeps execute. Revoking from `anon` alone is NOT enough because the ACL also carries `=X` (PUBLIC). | ZURIEL approval of the exact statements; DB change | yes, seconds (§6) |
| 2m | 14-day monitor: gateway requests to the two paths with status ≥ 400 (a post-restriction attempt shows as an error); weekly note in work_log | read-only | — |
| 3 | If the monitor shows no legitimate attempt: drop both functions; remove the dead wrappers in `src/lib/supabase.js`; update the five docs and the inventory note | separate approval; DB + code PR | recreate from §6 |
| 4 (optional) | Decide the fate of `post_share_counts` (keep as history / archive / drop), the Realtime publication and the inventory entry | separate decision | depends |

## 5. Approval conditions (all required before stage 2)
1. ZURIEL confirms that no share counter feature is planned, or accepts that it would be rebuilt under the bounded-RPC pattern (limits, closed schema, counters) rather than revived.
2. Stage-1 re-check results attached.
3. Exact statements approved in writing; work_log BEFORE written first, AFTER after verification.
4. Verification after the change by catalog only (no live call): `has_function_privilege` for public/anon/authenticated = false for both functions; ACL string shows only the owner; anon-executable SECURITY DEFINER count 295 → 293 (inventory update).
5. No conflicting active writer on the inventory or on these objects (scan work_log).
6. Rollback statements and captured definitions stored with the approval (§6).

## 6. Rollback artifacts (captured live 7.11.2026, not executed)
ACL to restore: `grant execute on function public.increment_post_share(bigint) to public, anon, authenticated;` and the same for `increment_post_share_by_slug(text)` (this reproduces `{=X, postgres=X, anon=X, authenticated=X}`).
Definition (by id), md5 `f2e4ecdc…`:
```
CREATE OR REPLACE FUNCTION public.increment_post_share(p_wp_id bigint) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare new_count bigint;
begin
  insert into public.post_share_counts (wp_id, count, updated_at) values (p_wp_id, 1, now())
  on conflict (wp_id) do update set count = public.post_share_counts.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end; $function$
```
Definition (by slug), md5 `aa011234…`: select `wp_id` from `public.posts` where `lower(slug) = lower(ltrim(p_slug,'/'))` (return null if none), then the same upsert, returning the new count; header identical (`SECURITY DEFINER`, `SET search_path TO 'public'`, `RETURNS bigint`). Full text is reproducible with `pg_get_functiondef` while the functions exist; capture it into the repo when stage 2 is approved.

## 7. Risks
Low. Residual: an unknown external caller (monitor covers), a future share feature (decision 1), documentation drift (stage 3).
