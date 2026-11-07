# Correction — `fn_log_name_research` IS created by a repository migration

> **Documentation correction in the RC only.** The branch `claude/sod1820-ci-failures-diagnosis-6z9ej6` (HEAD `f9d55248e`) was **not** changed; its document 08 is quoted, not edited. No SQL, DB, Storage, CI or Preview action was taken.
> Requested by the owner after an update from the failure-correction session. Verified against the file on `main` (`cfda877a1`) and in the RC.

## 1. The claim being corrected

Document 08 (`docs/reviews/ci-gate-completion-20261107/08-retirement-plan-fn-log-name-research.md`, §6, "Definitions") states: *"Neither definition is created by any migration in the repository, so the text must be committed to the repository when stage 2 is approved."*

## 2. What the repository actually contains

File: `supabase/migrations/20260728_namelab_quality_log.sql` (in `origin/main` at `cfda877a1`; first introduced by `2195c9784`, "Legacy: merge 80% estimated build meter (#1166)", 2026-10-26; sha256 prefix `7bc0b52276de004f`).

| Object | What the file does |
|---|---|
| `public.name_research_log` | `create table if not exists …` (identity PK, `created_at`, name text/length/language, three booleans, track counters, `elapsed_ms`, `track_status jsonb`); `alter table … enable row level security` with **no policy** (comment: "server-only; written via the definer RPC"); index `nrl_created` on `created_at desc` |
| `public.fn_log_name_research(p_doc jsonb, p_ms int default null)` | `create or replace function … returns void language sql security definer set search_path=public`; a single `insert … select … where coalesce(p_doc#>>'{input,components,full}','') <> ''`; **`grant execute … to anon, authenticated`** |
| `public.fn_name_research_stats(p_days int default 30)` | `create or replace function … stable security definer set search_path=public`; reads `name_research_log`; **`grant execute … to authenticated`**; the body contains no admin check (only the grant limits it) |

No other migration or proposed SQL in the repository defines or alters these three objects. (`supabase/proposed/20261106131000_def005_revoke_internal_rpcs_from_clients.sql` — this RC — only *mentions* `fn_log_name_research` in a comment, listing it as deliberately kept public.)

**Likely reason it was missed (not confirmed):** the filename uses an 8-digit date prefix (`20260728_…`) instead of the usual 14-digit timestamp; 72 migration files in the tree use that shape, so a search for timestamp-shaped names would skip them.

## 3. Corrected statement for document 08 (to be applied by its owner)

> The table `public.name_research_log`, the writer `public.fn_log_name_research(jsonb, integer)` and the reader `public.fn_name_research_stats(integer)` are created by `supabase/migrations/20260728_namelab_quality_log.sql`. The ACLs in that file (`anon, authenticated` on the writer; `authenticated` on the reader) are consistent with the live ACL captured on 7.11.2026 (`{=X, postgres=X, anon=X, authenticated=X}` and `{=X, postgres=X, authenticated=X}`): the `=X` entry is the default PUBLIC EXECUTE that function creation gives and that the file never revokes. **Whether the live function bodies still equal the file is not verified** — comparing them needs a read-only `pg_get_functiondef` against the file and is a separate step.

## 4. Consequences for the retirement plan (08) and the retention proposal (07)

| Item | Effect |
|---|---|
| "Commit the definitions to the repository at stage 2" | **Not needed** for the original text: it is already in git. What is needed is a *drift check* — live definition (md5 captured in 08) vs this file — before relying on either as the rollback source. If they differ, the live text wins and the file should be updated in the same approved step. |
| Rollback artifacts (§6 of 08) | The ACL restore statements are consistent with the file's `grant` lines. The function text can be restored from git (`git show cfda877a1:supabase/migrations/20260728_namelab_quality_log.sql`) *if* the drift check shows equality. |
| Retirement stages | A later repository change (revoke / drop) should be a **new** migration; it must not edit `20260728_…` in place. |
| Privacy of historical rows | unchanged: the table keeps up to 80 characters of the searched name per row (`left(…,80)`); the retention proposal (07) still applies. |

## 5. A related observation for the same plan (to be checked by its owner)

Document 08 names `NameMultiSearch` → `logNameResearch` as the only caller and describes the old calling page as having left service on 4.11. In the RC / `main` tree the caller is still mounted by the 2029 calculator: `CommunityCalculator2029Page.jsx` renders `CommunityCalculatorPage`, which renders `<NameMultiSearch name={deepName} hideInput />` under `{!babyMode && deepName && …}` (`src/pages/CommunityCalculatorPage.jsx:776-783`; the call is `src/components/NameMultiSearch.jsx:386`; the RPC call is `src/lib/supabase.js:3993`, wrapped in `.then(() => {}, () => {})`). The public-reading worker's allow-lists do **not** contain `fn_log_name_research` (searched `public-reading-deploy/*.js`), which is consistent with the zero gateway calls reported in 08 — so the call is prevented by the transport rule, not by the code being gone. After a stage-2 revoke the client call would fail silently, as it does today in the public build. Not verified here: whether the deep-name panel can be reached in the public release, and what a non-public build sends.

## 6. What was and was not done

* Done: read the migration, grepped the repository for the three objects and for their callers, compared with the quoted claim in 08.
* Not done: any live comparison of function bodies, any SQL, any change to the other session's branch.
