# E-mail exposure — focused read-only verification (7.11.2026)

Scope requested: verify read-only whether `resolve_visitor_email`, `legacy_top_pages` and the two SECURITY DEFINER views really allow unauthorized access; show permissions and exposure routes; give the exact fixing SQL with its effect on anonymous, signed-in and internal callers; show tests that prove the block and the preserved legitimate access. **Nothing was applied to Production.** All live checks were SELECT-only (role-simulated inside rolled-back transactions) or a public API call with a random, non-existent id. No e-mail address was printed, copied or stored: queries returned counts and booleans only.

## 1. Verdict

| Component | Real unauthorized access? | Severity | Fix |
| --- | --- | --- | --- |
| `public.resolve_visitor_email(text, text)` | **YES — verified.** Any caller holding only the public anon key obtains a user's e-mail by user UUID, or a guest's e-mail by visitor id | **P0** | DEF-001 migration A (exists, tested) |
| `public.notification_prefs_guest_get_v1(text)` (same chain, found while verifying) | **YES — verified.** Echoes the stored e-mail for a visitor id; visitor ids are readable by anon | **P0** (same fix) | DEF-001 migration A part B + DEF-001b |
| `public.legacy_top_pages(integer)` | **No e-mail.** Returns archived Jetpack page titles and view counts that the table's own public policy already exposes; an unused client-callable endpoint | P3 (hygiene) | DEF-028 part A (new) |
| view `public.redirect_map` | **No bypass.** Returns exactly the rows anon/authenticated can already read from `posts`; columns `wp_id, slug, target_path` only | lint only | DEF-028 part B (new, no behaviour change) |
| view `public.topic_cards_public` | **No e-mail; intentional door.** anon has no table privilege on `topic_cards`; the view filters approved + not `_do_not_publish`; `created_by` holds author labels (13 values, none with `@`) | accepted by design | none (keep SECURITY DEFINER); test pins it |

## 2. Permissions and exposure routes (live, read-only)

| Object | Owner / type | ACL as found | anon | authenticated | service_role |
| --- | --- | --- | --- | --- | --- |
| `resolve_visitor_email(text,text)` | postgres, SECURITY DEFINER, `search_path=public` | **null (default: PUBLIC execute)** | EXECUTE | EXECUTE | EXECUTE |
| `legacy_top_pages(integer)` | postgres, SECURITY DEFINER | `{=X, postgres=X, authenticated=X, anon=X}` | EXECUTE | EXECUTE | EXECUTE |
| `notification_prefs_guest_get_v1(text)` | postgres, SECURITY DEFINER | `{postgres=X, anon=X}` | EXECUTE | no | no |
| view `redirect_map` | postgres, no `security_invoker` | `anon=rm, authenticated=rm, service_role=all` | SELECT | SELECT | SELECT |
| view `topic_cards_public` | postgres, `security_barrier=true` | same | SELECT | SELECT | SELECT |

