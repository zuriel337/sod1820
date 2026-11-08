# P0 approval package — DEF-001 (e-mail exposure)

> **Status update 7.11.2026: Migration A was approved and APPLIED to Production (migration `20261107233659`); see [`DEF-001-APPLY-RECEIPT-20261107.md`](DEF-001-APPLY-RECEIPT-20261107.md). Migration B (DEF-001b) is still NOT applied.** The text below is the pre-approval package.
> **Original status: awaiting ZURIEL's point approval. Nothing below had been applied.** Branch `claude/sod1820-audit-remediation-g93w32`.
> Everything in this file is verified read-only against production and by the throw-away PostgreSQL suites `tests/sql/def001*.sql` (run by `scripts/run-def001-sql-test.sh` and by CI job `security-sql-contracts`).

## 1. What is being closed

| Path | Exposure (reachable with the public anon key) | Closed by |
|---|---|---|
| 1 | `resolve_visitor_email(p_visitor, p_uid)` returns `users.email` / `notification_prefs.email` for any UUID or visitor id | Migration A |
| 2 | `notification_prefs_guest_get_v1` / `_save_v1` echo the saved e-mail for a visitor id; visitor ids are readable in `push_subscriptions`, `feedback`, `els_records` | Migration A (stop echoing) + Migration B (stop exposing the ids) |

## 2. Final SQL

### Migration A — `supabase/proposed/20261106120000_def001_revoke_resolve_visitor_email.sql`
```sql
-- DEF-001 (P0) - e-mail exposure to the `anon` role. Two independent exposure paths are closed here.
--
-- Path 1: public.resolve_visitor_email(p_visitor text, p_uid text) is SECURITY DEFINER, has no caller check and
--   carried the default PUBLIC EXECUTE privilege. With the public anon key anyone could pass a user UUID (p_uid)
--   or a guest visitor id (p_visitor) and receive the matching e-mail address.
-- Path 2: public.notification_prefs_guest_get_v1 / _save_v1 treat the guest visitor id as a secret and return the
--   saved e-mail for it, but visitor ids are readable by anon in push_subscriptions, feedback and els_records.
--   Closing path 1 alone would leave "read a visitor id -> call the guest RPC -> get the e-mail".
--
-- Verified before writing this file: nothing in src/, api/, public-reading-deploy/ or supabase/functions
-- references resolve_visitor_email; the only SQL dependent (els_analytics) is admin-guarded SECURITY DEFINER and
-- runs as the owner, so it is unaffected by the revoke. No UI consumer reads `email` from the guest prefs RPCs
-- (WatchButton, SystemFrame2029, CommunityPersonalActions2029 use topics/channels/intensity only).
-- The visitor-id enumeration itself is handled separately (DEF-001b, two-step rollout).
--
-- NOT applied by this repository change. Apply only with explicit ZURIEL approval (production DB change).

-- Part A: server-side only.
revoke all on function public.resolve_visitor_email(text, text) from public;
revoke all on function public.resolve_visitor_email(text, text) from anon, authenticated;
grant execute on function public.resolve_visitor_email(text, text) to service_role;
alter function public.resolve_visitor_email(text, text) set search_path = '';

-- Part B: the guest preference RPCs stop returning the stored address (it stays stored and still receives
-- mail). `has_email` tells the UI that one is saved. Signature, ownership and grants are unchanged.
create or replace function public.notification_prefs_guest_get_v1(p_visitor text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_out jsonb;
begin
  if auth.uid() is not null then
    raise exception 'guest endpoint';
  end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad visitor identity';
  end if;

  select jsonb_build_object(
    'topics', np.topics,
    'channels', np.channels,
    'email', null,
    'has_email', coalesce(np.email, '') <> '',
    'intensity', np.intensity,
    'muted_until', np.muted_until
  )
  into v_out
  from public.notification_prefs np
  where np.user_id is null
    and np.visitor_id = v_vis;

  return v_out;
end
$function$;

create or replace function public.notification_prefs_guest_save_v1(
  p_visitor text,
  p_topics text[] default '{}'::text[],
  p_channels text[] default '{}'::text[],
  p_email text default null::text,
  p_intensity text default null::text,
  p_set_intensity boolean default false,
  p_muted_until timestamp with time zone default null::timestamp with time zone,
  p_set_muted_until boolean default false
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_topics text[] := coalesce(p_topics, '{}'::text[]);
  v_channels text[] := coalesce(p_channels, '{}'::text[]);
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_out jsonb;
begin
  if auth.uid() is not null then
    raise exception 'guest endpoint';
  end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad visitor identity';
  end if;
  if cardinality(v_topics) > 100
     or exists (select 1 from unnest(v_topics) t where btrim(t) = '' or length(t) > 160) then
    raise exception 'invalid topics';
  end if;
  if cardinality(v_channels) > 8
     or exists (select 1 from unnest(v_channels) c where btrim(c) = '' or length(c) > 32) then
    raise exception 'invalid channels';
  end if;
  if v_email is not null and length(v_email) > 320 then
    raise exception 'invalid email';
  end if;
  if p_set_intensity and (p_intensity is null or length(p_intensity) > 32) then
    raise exception 'invalid intensity';
  end if;

  insert into public.notification_prefs(
    user_id, visitor_id, topics, channels, email, intensity, muted_until
  ) values (
    null, v_vis, v_topics, v_channels, v_email,
    case when p_set_intensity then p_intensity else 'normal' end,
    case when p_set_muted_until then p_muted_until else null end
  )
  on conflict (visitor_id) do update
    set topics = excluded.topics,
        channels = excluded.channels,
        email = excluded.email,
        intensity = case
          when p_set_intensity then excluded.intensity
          else public.notification_prefs.intensity
        end,
        muted_until = case
          when p_set_muted_until then excluded.muted_until
          else public.notification_prefs.muted_until
        end,
        updated_at = now()
    where public.notification_prefs.user_id is null
  returning jsonb_build_object(
    'topics', topics,
    'channels', channels,
    'email', null,
    'has_email', coalesce(email, '') <> '',
    'intensity', intensity,
    'muted_until', muted_until
  ) into v_out;

  if v_out is null then
    raise exception 'visitor identity unavailable';
  end if;
  return v_out;
end
$function$;
```

