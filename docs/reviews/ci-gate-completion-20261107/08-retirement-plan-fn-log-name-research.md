# Retirement plan — `fn_log_name_research(jsonb, integer)` (and its companion reader `fn_name_research_stats(integer)`) (DRAFT; NOTHING EXECUTED)

> **DRAFT / EVIDENCE — not an owner contract, not an approval, no gate is passed.** Branch-only, not in `main`. Aggregate numbers only: no personal data, no secrets. Index: [README](README.md).

Scope of this document: **consumer verification and gateway evidence first**, then a staged plan and approval conditions. No SQL, ACL, function, table, code, cron or data was changed. Statements are inert text for a later, separately approved step.
Evidence tags: **V** live read-only (7.11.2026) · **C** repository main@cfda877a · **G** gateway logs · **A** subagent scan.

## 1. What the objects are (V)
| Object | Facts |
|---|---|
| `fn_log_name_research(p_doc jsonb, p_ms integer DEFAULT NULL)` | SECURITY DEFINER (postgres), `search_path = public`, VOLATILE, SQL language; ACL `{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres}` (PUBLIC, anon, authenticated); 1 overload; md5 of the full definition `45073f63df8945774bc1046afd6be2a8`. Inserts one row into `public.name_research_log` per call, including the typed full name (first 80 characters) when it is not empty. No size bound, no rate limit. |
| `fn_name_research_stats(p_days integer DEFAULT 30)` | SECURITY DEFINER, STABLE; ACL `{=X/postgres, postgres=X/postgres, authenticated=X/postgres}` — executable by **PUBLIC**, hence by anon; md5 `398d155905f791c76fd0614b1d6d5751`. Returns aggregates only (counts, rates, per-track percentages), no names. |
| `public.name_research_log` | 1,294 rows; oldest 2026-07-28; **last row 2026-11-04 11:49:50 UTC**; RLS on, no policy, no anon privilege; no trigger. Retention: none (not in the retention registry). See [07](07-name-research-log-impact-and-retention-30-180.md). |
| Other readers or writers | None: no other function reads or writes the table (checked in pg_proc bodies); no trigger; no cron job; no view. |

## 2. Consumer verification
### 2.1 Gateway (G) — validated by a positive control
| Window (24 h, start 05:06Z) | `fn_log_name_research` calls | `fn_name_research_stats` calls |
|---|---|---|
| 10-31 → 11-01 | 16 | 0 |
| 11-01 → 11-02 | 9 | 0 |
| 11-02 → 11-03 | 14 | 0 |
| 11-03 → 11-04 | 20 | 0 |
| 11-04 → 11-05 | 9 (**last call 2026-11-04 11:49:49.997 UTC**) | 0 |
| 11-05 → 11-06 | **0** | 0 |
| 11-06 → 11-07 | **0** | 0 |
- Positive control: the calls in the first five windows are detected by exactly the query that returns 0 afterwards, and the last gateway call (11:49:49.997) coincides with the last table row (11:49:50) — the two sources agree to the second.
- Origin of the calls: 11-03 window — 16 POSTs from the production page `sod1820.co.il` (12 anon, 4 signed-in) with browser user agents; 11-04 window — 7 POSTs, all from a loopback page (test browsers). After 11:49:50 on 4.11 nothing arrives. The last call is consistent with the Legacy page leaving service at the cutover (the exact alias-switch instant is not readable).
- The stats reader has **0 calls in every window sampled** (7) — it has never been seen in the gateway in this period.
- Log retention: windows before about 1 September contain no rows, so history before September cannot be checked.
### 2.2 Code (C)
- Only `NameMultiSearch.jsx` (via `logNameResearch` in `src/lib/supabase.js`) calls the writer. `NameMultiSearch` is rendered only by `CommunityCalculatorPage` inside `{!babyMode && deepName && …}`.
- `CommunityCalculator2029Page` imports `CommunityCalculatorPage` and mounts it with the `passive` flag; in `passive` mode the effect that fills `deepName` returns immediately, so the component and the logger are **not rendered** on the live route. Removing `passive` would revive collection of typed names. No other importer of `CommunityCalculatorPage` or `NameMultiSearch` exists.
- No repository Edge Function, API route, script or worker references the writer, the reader or the table. No test references them.
### 2.3 Database (V)
No DB-internal caller of either function (bodies, triggers, cron). The reader is called by nothing.
### 2.4 Deployed Edge Functions (A)
Read-only scan (7.11.2026): **93 functions listed (all active), all 93 retrieved and scanned**, shared and sibling files included; 0 unreadable. Four oversized bundles were searched programmatically (case-insensitive); the other 89 were read inline by the subagent. Search terms: `fn_log_name_research`, `fn_name_research_stats`, `name_research_log` (and the share-counter name, see [05](05-retirement-plan-increment-post-share.md) §3b); near-variants (`name_research`) were also looked for. **No match in any function body or slug.** Limits: the result is the subagent's report, **not independently re-run**; it covers deployed Edge Function source only (SQL, cron, frontend and tests are covered in 2.2 and 2.3); point-in-time — repeat it in the stage-1 re-check.
### 2.5 Not proven
A caller older than the log retention (bounded by the table: first row 2026-07-28, and the Legacy page that called it left service on 4.11); an off-project process using the public key from a non-browser client (none seen in the gateway window); a future product need (decision).