* **`resolve_visitor_email` body (no caller check, four lookup branches):** `users.email` by `p_uid`; `notification_prefs.email` by `p_visitor`; `users.email` through `notification_prefs.user_id`; `users.email` through `push_subscriptions.user_id`.
* **How an attacker gets the identifier (verified as role `anon`):** the same anon key can read 11 distinct visitor ids (from 3 `push_subscriptions` rows, 9 `feedback` rows and `els_records`; `feedback_public_read` is `using true`) and 21 distinct user UUIDs (`contributors`, `els_finds`, `push_subscriptions`, `authorized_uploaders`, `contribution_links`, `gematria_words`, `word_aliases`).
* **Measured, executed as `anon` in a rolled-back transaction, counts only:** from the 11 visitor ids → **1 e-mail** through `resolve_visitor_email` and the same 1 through `notification_prefs_guest_get_v1`; from the 21 user UUIDs → **21 of 21 resolve to a distinct e-mail**. No address was displayed.
* **Black-box proof over the public REST API** (anon publishable key only, no login, random UUID so no personal data could come back): `POST /rest/v1/rpc/resolve_visitor_email` → **HTTP 200** (reachable; `null` for the random id); `POST /rpc/legacy_top_pages` → HTTP 200, rows `{title, views}`; `GET /redirect_map` and `/topic_cards_public` → HTTP 200 with the columns listed above.
* **No email-named column is directly readable by anon** in any public table or view (checked via `has_column_privilege`): the exposure is only through the two SECURITY DEFINER functions above. Of nine anon-executable SECURITY DEFINER functions whose body reads e-mail, four (`admin_users_overview`, `admin_els_to_dossier`, `merge_els_variant`, `credit_purchase_pending`) contain a caller/admin check (not individually audited here), three are trigger functions (not callable through the API), and two have none: the ones above.
* **Who legitimately uses them (so we know what a revoke can break):** `resolve_visitor_email` — no repository code (guard test `def001-email-exposure-contract`), no view, cron job, trigger or Edge-function log line; the only DB dependent is `els_analytics(integer)` (SECURITY DEFINER, owner postgres, admin check `users.role='admin'`), which runs as the owner and is unaffected. API gateway logs for 5–7.11: one `curl/8.5.0` call on 6.11 (consistent with the earlier audit's own verification; not individually confirmed) and today's three probes from this session; no browser and no Edge function. `legacy_top_pages` — client wrapper `getLegacyTopPages` has no caller (removed on the RC); no DB/Edge/cron use; only my probe in the logs. `redirect_map` — no repository, DB or log consumer except my probe.

## 3. Exact SQL

### 3.1 DEF-001 (P0): `supabase/proposed/20261106120000_def001_revoke_resolve_visitor_email.sql` (unchanged, tested)

```sql
revoke all on function public.resolve_visitor_email(text, text) from public;
revoke all on function public.resolve_visitor_email(text, text) from anon, authenticated;
grant execute on function public.resolve_visitor_email(text, text) to service_role;
alter function public.resolve_visitor_email(text, text) set search_path = '';
-- + create or replace of notification_prefs_guest_get_v1 / _save_v1: the response no longer carries the address
--   ('email', null, 'has_email', coalesce(np.email,'') <> ''); signature, ownership, grants and every other line unchanged.
```
I diffed the migration's two function bodies against the live definitions read today: they are identical except for the e-mail line and the added `has_email` key. Rollback: `ROLLBACK_20261106120000_def001.sql`.

### 3.2 DEF-001b: `20261106121000_def001b_visitor_id_exposure_step1.sql` (+ step 2 after the frontend is live)
Stops anon from reading visitor ids: drops `feedback_public_read` (admin-only read policy instead), replaces `els_records` table SELECT by a column grant without `visitor_id`, adds the `push_subscription_upsert_v1/delete_v1` RPCs; step 2 (`…121500_def001b_push_subscriptions_lockdown.sql`) removes anon table access to `push_subscriptions` **only after** the RC code that calls the RPCs is live (`supabase/proposed/APPLY-BEFORE-DEPLOY.json`).

### 3.3 DEF-028 (new, P3): `supabase/proposed/20261107120000_def028_legacy_top_pages_and_redirect_map.sql`

```sql
revoke all on function public.legacy_top_pages(integer) from public;
revoke all on function public.legacy_top_pages(integer) from anon, authenticated;
grant execute on function public.legacy_top_pages(integer) to service_role;   -- search_path stays 'public' (the body uses an unqualified table)
alter view public.redirect_map set (security_invoker = true);
-- topic_cards_public: deliberately unchanged
```
Rollback: `ROLLBACK_20261107120000_def028.sql` (grant back to public/anon/authenticated; `security_invoker = false`).

## 4. Effect by caller

| Caller | DEF-001 (+001b) | DEF-028 |
| --- | --- | --- |
| **Anonymous visitor / crawler** | `resolve_visitor_email` → `permission denied` (was: returns e-mail). Guest preference RPCs keep working but return `email: null` + `has_email: true/false`; the address stays stored and still receives mail. No page reads the address (WatchButton, SystemFrame2029, CommunityPersonalActions2029 use topics/channels/intensity). After 001b: visitor ids no longer listable | `legacy_top_pages` → `permission denied` (no caller). `redirect_map` and `topic_cards_public`: **identical rows and columns** |
| **Signed-in member** | `resolve_visitor_email` → `permission denied`; nothing in the member UI used it; own e-mail still comes from the member's own `users` row under RLS | same as anonymous; `redirect_map` returns the same 1,291 rows (verified live under role `authenticated`) |
| **Admin session** | `els_analytics(integer)` keeps working: it is SECURITY DEFINER owned by postgres, so the nested call runs with the owner's rights; a non-admin is still rejected by its own check | none |
| **service_role / server code / Edge functions** | still EXECUTE and resolve (the mailing side) | still EXECUTE; bypasses RLS as before |

## 5. Tests (run by me on a throwaway local PostgreSQL 16; never against the live database)

* Existing: `scripts/run-def001-sql-test.sh` (`SOD_SQL_TEST_SOCKET_DIR` mode) → DEF-001, DEF-001b, DEF-004, DEF-005, DEF-003 **all PASS**. DEF-001 proves, with synthetic data: baseline shows both exposure paths; after the migration anon and authenticated are denied on both call styles; service_role still resolves; the admin-guarded dependent keeps working and a non-admin stays rejected; the guest RPCs keep the UI contract and never echo the address while the address is still stored; invalid identities are still rejected; a repository audit query finds no client-executable, caller-check-free e-mail reader; the rollback restores the old behaviour. CI job `security-sql-contracts` already runs these.
* New: `tests/sql/def028_legacy_top_pages_and_views_v1.sql` → **PASS**. It proves: baseline anon can call `legacy_top_pages`; after the migration anon and authenticated are denied, service_role still gets the aggregated rows; `redirect_map` shows each of anon/authenticated/service_role exactly the rows it saw before, never a draft or an incomplete row, and a *stricter* posts policy now binds the view too; `topic_cards_public` shows only the approved, publishable card, has no e-mail-like column or value, stays `security_barrier`, and `topic_cards` itself stays unreadable to anon/authenticated; the rollback restores the old state.
* Mutation checks on the new test (each must fail it): revoke only from anon; no `ALTER VIEW`; service_role loses EXECUTE; `topic_cards_public` also switched to invoker (breaks anonymous topic reads: `permission denied for table topic_cards`). One test assertion was NULL-unsafe and was fixed after the second mutation survived it.
* Not wired into CI or into `run-def001-sql-test.sh` (no CI expansion was requested); wiring the new file is a one-line change in that runner.

## 6. Verification after an approved apply (SELECT-only)

```sql
select has_function_privilege('anon','public.resolve_visitor_email(text,text)','EXECUTE')   -- expect false
     , has_function_privilege('authenticated','public.resolve_visitor_email(text,text)','EXECUTE')  -- expect false
     , has_function_privilege('service_role','public.resolve_visitor_email(text,text)','EXECUTE')   -- expect true
     , coalesce(public.notification_prefs_guest_get_v1(<a visitor id>)->>'email','') = ''            -- expect true (as anon)
     , has_function_privilege('anon','public.legacy_top_pages(integer)','EXECUTE');                  -- expect false
```
and the same black-box call as in section 2 (random UUID) must now return HTTP 401/403/404 instead of 200.

## 7. Recommendation and what stays open

1. **Apply DEF-001 migration A first** (alone, the smallest change that closes the verified e-mail leak: no deploy needed, no frontend dependency, rollback ready). Then 001b step 1, then deploy the RC, then 001b step 2.
2. Treat DEF-028 as a separate, optional hygiene step; it carries no e-mail risk.
3. Open after the fix: the **user UUIDs and visitor ids themselves** stay readable by anon (pseudonymous identifiers; 001b removes the visitor-id sources only); `feedback` rows with visitor ids are public until 001b; `legacy_traffic` has a public read policy (public traffic statistics, owner decision); the advisor lint for `topic_cards_public` will remain by design.
4. If you want, the e-mails of the 21 users and 1 guest that were reachable should be treated as exposed to anyone with the public key until the fix is live (no evidence of abuse in the 5–7.11 gateway logs; older logs were not examined).