### Migration B (step 1) — `supabase/proposed/20261106121000_def001b_visitor_id_exposure_step1.sql`
```sql
-- DEF-001b (step 1 of 2) - stop guest visitor ids (bearer-style identifiers used by the guest notification RPCs and
-- watch_toggle) from being readable by clients. Companion of 20261106120000_def001_revoke_resolve_visitor_email.sql.
--
-- Exposure found in the audit: `visitor_id` is readable by anon in public.push_subscriptions (policy ps_anon_select),
-- public.feedback (policy feedback_public_read = true) and public.els_records (table-level SELECT). A visitor id is enough
-- to call notification_prefs_guest_save_v1 / watch_toggle for that guest.
--
-- Step 1 (this file) is backward compatible and safe to apply before any frontend deployment:
--   * feedback: no reader exists in src/, api/ or supabase/functions; only administrators keep read access.
--   * els_records: every reader selects an explicit column list that never contains visitor_id; the table-level SELECT
--     is replaced by a column grant that excludes it (service_role and the owner are unaffected).
--   * push_subscriptions: ADDS the two SECURITY DEFINER RPCs the client will use. Table access is NOT touched here.
-- Step 2 (supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql) removes the anon table access and
-- must only be applied AFTER the frontend that calls these RPCs (src/lib/push.js) is live.
--
-- NOT applied by this repository change. Apply only with explicit ZURIEL approval (production DB change).

-- feedback: administrators only.
drop policy if exists feedback_public_read on public.feedback;
create policy feedback_admin_read on public.feedback for select to authenticated
  using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
revoke select on public.feedback from anon;

-- els_records: every column except visitor_id stays readable under the existing row policies.
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'els_records' and column_name <> 'visitor_id';
  if cols is null then raise exception 'els_records not found'; end if;
  execute 'revoke select on public.els_records from anon, authenticated';
  execute format('grant select (%s) on public.els_records to anon, authenticated', cols);
end $$;

-- push_subscriptions: write path through RPCs (the browser can then lose direct table access in step 2).
create or replace function public.push_subscription_upsert_v1(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_topics text[] default null,
  p_user_agent text default null,
  p_visitor text default null
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_endpoint text := btrim(coalesce(p_endpoint, ''));
  v_visitor text := nullif(lower(btrim(coalesce(p_visitor, ''))), '');
  v_topics text[] := coalesce(p_topics, '{}'::text[]);
begin
  if v_endpoint !~ '^https://' or length(v_endpoint) > 2048 then raise exception 'invalid endpoint'; end if;
  if length(coalesce(p_p256dh, '')) not between 1 and 512 or length(coalesce(p_auth, '')) not between 1 and 512 then
    raise exception 'invalid keys';
  end if;
  if v_visitor is not null and v_visitor !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'bad visitor identity';
  end if;
  if cardinality(v_topics) > 100 or exists (select 1 from unnest(v_topics) t where btrim(t) = '' or length(t) > 160) then
    raise exception 'invalid topics';
  end if;

  insert into public.push_subscriptions (endpoint, p256dh, auth, user_id, visitor_id, topics, user_agent, last_seen)
  values (v_endpoint, p_p256dh, p_auth, v_uid, case when v_uid is null then v_visitor end, v_topics,
          left(p_user_agent, 512), now())
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_id = excluded.user_id,
        visitor_id = excluded.visitor_id,
        topics = excluded.topics,
        user_agent = excluded.user_agent,
        last_seen = excluded.last_seen
    where public.push_subscriptions.user_id is null or public.push_subscriptions.user_id = v_uid;
end
$function$;

create or replace function public.push_subscription_delete_v1(p_endpoint text) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from public.push_subscriptions
  where endpoint = btrim(coalesce(p_endpoint, ''))
    and (user_id is null or user_id = auth.uid());
end
$function$;

revoke all on function public.push_subscription_upsert_v1(text, text, text, text[], text, text) from public;
revoke all on function public.push_subscription_delete_v1(text) from public;
grant execute on function public.push_subscription_upsert_v1(text, text, text, text[], text, text) to anon, authenticated, service_role;
grant execute on function public.push_subscription_delete_v1(text) to anon, authenticated, service_role;
```

