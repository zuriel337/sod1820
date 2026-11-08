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

## 5. Call chain of `fn_log_name_research` (read-only check, 7.11.2026) — replaces an earlier, wrong version of this section

The first version of this section said the caller "is still mounted by the 2029 calculator". **That was wrong**: it was inferred from imports without reading the `passive` prop. Corrected chain, read from the RC tree (`cfda877a1` base):

| Step | Evidence |
|---|---|
| The RPC is called only by `logNameResearch` | `src/lib/supabase.js:3990-3994` (`fire-and-forget`, errors swallowed); no other caller of the RPC in `src/`, `api/`, `supabase/functions/`, `public-reading-deploy/` |
| `logNameResearch` is called only after a successful research result | `src/components/NameMultiSearch.jsx:386`, after `getNameMulti(w)` (which calls the RPC `fn_name_research_graded`) returned a document; `if (!d) { setPhase("err"); return; }` runs first |
| `NameMultiSearch` has exactly one importer | `src/pages/CommunityCalculatorPage.jsx:17`, rendered at lines 776-783 only under `{!babyMode && deepName && …}` |
| `deepName` is set in exactly one place | `CommunityCalculatorPage.jsx:316` — `useEffect(() => { if (passive) return undefined; … setDeepName(name1.trim()) … })`; initial value `""` |
| `CommunityCalculatorPage` has exactly one importer, and it always passes `passive` | `src/pages/CommunityCalculator2029Page.jsx:3` and `:269` (`<CommunityCalculatorPage … passive actionsLocked=… />`), route `/community/calculator` (`src/App2029.jsx:331`) |

**Result:** in the 2029 tree `deepName` stays `""`, so the deep-name research panel ("🔬 מחקר מעמיק על «…»") is **never rendered**, `NameMultiSearch` is never mounted, `getNameMulti` and `logNameResearch` are never called. The chain is dead code in the product.

**Second, independent barrier:** neither `fn_name_research_graded` nor `fn_log_name_research` is in the public-reading worker's allow-lists (`public-reading-deploy/transport.js:11-20`; searched `public-reading-deploy/*.js`). The worker admits named RPCs with explicit body checks and answers other operations with `public_reading_operation_denied` (the same mechanism the audit observed for `page_views`); I read the POST branch up to line ~440, not every path.

**Accessibility of the public research panel (read-only answer):** not accessible in the product as built — not because it is hidden by a flag but because the only mounting condition (`deepName`) can never become true while `passive` is set. The route `/community/calculator` itself exists; the edge allow-list contains the `/community` prefix (`route-legitimacy.js:20`); I did not test the exact path or run a browser.

**Consistency with doc 08:** its conclusion "no live caller; 0 gateway calls since 4.11" is supported. Its stated *reason* ("the Legacy page that called it left service") is incomplete — the 2029 tree still contains the caller code, which is unreachable. That matters for stage 2 of the retirement plan: removing `NameMultiSearch`/`logNameResearch` becomes a pure dead-code removal, while the ACL revoke has no client impact.

**Not verified:** runtime behaviour in a browser; old cached client bundles from before 4.11 (the gateway count in doc 08 covers them from 4.11 only).

## 6. What was and was not done

* Done: read the migration, grepped the repository for the three objects and for their callers, compared with the quoted claim in 08.
* Not done: any live comparison of function bodies, any SQL, any change to the other session's branch.
