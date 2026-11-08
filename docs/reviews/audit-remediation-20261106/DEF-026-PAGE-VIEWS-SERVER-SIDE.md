# DEF-026 — `public.page_views` is still open to anonymous INSERT (server side) · S2 inventory entry

> **Status: findings + proposal only. Nothing in this file was executed.** No SQL, ACL, RLS, DB or Storage change; no CI; no Preview; no merge/deploy.
> RC: `claude/sod1820-audit-rc-g93w32`. DEF-012 (client side) is **unchanged and stays in the RC** — it is *pending coordination* and is not touched by anything below.
> Source of the new facts: findings relayed by the owner from the session "תיקון כשלים במנגנון קבוע" (branch `claude/sod1820-ci-failures-diagnosis-6z9ej6`), which checked DEF-012 against the RC. Their conclusions were **not re-verified against the live DB in this step** (no SQL allowed). The earlier read-only audit evidence of 6.11 (register DEF-012) is consistent with them.

## 1. What is established

| # | Fact | Basis |
|---|---|---|
| 1 | `DEF-012` (3 lines in `src/lib/supabase.js`, `logView`) stops the public build from *sending* the `page_views` insert; it does **not** close the write on the server. | other session + code (`src/lib/supabase.js:2235`) |
| 2 | `page_views` still has an anonymous INSERT policy `pv_insert` with `WITH CHECK (true)`. | other session; audit of 6.11 (register DEF-012: anon holds `INSERT`, `pv_insert`, `WITH CHECK true`, 98,541 rows, last row 2026-11-06 03:19Z, ≈ up to 7/hour) |
| 3 | The only thing that makes the browser get a 403 is the **public-reading request worker** (`public-reading-deploy/transport.js`, allow-list does not contain `rest/v1/page_views`). That is a transport rule, not a database control: any client holding the public anon key and talking to PostgREST directly is not subject to it. | `transport.js`; rows kept arriving on 6.11 although the worker denies the write |
| 4 | DEF-012 does not conflict with the other session's work or with PR #1259. Recommendation: keep it in the RC as is. | other session |
| 5 | "`page_views` collection is broken" is a **separate analytics problem** (no replacement mechanism decided). It is not fixed or decided here. | other session |

## 2. Callers / consumers (repository evidence)

**Writers**

| Path | Where | State |
|---|---|---|
| Browser insert `supabase.from("page_views").insert({kind, ref})` | `src/lib/supabase.js` `logView` (only writer in `src/`, `api/`, `public-reading-deploy/`, `supabase/functions/`) | Single call site: `src/pages/Post2029Page.jsx:145` (`void logView("post", post.slug)`). Skipped for bots (`sideEffectAllowed("page_views")`) and, with DEF-012, skipped in the public build. |
| SQL writers (trigger, function, policy, DDL) | **none in the repository** — the table, its RLS and the `pv_insert` policy exist only in the live DB | cannot be reviewed from git; needs a live read-only snapshot (see §5) |

**Readers**

| Reader | Where | Active caller |
|---|---|---|
| `hot_posts_live(days, lim)` — SECURITY DEFINER, `kind='post'`, window by `created_at` | `supabase/migrations/20261103175116_public_s2_guarded_readers.sql` | `getHotPostsLive` in `src/lib/supabase.js` has **no caller** in `src/` or `api/`, and the public-reading RPC allow-list does not contain it → no live 2029 consumer found |
| `view_count(p_kind, p_ref, p_days)` | wrapper `getViewCount` in `src/lib/supabase.js`; the SQL definition is **not in the repo** (live DB only), so what it reads is unverified | **no caller** found |
| `admin_infra_load` (admin-only) | `supabase/migrations/20260808_admin_infra_load.sql` → `getInfraLoad` in `src/lib/visits.js` | admin infrastructure panel (daily `pv` series) |
| `admin_journey_funnel` (admin-only) | function body is **not in the repo** (live DB only) → `getJourneyFunnel` in `src/lib/supabase.js` | admin journey funnel |
| `fn_ti_session_*`, traffic-intelligence v6, `g3_2029_analytics_one_tree`, web-vitals RUM | repo SQL shows `page_views` there is a **CTE/column alias** over `events`, not this table | docs list them as readers (`docs/2029-data-placement-retention-crosswalk.md:71`); the SQL in git does not support that — flagged as doc drift, live function bodies not re-read |
| Direct client SELECT | none; `src/lib/supabase.js:807` states the table is blocked for SELECT by RLS | not re-verified live |

Classification already in the repo: `page_views` = `OPERATIONAL_RUNTIME` (`traffic_intelligence_law v11`), "operational only" (`20261001073844_g3_canonical_data_inventory_projection_v1.sql`). Guard tests that mention it: `test/bot-read-no-side-effect.test.mjs`, `test/bot-read-sink-guard.test.mjs`, `test/def012-page-views-public-build.test.mjs`, `tests/world2029-release.spec.cjs` (it only blocks the request in a browser test).

**Net:** the 2029 frontend has exactly one writer (post page, now a no-op in the public build) and no public reader. The live consumers of the data are two admin dashboards. Public effect of the data is limited to `hot_posts_live`, which nothing in the active product calls.

## 3. Risk