### Migration B (step 2) — `supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql` (only after the frontend release)
```sql
-- DEF-001b (step 2 of 2) - PROPOSED, not in supabase/migrations on purpose.
-- Precondition: step 1 is applied AND the frontend that uses push_subscription_upsert_v1 / push_subscription_delete_v1
-- (src/lib/push.js) is live. Applying this earlier breaks anonymous Web Push subscribe / unsubscribe.
-- After this, visitor_id, endpoint and the push keys of anonymous subscribers are no longer readable by clients.
-- Rollback: re-create the four ps_anon_* policies and `grant select, insert, update, delete ... to anon`.

drop policy if exists ps_anon_select on public.push_subscriptions;
drop policy if exists ps_anon_insert on public.push_subscriptions;
drop policy if exists ps_anon_update on public.push_subscriptions;
drop policy if exists ps_anon_delete on public.push_subscriptions;
revoke all on public.push_subscriptions from anon;
```

## 3. Impact on the existing system (what could break, and the evidence it does not)

| Area | Could it break? | Evidence |
|---|---|---|
| **Notifications / e-mail sending** | No | Senders read `notification_prefs` directly with the **service role** (`send-push`, newsletter and WhatsApp functions: deployed source read for 25 functions, repo copy for the rest — `docs/audit-evidence/20261106/edge-deps.md`); the stored address is **not touched** by any statement. `resolve_visitor_email` has **no** caller in `src/`, `api/`, `public-reading-deploy/`, `supabase/functions/`, middleware, cron or any view/policy/trigger; the one SQL dependent (`els_analytics`) is admin-guarded SECURITY DEFINER and runs as owner (proved in the SQL test, section 4). |
| **User preferences (guest)** | No functional change | Guest get/save keep signature, grants, validation and storage. Only the response no longer contains the address: `email: null`, `has_email: true/false`. The three UI consumers (`WatchButton`, `SystemFrame2029`, `CommunityPersonalActions2029`) read topics/channels/intensity only (`test/def001-email-exposure-contract.test.mjs` fails if any reads `prefs.email`). Signed-in users use `notification_prefs` directly (own row, unchanged). |
| **Follow / watch** | No | `watch_toggle` / `follow_subject_*` untouched. |
| **Push subscribe / unsubscribe** | Behaviour unchanged in production | The public-reading request worker already denies this write today (it is not on the worker allow-list), so production push subscription never worked through this path; the code now calls the new RPCs, which keep working in Preview/test builds that allow writes. Step 2 is applied only after the frontend that uses the RPCs is live. |
| **`els_records` readers** | No | Every reader selects an explicit column list without `visitor_id` (`src/lib/elsMatrices.js`, `publicLibraryContinuity2029.js`, `contributorPublicationCatalog.js`, `api/sitemap.js`, `api/og.js`); the SQL function `fn_els_for_name` (INVOKER, anon-callable) reads explicit columns; `els_matrix_reading_job_*`, `els_search_page_v1`, `els_verify_occurrence_v1` do not use `visitor_id`; `save_els_matrix_anon` is SECURITY DEFINER (owner rights). Deployed edge functions: no `select=*` on the table (25 read; 68 UNKNOWN for deployed source → repo copy clean). |
| **`feedback`** | No | No reader in `src/`, `api/`, `supabase/functions/`; written through the `record_feedback` RPC (SECURITY DEFINER). Admins keep read access through the new policy. |
| **Cron / scheduled jobs** | No | Run as `postgres`. |
| **Admin tools** | No | They read with the admin session; `feedback_admin_read` keeps that, `els_records` admin screens do not select `visitor_id` (grep). |