## 3. Dependencies
- Table and rows: untouched by this plan; their lifetime is governed by the retention proposal in [07](07-name-research-log-impact-and-retention-30-180.md) (30 / 180 days, **proposal only**).
- Retention registry (`admin_retention_preview`): will list the table once retention is approved; independent of the function retirement.
- Code: the writer call lives in the legacy-style component; removal of `logNameResearch` (and optionally `NameMultiSearch`) is a code change with its own approval. A guard test ("passive mode never renders the name research component") would protect against accidental revival.
- Docs: `docs/reviews/2029-legacy-separation-20261105/FINDINGS.md` and `docs/research-universal-finding-contract.md` mention the surfaces; update after stage 3.
- No overlap with PR #1259 (different objects) or with the share-counter plan ([05](05-retirement-plan-increment-post-share.md)).

## 4. Staged plan
| Stage | Action (text only) | Needs | Reversible |
|---|---|---|---|
| 0 | Consumer and gateway evidence (this document) | — | — |
| 1 | Same-day re-check: gateway 7 days = 0 for both functions, md5/ACL unchanged, no new reference on main, Edge scan clean | — | n/a |
| 2 | Restrict execution of the **writer** first (it can collect personal text): `revoke execute on function public.fn_log_name_research(jsonb, integer) from public, anon, authenticated;` The reader can follow in the same step (`revoke execute on function public.fn_name_research_stats(integer) from public, anon, authenticated;`) or stay until retention is complete — owner choice. Revoking from `anon` alone is not enough because the ACL carries PUBLIC. | exact statements approved; DB change | yes, seconds |
| 2m | 14-day monitor: gateway requests to the two paths with status ≥ 400 (an attempt after the restriction shows as an error); weekly note in work_log | read-only | — |
| 3 | If no legitimate attempt appears: drop both functions; remove the dead `logNameResearch` call and, if the owner agrees, `NameMultiSearch`; add the guard test; update docs | separate approval; DB + code PR | recreate from the captured definitions |
| 4 | Table fate after the retention rules have run (empty table: keep, archive or drop) and registry entry | separate decision | depends |
Order relative to retention: restrict the writer first (prevents any new personal text, reversible), then apply the 30 / 180 retention once approved; function drop only after the monitor.

## 5. Approval conditions (all required before stage 2)
1. ZURIEL confirms there is no plan to revive the name-research quality log, or accepts that a revival must be designed under the minimized, bounded pattern (no name text, input caps, per-address limit, retention class) instead of re-enabling this function.
2. Stage-1 re-check attached (gateway, md5/ACL, repository, Edge scan).
3. Exact statements approved in writing; work_log BEFORE first, AFTER after verification (catalog check only: `has_function_privilege` false for public/anon/authenticated; no live call).
4. Backup position recorded by the owner (see [07](07-name-research-log-impact-and-retention-30-180.md) §5) before any irreversible retention run; the function restriction itself does not touch data and does not need it.
5. Inventory update: anon-executable SECURITY DEFINER functions 295 → 294 (writer) and the reader is not SECURITY DEFINER-restricted today only via PUBLIC (counted by the advisor as anon-executable).
6. No conflicting active writer on the retention registry or these objects.

## 6. Rollback artifacts (captured live 7.11.2026; not executed)
- ACL restore: `grant execute on function public.fn_log_name_research(jsonb, integer) to public, anon, authenticated;` and `grant execute on function public.fn_name_research_stats(integer) to public, authenticated;` (reproduces `{=X, postgres=X, anon=X, authenticated=X}` and `{=X, postgres=X, authenticated=X}`).
- Definitions: the full text is reproducible with `pg_get_functiondef` while the functions exist and was captured on 7.11.2026 (md5 above). Neither definition is created by any migration in the repository, so the text must be committed to the repository when stage 2 is approved. Summary of the writer: a single `insert … select … where coalesce(p_doc#>>'{input,components,full}','') <> ''` into `name_research_log` (name text first 80 characters, name length, language, three booleans, track counts, `elapsed_ms`, aggregated `track_status`).
- Data: a restriction or drop of the functions changes no row.

## 7. Risks
Low. Residual risks: an unknown off-project caller (monitor covers it); a future feature wanting the quality log (decision 1); documentation drift (stage 3). The privacy exposure that remains after the function is restricted is the historical rows, handled by the retention proposal.
