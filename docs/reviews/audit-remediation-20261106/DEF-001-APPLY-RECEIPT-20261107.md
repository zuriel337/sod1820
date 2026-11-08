# DEF-001 Migration A — applied to the Production database (receipt, 7.11.2026)

**Approved by ZURIEL for this migration only.** Scope respected: no DEF-028, no DEF-001b, no code change, no merge, no deployment, no other DB object touched.

## What was applied

* Migration registered in the database history as `20261107233659 def001_revoke_resolve_visitor_email` (Supabase project `linswmnnkjxvweumprav`), executed in one transaction by the Supabase `apply_migration` tool (`{"success":true}`).
* SQL = the file `supabase/proposed/20261106120000_def001_revoke_resolve_visitor_email.sql`, byte-for-byte as tested (sha256 `483dad92e0924fd7edbf57e88fb345109a577618a615c0d8101546283b5654f3`, identical in the working tree and at git HEAD; unchanged since the test runs). Statements: `revoke all … from public`, `revoke all … from anon, authenticated`, `grant execute … to service_role`, `alter function … set search_path = ''` on `public.resolve_visitor_email(text, text)`; `create or replace` of `public.notification_prefs_guest_get_v1(text)` and `public.notification_prefs_guest_save_v1(text, text[], text[], text, text, boolean, timestamptz, boolean)` (no longer return the stored address; add `has_email`).

## Checked BEFORE applying

| Check | Result |
| --- | --- |
| Migration file == tested version | sha256 above; `git status` clean for it, its rollback and the test; no commit touched it after the test runs |
| Live DB == the state the migration/rollback were written against | `guest_get_v1` and `guest_save_v1` live bodies are identical to the rollback file's bodies (whitespace-insensitive md5 `38b11594…` / `1d3cadd7…`); `resolve_visitor_email` ACL null (default PUBLIC), `search_path=public`; one overload each; same signatures and owner `postgres` |
| Rollback available and equal to the live pre-change state | `supabase/proposed/ROLLBACK_20261106120000_def001.sql` (tested in the DEF-001 suite) |
| No UI impact | no caller of `saveNotificationPrefs`, no reader of `.email` from the guest get result (main and RC); only the DB dependent is `els_analytics` |
| Pre-state fingerprints | `els_analytics(30)`: total 107, `with_email` 3; guest prefs (4 UUID-shaped readable visitor ids): 1 returned an e-mail, fingerprint of the rows without e-mail `1c0e3b60147dd5b84dfb05c9a02a9655` |

## Checked IMMEDIATELY AFTER applying

| Check | Result |
| --- | --- |
| Live bodies == the migration's bodies | `guest_get_v1` md5(no whitespace) `95ad7865…` = migration; `guest_save_v1` `4342aca4…` = migration |
| ACL / config | `resolve_visitor_email`: ACL `{postgres=X, service_role=X}`, `search_path=""`, anon false, authenticated false, service_role true; guest RPCs: ACL unchanged (`{postgres, anon}`), one overload each |
| **anon, SQL** | `resolve_visitor_email` by uid and by visitor id → `42501 permission denied for function resolve_visitor_email` |
| **authenticated, SQL** | same `42501` |
| **Public REST API, anon key only** (random non-existent ids) | both call styles → **HTTP 401**, `{"code":"42501","message":"permission denied for function resolve_visitor_email"}` (before: HTTP 200) |
| **service_role** | resolves 25 of 25 user ids and 13 of 13 guest ids (counts only) |
| **`els_analytics(30)` as the real admin** | total 107, `with_email` **3** — identical to before; a non-admin is still rejected (`not authorized`) |
| **Guest preferences** (anon, real data) | the rows are unchanged: fingerprint without e-mail `1c0e3b60147dd5b84dfb05c9a02a9655` (identical); e-mails returned **1 → 0**; `has_email` true on that row |
| Guest save/get round trip (synthetic visitor, rolled back) | topics/channels/intensity preserved; `email: null`, `has_email: true`; the address is still stored internally for mailing; invalid identity still rejected (`bad visitor identity`); nothing persisted (0 leftover rows; `notification_prefs` e-mail counts unchanged: guests 13, users 223) |

**Note on the wording of the request:** `notification_prefs_guest_get_v1` is *not* denied to anon (no 401/403): the guest UI needs it. Migration A closes it by no longer returning the address (`email: null`). Revoking it would break guest preferences and was out of scope.

Pre-existing behaviour, unchanged by this migration: `notification_prefs_guest_save_v1` overwrites the stored address with whatever `p_email` is sent (including none). No UI code calls it.

## Rollback (not executed)

`supabase/proposed/ROLLBACK_20261106120000_def001.sql` — restores the execute grants for public/anon/authenticated, `search_path = public`, and the two guest functions' previous bodies. Run it only if a legitimate flow breaks and cannot be fixed forward (it restores the exposure it removed).

## What stays open

DEF-001b (visitor ids and user UUIDs remain readable by anon; step 1 then step 2 after the RC is deployed), DEF-028, the other proposals, the RC merge and deployment: each still needs its own approval. E-mail addresses reachable before this change (21 of 21 sampled user UUIDs and 1 guest) must be treated as having been exposed to anyone holding the public key; gateway logs for 5–7.11 show no abuse, older logs were not examined.