**Residual risks (honest list):** (1) 68 of 93 deployed edge functions were verified from the repository copy only — four are deployed-only (`claude-raziel`, `els-live-reading`, `noop`, `wa-groups-list`) and were read; drift between repo and deployed code for the others is UNKNOWN. (2) A third-party client outside this repository using `resolve_visitor_email` or reading `els_records.visitor_id` with the anon key would stop working — none exists in the repo, Vercel project or edge functions we can see. (3) Future columns added to `els_records` need an explicit column grant to anon/authenticated (documented in the migration).

## 4. Order of application (each production step needs your explicit "apply")

1. **Pre-check (read-only, 1 min):** run `scripts/sql/audit_email_exposure_v1.sql` and save the output; take the Supabase advisor snapshot.
2. **Apply Migration A** (`…120000`). Seconds; transactional; locks only the three functions.
3. **Verify (read-only):** anon call to `resolve_visitor_email` → `42501 permission denied`; guest get for a **test** visitor id returns `email:null, has_email`; the home/community pages load; `WatchButton` follow works for a guest in a browser.
4. **Apply Migration B step 1** (`…121000`). Seconds; `els_records` privilege swap is one transaction (no window without access).
5. **Verify:** `https://sod1820.co.il/gallery`, `/codes`, a `/codes/<slug>` page, a cipher page, `/community` render; sitemap still builds (`/sitemap.xml` 200); anon REST `select=visitor_id` on `feedback` / `els_records` → permission denied; `select=id,slug,title` on `els_records` → rows.
6. **Release the frontend** containing the `push.js` RPC calls (separate approval for merge + deploy).
7. **Apply step 2** (`supabase/proposed/…121500`) only after step 6 is live.
8. **Post-check:** rerun `audit_email_exposure_v1.sql` (expected 0 rows) and the advisor; compare with the pre-check.

## 5. Rollback

* Migration A → `supabase/proposed/ROLLBACK_20261106120000_def001.sql` (restores the PUBLIC grant, `search_path=public`, and the exact previous guest RPC bodies).
* Migration B (both steps) → `supabase/proposed/ROLLBACK_20261106121000_def001b.sql`.
* Both rollbacks are **executed inside the SQL test** against the fixture and the test asserts the pre-change behaviour is back. No data is modified by either migration, so no data restore is needed.

