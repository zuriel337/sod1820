-- @@ table public.direct_messages
create table public.direct_messages (
  id uuid not null default gen_random_uuid(),
  from_user uuid not null,
  to_user uuid not null,
  body text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint direct_messages_pkey PRIMARY KEY (id)
);
-- @@ table public.notification_prefs
create table public.notification_prefs (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  visitor_id text,
  email text,
  topics text[] not null default '{}'::text[],
  channels text[] not null default '{}'::text[],
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  intensity text not null default 'normal'::text,
  muted_until timestamp with time zone,
  constraint notification_prefs_pkey PRIMARY KEY (id)
);
-- @@ table public.page_views
create table public.page_views (
  id bigint generated always as identity not null,
  kind text not null,
  ref text not null,
  created_at timestamp with time zone not null default now(),
  constraint page_views_pkey PRIMARY KEY (id)
);
-- @@ table public.push_subscriptions
create table public.push_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  visitor_id text,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  topics text[] not null default '{}'::text[],
  user_agent text,
  created_at timestamp with time zone not null default now(),
  last_seen timestamp with time zone not null default now(),
  constraint push_subscriptions_endpoint_key UNIQUE (endpoint),
  constraint push_subscriptions_pkey PRIMARY KEY (id)
);
-- @@ table public.user_activity
create table public.user_activity (
  id bigint generated always as identity not null,
  user_id uuid not null default auth.uid(),
  kind text not null,
  ref text,
  title text,
  created_at timestamp with time zone not null default now(),
  constraint user_activity_pkey PRIMARY KEY (id)
);
-- @@ table public.user_notifications
create table public.user_notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  email text not null,
  kind text not null default 'general'::text,
  title text not null,
  body text,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  source_topic text,
  source_ref text,
  channels_sent text[] not null default '{}'::text[],
  dedupe_key text,
  constraint user_notifications_pkey PRIMARY KEY (id)
);
-- @@ table public.users
create table public.users (
  id uuid not null default gen_random_uuid(),
  email text not null,
  username text,
  role text default 'user'::text,
  created_at timestamp with time zone default now(),
  display_name text,
  avatar_url text,
  tier text not null default 'free'::text,
  is_researcher boolean not null default false,
  senior_level integer not null default 0,
  community_moderator boolean not null default false,
  last_seen_at timestamp with time zone,
  constraint users_email_key UNIQUE (email),
  constraint users_pkey PRIMARY KEY (id),
  constraint users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text]))),
  constraint users_tier_check CHECK ((tier = ANY (ARRAY['free'::text, 'member'::text])))
);
-- @@ fk public.notification_prefs.notification_prefs_user_id_fkey
alter table public.notification_prefs add constraint notification_prefs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- @@ fk public.push_subscriptions.push_subscriptions_user_id_fkey
alter table public.push_subscriptions add constraint push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- @@ fk public.user_notifications.user_notifications_user_id_fkey
alter table public.user_notifications add constraint user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- @@ fk public.users.users_id_fkey
alter table public.users add constraint users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- @@ index public.direct_messages.dm_from_idx
CREATE INDEX dm_from_idx ON public.direct_messages USING btree (from_user, to_user, created_at DESC);
-- @@ index public.direct_messages.dm_to_idx
CREATE INDEX dm_to_idx ON public.direct_messages USING btree (to_user, from_user, created_at DESC);
-- @@ index public.notification_prefs.notification_prefs_user_uidx
CREATE UNIQUE INDEX notification_prefs_user_uidx ON public.notification_prefs USING btree (user_id);
-- @@ index public.notification_prefs.notification_prefs_visitor_uidx
CREATE UNIQUE INDEX notification_prefs_visitor_uidx ON public.notification_prefs USING btree (visitor_id);
-- @@ index public.page_views.page_views_created_idx
CREATE INDEX page_views_created_idx ON public.page_views USING btree (created_at);
-- @@ index public.page_views.page_views_kind_ref_idx
CREATE INDEX page_views_kind_ref_idx ON public.page_views USING btree (kind, ref);
-- @@ index public.push_subscriptions.push_subscriptions_user_idx
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions USING btree (user_id);
-- @@ index public.user_activity.user_activity_time_idx
CREATE INDEX user_activity_time_idx ON public.user_activity USING btree (created_at DESC);
-- @@ index public.user_activity.user_activity_user_time_idx
CREATE INDEX user_activity_user_time_idx ON public.user_activity USING btree (user_id, created_at DESC);
-- @@ index public.user_notifications.uq_user_notifications_dedupe
CREATE UNIQUE INDEX uq_user_notifications_dedupe ON public.user_notifications USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL);
-- @@ index public.user_notifications.user_notifications_email_idx
CREATE INDEX user_notifications_email_idx ON public.user_notifications USING btree (lower(email), created_at DESC);
-- @@ index public.user_notifications.user_notifications_user_idx
CREATE INDEX user_notifications_user_idx ON public.user_notifications USING btree (user_id, created_at DESC);
-- @@ index public.users.users_last_seen_at_idx
CREATE INDEX users_last_seen_at_idx ON public.users USING btree (last_seen_at DESC) WHERE (last_seen_at IS NOT NULL);
-- @@ rls public.direct_messages
alter table public.direct_messages enable row level security;
-- @@ rls public.notification_prefs
alter table public.notification_prefs enable row level security;
-- @@ rls public.page_views
alter table public.page_views enable row level security;
-- @@ rls public.push_subscriptions
alter table public.push_subscriptions enable row level security;
-- @@ rls public.user_activity
alter table public.user_activity enable row level security;
-- @@ rls public.user_notifications
alter table public.user_notifications enable row level security;
-- @@ rls public.users
alter table public.users enable row level security;
-- @@ policy public.direct_messages.dm_participant_read
create policy dm_participant_read on public.direct_messages as PERMISSIVE for SELECT to public using (((from_user = auth.uid()) OR (to_user = auth.uid())));
-- @@ policy public.notification_prefs.np_auth_delete
create policy np_auth_delete on public.notification_prefs as PERMISSIVE for DELETE to authenticated using ((user_id = auth.uid()));
-- @@ policy public.notification_prefs.np_auth_insert
create policy np_auth_insert on public.notification_prefs as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));
-- @@ policy public.notification_prefs.np_auth_select
create policy np_auth_select on public.notification_prefs as PERMISSIVE for SELECT to authenticated using ((user_id = auth.uid()));
-- @@ policy public.notification_prefs.np_auth_update
create policy np_auth_update on public.notification_prefs as PERMISSIVE for UPDATE to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
-- @@ policy public.page_views.pv_insert
create policy pv_insert on public.page_views as PERMISSIVE for INSERT to anon, authenticated with check (true);
-- @@ policy public.push_subscriptions.ps_auth_delete
create policy ps_auth_delete on public.push_subscriptions as PERMISSIVE for DELETE to authenticated using ((user_id = auth.uid()));
-- @@ policy public.push_subscriptions.ps_auth_insert
create policy ps_auth_insert on public.push_subscriptions as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));
-- @@ policy public.push_subscriptions.ps_auth_select
create policy ps_auth_select on public.push_subscriptions as PERMISSIVE for SELECT to authenticated using ((user_id = auth.uid()));
-- @@ policy public.push_subscriptions.ps_auth_update
create policy ps_auth_update on public.push_subscriptions as PERMISSIVE for UPDATE to authenticated using ((user_id = auth.uid())) with check ((user_id = auth.uid()));
-- @@ policy public.user_activity.ua_insert_own
create policy ua_insert_own on public.user_activity as PERMISSIVE for INSERT to authenticated with check ((user_id = auth.uid()));
-- @@ policy public.user_activity.ua_select_own
create policy ua_select_own on public.user_activity as PERMISSIVE for SELECT to authenticated using ((user_id = auth.uid()));
-- @@ policy public.user_notifications.un_owner_read
create policy un_owner_read on public.user_notifications as PERMISSIVE for SELECT to authenticated using (((user_id = auth.uid()) OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '\x00'::text)))));
-- @@ policy public.user_notifications.un_owner_update
create policy un_owner_update on public.user_notifications as PERMISSIVE for UPDATE to authenticated using (((user_id = auth.uid()) OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '\x00'::text))))) with check (((user_id = auth.uid()) OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), '\x00'::text)))));
-- @@ policy public.users.users_select_public
create policy users_select_public on public.users as PERMISSIVE for SELECT to public using (true);
-- @@ policy public.users.users_update_own
create policy users_update_own on public.users as PERMISSIVE for UPDATE to public using ((id = auth.uid())) with check ((id = auth.uid()));
-- @@ function public.dm_inbox()
CREATE OR REPLACE FUNCTION public.dm_inbox()
 RETURNS TABLE(counterpart uuid, name text, avatar text, last_body text, last_at timestamp with time zone, unread bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (select auth.uid() uid),
  msgs as (
    select case when d.from_user = (select uid from me) then d.to_user else d.from_user end as cp,
           d.body, d.created_at, d.to_user, d.read_at
    from direct_messages d
    where d.from_user = (select uid from me) or d.to_user = (select uid from me)
  ),
  latest as (select distinct on (cp) cp, body, created_at from msgs order by cp, created_at desc)
  select l.cp,
         coalesce(nullif(u.display_name,''), nullif(u.username,''), 'משתמש'),
         u.avatar_url, l.body, l.created_at,
         (select count(*) from msgs m where m.cp = l.cp and m.to_user = (select uid from me) and m.read_at is null)
  from latest l left join users u on u.id = l.cp
  order by l.created_at desc;
$function$
;
-- @@ function public.dm_send(p_to uuid, p_body text)
CREATE OR REPLACE FUNCTION public.dm_send(p_to uuid, p_body text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); v_id uuid; v_body text;
begin
  if uid is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
  if p_to is null or p_to = uid then return jsonb_build_object('ok',false,'error','bad_recipient'); end if;
  if not exists (select 1 from users where id = p_to) then return jsonb_build_object('ok',false,'error','no_such_user'); end if;
  v_body := nullif(btrim(p_body),'');
  if v_body is null then return jsonb_build_object('ok',false,'error','empty'); end if;
  if length(v_body) > 4000 then return jsonb_build_object('ok',false,'error','too_long'); end if;
  insert into direct_messages(from_user, to_user, body) values (uid, p_to, v_body) returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end $function$
;
-- @@ function public.dm_thread(p_with uuid, p_limit integer)
CREATE OR REPLACE FUNCTION public.dm_thread(p_with uuid, p_limit integer DEFAULT 60)
 RETURNS SETOF direct_messages
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  update direct_messages set read_at = now()
   where to_user = uid and from_user = p_with and read_at is null;
  return query
    select * from direct_messages d
     where (d.from_user = uid and d.to_user = p_with) or (d.from_user = p_with and d.to_user = uid)
     order by d.created_at asc
     limit greatest(1, least(coalesce(p_limit,60), 200));
end $function$
;
-- @@ function public.notify_on_dm()
CREATE OR REPLACE FUNCTION public.notify_on_dm()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if NEW.to_user is not null and NEW.to_user is distinct from NEW.from_user then
    insert into public.user_notifications (user_id, email, kind, title, body, link)
    select NEW.to_user, lower(u.email), 'dm',
           'הודעה פרטית חדשה ✉️',
           left(coalesce(NEW.body,''),90),
           '/me?tab=messages&dm=' || NEW.from_user::text
    from public.users u where u.id = NEW.to_user;
  end if;
  return NEW;
end $function$
;
-- @@ function public.push_subscription_delete_v1(p_endpoint text)
CREATE OR REPLACE FUNCTION public.push_subscription_delete_v1(p_endpoint text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.push_subscriptions
  where endpoint = btrim(coalesce(p_endpoint, ''))
    and (user_id is null or user_id = auth.uid());
end
$function$
;
-- @@ function public.push_subscription_upsert_v1(p_endpoint text, p_p256dh text, p_auth text, p_topics text[], p_user_agent text, p_visitor text)
CREATE OR REPLACE FUNCTION public.push_subscription_upsert_v1(p_endpoint text, p_p256dh text, p_auth text, p_topics text[] DEFAULT NULL::text[], p_user_agent text DEFAULT NULL::text, p_visitor text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
-- @@ function public.view_count(p_kind text, p_ref text, p_days integer)
CREATE OR REPLACE FUNCTION public.view_count(p_kind text, p_ref text, p_days integer DEFAULT 7)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select count(*)::bigint from public.page_views
  where kind = p_kind and ref = p_ref and created_at > now() - make_interval(days => p_days);
$function$
;
-- @@ trigger public.direct_messages.trg_dm_notify
CREATE TRIGGER trg_dm_notify AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION notify_on_dm();
-- @@ trigger public.notification_prefs.trg_np_new_follower
CREATE TRIGGER trg_np_new_follower AFTER INSERT OR UPDATE OF topics ON public.notification_prefs FOR EACH ROW EXECUTE FUNCTION notify_on_new_follower();
-- @@ trigger public.user_notifications.trg_user_notification_wa_project
CREATE TRIGGER trg_user_notification_wa_project AFTER INSERT ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION fn_user_notification_wa_project();
-- @@ tablegrant public.direct_messages
grant SELECT on public.direct_messages to authenticated;
grant DELETE on public.direct_messages to service_role;
grant INSERT on public.direct_messages to service_role;
grant REFERENCES on public.direct_messages to service_role;
grant SELECT on public.direct_messages to service_role;
grant TRIGGER on public.direct_messages to service_role;
grant TRUNCATE on public.direct_messages to service_role;
grant UPDATE on public.direct_messages to service_role;
-- @@ tablegrant public.notification_prefs
grant DELETE on public.notification_prefs to authenticated;
grant INSERT on public.notification_prefs to authenticated;
grant SELECT on public.notification_prefs to authenticated;
grant UPDATE on public.notification_prefs to authenticated;
grant DELETE on public.notification_prefs to service_role;
grant INSERT on public.notification_prefs to service_role;
grant REFERENCES on public.notification_prefs to service_role;
grant SELECT on public.notification_prefs to service_role;
grant TRIGGER on public.notification_prefs to service_role;
grant TRUNCATE on public.notification_prefs to service_role;
grant UPDATE on public.notification_prefs to service_role;
-- @@ tablegrant public.page_views
grant INSERT on public.page_views to anon;
grant INSERT on public.page_views to authenticated;
grant DELETE on public.page_views to service_role;
grant INSERT on public.page_views to service_role;
grant REFERENCES on public.page_views to service_role;
grant SELECT on public.page_views to service_role;
grant TRIGGER on public.page_views to service_role;
grant TRUNCATE on public.page_views to service_role;
grant UPDATE on public.page_views to service_role;
-- @@ tablegrant public.push_subscriptions
grant DELETE on public.push_subscriptions to authenticated;
grant INSERT on public.push_subscriptions to authenticated;
grant SELECT on public.push_subscriptions to authenticated;
grant UPDATE on public.push_subscriptions to authenticated;
grant DELETE on public.push_subscriptions to service_role;
grant INSERT on public.push_subscriptions to service_role;
grant REFERENCES on public.push_subscriptions to service_role;
grant SELECT on public.push_subscriptions to service_role;
grant TRIGGER on public.push_subscriptions to service_role;
grant TRUNCATE on public.push_subscriptions to service_role;
grant UPDATE on public.push_subscriptions to service_role;
-- @@ tablegrant public.user_activity
grant INSERT on public.user_activity to authenticated;
grant SELECT on public.user_activity to authenticated;
grant DELETE on public.user_activity to service_role;
grant INSERT on public.user_activity to service_role;
grant REFERENCES on public.user_activity to service_role;
grant SELECT on public.user_activity to service_role;
grant TRIGGER on public.user_activity to service_role;
grant TRUNCATE on public.user_activity to service_role;
grant UPDATE on public.user_activity to service_role;
-- @@ tablegrant public.user_notifications
grant SELECT on public.user_notifications to authenticated;
grant DELETE on public.user_notifications to service_role;
grant INSERT on public.user_notifications to service_role;
grant REFERENCES on public.user_notifications to service_role;
grant SELECT on public.user_notifications to service_role;
grant TRIGGER on public.user_notifications to service_role;
grant TRUNCATE on public.user_notifications to service_role;
grant UPDATE on public.user_notifications to service_role;
-- @@ tablegrant public.users
grant DELETE on public.users to service_role;
grant INSERT on public.users to service_role;
grant REFERENCES on public.users to service_role;
grant SELECT on public.users to service_role;
grant TRIGGER on public.users to service_role;
grant TRUNCATE on public.users to service_role;
grant UPDATE on public.users to service_role;
-- @@ colgrant public.user_notifications
grant update (read_at) on public.user_notifications to authenticated;
-- @@ colgrant public.users
grant select (id, username, role, created_at, display_name, avatar_url, tier, is_researcher, senior_level, community_moderator, last_seen_at) on public.users to anon;
grant select (id, username, role, created_at, display_name, avatar_url, tier, is_researcher, senior_level, community_moderator, last_seen_at) on public.users to authenticated;
grant update (username, display_name, avatar_url) on public.users to authenticated;
-- @@ fngrant public.dm_inbox()
revoke all on function public.dm_inbox() from public;
grant execute on function public.dm_inbox() to authenticated;
-- @@ fngrant public.dm_send(p_to uuid, p_body text)
revoke all on function public.dm_send(p_to uuid, p_body text) from public;
grant execute on function public.dm_send(p_to uuid, p_body text) to authenticated;
-- @@ fngrant public.dm_thread(p_with uuid, p_limit integer)
revoke all on function public.dm_thread(p_with uuid, p_limit integer) from public;
grant execute on function public.dm_thread(p_with uuid, p_limit integer) to authenticated;
-- @@ fngrant public.notify_on_dm()
revoke all on function public.notify_on_dm() from public;
-- @@ fngrant public.push_subscription_delete_v1(p_endpoint text)
revoke all on function public.push_subscription_delete_v1(p_endpoint text) from public;
grant execute on function public.push_subscription_delete_v1(p_endpoint text) to anon;
grant execute on function public.push_subscription_delete_v1(p_endpoint text) to authenticated;
grant execute on function public.push_subscription_delete_v1(p_endpoint text) to service_role;
-- @@ fngrant public.push_subscription_upsert_v1(p_endpoint text, p_p256dh text, p_auth text, p_topics text[], p_user_agent text, p_visitor text)
revoke all on function public.push_subscription_upsert_v1(p_endpoint text, p_p256dh text, p_auth text, p_topics text[], p_user_agent text, p_visitor text) from public;
grant execute on function public.push_subscription_upsert_v1(p_endpoint text, p_p256dh text, p_auth text, p_topics text[], p_user_agent text, p_visitor text) to anon;
grant execute on function public.push_subscription_upsert_v1(p_endpoint text, p_p256dh text, p_auth text, p_topics text[], p_user_agent text, p_visitor text) to authenticated;
grant execute on function public.push_subscription_upsert_v1(p_endpoint text, p_p256dh text, p_auth text, p_topics text[], p_user_agent text, p_visitor text) to service_role;
-- @@ fngrant public.view_count(p_kind text, p_ref text, p_days integer)
revoke all on function public.view_count(p_kind text, p_ref text, p_days integer) from public;
grant execute on function public.view_count(p_kind text, p_ref text, p_days integer) to anon;
grant execute on function public.view_count(p_kind text, p_ref text, p_days integer) to authenticated;
-- @@ table private.edge_rate_limit_buckets
create table private.edge_rate_limit_buckets (
  key_hash text not null,
  bucket bigint not null,
  count integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint edge_rate_limit_buckets_count_check CHECK ((count >= 0)),
  constraint edge_rate_limit_buckets_key_hash_check CHECK ((key_hash ~ '^[0-9a-f]{64}$'::text)),
  constraint edge_rate_limit_buckets_pkey PRIMARY KEY (key_hash, bucket)
);
-- @@ table public.tanakh_stream
create table public.tanakh_stream (
  idx integer not null,
  ch text not null,
  book_idx smallint,
  constraint tanakh_stream_pkey PRIMARY KEY (idx)
);
-- @@ table public.torah_stream
create table public.torah_stream (
  idx integer not null,
  ch text not null,
  book_idx smallint,
  constraint torah_stream_pkey PRIMARY KEY (idx)
);
-- @@ index public.tanakh_stream.tanakh_stream_ch
CREATE INDEX tanakh_stream_ch ON public.tanakh_stream USING btree (ch, idx);
-- @@ index public.torah_stream.torah_stream_ch
CREATE INDEX torah_stream_ch ON public.torah_stream USING btree (ch, idx);
-- @@ rls public.tanakh_stream
alter table public.tanakh_stream enable row level security;
-- @@ rls public.torah_stream
alter table public.torah_stream enable row level security;
-- @@ policy public.torah_stream.torah_stream_read
create policy torah_stream_read on public.torah_stream as PERMISSIVE for SELECT to public using (true);
-- @@ function public.edge_rate_limit_check(p_key_hash text, p_window_seconds integer, p_limit integer)
CREATE OR REPLACE FUNCTION public.edge_rate_limit_check(p_key_hash text, p_window_seconds integer DEFAULT 300, p_limit integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_window integer := greatest(60, least(coalesce(p_window_seconds, 300), 3600));
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 120));
  v_bucket bigint;
  v_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rate-limit key';
  end if;

  v_bucket := floor(extract(epoch from clock_timestamp()) / v_window)::bigint;

  insert into private.edge_rate_limit_buckets(key_hash, bucket, count, updated_at)
  values (p_key_hash, v_bucket, 1, clock_timestamp())
  on conflict (key_hash, bucket)
  do update set
    count = private.edge_rate_limit_buckets.count + 1,
    updated_at = clock_timestamp()
  returning count into v_count;

  if random() < 0.01 then
    delete from private.edge_rate_limit_buckets
    where updated_at < clock_timestamp() - interval '2 hours';
  end if;

  return jsonb_build_object(
    'allowed', v_count <= v_limit,
    'count', v_count,
    'limit', v_limit,
    'window_seconds', v_window
  );
end;
$function$
;
-- @@ function public.els_stream_letters_v1(p_scope text)
CREATE OR REPLACE FUNCTION public.els_stream_letters_v1(p_scope text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_hi integer;
begin
  if p_scope = 'torah' then
    select max(idx) into v_hi from public.torah_stream;
  elsif p_scope = 'tanakh' then
    select max(idx) into v_hi from public.tanakh_stream;
  else
    raise exception 'unsupported ELS scope %', p_scope;
  end if;
  return v_hi;
end
$function$
;
-- @@ function public.els_stream_relation_v1(p_scope text)
CREATE OR REPLACE FUNCTION public.els_stream_relation_v1(p_scope text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case p_scope when 'torah' then 'torah_stream' when 'tanakh' then 'tanakh_stream' else null end
$function$
;
-- @@ function public.els_verify_batch_core_v1(p_scope text, p_term text, p_skip integer[], p_dir integer[], p_start integer[])
CREATE OR REPLACE FUNCTION public.els_verify_batch_core_v1(p_scope text, p_term text, p_skip integer[], p_dir integer[], p_start integer[])
 RETURNS TABLE(ord integer, ok boolean)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare
  v_rel text := public.els_stream_relation_v1(p_scope);
  v_sql text;
begin
  if v_rel is null then
    raise exception 'unsupported ELS scope %', p_scope;
  end if;
  v_sql := $q$
  with q as (
    select translate(regexp_replace(coalesce($1,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ') t
  ), qn as (
    select t, length(t) ln, (select max(idx) from public.@REL@) hi from q
  ), cand as (
    select u.ord::integer ord, u.skip, u.dir, u.st
    from unnest($2,$3,$4) with ordinality as u(skip,dir,st,ord)
  ), letters as (
    select c.ord, k.k, substr(qn.t,k.k+1,1) want,
           (select s.ch from public.@REL@ s where s.idx = c.st+1+c.dir*c.skip*k.k) got
    from cand c
    cross join qn
    cross join lateral generate_series(0,qn.ln-1) k(k)
    where qn.ln >= 2
      and c.skip >= 2 and c.dir in (-1,1) and c.st >= 0
      and c.st+1 between 1 and qn.hi
      and c.st+1+c.dir*c.skip*(qn.ln-1) between 1 and qn.hi
  )
  select c.ord,
         coalesce((select bool_and(l.got = l.want) from letters l where l.ord = c.ord), false)
  from cand c
  order by c.ord
  $q$;
  return query execute replace(v_sql, '@REL@', v_rel) using p_term, p_skip, p_dir, p_start;
end
$function$
;
-- @@ function public.els_verify_batch_v1(p_term text, p_scope text, p_corpus_id text, p_candidates jsonb, p_strategy jsonb)
CREATE OR REPLACE FUNCTION public.els_verify_batch_v1(p_term text, p_scope text, p_corpus_id text, p_candidates jsonb, p_strategy jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  c_max_candidates constant integer := 4000;
  c_max_letter_checks constant integer := 64000;
  v_raw text := coalesce(p_term,'');
  v_term text := translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_len integer := length(v_term);
  v_corpus_id text;
  v_n integer;
  v_skips integer[];
  v_dirs integer[];
  v_starts integer[];
  v_ords integer[];
  v_dep text;
  v_hits jsonb;
  v_rejected integer;
  v_invalid integer;
  v_unique integer;
  v_engine jsonb := jsonb_build_object('id','els-sql-core','version',2,'function','els_verify_batch_v1','owner','els_research_layer_law:v9');
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_verify_batch_v1','status','CORPUS_UNKNOWN','verification_state','NOT_TESTED');
  end if;
  v_corpus_id := public.fn_els_corpus_id(v_scope);
  -- corpus binding is checked BEFORE any coordinate verification (fail closed)
  if p_corpus_id is distinct from v_corpus_id then
    return jsonb_build_object('contract','els_verify_batch_v1','status','CORPUS_MISMATCH','verification_state','NOT_TESTED',
      'scope',v_scope,'corpus_id',v_corpus_id,'requested_corpus_id',p_corpus_id,'engine',v_engine);
  end if;
  if v_len < 2 or p_candidates is null or jsonb_typeof(p_candidates) <> 'array' then
    return jsonb_build_object('contract','els_verify_batch_v1','status','CONTEXT_REQUIRED','verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id,'engine',v_engine);
  end if;
  v_n := jsonb_array_length(p_candidates);
  if v_n > c_max_candidates then
    return jsonb_build_object('contract','els_verify_batch_v1','status','BUDGET_EXCEEDED','reason','max_candidates','limit',c_max_candidates,'verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id,'engine',v_engine);
  end if;

  -- dedupe exact (skip,dir,start) preserving first order; non-integer/absent members are counted invalid
  with raw as (
    select e.ord,
           case when jsonb_typeof(e.v->'skip')='number' and (e.v->>'skip') ~ '^-?[0-9]{1,9}$' then (e.v->>'skip')::integer end skip,
           case when jsonb_typeof(e.v->'dir')='number' and (e.v->>'dir') ~ '^-?[0-9]{1,2}$' then (e.v->>'dir')::integer end dir,
           case when jsonb_typeof(e.v->'start')='number' and (e.v->>'start') ~ '^-?[0-9]{1,9}$' then (e.v->>'start')::integer end st
    from jsonb_array_elements(p_candidates) with ordinality e(v,ord)
  ), valid as (
    select * from raw where skip >= 2 and dir in (-1,1) and st >= 0
  ), firsts as (
    select distinct on (skip,dir,st) ord, skip, dir, st from valid order by skip,dir,st,ord
  )
  select (select count(*) from raw where not (skip >= 2 and dir in (-1,1) and st >= 0) or skip is null or dir is null or st is null),
         count(*),
         array_agg(skip order by ord), array_agg(dir order by ord), array_agg(st order by ord), array_agg(ord order by ord)
    into v_invalid, v_unique, v_skips, v_dirs, v_starts, v_ords
  from firsts;

  v_unique := coalesce(v_unique,0);
  if v_unique * v_len > c_max_letter_checks then
    return jsonb_build_object('contract','els_verify_batch_v1','status','BUDGET_EXCEEDED','reason','max_letter_checks','limit',c_max_letter_checks,'verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id,'engine',v_engine);
  end if;

  v_dep := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':batch';

  with res as (
    select f.ord, f.skip, f.dir, f.st, r.ok
    from unnest(v_ords, v_skips, v_dirs, v_starts) with ordinality f(ord,skip,dir,st,o)
    join public.els_verify_batch_core_v1(v_scope, v_term, v_skips, v_dirs, v_starts) r on r.ord = f.o::integer
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||skip::text||':'||dir::text||':'||st::text,
           'skip',skip,'dir',dir,'direction',case when dir=1 then 'fwd' else 'back' end,
           'start',st,'end',st+dir*skip*(v_len-1),
           'positions',(select jsonb_agg(st+dir*skip*k order by k) from generate_series(0,v_len-1) k),
           'coordinate_convention','zero_based_character_index','dependency_group',v_dep||':skip'||skip::text,
           'verification_state','MATCH','input_ordinal',ord-1
         ) order by ord) filter (where ok),'[]'::jsonb),
         count(*) filter (where not ok)
    into v_hits, v_rejected
  from res;

  return jsonb_build_object(
    'contract','els_verify_batch_v1','status','OK',
    'scope',v_scope,'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'verified',v_hits,
    'counts',jsonb_build_object('received',v_n,'unique',v_unique,'duplicates',v_n-v_invalid-v_unique,'invalid',v_invalid,'verified',jsonb_array_length(v_hits),'mismatch',v_rejected,'letter_checks',v_unique*v_len),
    'limits',jsonb_build_object('max_candidates',c_max_candidates,'max_letter_checks',c_max_letter_checks),
    'strategy',p_strategy,
    'completion',jsonb_build_object('executed',true,'exhaustive',false,'negative_authority',false,
      'note','batch verifies supplied candidates only; an empty verified set is never NOT_FOUND / EXECUTED_EMPTY'),
    'engine',v_engine,
    'provenance',jsonb_build_object('source_relation','public.'||public.els_stream_relation_v1(v_scope),'verifier','els_verify_batch_core_v1','rule_version','els_research_layer_law:v9')
  );
end
$function$
;
-- @@ function public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer)
CREATE OR REPLACE FUNCTION public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_raw text := coalesce(p_term,'');
  v_term text := translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ');
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_len integer := length(v_term);
  v_corpus_id text := public.fn_els_corpus_id(v_scope);
  v_match boolean := false;
  v_dependency_group text;
begin
  if v_scope not in ('torah','tanakh') then
    return jsonb_build_object('contract','els_occurrence_replay_v1','status','CORPUS_UNKNOWN','verification_state','NOT_TESTED');
  end if;
  if v_len < 2 or coalesce(p_skip,0) < 2 or coalesce(p_dir,0) not in (-1,1) or coalesce(p_start,-1) < 0 then
    return jsonb_build_object('contract','els_occurrence_replay_v1','status','CONTEXT_REQUIRED','verification_state','NOT_TESTED','scope',v_scope,'corpus_id',v_corpus_id);
  end if;

  select coalesce(bool_or(r.ok),false) into v_match
  from public.els_verify_batch_core_v1(v_scope, v_term, array[p_skip], array[p_dir], array[p_start]) r;

  v_dependency_group := 'els:'||v_corpus_id||':'||encode(digest(v_term,'sha256'),'hex')||':skip'||p_skip::text;

  return jsonb_build_object(
    'contract','els_occurrence_replay_v1',
    'status',case when v_match then 'OK' else 'REPLAY_MISMATCH' end,
    'verification_state',case when v_match then 'MATCH' else 'MISMATCH' end,
    'scope',v_scope,'corpus_id',v_corpus_id,
    'input',jsonb_build_object('raw',v_raw,'normalized',v_term,'length',v_len),
    'occurrence',jsonb_build_object(
      'occurrence_id','els:'||v_corpus_id||':'||v_term||':'||p_skip::text||':'||p_dir::text||':'||p_start::text,
      'skip',p_skip,'dir',p_dir,'direction',case when p_dir=1 then 'fwd' else 'back' end,
      'start',p_start,'end',p_start+p_dir*p_skip*(v_len-1),
      'positions',(select jsonb_agg(p_start+p_dir*p_skip*k order by k) from generate_series(0,v_len-1) k),
      'coordinate_convention','zero_based_character_index','dependency_group',v_dependency_group
    ),
    'engine',jsonb_build_object('id','els-sql-core','version',2,'function','els_verify_occurrence_v1','owner','els_research_layer_law:v9'),
    'provenance',jsonb_build_object('source_relation','public.'||public.els_stream_relation_v1(v_scope),'occurrence_generator',case when v_scope='torah' then 'els_torah_occurrences_internal_v1' else 'els_occurrences_internal_v1' end,'verifier','els_verify_batch_core_v1','rule_version','els_research_layer_law:v9')
  );
end
$function$
;
-- @@ function public.fn_els_corpus_id(p_scope text)
CREATE OR REPLACE FUNCTION public.fn_els_corpus_id(p_scope text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case coalesce(nullif(p_scope,''),'torah')
    when 'torah'  then '0b022e8eef6f9c16'
    when 'tanakh' then '0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b'
    else null
  end
$function$
;
-- @@ tablegrant public.tanakh_stream
grant DELETE on public.tanakh_stream to service_role;
grant INSERT on public.tanakh_stream to service_role;
grant REFERENCES on public.tanakh_stream to service_role;
grant SELECT on public.tanakh_stream to service_role;
grant TRIGGER on public.tanakh_stream to service_role;
grant TRUNCATE on public.tanakh_stream to service_role;
grant UPDATE on public.tanakh_stream to service_role;
-- @@ tablegrant public.torah_stream
grant SELECT on public.torah_stream to anon;
grant SELECT on public.torah_stream to authenticated;
grant DELETE on public.torah_stream to service_role;
grant INSERT on public.torah_stream to service_role;
grant REFERENCES on public.torah_stream to service_role;
grant SELECT on public.torah_stream to service_role;
grant TRIGGER on public.torah_stream to service_role;
grant TRUNCATE on public.torah_stream to service_role;
grant UPDATE on public.torah_stream to service_role;
-- @@ fngrant public.edge_rate_limit_check(p_key_hash text, p_window_seconds integer, p_limit integer)
revoke all on function public.edge_rate_limit_check(p_key_hash text, p_window_seconds integer, p_limit integer) from public;
grant execute on function public.edge_rate_limit_check(p_key_hash text, p_window_seconds integer, p_limit integer) to service_role;
-- @@ fngrant public.els_stream_letters_v1(p_scope text)
revoke all on function public.els_stream_letters_v1(p_scope text) from public;
grant execute on function public.els_stream_letters_v1(p_scope text) to service_role;
-- @@ fngrant public.els_stream_relation_v1(p_scope text)
revoke all on function public.els_stream_relation_v1(p_scope text) from public;
grant execute on function public.els_stream_relation_v1(p_scope text) to service_role;
-- @@ fngrant public.els_verify_batch_core_v1(p_scope text, p_term text, p_skip integer[], p_dir integer[], p_start integer[])
revoke all on function public.els_verify_batch_core_v1(p_scope text, p_term text, p_skip integer[], p_dir integer[], p_start integer[]) from public;
grant execute on function public.els_verify_batch_core_v1(p_scope text, p_term text, p_skip integer[], p_dir integer[], p_start integer[]) to service_role;
-- @@ fngrant public.els_verify_batch_v1(p_term text, p_scope text, p_corpus_id text, p_candidates jsonb, p_strategy jsonb)
revoke all on function public.els_verify_batch_v1(p_term text, p_scope text, p_corpus_id text, p_candidates jsonb, p_strategy jsonb) from public;
grant execute on function public.els_verify_batch_v1(p_term text, p_scope text, p_corpus_id text, p_candidates jsonb, p_strategy jsonb) to service_role;
-- @@ fngrant public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer)
revoke all on function public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer) from public;
grant execute on function public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer) to anon;
grant execute on function public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer) to authenticated;
grant execute on function public.els_verify_occurrence_v1(p_term text, p_scope text, p_skip integer, p_dir integer, p_start integer) to service_role;
-- @@ fngrant public.fn_els_corpus_id(p_scope text)
revoke all on function public.fn_els_corpus_id(p_scope text) from public;
grant execute on function public.fn_els_corpus_id(p_scope text) to anon;
grant execute on function public.fn_els_corpus_id(p_scope text) to authenticated;
-- @@ function public.els_publish_truth_gate_v1(p_term text, p_scope text, p_skip integer, p_direction text, p_start_index integer, p_row_corpus_id text, p_check_row_corpus boolean)
CREATE OR REPLACE FUNCTION public.els_publish_truth_gate_v1(p_term text, p_scope text, p_skip integer, p_direction text, p_start_index integer, p_row_corpus_id text DEFAULT NULL::text, p_check_row_corpus boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_scope text := lower(coalesce(nullif(btrim(p_scope),''),'torah'));
  v_norm text := public.fn_els_term_norm(p_term);
  v_corpus text;
  v_dir integer;
  v_state text;
begin
  if v_scope not in ('torah','tanakh') then return 'IDENTITY_INCOMPLETE:scope'; end if;
  v_corpus := public.fn_els_corpus_id(v_scope);
  if v_corpus is null then return 'IDENTITY_INCOMPLETE:corpus_id'; end if;
  if p_check_row_corpus and p_row_corpus_id is distinct from v_corpus then return 'IDENTITY_INCOMPLETE:corpus_id'; end if;
  if length(coalesce(v_norm,'')) < 2 then return 'IDENTITY_INCOMPLETE:term'; end if;
  if coalesce(p_skip,0) < 2 then return 'IDENTITY_INCOMPLETE:skip'; end if;
  v_dir := case p_direction when 'fwd' then 1 when 'back' then -1 else null end;
  if v_dir is null then return 'IDENTITY_INCOMPLETE:direction'; end if;
  if coalesce(p_start_index,-1) < 0 then return 'IDENTITY_INCOMPLETE:start_index'; end if;
  v_state := public.els_verify_occurrence_v1(p_term, v_scope, p_skip, v_dir, p_start_index)->>'verification_state';
  if v_state is distinct from 'MATCH' then return 'REPLAY_'||coalesce(v_state,'NOT_TESTED'); end if;
  return 'MATCH';
end
$function$
;
-- @@ function public.els_slugify(p_term text, p_skip integer)
CREATE OR REPLACE FUNCTION public.els_slugify(p_term text, p_skip integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select trim(both '-' from regexp_replace(
           regexp_replace(coalesce(p_term,''), '[^א-תa-zA-Z0-9]+', '-', 'g'),
           '-+', '-', 'g'))
         || '-' || coalesce(nullif(p_skip,0)::text, '0');
$function$
;
-- @@ function public.fn_els_term_norm(p_term text)
CREATE OR REPLACE FUNCTION public.fn_els_term_norm(p_term text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ')
$function$
;
-- @@ fngrant public.els_publish_truth_gate_v1(p_term text, p_scope text, p_skip integer, p_direction text, p_start_index integer, p_row_corpus_id text, p_check_row_corpus boolean)
revoke all on function public.els_publish_truth_gate_v1(p_term text, p_scope text, p_skip integer, p_direction text, p_start_index integer, p_row_corpus_id text, p_check_row_corpus boolean) from public;
grant execute on function public.els_publish_truth_gate_v1(p_term text, p_scope text, p_skip integer, p_direction text, p_start_index integer, p_row_corpus_id text, p_check_row_corpus boolean) to service_role;
-- @@ fngrant public.els_slugify(p_term text, p_skip integer)
revoke all on function public.els_slugify(p_term text, p_skip integer) from public;
-- @@ fngrant public.fn_els_term_norm(p_term text)
revoke all on function public.fn_els_term_norm(p_term text) from public;
grant execute on function public.fn_els_term_norm(p_term text) to anon;
grant execute on function public.fn_els_term_norm(p_term text) to authenticated;
-- @@ table public.op_trace_roots
create table public.op_trace_roots (
  trace_id uuid not null,
  interaction_id text,
  capability text,
  surface text,
  channel text,
  locale text,
  identity_class text,
  session_ref text,
  subject_ref text,
  availability_ref text,
  entitlement_ref text,
  budget_ref text,
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  outcome text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint op_trace_roots_outcome_ck CHECK (((outcome IS NULL) OR (outcome = ANY (ARRAY['success'::text, 'partial'::text, 'continuation_required'::text, 'negative_result'::text, 'access_filtered'::text, 'cache_hit'::text, 'cache_miss'::text, 'degraded_fallback'::text, 'cancelled'::text, 'timeout'::text, 'provider_error'::text, 'tool_error'::text, 'failed_with_reason'::text])))),
  constraint op_trace_roots_pkey PRIMARY KEY (trace_id),
  constraint op_trace_roots_time_ck CHECK (((ended_at IS NULL) OR (ended_at >= started_at)))
);
-- @@ table public.op_trace_spans
create table public.op_trace_spans (
  span_id uuid not null,
  trace_id uuid not null,
  parent_span_id uuid,
  kind text not null,
  name text not null,
  capability text,
  owner_ref text,
  plan_ref text,
  intelligence_level text,
  provider text,
  model text,
  model_version text,
  engine_version text,
  tool_version text,
  routing_reason text,
  escalation_reason text,
  fallback_reason text,
  started_at timestamp with time zone not null,
  ended_at timestamp with time zone,
  duration_ms bigint,
  outcome text,
  output_use text not null default 'not_applicable'::text,
  stop_reason text,
  request_ref text,
  retry_ordinal integer not null default 0,
  continuation_ordinal integer not null default 0,
  resources jsonb not null default '{}'::jsonb,
  provider_native_amount numeric,
  provider_currency text,
  pricing_ref text,
  pricing_effective_at timestamp with time zone,
  fx_rate numeric,
  fx_effective_at timestamp with time zone,
  cost_ils numeric,
  cost_certainty text not null default 'unknown'::text,
  credits_charged numeric,
  customer_price numeric,
  replay jsonb not null default '{}'::jsonb,
  redaction_applied boolean not null default true,
  raw_private_payload_logged boolean not null default false,
  payload_hash text,
  secure_payload_ref text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint op_trace_spans_cost_certainty_ck CHECK ((cost_certainty = ANY (ARRAY['exact'::text, 'estimated'::text, 'unknown'::text, 'not_billable'::text]))),
  constraint op_trace_spans_duration_ck CHECK (((duration_ms IS NULL) OR (duration_ms >= 0))),
  constraint op_trace_spans_identity_uq UNIQUE (span_id, trace_id),
  constraint op_trace_spans_kind_ck CHECK ((kind = ANY (ARRAY['root_interaction'::text, 'router_plan'::text, 'engine'::text, 'model_call'::text, 'tool_call'::text, 'db_rpc'::text, 'cache'::text, 'network'::text, 'media'::text, 'storage_index'::text, 'background_job'::text, 'synthesis'::text, 'export'::text]))),
  constraint op_trace_spans_not_self_parent_ck CHECK (((parent_span_id IS NULL) OR (parent_span_id <> span_id))),
  constraint op_trace_spans_outcome_ck CHECK (((outcome IS NULL) OR (outcome = ANY (ARRAY['success'::text, 'partial'::text, 'continuation_required'::text, 'negative_result'::text, 'access_filtered'::text, 'cache_hit'::text, 'cache_miss'::text, 'degraded_fallback'::text, 'cancelled'::text, 'timeout'::text, 'provider_error'::text, 'tool_error'::text, 'failed_with_reason'::text])))),
  constraint op_trace_spans_output_use_ck CHECK ((output_use = ANY (ARRAY['used'::text, 'partially_used'::text, 'rejected'::text, 'superseded'::text, 'not_applicable'::text]))),
  constraint op_trace_spans_pkey PRIMARY KEY (span_id),
  constraint op_trace_spans_private_payload_ck CHECK ((raw_private_payload_logged = false)),
  constraint op_trace_spans_retry_ck CHECK (((retry_ordinal >= 0) AND (continuation_ordinal >= 0))),
  constraint op_trace_spans_time_ck CHECK (((ended_at IS NULL) OR (ended_at >= started_at))),
  constraint op_trace_spans_tree_shape_ck CHECK ((((kind = 'root_interaction'::text) AND (parent_span_id IS NULL)) OR ((kind <> 'root_interaction'::text) AND (parent_span_id IS NOT NULL))))
);
-- @@ fk public.op_trace_spans.op_trace_spans_parent_same_trace_fk
alter table public.op_trace_spans add constraint op_trace_spans_parent_same_trace_fk FOREIGN KEY (parent_span_id, trace_id) REFERENCES op_trace_spans(span_id, trace_id) DEFERRABLE;
-- @@ fk public.op_trace_spans.op_trace_spans_trace_id_fkey
alter table public.op_trace_spans add constraint op_trace_spans_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES op_trace_roots(trace_id) ON DELETE CASCADE;
-- @@ index public.op_trace_roots.op_trace_roots_capability_started_idx
CREATE INDEX op_trace_roots_capability_started_idx ON public.op_trace_roots USING btree (capability, started_at DESC);
-- @@ index public.op_trace_roots.op_trace_roots_started_idx
CREATE INDEX op_trace_roots_started_idx ON public.op_trace_roots USING btree (started_at DESC);
-- @@ index public.op_trace_spans.op_trace_one_root_idx
CREATE UNIQUE INDEX op_trace_one_root_idx ON public.op_trace_spans USING btree (trace_id) WHERE ((kind = 'root_interaction'::text) AND (parent_span_id IS NULL));
-- @@ index public.op_trace_spans.op_trace_spans_kind_started_idx
CREATE INDEX op_trace_spans_kind_started_idx ON public.op_trace_spans USING btree (kind, started_at DESC);
-- @@ index public.op_trace_spans.op_trace_spans_trace_started_idx
CREATE INDEX op_trace_spans_trace_started_idx ON public.op_trace_spans USING btree (trace_id, started_at);
-- @@ rls public.op_trace_roots
alter table public.op_trace_roots enable row level security;
-- @@ rls public.op_trace_spans
alter table public.op_trace_spans enable row level security;
-- @@ function public.op_trace_begin_v1(p_trace_id uuid, p_root_span_id uuid, p_context jsonb, p_started_at timestamp with time zone)
CREATE OR REPLACE FUNCTION public.op_trace_begin_v1(p_trace_id uuid, p_root_span_id uuid, p_context jsonb DEFAULT '{}'::jsonb, p_started_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_root_span_id uuid;
begin
  if p_trace_id is null or p_root_span_id is null then
    raise exception 'trace_id and root_span_id are required';
  end if;

  insert into public.op_trace_roots(
    trace_id, interaction_id, capability, surface, channel, locale, identity_class,
    session_ref, subject_ref, availability_ref, entitlement_ref, budget_ref, started_at
  ) values (
    p_trace_id,
    nullif(p_context->>'interaction_id',''),
    nullif(p_context->>'capability',''),
    nullif(p_context->>'surface',''),
    nullif(p_context->>'channel',''),
    nullif(p_context->>'locale',''),
    nullif(p_context->>'identity_class',''),
    nullif(p_context->>'session_ref',''),
    nullif(p_context->>'subject_ref',''),
    nullif(p_context->>'availability_ref',''),
    nullif(p_context->>'entitlement_ref',''),
    nullif(p_context->>'budget_ref',''),
    coalesce(p_started_at, now())
  )
  on conflict (trace_id) do nothing;

  select s.span_id into v_root_span_id
  from public.op_trace_spans s
  where s.trace_id = p_trace_id and s.kind = 'root_interaction' and s.parent_span_id is null
  limit 1;

  if v_root_span_id is null then
    insert into public.op_trace_spans(
      span_id, trace_id, parent_span_id, kind, name, capability, owner_ref,
      started_at, output_use, cost_certainty, redaction_applied, raw_private_payload_logged
    ) values (
      p_root_span_id, p_trace_id, null, 'root_interaction',
      coalesce(nullif(p_context->>'root_name',''), 'interaction'),
      nullif(p_context->>'capability',''),
      nullif(p_context->>'owner_ref',''),
      coalesce(p_started_at, now()),
      'not_applicable', 'not_billable', true, false
    )
    on conflict (span_id) do nothing;

    select s.span_id into v_root_span_id
    from public.op_trace_spans s
    where s.trace_id = p_trace_id and s.kind = 'root_interaction' and s.parent_span_id is null
    limit 1;
  end if;

  if v_root_span_id is null then
    raise exception 'root span could not be established';
  end if;

  return jsonb_build_object('trace_id', p_trace_id, 'root_span_id', v_root_span_id);
end;
$function$
;
-- @@ function public.op_trace_finish_v1(p_trace_id uuid, p_root_span_id uuid, p_outcome text, p_ended_at timestamp with time zone, p_stop_reason text)
CREATE OR REPLACE FUNCTION public.op_trace_finish_v1(p_trace_id uuid, p_root_span_id uuid, p_outcome text, p_ended_at timestamp with time zone DEFAULT now(), p_stop_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_started timestamptz;
  v_ended timestamptz := coalesce(p_ended_at, now());
  v_duration bigint;
begin
  select started_at into v_started
  from public.op_trace_spans
  where span_id = p_root_span_id and trace_id = p_trace_id and kind = 'root_interaction';

  if v_started is null then
    return false;
  end if;

  v_duration := greatest(0, floor(extract(epoch from (v_ended - v_started)) * 1000)::bigint);

  update public.op_trace_spans
  set ended_at = coalesce(ended_at, v_ended),
      duration_ms = coalesce(duration_ms, v_duration),
      outcome = coalesce(outcome, p_outcome),
      stop_reason = coalesce(stop_reason, p_stop_reason),
      updated_at = now()
  where span_id = p_root_span_id
    and trace_id = p_trace_id;

  update public.op_trace_roots
  set ended_at = coalesce(ended_at, v_ended),
      outcome = coalesce(outcome, p_outcome),
      updated_at = now()
  where trace_id = p_trace_id;

  return true;
end;
$function$
;
-- @@ function public.op_trace_record_span_v1(p_trace_id uuid, p_span_id uuid, p_parent_span_id uuid, p_kind text, p_name text, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_outcome text, p_detail jsonb)
CREATE OR REPLACE FUNCTION public.op_trace_record_span_v1(p_trace_id uuid, p_span_id uuid, p_parent_span_id uuid, p_kind text, p_name text, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_outcome text, p_detail jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_duration bigint;
  v_raw_private boolean := coalesce((p_detail #>> '{privacy,rawPrivatePayloadLogged}')::boolean, false);
begin
  if p_trace_id is null or p_span_id is null or p_parent_span_id is null then
    raise exception 'trace_id, span_id and parent_span_id are required';
  end if;
  if p_started_at is null or p_ended_at is null or p_ended_at < p_started_at then
    raise exception 'valid started_at/ended_at are required';
  end if;
  if v_raw_private then
    raise exception 'raw private payload logging is forbidden';
  end if;

  v_duration := greatest(0, floor(extract(epoch from (p_ended_at - p_started_at)) * 1000)::bigint);

  insert into public.op_trace_spans(
    span_id, trace_id, parent_span_id, kind, name, capability, owner_ref, plan_ref,
    intelligence_level, provider, model, model_version, engine_version, tool_version,
    routing_reason, escalation_reason, fallback_reason,
    started_at, ended_at, duration_ms, outcome, output_use, stop_reason, request_ref,
    retry_ordinal, continuation_ordinal, resources,
    provider_native_amount, provider_currency, pricing_ref, pricing_effective_at,
    fx_rate, fx_effective_at, cost_ils, cost_certainty, credits_charged, customer_price,
    replay, redaction_applied, raw_private_payload_logged, payload_hash, secure_payload_ref
  ) values (
    p_span_id, p_trace_id, p_parent_span_id, p_kind, p_name,
    nullif(p_detail->>'capability',''),
    nullif(p_detail->>'owner_ref',''),
    nullif(p_detail->>'plan_ref',''),
    nullif(p_detail->>'intelligence_level',''),
    nullif(p_detail->>'provider',''),
    nullif(p_detail->>'model',''),
    nullif(p_detail->>'model_version',''),
    nullif(p_detail->>'engine_version',''),
    nullif(p_detail->>'tool_version',''),
    nullif(p_detail->>'routing_reason',''),
    nullif(p_detail->>'escalation_reason',''),
    nullif(p_detail->>'fallback_reason',''),
    p_started_at, p_ended_at, v_duration, p_outcome,
    coalesce(nullif(p_detail->>'output_use',''), 'not_applicable'),
    nullif(p_detail->>'stop_reason',''),
    nullif(p_detail->>'request_ref',''),
    coalesce(nullif(p_detail->>'retry_ordinal','')::integer, 0),
    coalesce(nullif(p_detail->>'continuation_ordinal','')::integer, 0),
    coalesce(p_detail->'resources', '{}'::jsonb),
    nullif(p_detail #>> '{cost,providerNativeAmount}','')::numeric,
    nullif(p_detail #>> '{cost,providerCurrency}',''),
    nullif(p_detail #>> '{cost,pricingRef}',''),
    nullif(p_detail #>> '{cost,pricingEffectiveAt}','')::timestamptz,
    nullif(p_detail #>> '{cost,fxRate}','')::numeric,
    nullif(p_detail #>> '{cost,fxEffectiveAt}','')::timestamptz,
    nullif(p_detail #>> '{cost,costIls}','')::numeric,
    coalesce(nullif(p_detail #>> '{cost,certainty}',''), 'unknown'),
    nullif(p_detail #>> '{cost,creditsCharged}','')::numeric,
    nullif(p_detail #>> '{cost,customerPrice}','')::numeric,
    coalesce(p_detail->'replay', '{}'::jsonb),
    coalesce(nullif(p_detail #>> '{privacy,redactionApplied}','')::boolean, true),
    false,
    nullif(p_detail #>> '{privacy,payloadHash}',''),
    nullif(p_detail #>> '{privacy,securePayloadRef}','')
  )
  on conflict (span_id) do nothing;

  -- Idempotency is valid only for the same logical span. Reusing a span UUID
  -- across a different trace/parent/kind is a collision and must fail closed.
  perform 1
  from public.op_trace_spans s
  where s.span_id = p_span_id
    and s.trace_id = p_trace_id
    and s.parent_span_id = p_parent_span_id
    and s.kind = p_kind
    and s.name = p_name;

  if not found then
    raise exception 'span idempotency collision';
  end if;

  return jsonb_build_object('trace_id', p_trace_id, 'span_id', p_span_id);
end;
$function$
;
-- @@ tablegrant public.op_trace_roots
grant DELETE on public.op_trace_roots to service_role;
grant INSERT on public.op_trace_roots to service_role;
grant REFERENCES on public.op_trace_roots to service_role;
grant SELECT on public.op_trace_roots to service_role;
grant TRIGGER on public.op_trace_roots to service_role;
grant TRUNCATE on public.op_trace_roots to service_role;
grant UPDATE on public.op_trace_roots to service_role;
-- @@ tablegrant public.op_trace_spans
grant DELETE on public.op_trace_spans to service_role;
grant INSERT on public.op_trace_spans to service_role;
grant REFERENCES on public.op_trace_spans to service_role;
grant SELECT on public.op_trace_spans to service_role;
grant TRIGGER on public.op_trace_spans to service_role;
grant TRUNCATE on public.op_trace_spans to service_role;
grant UPDATE on public.op_trace_spans to service_role;
-- @@ fngrant public.op_trace_begin_v1(p_trace_id uuid, p_root_span_id uuid, p_context jsonb, p_started_at timestamp with time zone)
revoke all on function public.op_trace_begin_v1(p_trace_id uuid, p_root_span_id uuid, p_context jsonb, p_started_at timestamp with time zone) from public;
grant execute on function public.op_trace_begin_v1(p_trace_id uuid, p_root_span_id uuid, p_context jsonb, p_started_at timestamp with time zone) to service_role;
-- @@ fngrant public.op_trace_finish_v1(p_trace_id uuid, p_root_span_id uuid, p_outcome text, p_ended_at timestamp with time zone, p_stop_reason text)
revoke all on function public.op_trace_finish_v1(p_trace_id uuid, p_root_span_id uuid, p_outcome text, p_ended_at timestamp with time zone, p_stop_reason text) from public;
grant execute on function public.op_trace_finish_v1(p_trace_id uuid, p_root_span_id uuid, p_outcome text, p_ended_at timestamp with time zone, p_stop_reason text) to service_role;
-- @@ fngrant public.op_trace_record_span_v1(p_trace_id uuid, p_span_id uuid, p_parent_span_id uuid, p_kind text, p_name text, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_outcome text, p_detail jsonb)
revoke all on function public.op_trace_record_span_v1(p_trace_id uuid, p_span_id uuid, p_parent_span_id uuid, p_kind text, p_name text, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_outcome text, p_detail jsonb) from public;
grant execute on function public.op_trace_record_span_v1(p_trace_id uuid, p_span_id uuid, p_parent_span_id uuid, p_kind text, p_name text, p_started_at timestamp with time zone, p_ended_at timestamp with time zone, p_outcome text, p_detail jsonb) to service_role;
-- @@ table public.ai_usage
create table public.ai_usage (
  day date not null default ((now() AT TIME ZONE 'Asia/Jerusalem'::text))::date,
  identity text not null,
  tier text,
  n integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint ai_usage_pkey PRIMARY KEY (day, identity)
);
-- @@ table public.profiles
create table public.profiles (
  user_id uuid not null,
  credits integer not null default 0,
  xp integer not null default 0,
  level integer not null default 1,
  tier integer not null default 0,
  streak integer not null default 0,
  joined_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  full_name text,
  birth_date date,
  hidden_widgets text[] not null default '{}'::text[],
  constraint profiles_pkey PRIMARY KEY (user_id),
  constraint profiles_tier_range CHECK (((tier >= 0) AND (tier <= 5)))
);
-- @@ table public.site_flags
create table public.site_flags (
  key text not null,
  enabled boolean not null default false,
  message text,
  updated_at timestamp with time zone not null default now(),
  mode text not null default 'all'::text,
  constraint site_flags_pkey PRIMARY KEY (key)
);
-- @@ fk public.profiles.profiles_user_id_fkey
alter table public.profiles add constraint profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
-- @@ index public.ai_usage.ai_usage_day_idx
CREATE INDEX ai_usage_day_idx ON public.ai_usage USING btree (day);
-- @@ rls public.ai_usage
alter table public.ai_usage enable row level security;
-- @@ rls public.profiles
alter table public.profiles enable row level security;
-- @@ rls public.site_flags
alter table public.site_flags enable row level security;
-- @@ policy public.profiles.profiles_owner_read
create policy profiles_owner_read on public.profiles as PERMISSIVE for SELECT to authenticated using ((auth.uid() = user_id));
-- @@ policy public.site_flags.site_flags_public_read
create policy site_flags_public_read on public.site_flags as PERMISSIVE for SELECT to public using (true);
-- @@ function public.ai_quota_check(p_identity text, p_tier text, p_limit_override integer)
CREATE OR REPLACE FUNCTION public.ai_quota_check(p_identity text, p_tier text, p_limit_override integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_day date := (now() at time zone 'Asia/Jerusalem')::date;
  v_used integer;
  v_lim integer;
begin
  if p_identity is null or length(p_identity) = 0 then
    return jsonb_build_object('allowed', true, 'used', 0, 'limit', null, 'tier', 'unknown');
  end if;

  if p_tier = 'admin' then
    return jsonb_build_object('allowed', true, 'used', 0, 'limit', null, 'tier', 'admin');
  end if;

  v_lim := coalesce(p_limit_override, 2);

  if v_lim <= 0 then
    select n into v_used from public.ai_usage where day = v_day and identity = p_identity;
    return jsonb_build_object('allowed', false, 'used', coalesce(v_used,0), 'limit', v_lim, 'tier', p_tier);
  end if;

  -- Single atomic insert/update gate: two concurrent requests cannot both pass
  -- the same last remaining unit. The WHERE is evaluated while the conflict row
  -- is locked by PostgreSQL.
  insert into public.ai_usage(day, identity, tier, n)
  values (v_day, p_identity, p_tier, 1)
  on conflict (day, identity) do update
    set n = public.ai_usage.n + 1,
        tier = excluded.tier,
        updated_at = now()
    where public.ai_usage.n < v_lim
  returning n into v_used;

  if v_used is null then
    select n into v_used from public.ai_usage where day = v_day and identity = p_identity;
    return jsonb_build_object('allowed', false, 'used', coalesce(v_used,0), 'limit', v_lim, 'tier', p_tier);
  end if;

  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_lim, 'tier', p_tier);
end;
$function$
;
-- @@ function public.fn_capability_execution_gate_v1(p_capability text, p_flag_key text, p_required_entitlement text, p_user_ref text, p_visitor text, p_identity text, p_budget_kind text, p_budget_tier text, p_budget_limit_override integer)
CREATE OR REPLACE FUNCTION public.fn_capability_execution_gate_v1(p_capability text, p_flag_key text DEFAULT NULL::text, p_required_entitlement text DEFAULT NULL::text, p_user_ref text DEFAULT NULL::text, p_visitor text DEFAULT NULL::text, p_identity text DEFAULT NULL::text, p_budget_kind text DEFAULT 'none'::text, p_budget_tier text DEFAULT NULL::text, p_budget_limit_override integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_capability text := nullif(btrim(coalesce(p_capability,'')), '');
  v_flag_key text := nullif(btrim(coalesce(p_flag_key,'')), '');
  v_required text := lower(nullif(btrim(coalesce(p_required_entitlement,'')), ''));
  v_budget_kind text := lower(coalesce(nullif(btrim(coalesce(p_budget_kind,'')), ''), 'none'));

  v_ent jsonb;
  v_context_type text;
  v_is_admin boolean := false;
  v_is_authenticated boolean := false;
  v_entitlement_allowed boolean := false;
  v_entitlement_state text := 'unresolved';

  v_flag_found boolean := false;
  v_flag_enabled boolean := false;
  v_flag_mode text := null;
  v_flag_message text := null;
  v_availability_state text := 'open';
  v_availability_allowed boolean := true;

  v_budget jsonb := jsonb_build_object(
    'kind','none','state','not_metered','allowed',true,
    'used',0,'limit',null,'tier',null,'consumed',false
  );
  v_budget_allowed boolean := true;
  v_budget_tier text;

  v_allowed boolean;
begin
  if v_capability is null then
    raise exception 'capability is required';
  end if;

  -- Entitlement identity comes from the existing canonical read-layer.
  v_ent := public.fn_user_entitlement(p_user_ref, p_visitor);
  v_context_type := coalesce(v_ent->>'context_type','public_user');
  v_is_admin := coalesce((v_ent->>'is_admin')::boolean, false);
  v_is_authenticated := v_context_type <> 'public_user';

  -- Availability: explicit no-flag means this capability currently has no
  -- site_flags availability gate. If a server contract names a flag and the
  -- flag is missing/invalid, fail closed instead of silently opening expensive I/O.
  if v_flag_key is not null then
    select true, coalesce(f.enabled,false), coalesce(f.mode,'all'), f.message
      into v_flag_found, v_flag_enabled, v_flag_mode, v_flag_message
    from public.site_flags f
    where f.key = v_flag_key
    limit 1;

    if not coalesce(v_flag_found,false) then
      v_availability_state := 'unknown_flag';
      v_availability_allowed := false;
    elsif not v_flag_enabled then
      v_availability_state := 'open';
      v_availability_allowed := true;
    elsif v_flag_mode = 'all' then
      v_availability_state := case when v_is_admin then 'admin_bypass' else 'closed' end;
      v_availability_allowed := v_is_admin;
    elsif v_flag_mode = 'anon' then
      v_availability_state := case
        when v_is_admin then 'admin_bypass'
        when v_is_authenticated then 'registered_bypass'
        else 'registered_only'
      end;
      v_availability_allowed := v_is_admin or v_is_authenticated;
    else
      v_availability_state := 'invalid_mode';
      v_availability_allowed := false;
    end if;
  end if;

  -- Entitlement allocation remains a server-supplied policy input. G3 does not
  -- invent final G5 product allocation. The function only resolves that input
  -- against the existing entitlement owner.
  if v_required is null or v_required = 'public' then
    v_required := 'public';
    v_entitlement_allowed := true;
    v_entitlement_state := 'public';
  elsif v_required in ('subscriber','admin') then
    v_entitlement_allowed := coalesce(v_ent->'entitlements','[]'::jsonb) ? v_required;
    v_entitlement_state := case when v_entitlement_allowed then 'allowed' else 'denied' end;
  else
    -- G3 intentionally refuses premium/credits or invented tier names. Final
    -- Free/Registered/Premium/Credits allocation belongs to G5.
    v_entitlement_allowed := false;
    v_entitlement_state := 'unsupported_requirement';
  end if;

  -- Budget is consumed only after availability+entitlement pass.
  if v_budget_kind = 'none' then
    v_budget_allowed := true;
  elsif v_budget_kind = 'ai_quota' then
    if not v_availability_allowed or not v_entitlement_allowed then
      v_budget_allowed := false;
      v_budget := jsonb_build_object(
        'kind','ai_quota','state','not_consumed_upstream_denied','allowed',false,
        'used',null,'limit',null,'tier',null,'consumed',false
      );
    elsif nullif(btrim(coalesce(p_identity,'')), '') is null then
      v_budget_allowed := false;
      v_budget := jsonb_build_object(
        'kind','ai_quota','state','missing_identity','allowed',false,
        'used',null,'limit',null,'tier',null,'consumed',false
      );
    else
      v_budget_tier := coalesce(
        nullif(btrim(coalesce(p_budget_tier,'')), ''),
        case when v_is_admin then 'admin' when v_is_authenticated then 'user' else 'anon' end
      );
      v_budget := public.ai_quota_check(p_identity, v_budget_tier, p_budget_limit_override);
      v_budget_allowed := coalesce((v_budget->>'allowed')::boolean, false);
      v_budget := coalesce(v_budget,'{}'::jsonb) || jsonb_build_object(
        'kind','ai_quota',
        'state',case when v_budget_allowed then 'allowed' else 'exhausted' end,
        'consumed',case
          when v_budget_allowed and (v_budget->>'limit') is not null then true
          else false
        end
      );
    end if;
  else
    v_budget_allowed := false;
    v_budget := jsonb_build_object(
      'kind',v_budget_kind,'state','unknown_budget_kind','allowed',false,
      'used',null,'limit',null,'tier',null,'consumed',false
    );
  end if;

  v_allowed := v_availability_allowed and v_entitlement_allowed and v_budget_allowed;

  return jsonb_build_object(
    'v',1,
    'capability',v_capability,
    'allowed',v_allowed,
    'availability',jsonb_build_object(
      'owner','site_flags_lock_law v3',
      'flag_key',v_flag_key,
      'flag_found',case when v_flag_key is null then null else coalesce(v_flag_found,false) end,
      'enabled',case when v_flag_key is null then null else v_flag_enabled end,
      'mode',case when v_flag_key is null then null else v_flag_mode end,
      'state',v_availability_state,
      'allowed',v_availability_allowed,
      'message',v_flag_message
    ),
    'entitlement',jsonb_build_object(
      'owner','platform_tiers_law v4',
      'required',coalesce(v_required,'public'),
      'state',v_entitlement_state,
      'allowed',v_entitlement_allowed,
      'context_type',v_context_type,
      'entitlement',v_ent->>'entitlement',
      'tier',v_ent->'tier',
      'role',v_ent->>'role',
      'is_admin',v_is_admin,
      'is_subscriber',coalesce((v_ent->>'is_subscriber')::boolean,false),
      'entitlements',coalesce(v_ent->'entitlements','[]'::jsonb)
    ),
    'budget',coalesce(v_budget,'{}'::jsonb) || jsonb_build_object(
      'owner','ai_quota_law v3',
      'allowed',v_budget_allowed
    ),
    'policy',jsonb_build_object(
      'server_authoritative',true,
      'final_product_allocation_defined_here',false,
      'pricing_defined_here',false,
      'supported_entitlement_requirements',jsonb_build_array('public','subscriber','admin'),
      'named_availability_flag_must_exist',true
    )
  );
end;
$function$
;
-- @@ function public.fn_user_entitlement(p_user_ref text, p_visitor text)
CREATE OR REPLACE FUNCTION public.fn_user_entitlement(p_user_ref text, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid; v_role text; v_tier int; v_ct text; v_ent text;
begin
  begin v_uid := p_user_ref::uuid; exception when others then v_uid := null; end;
  if v_uid is not null then
    select u.role, coalesce(p.tier,0) into v_role, v_tier
    from public.users u left join public.profiles p on p.user_id = u.id
    where u.id = v_uid;
  end if;
  v_ct := case when v_role='admin' then 'admin'
               when coalesce(v_tier,0) >= 3 then 'subscriber'
               when v_uid is not null then 'authenticated_user'
               else 'public_user' end;
  v_ent := case when v_role='admin' then 'admin' when coalesce(v_tier,0)>=3 then 'subscriber' else 'public' end;
  return jsonb_build_object(
    'context_type', v_ct, 'entitlement', v_ent, 'tier', coalesce(v_tier,0), 'role', coalesce(v_role,'anon'),
    'is_admin', v_role='admin', 'is_subscriber', v_ct in ('subscriber','admin'),
    'entitlements', case v_ent when 'admin' then '["public","subscriber","premium","admin"]'::jsonb
                               when 'subscriber' then '["public","subscriber"]'::jsonb
                               else '["public"]'::jsonb end,
    'source_of_truth','users.role + profiles.tier (paid_subscribers עתידי)', 'note','read-layer; אין מנויים מקבילים');
end $function$
;
-- @@ trigger public.profiles.trg_credit_signup_grant
CREATE TRIGGER trg_credit_signup_grant AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION credit_signup_grant_tg();
-- @@ tablegrant public.ai_usage
grant DELETE on public.ai_usage to service_role;
grant INSERT on public.ai_usage to service_role;
grant REFERENCES on public.ai_usage to service_role;
grant SELECT on public.ai_usage to service_role;
grant TRIGGER on public.ai_usage to service_role;
grant TRUNCATE on public.ai_usage to service_role;
grant UPDATE on public.ai_usage to service_role;
-- @@ tablegrant public.profiles
grant SELECT on public.profiles to authenticated;
grant DELETE on public.profiles to service_role;
grant INSERT on public.profiles to service_role;
grant REFERENCES on public.profiles to service_role;
grant SELECT on public.profiles to service_role;
grant TRIGGER on public.profiles to service_role;
grant TRUNCATE on public.profiles to service_role;
grant UPDATE on public.profiles to service_role;
-- @@ tablegrant public.site_flags
grant SELECT on public.site_flags to anon;
grant SELECT on public.site_flags to authenticated;
grant DELETE on public.site_flags to service_role;
grant INSERT on public.site_flags to service_role;
grant REFERENCES on public.site_flags to service_role;
grant SELECT on public.site_flags to service_role;
grant TRIGGER on public.site_flags to service_role;
grant TRUNCATE on public.site_flags to service_role;
grant UPDATE on public.site_flags to service_role;
-- @@ colgrant public.profiles
grant select (full_name, birth_date) on public.profiles to authenticated;
-- @@ fngrant public.ai_quota_check(p_identity text, p_tier text, p_limit_override integer)
revoke all on function public.ai_quota_check(p_identity text, p_tier text, p_limit_override integer) from public;
grant execute on function public.ai_quota_check(p_identity text, p_tier text, p_limit_override integer) to service_role;
-- @@ fngrant public.fn_capability_execution_gate_v1(p_capability text, p_flag_key text, p_required_entitlement text, p_user_ref text, p_visitor text, p_identity text, p_budget_kind text, p_budget_tier text, p_budget_limit_override integer)
revoke all on function public.fn_capability_execution_gate_v1(p_capability text, p_flag_key text, p_required_entitlement text, p_user_ref text, p_visitor text, p_identity text, p_budget_kind text, p_budget_tier text, p_budget_limit_override integer) from public;
grant execute on function public.fn_capability_execution_gate_v1(p_capability text, p_flag_key text, p_required_entitlement text, p_user_ref text, p_visitor text, p_identity text, p_budget_kind text, p_budget_tier text, p_budget_limit_override integer) to service_role;
-- @@ fngrant public.fn_user_entitlement(p_user_ref text, p_visitor text)
revoke all on function public.fn_user_entitlement(p_user_ref text, p_visitor text) from public;
grant execute on function public.fn_user_entitlement(p_user_ref text, p_visitor text) to service_role;