| Aspect | Assessment |
|---|---|
| Confidentiality | none known — SELECT is blocked by RLS (per code comment; not re-verified live). Rows hold `kind`, `ref`, timestamp (no e-mail/visitor id in the written columns). |
| Integrity | anyone with the public anon key can insert arbitrary `(kind, ref)` rows → can skew `hot_posts_live` ranking and the two admin dashboards. |
| Availability / cost | unbounded anonymous row growth (98,541 rows on 6.11, no write validation, no rate control). |
| S2 acceptance (`docs/2029-security-hardening-gate-plan-v1.md`, Stage S2) | falls under "intended public writes have explicit validation, bounded side effects and abuse/rate controls". It is **not** an authorization gap that exposes data, so it is a *scheduled non-blocking item with an owner* unless a dashboard owner says the data is relied on. |
| Proposed severity | **P2** (integrity/abuse, no confidentiality impact). |

## 4. S2 inventory entry (paste into the S2 inventory owned by the other session)

> No file named "S2 inventory" exists in the RC, on `main` or on the other session's branch (its S2 row is in `docs/reviews/ci-gate-completion-20261107/09-obligations-and-evidence-20261107.md`, branch-only). This entry is therefore kept here for that session to copy; the other session's branch was not touched.

| Field | Value |
|---|---|
| Object | `public.page_views` — table, RLS policy `pv_insert` |
| Class | PUBLIC_WRITE (unvalidated) — table is `OPERATIONAL_RUNTIME` |
| Gap | anon `INSERT … WITH CHECK (true)`; no validation of `kind`/`ref`, no per-caller bound, no rate control |
| Mitigation in place | client no longer sends the write in the public build (DEF-012, RC only, not merged); public worker denies the path (transport rule, not a DB control) |
| Consumers | writer: `logView` ← `Post2029Page.jsx:145`; readers: `hot_posts_live` (no caller), `view_count` (no caller), `admin_infra_load`, `admin_journey_funnel` (admin) |
| Open dependency | analytics session: no replacement collection mechanism decided |
| Severity / blocking | P2 · non-blocking for cutover unless an owner depends on the data |
| Decision needed | choose R1 / R2 / R3 below; DB change = separate explicit approval |
| Evidence | register DEF-012 (6.11 audit), this file |

## 5. Remediation options (proposal — not applied)

**R1 — close the anonymous write (recommended once the analytics session confirms no hidden writer).**
Revoke direct INSERT from `anon`/`authenticated` and drop `pv_insert`. No replacement writer is needed *now*: the 2029 build does not write the table and the stated forward telemetry family is `events`/Traffic (`audits/g3-implementation-compaction/…ARCHIVE_GATE_V1.md` item 12). If the analytics session later wants page-view counting again, it should arrive as a validated, bounded RPC (kind allow-list, `ref` length cap, per-visitor/IP cap) — a separate decision.

Effects:
* `logView` in a non-public build gets a permission error; it is inside `try {…} catch {}`, so no UI effect.
* `hot_posts_live`, `view_count` and the two admin series stop growing after the change (they would read the frozen history). No active public caller; admin panels show a flat tail.
* Nothing is deleted: existing 98k+ rows remain readable by the SECURITY DEFINER readers.

**R2 — keep the write, make it bounded.** Replace `WITH CHECK (true)` by a check (`kind` in an allow-list, `char_length(ref) <= 200`, `created_at` defaulted server-side) and add a size/rate guard (trigger or RPC-only path). More moving parts; still lets a determined caller write plausible rows; only worth it if page views must keep being collected from clients.

**R3 — accept and schedule.** Document the risk with an owner and a date. Not recommended: leaves the ranking/dashboard inputs writable by anyone.

## 6. Rollback (R1)

R1 deletes no data, so rollback is restoring the access, not the rows.
1. **Before** applying (separate approval): take a read-only snapshot of `pg_policies` and `information_schema.role_table_grants` for `public.page_views`, plus the table's RLS flags and any grants on its sequence. The rollback script is generated from that snapshot so it restores the *exact* roles — the policy's `TO` list and the grant list above are **not known from the repo** and are not guessed here.
2. Rollback shape (to be completed from the snapshot):
   ```sql
   -- ROLLBACK for R1 (template — fill roles from the pre-change snapshot)
   create policy pv_insert on public.page_views for insert to <roles from snapshot> with check (true);
   grant insert on public.page_views to <roles from snapshot>;
   -- sequence/identity grants only if the snapshot shows any
   ```
3. Trigger for rollback: any unexpected writer reported by monitoring (PostgREST 401/403 on `page_views` from a first-party client) in the first 24 h.

## 7. Test plan (throwaway PostgreSQL only, like the DEF-001/004/005 suites)

* Fixture: table + RLS + `pv_insert` as in the pre-change snapshot; roles `anon`, `authenticated`, `service_role`.
* After R1: `anon` and `authenticated` INSERT fails; `service_role` and the SECURITY DEFINER readers still work; `hot_posts_live` returns rows from the historical fixture; admin readers unaffected.
* After rollback: anon INSERT succeeds again (negative control).
* JS: `test/def012-page-views-public-build.test.mjs` unchanged and still green; add a contract test that no first-party client other than `logView` writes `page_views`.

## 8. Not done / needs approval

* No SQL, ACL or RLS change; no live snapshot taken in this step.
* The R1/R2/R3 choice, the live snapshot, and the DB change each need explicit approval; R1 also needs the analytics session's confirmation that no other writer exists.
* DEF-012 stays exactly as is until the analytics session answers.