```sql
-- ROLLBACK A
-- Rollback of 20261106120000_def001_revoke_resolve_visitor_email.sql. Restores the exact pre-change behaviour (including the exposure it removed):
-- apply only if the change breaks a legitimate flow that cannot be fixed forward. Definitions below are the production ones captured 2026-11-06.
grant execute on function public.resolve_visitor_email(text, text) to public, anon, authenticated;
alter function public.resolve_visitor_email(text, text) set search_path = public;

create or replace function public.notification_prefs_guest_get_v1(p_visitor text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_out jsonb;
begin
  if auth.uid() is not null then raise exception 'guest endpoint'; end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'bad visitor identity'; end if;
  select jsonb_build_object('topics', np.topics, 'channels', np.channels, 'email', np.email, 'intensity', np.intensity, 'muted_until', np.muted_until)
  into v_out from public.notification_prefs np where np.user_id is null and np.visitor_id = v_vis;
  return v_out;
end
$function$;

create or replace function public.notification_prefs_guest_save_v1(
  p_visitor text, p_topics text[] default '{}'::text[], p_channels text[] default '{}'::text[], p_email text default null::text,
  p_intensity text default null::text, p_set_intensity boolean default false,
  p_muted_until timestamp with time zone default null::timestamp with time zone, p_set_muted_until boolean default false
) returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_vis text := lower(btrim(coalesce(p_visitor, '')));
  v_topics text[] := coalesce(p_topics, '{}'::text[]);
  v_channels text[] := coalesce(p_channels, '{}'::text[]);
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_out jsonb;
begin
  if auth.uid() is not null then raise exception 'guest endpoint'; end if;
  if v_vis !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'bad visitor identity'; end if;
  if cardinality(v_topics) > 100 or exists (select 1 from unnest(v_topics) t where btrim(t) = '' or length(t) > 160) then raise exception 'invalid topics'; end if;
  if cardinality(v_channels) > 8 or exists (select 1 from unnest(v_channels) c where btrim(c) = '' or length(c) > 32) then raise exception 'invalid channels'; end if;
  if v_email is not null and length(v_email) > 320 then raise exception 'invalid email'; end if;
  if p_set_intensity and (p_intensity is null or length(p_intensity) > 32) then raise exception 'invalid intensity'; end if;
  insert into public.notification_prefs(user_id, visitor_id, topics, channels, email, intensity, muted_until)
  values (null, v_vis, v_topics, v_channels, v_email, case when p_set_intensity then p_intensity else 'normal' end, case when p_set_muted_until then p_muted_until else null end)
  on conflict (visitor_id) do update
    set topics = excluded.topics, channels = excluded.channels, email = excluded.email,
        intensity = case when p_set_intensity then excluded.intensity else public.notification_prefs.intensity end,
        muted_until = case when p_set_muted_until then excluded.muted_until else public.notification_prefs.muted_until end,
        updated_at = now()
    where public.notification_prefs.user_id is null
  returning jsonb_build_object('topics', topics, 'channels', channels, 'email', email, 'intensity', intensity, 'muted_until', muted_until) into v_out;
  if v_out is null then raise exception 'visitor identity unavailable'; end if;
  return v_out;
end
$function$;
```
```sql
-- ROLLBACK B
-- Rollback of 20261106121000_def001b_visitor_id_exposure_step1.sql (and, if it was applied, of the step-2 lockdown). Restores the pre-change grants/policies.
-- Step-2 rollback (only if the lockdown file was applied):
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'ps_anon_select') then
    create policy ps_anon_select on public.push_subscriptions for select to anon using (user_id is null);
    create policy ps_anon_insert on public.push_subscriptions for insert to anon with check (user_id is null);
    create policy ps_anon_update on public.push_subscriptions for update to anon using (user_id is null) with check (user_id is null);
    create policy ps_anon_delete on public.push_subscriptions for delete to anon using (user_id is null);
    grant select, insert, update, delete on public.push_subscriptions to anon;
  end if;
end $$;
-- Step-1 rollback:
drop policy if exists feedback_admin_read on public.feedback;
create policy feedback_public_read on public.feedback for select using (true);
grant select on public.feedback to anon;
revoke select on public.els_records from anon, authenticated;
grant select on public.els_records to anon, authenticated;
drop function if exists public.push_subscription_upsert_v1(text, text, text, text[], text, text);
drop function if exists public.push_subscription_delete_v1(text);
```

## 6. Proof matrix (anon / authenticated / authorized) — `tests/sql/def001_visitor_email_exposure_v1.sql`, `…def001b…`

| Actor | Action | Before | After | Test section |
|---|---|---|---|---|
| anon | `resolve_visitor_email(uid)` / `(visitor)` | returns e-mail | `42501` | baseline, 2 |
| authenticated | same | returns e-mail | `42501` | 2 |
| service_role | same | works | works | 3 |
| admin (SECURITY DEFINER dependent) | `els_analytics`-style call | works | works | 4 |
| non-admin | same dependent | `forbidden` | `forbidden` | 4 |
| anon | guest prefs get/save | e-mail echoed | topics/channels/intensity intact, e-mail never in payload, `has_email` | 5 |
| service role | stored address | present | present, unchanged | 5 |
| anon | `visitor_id` of `feedback` / `els_records` / `push_subscriptions` | readable | `42501` | def001b |
| anon | public `els_records` columns | readable | readable | def001b |
| anon | push upsert / update / delete via RPC; cannot take over an account-owned endpoint | n/a | works / denied | def001b |
| authenticated | push upsert binds to `auth.uid()`, ignores a supplied visitor id | n/a | yes | def001b |

Negative control: with the migration skipped the same suite fails at "anon can still execute".
