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
-- @@ table public.els_records
create table public.els_records (
  id uuid not null default gen_random_uuid(),
  title text not null,
  search_term text,
  torah_book text,
  torah_section text,
  skip_distance integer,
  image_url text,
  description text,
  primary_number integer,
  anchor_numbers integer[],
  importance integer default 3,
  visibility text default 'public'::text,
  status text default 'draft'::text,
  created_at timestamp with time zone default now(),
  owner_user_id uuid,
  author_name text,
  visitor_id text,
  positions jsonb,
  source text default 'admin'::text,
  scope text default 'torah'::text,
  direction text,
  slug text,
  self_published boolean not null default false,
  home_hidden boolean not null default false,
  corpus_id text,
  term_norm text,
  start_index integer,
  engine_detail jsonb,
  constraint els_records_pkey PRIMARY KEY (id),
  constraint els_records_private_not_self_published_chk CHECK (((visibility <> 'private'::text) OR (COALESCE(self_published, false) = false))) NOT VALID,
  constraint els_records_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'published'::text, 'hidden'::text, 'archived'::text]))),
  constraint els_records_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'member'::text, 'premium'::text, 'admin'::text, 'private'::text])))
);
-- @@ fk public.els_records.els_records_owner_user_id_fkey
alter table public.els_records add constraint els_records_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- @@ index public.els_records.els_anchor_numbers_idx
CREATE INDEX els_anchor_numbers_idx ON public.els_records USING gin (anchor_numbers);
-- @@ index public.els_records.els_primary_number_idx
CREATE INDEX els_primary_number_idx ON public.els_records USING btree (primary_number);
-- @@ index public.els_records.els_records_slug_uidx
CREATE UNIQUE INDEX els_records_slug_uidx ON public.els_records USING btree (slug) WHERE (slug IS NOT NULL);
-- @@ rls public.els_records
alter table public.els_records enable row level security;
-- @@ policy public.els_records.admin_all_els
create policy admin_all_els on public.els_records as PERMISSIVE for ALL to authenticated using ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))) with check ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text)))));
-- @@ policy public.els_records.els_owner_read
create policy els_owner_read on public.els_records as PERMISSIVE for SELECT to authenticated using ((owner_user_id = auth.uid()));
-- @@ policy public.els_records.public_read_published_els
create policy public_read_published_els on public.els_records as PERMISSIVE for SELECT to public using (((status = 'published'::text) AND (visibility = 'public'::text)));
-- @@ policy public.els_records.public_read_self_published_els
create policy public_read_self_published_els on public.els_records as PERMISSIVE for SELECT to public using (((self_published = true) AND (visibility = 'public'::text)));
-- @@ trigger public.els_records.trg_cipher_notify
CREATE TRIGGER trg_cipher_notify AFTER INSERT OR UPDATE OF status ON public.els_records FOR EACH ROW EXECUTE FUNCTION notify_on_cipher_publish();
-- @@ trigger public.els_records.trg_els_fill_numbers
CREATE TRIGGER trg_els_fill_numbers BEFORE INSERT OR UPDATE ON public.els_records FOR EACH ROW EXECUTE FUNCTION els_fill_numbers();
-- @@ trigger public.els_records.trg_els_published_to_ticker
CREATE TRIGGER trg_els_published_to_ticker AFTER INSERT OR UPDATE OF status ON public.els_records FOR EACH ROW EXECUTE FUNCTION els_published_to_ticker();
-- @@ tablegrant public.els_records
grant DELETE on public.els_records to service_role;
grant INSERT on public.els_records to service_role;
grant REFERENCES on public.els_records to service_role;
grant SELECT on public.els_records to service_role;
grant TRIGGER on public.els_records to service_role;
grant TRUNCATE on public.els_records to service_role;
grant UPDATE on public.els_records to service_role;
-- @@ colgrant public.els_records
grant select (id, title, search_term, torah_book, torah_section, skip_distance, image_url, description, primary_number, anchor_numbers, importance, visibility, status, created_at, owner_user_id, author_name, positions, source, scope, direction, slug, self_published, home_hidden, corpus_id, term_norm, start_index, engine_detail) on public.els_records to anon;
grant select (id, title, search_term, torah_book, torah_section, skip_distance, image_url, description, primary_number, anchor_numbers, importance, visibility, status, created_at, owner_user_id, author_name, positions, source, scope, direction, slug, self_published, home_hidden, corpus_id, term_norm, start_index, engine_detail) on public.els_records to authenticated;
-- @@ table public.anon_contrib_log
create table public.anon_contrib_log (
  id bigint not null default nextval('anon_contrib_log_id_seq'::regclass),
  ip text,
  created_at timestamp with time zone not null default now(),
  constraint anon_contrib_log_pkey PRIMARY KEY (id)
);
-- @@ table public.beit_midrash
create table public.beit_midrash (
  id uuid not null default gen_random_uuid(),
  type text not null default 'מקור'::text,
  title text not null,
  body text,
  related_numbers integer[],
  related_phrases text[],
  source_ref text,
  link text,
  origin text not null default 'צוריאל'::text,
  verified boolean not null default false,
  ai_touched boolean not null default false,
  space text not null default 'core'::text,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint beit_midrash_origin_check CHECK ((origin = ANY (ARRAY['צוריאל'::text, 'ai'::text]))),
  constraint beit_midrash_pkey PRIMARY KEY (id),
  constraint beit_midrash_type_check CHECK ((type = ANY (ARRAY['שיעור'::text, 'דיון'::text, 'מקור'::text, 'שאלה_תשובה'::text, 'כללי'::text])))
);
-- @@ table public.community_net_blocks
create table public.community_net_blocks (
  id uuid not null default gen_random_uuid(),
  net_ref text not null,
  duration_kind text not null,
  created_at timestamp with time zone not null default now(),
  created_by uuid not null,
  reason text not null,
  expires_at timestamp with time zone,
  source_message_id uuid,
  lifted_at timestamp with time zone,
  lifted_by uuid,
  lift_reason text,
  permanent_requested_at timestamp with time zone,
  permanent_requested_by uuid,
  permanent_request_reason text,
  permanent_approved_at timestamp with time zone,
  permanent_approved_by uuid,
  constraint community_net_blocks_check CHECK (((duration_kind = 'permanent'::text) = (expires_at IS NULL))),
  constraint community_net_blocks_duration_kind_check CHECK ((duration_kind = ANY (ARRAY['h24'::text, 'd3'::text, 'd7'::text, 'permanent'::text]))),
  constraint community_net_blocks_pkey PRIMARY KEY (id),
  constraint community_net_blocks_reason_check CHECK (((char_length(btrim(reason)) >= 10) AND (char_length(btrim(reason)) <= 300)))
);
-- @@ table public.community_net_key
create table public.community_net_key (
  singleton boolean not null default true,
  key bytea not null,
  created_at timestamp with time zone not null default now(),
  constraint community_net_key_pkey PRIMARY KEY (singleton),
  constraint community_net_key_singleton_check CHECK (singleton)
);
-- @@ table public.contribution_events
create table public.contribution_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  kind text not null,
  ref text,
  value bigint,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint contribution_events_pkey PRIMARY KEY (id)
);
-- @@ table public.contributors
create table public.contributors (
  id uuid not null default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  kind text not null default 'community'::text,
  phone text,
  email text,
  user_id uuid,
  avatar_url text,
  role text,
  bio text,
  vip boolean not null default false,
  active boolean not null default true,
  source text,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  media jsonb not null default '[]'::jsonb,
  code text,
  locked boolean not null default false,
  access_code text,
  tags text[],
  building boolean not null default false,
  wa_names text[] default '{}'::text[],
  feature_media boolean default false,
  merged_into text,
  dossier_settings jsonb not null default '{}'::jsonb,
  trusted boolean not null default false,
  specialty text,
  specialty_label text,
  on_whatsapp boolean not null default false,
  accent text,
  emblem text,
  engaged boolean not null default true,
  page_config jsonb not null default jsonb_build_object('version', 1),
  wa_channel text,
  wa_group_url text,
  constraint contributors_code_key UNIQUE (code),
  constraint contributors_pkey PRIMARY KEY (id),
  constraint contributors_slug_key UNIQUE (slug)
);
-- @@ table public.identity_edges
create table public.identity_edges (
  id uuid not null default gen_random_uuid(),
  sod_id text not null,
  person_id uuid not null,
  kind text not null,
  legacy_id text,
  confidence smallint not null default 100,
  first_seen timestamp with time zone not null default now(),
  last_seen timestamp with time zone not null default now(),
  meta jsonb,
  constraint identity_edges_pkey PRIMARY KEY (id)
);
-- @@ table public.persons
create table public.persons (
  person_id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  first_seen timestamp with time zone,
  last_seen timestamp with time zone,
  first_source text,
  first_app_context text,
  account_user_id uuid,
  primary_channel text,
  constraint persons_pkey PRIMARY KEY (person_id)
);
-- @@ table public.research_contribution_deletions
create table public.research_contribution_deletions (
  contribution_id uuid not null,
  body text,
  title text,
  image_url text,
  media jsonb,
  status text,
  deleted_by uuid,
  deleted_at timestamp with time zone not null default now(),
  constraint research_contribution_deletions_pkey PRIMARY KEY (contribution_id)
);
-- @@ table public.research_contribution_edits
create table public.research_contribution_edits (
  id bigint not null default nextval('research_contribution_edits_id_seq'::regclass),
  contribution_id uuid not null,
  body text,
  edited_by uuid,
  edited_at timestamp with time zone not null default now(),
  constraint research_contribution_edits_pkey PRIMARY KEY (id)
);
-- @@ table public.research_contributions
create table public.research_contributions (
  id uuid not null default gen_random_uuid(),
  author_user_id uuid,
  author_contributor_id uuid,
  author_name text,
  intent text not null default 'תגובה'::text,
  origin text not null default 'beit_midrash'::text,
  research_state text not null default 'idea'::text,
  status text not null default 'pending'::text,
  target_type text,
  target_id text,
  parent_id uuid,
  title text,
  body text,
  gematria_claim jsonb,
  projected_insight_id uuid,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  graph_node_id uuid,
  pinned_at timestamp with time zone,
  last_activity_at timestamp with time zone default now(),
  image_url text,
  is_featured boolean not null default false,
  convergence_slug text,
  is_answer boolean default false,
  reaction_boosts jsonb not null default '{}'::jsonb,
  media jsonb not null default '[]'::jsonb,
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  thread_hidden_at timestamp with time zone,
  thread_bumped_at timestamp with time zone,
  constraint research_contributions_media_array_ck CHECK ((jsonb_typeof(media) = 'array'::text)),
  constraint research_contributions_pkey PRIMARY KEY (id)
);
-- @@ table public.subscribe_events
create table public.subscribe_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  visitor_id text,
  topic text not null,
  source text,
  action text not null default 'follow'::text,
  created_at timestamp with time zone not null default now(),
  constraint subscribe_events_pkey PRIMARY KEY (id)
);
-- @@ fk public.contribution_events.contribution_events_user_id_fkey
alter table public.contribution_events add constraint contribution_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
-- @@ fk public.contributors.contributors_user_id_fkey
alter table public.contributors add constraint contributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
-- @@ fk public.identity_edges.identity_edges_person_id_fkey
alter table public.identity_edges add constraint identity_edges_person_id_fkey FOREIGN KEY (person_id) REFERENCES persons(person_id) ON DELETE CASCADE;
-- @@ fk public.research_contribution_deletions.research_contribution_deletions_contribution_id_fkey
alter table public.research_contribution_deletions add constraint research_contribution_deletions_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES research_contributions(id) ON DELETE CASCADE;
-- @@ fk public.research_contribution_edits.research_contribution_edits_contribution_id_fkey
alter table public.research_contribution_edits add constraint research_contribution_edits_contribution_id_fkey FOREIGN KEY (contribution_id) REFERENCES research_contributions(id) ON DELETE CASCADE;
-- @@ fk public.research_contributions.research_contributions_author_contributor_id_fkey
alter table public.research_contributions add constraint research_contributions_author_contributor_id_fkey FOREIGN KEY (author_contributor_id) REFERENCES contributors(id) ON DELETE SET NULL;
-- @@ fk public.research_contributions.research_contributions_author_user_id_fkey
alter table public.research_contributions add constraint research_contributions_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
-- @@ fk public.research_contributions.research_contributions_graph_node_id_fkey
alter table public.research_contributions add constraint research_contributions_graph_node_id_fkey FOREIGN KEY (graph_node_id) REFERENCES nodes(id);
-- @@ fk public.research_contributions.research_contributions_parent_id_fkey
alter table public.research_contributions add constraint research_contributions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES research_contributions(id) ON DELETE CASCADE;
-- @@ fk public.research_contributions.research_contributions_projected_insight_id_fkey
alter table public.research_contributions add constraint research_contributions_projected_insight_id_fkey FOREIGN KEY (projected_insight_id) REFERENCES insights(id) ON DELETE SET NULL;
-- @@ index public.anon_contrib_log.anon_contrib_log_ip_time
CREATE INDEX anon_contrib_log_ip_time ON public.anon_contrib_log USING btree (ip, created_at);
-- @@ index public.community_net_blocks.community_net_blocks_one_open_per_net
CREATE UNIQUE INDEX community_net_blocks_one_open_per_net ON public.community_net_blocks USING btree (net_ref) WHERE (lifted_at IS NULL);
-- @@ index public.contributors.idx_contributors_kind
CREATE INDEX idx_contributors_kind ON public.contributors USING btree (kind, active);
-- @@ index public.identity_edges.identity_edges_legacy_idx
CREATE INDEX identity_edges_legacy_idx ON public.identity_edges USING btree (legacy_id) WHERE (legacy_id IS NOT NULL);
-- @@ index public.identity_edges.identity_edges_legacy_seed_row_unique
CREATE UNIQUE INDEX identity_edges_legacy_seed_row_unique ON public.identity_edges USING btree (sod_id, person_id, legacy_id) WHERE ((kind = 'legacy_seed'::text) AND (legacy_id IS NOT NULL));
-- @@ index public.identity_edges.identity_edges_legacy_seed_unique
CREATE UNIQUE INDEX identity_edges_legacy_seed_unique ON public.identity_edges USING btree (legacy_id) WHERE ((kind = 'legacy_seed'::text) AND (legacy_id IS NOT NULL) AND (legacy_id <> ALL (ARRAY['0401ea30-ee9f-4b27-9ff6-f7782b95e434'::text, '0572e53c-0f18-4bd6-87e5-55df9db52462'::text, '07881577-d8b5-41cb-9f0b-c3c871bcbbf0'::text, '10aafa66-17de-47c7-9482-76ec99329478'::text, '13659d7d-da16-47f9-9d7b-7ace3fa18ef5'::text, '1597fc45-e3db-4128-9f75-6aa21467be03'::text, '15a66b1a-de3d-4d7c-b2b1-97987336c316'::text, '17d159e0-89ef-4159-b124-8a9ae37b3e49'::text, '19982a25-7d08-4294-8993-b38a17a8f020'::text, '1e0ad37b-6757-4762-a7ee-826a68af9c8a'::text, '22618c48-76f3-4d2e-a19f-a262f375ad7e'::text, '23718595-cd02-4fa6-ac93-869ad2e5917d'::text, '2620a46e-c05e-43c9-8658-02b320625d6a'::text, '2b9d4e5a-f4e6-4861-8673-9e5c57302552'::text, '2e022b27-8cc8-4018-853d-6e9bbde40e12'::text, '2fc90feb-ca71-483e-884a-72f1ede3f90c'::text, '30b4025e-fc99-4c52-9e99-709efba761b3'::text, '31501b76-9eea-423f-a2af-6ec02b1b8928'::text, '31fdf611-03f3-46c8-afcc-b47a7eaca4be'::text, '3451df85-47d8-4c40-9fdb-3fdd44601fe3'::text, '354f118d-77d7-4a68-b352-1aec49a354fb'::text, '36dff039-9165-43d8-9f86-6e83231cb25b'::text, '3801a71e-4a81-4083-ba19-6662dc84ca92'::text, '41d9045f-0c2d-47a4-bf6e-24b8e635dd8a'::text, '43a4a215-5adb-40c3-a55e-0ea5640a9930'::text, '45dd6aea-e84c-4a35-9d4d-c1e5d9d14c21'::text, '493c625b-647a-4ff3-90d4-523aaeccde57'::text, '499909e5-8455-4fd3-a365-2baf68b39435'::text, '4a1ce37d-5698-47ea-afaa-a28b82c9f181'::text, '4a5f3722-b770-429d-8b30-86cfe0f573ab'::text, '4f020a14-3059-4d78-90da-5498b43532b6'::text, '50ed52f3-fd2b-4241-a10c-d05f71ddcb08'::text, '53583e02-3132-4b71-bf2c-393ff9fe6cc9'::text, '5562fca4-e8f0-4bbd-aa59-bd0c9ea2c0d6'::text, '5880a8a6-19ad-4b04-b728-bd1de96274af'::text, '5bc0d16d-84b7-4d30-a03d-447ba13ba1da'::text, '5e4a9be7-1ed6-4634-af29-7c03981538e1'::text, '60ebe0d3-19a9-4133-af30-6521dfd97797'::text, '636108f7-f0fc-49b6-bcb3-b379aa0fcc6a'::text, '699a6084-de89-449a-8c07-2fd563ba2838'::text, '6a617540-a1d8-4aa5-8de6-1e8a595d9dc6'::text, '6bc01dad-8ac6-4a0e-b9d0-442f76a1a66d'::text, '6c5dbe93-33b0-4762-a354-d9b666888b45'::text, '6dfb9faf-20fd-45c4-826f-67a17ce32aaa'::text, '73f45c92-764b-4826-a5d6-eaafbbfb66ad'::text, '7a5949cc-2ecf-47df-8459-9c6078dd2548'::text, '7d00fdf3-fa49-4255-a44f-d3764f7a5771'::text, '7f64c940-7c95-48df-afa4-3b9f3c826150'::text, '7f949767-641e-44bf-bf90-25e5cd490b19'::text, '84b7f986-70e3-4627-9a27-b9a6306358dd'::text, '84e6fb22-2880-46a0-81fb-9a849e51912a'::text, '87d3c5ad-4382-45c4-a2d4-a09f808f05cd'::text, '8b811c6b-dc81-4c16-8f76-d3a54f68c5be'::text, '90e55583-931c-44f7-8608-60680058c4c3'::text, '91535ad7-324f-4746-ac7b-49a633e489ae'::text, '944386bd-597e-4389-8980-304da9daeb39'::text, '95536234-c308-4ddc-80a9-e6b757b6ba52'::text, '9ecf010e-0acb-4945-8b70-77938e5e1ccd'::text, '9f21766a-4f2e-4d3f-bb17-56c02403b3a2'::text, 'a06a1871-2f1d-4e83-8974-4f27497a1e7a'::text, 'a158a34c-a8d5-4cdd-81c8-9e29cb5f6026'::text, 'a377b835-dcb4-4d5a-9d4a-98bd120fd31d'::text, 'a5e15fce-43ca-4688-906a-b65dbc62d04c'::text, 'a7df7398-c99f-424e-8877-48a004780193'::text, 'ab082f57-8314-43b8-9cf6-dec334d3d8ac'::text, 'afcd9c5a-9acd-41ea-9a2c-b878deebad35'::text, 'b05b6057-e4ef-4671-9b66-7a17a3634c9a'::text, 'b0cc9c15-170d-4d7b-8a57-ca7276c93b00'::text, 'b1564f21-cb28-4209-9fbc-e9ddeccd15d7'::text, 'b82441be-6bf6-49bb-adac-32a773824239'::text, 'b8b1b5ca-ca85-421c-a4ed-bef498174a23'::text, 'b8e4a239-82b9-4074-b9a4-358a26ff23a1'::text, 'bc1c1900-3d4e-4e33-b04e-f1ea573886c6'::text, 'be7fc250-bccc-41ed-9d7f-27e9dd90ba2c'::text, 'c4362e06-3aae-47e9-bdc9-c577b2952202'::text, 'c4ce9630-5ca9-4517-86e8-cacdbc1e70a8'::text, 'c66ad8b0-abe5-429f-b344-7c881b1b888a'::text, 'c70eb4dc-6671-4a02-82e0-316eb4be9b96'::text, 'c8f695b3-90de-4b41-bda3-771ab9513953'::text, 'c94570e2-6dda-4f21-8224-984e6cced1fe'::text, 'ca791261-6746-40ce-9fec-642b0ab4e894'::text, 'cc5846e5-1903-47cd-a474-5fffae194d83'::text, 'cd02988e-ed1e-496e-aadd-0fe8ef6e0fe7'::text, 'cf1bcdb2-b90c-4b32-bb68-0fbb0199a950'::text, 'd305a163-1f1b-42fa-8adb-a469bad5a8a9'::text, 'd48b3143-d1ab-4c60-a2e6-21f1ac726a4d'::text, 'd56c0eb8-b1bc-422f-adad-a7630eca561d'::text, 'd63f5f12-72d1-4f87-8c55-b2ff6c146f21'::text, 'd82030f3-7b36-4191-9d22-b6d1285b45bb'::text, 'd8b9cf80-02f2-446f-b0a1-2d35f98ee57f'::text, 'db5be8e2-e94d-4996-a137-d1e3a9f05786'::text, 'dcdad862-0cb4-4652-8a4a-24bea175f9e2'::text, 'ddf455eb-51f5-4b27-8827-acc626b2d5c3'::text, 'dfeabdd1-6a88-4b92-be27-7e60b9f3126b'::text, 'e61834e8-3000-4e4c-a7eb-a9c366a6b5b5'::text, 'e8a19666-b086-4900-8ca7-7d7cf80f74f6'::text, 'ebc67956-1e0c-4b53-9869-6481ca7e673f'::text, 'f20b5f89-0c92-4aca-a086-55e5406d7ccf'::text, 'f288657a-26f5-44f1-8872-e1db661fb7a4'::text, 'f471d861-fdec-488d-8716-2fcf4a6aa218'::text, 'f6162d18-8de7-4c0e-95e6-079a8eb0593c'::text, 'f8e293a8-c492-4237-a8a0-054c0d104897'::text, 'f9aec285-fc1d-49d6-bf4c-983f75a03f02'::text, 'f9d34e43-36a3-4f07-ab74-e1cc67f9434e'::text, 'fe66a39d-91fd-4040-beca-58d88b9601a3'::text])));
-- @@ index public.identity_edges.identity_edges_person_idx
CREATE INDEX identity_edges_person_idx ON public.identity_edges USING btree (person_id);
-- @@ index public.identity_edges.identity_edges_singular_kind_unique
CREATE UNIQUE INDEX identity_edges_singular_kind_unique ON public.identity_edges USING btree (sod_id, person_id, kind) WHERE (kind <> 'legacy_seed'::text);
-- @@ index public.identity_edges.identity_edges_sod_idx
CREATE INDEX identity_edges_sod_idx ON public.identity_edges USING btree (sod_id);
-- @@ index public.identity_edges.identity_edges_user_idx
CREATE INDEX identity_edges_user_idx ON public.identity_edges USING btree (person_id) WHERE (kind = 'login'::text);
-- @@ index public.persons.persons_account_user_id_unique
CREATE UNIQUE INDEX persons_account_user_id_unique ON public.persons USING btree (account_user_id) WHERE (account_user_id IS NOT NULL);
-- @@ index public.research_contribution_edits.rc_edits_idx
CREATE INDEX rc_edits_idx ON public.research_contribution_edits USING btree (contribution_id, edited_at DESC);
-- @@ index public.research_contributions.rc_author_idx
CREATE INDEX rc_author_idx ON public.research_contributions USING btree (author_user_id);
-- @@ index public.research_contributions.rc_community_body_trgm_idx
CREATE INDEX rc_community_body_trgm_idx ON public.research_contributions USING gin (body gin_trgm_ops) WHERE ((status = 'approved'::text) AND (origin = ANY (ARRAY['openweb'::text, 'community_2029'::text])));
-- @@ index public.research_contributions.rc_deleted_idx
CREATE INDEX rc_deleted_idx ON public.research_contributions USING btree (parent_id) WHERE (deleted_at IS NOT NULL);
-- @@ index public.research_contributions.rc_deleted_root_idx
CREATE INDEX rc_deleted_root_idx ON public.research_contributions USING btree (created_at, id) WHERE ((deleted_at IS NOT NULL) AND (parent_id IS NULL));
-- @@ index public.research_contributions.rc_facets_idx
CREATE INDEX rc_facets_idx ON public.research_contributions USING btree (origin, intent, research_state, status);
-- @@ index public.research_contributions.rc_parent_idx
CREATE INDEX rc_parent_idx ON public.research_contributions USING btree (parent_id);
-- @@ index public.research_contributions.rc_status_idx
CREATE INDEX rc_status_idx ON public.research_contributions USING btree (status, created_at DESC);
-- @@ index public.research_contributions.rc_target_idx
CREATE INDEX rc_target_idx ON public.research_contributions USING btree (target_type, target_id, created_at DESC);
-- @@ index public.subscribe_events.ix_subscribe_events_source
CREATE INDEX ix_subscribe_events_source ON public.subscribe_events USING btree (source);
-- @@ index public.subscribe_events.ix_subscribe_events_topic
CREATE INDEX ix_subscribe_events_topic ON public.subscribe_events USING btree (topic);
-- @@ rls public.anon_contrib_log
alter table public.anon_contrib_log enable row level security;
-- @@ rls public.beit_midrash
alter table public.beit_midrash enable row level security;
-- @@ rls public.community_net_blocks
alter table public.community_net_blocks enable row level security;
-- @@ rls public.community_net_key
alter table public.community_net_key enable row level security;
-- @@ rls public.contribution_events
alter table public.contribution_events enable row level security;
-- @@ rls public.contributors
alter table public.contributors enable row level security;
-- @@ rls public.identity_edges
alter table public.identity_edges enable row level security;
-- @@ rls public.persons
alter table public.persons enable row level security;
-- @@ rls public.research_contribution_deletions
alter table public.research_contribution_deletions enable row level security;
-- @@ rls public.research_contribution_edits
alter table public.research_contribution_edits enable row level security;
-- @@ rls public.research_contributions
alter table public.research_contributions enable row level security;
-- @@ rls public.subscribe_events
alter table public.subscribe_events enable row level security;
-- @@ policy public.beit_midrash.bm_public_read
create policy bm_public_read on public.beit_midrash as PERMISSIVE for SELECT to anon, authenticated using (true);
-- @@ policy public.contribution_events.ce_read_own
create policy ce_read_own on public.contribution_events as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
-- @@ policy public.contributors.contributors_read
create policy contributors_read on public.contributors as PERMISSIVE for SELECT to public using (((COALESCE((dossier_settings ->> 'visibility'::text), 'public'::text) <> 'private'::text) OR (user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'admin'::text))))));
-- @@ policy public.research_contributions.rc_public_read
create policy rc_public_read on public.research_contributions as PERMISSIVE for SELECT to public using (((status = 'approved'::text) OR (author_user_id = auth.uid())));
-- @@ policy public.research_contributions.research_contributions_admin_read
create policy research_contributions_admin_read on public.research_contributions as PERMISSIVE for SELECT to authenticated using (( SELECT rd_is_admin() AS rd_is_admin));
-- @@ policy public.subscribe_events.se_owner_read
create policy se_owner_read on public.subscribe_events as PERMISSIVE for SELECT to public using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::text))))));
-- @@ function public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text, p_target_id text, p_parent_id uuid, p_title text, p_gematria_claim jsonb, p_author_name text, p_image_url text)
CREATE OR REPLACE FUNCTION public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text DEFAULT NULL::text, p_target_id text DEFAULT NULL::text, p_parent_id uuid DEFAULT NULL::uuid, p_title text DEFAULT NULL::text, p_gematria_claim jsonb DEFAULT NULL::jsonb, p_author_name text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_cid uuid;
  v_name text;
  v_status text;
  v_state text;
  new_id uuid;
  v_ip text;
  v_recent int;
  v_trusted boolean := false;
  v_intent text := nullif(btrim(coalesce(p_intent,'')), '');
begin
  if p_body is null or length(btrim(p_body)) = 0 then raise exception 'empty body'; end if;

  if v_intent is null or not (v_intent = any(array[
    'תגובה','חידוש','שאלה','תיקון','תצפית','השערה','מקור','צופן','גימטריה','קשר'
  ]::text[])) then
    raise exception 'invalid intent';
  end if;

  if v_uid is not null then
    select u.id, u.trusted
      into v_cid, v_trusted
    from public.rc_unique_contributor_for_user_v1(v_uid) u;
    v_trusted := coalesce(v_trusted, false);

    v_status := case when v_intent = 'תגובה' then 'approved' else 'pending' end;
    v_state  := case
      when v_intent = 'תגובה' then 'discussion'
      when v_trusted then 'validated'
      else 'idea'
    end;

    select coalesce(nullif(display_name,''), nullif(username,''))
      into v_name
    from public.users
    where id = v_uid
    limit 1;
  else
    -- M0 (12.11.2026): the platform-set client address first (as add_guest_community_message); the first X-Forwarded-For hop is client-controlled.
    v_ip := coalesce(nullif(btrim(coalesce((current_setting('request.headers', true)::json)->>'cf-connecting-ip', '')), ''),
                     nullif(btrim(coalesce((current_setting('request.headers', true)::json)->>'x-real-ip', '')), ''),
                     split_part(coalesce((current_setting('request.headers', true)::json)->>'x-forwarded-for',''), ',', 1));
    v_ip := nullif(btrim(v_ip), '');
    -- Community network protection (26.11.2026): hash first, refuse a blocked network before any log write.
    v_ip := public.community_net_ref_v1(public.community_trusted_client_ip_v1());
    if v_ip is not null and public.community_write_scope_v1(p_origin, p_parent_id) and public.community_net_blocked_v1(v_ip) then raise exception 'community_write_blocked'; end if;
    -- No trusted address header = no reference: a guest write into the community (decided on the server: community origin, or an answer to a stored community message) fails closed, as add_guest_community_message already does; other writes are unchanged.
    if v_ip is null and public.community_write_scope_v1(p_origin, p_parent_id) then raise exception 'rate_limited'; end if;
    if v_ip is not null then
      select count(*) into v_recent
      from public.anon_contrib_log
      where ip in (v_ip, coalesce(public.community_trusted_client_ip_v1(), v_ip)) and created_at > now() - interval '1 hour';
      if v_recent >= 5 then raise exception 'rate_limited'; end if;
      insert into public.anon_contrib_log(ip) values (v_ip);
    end if;
    v_status := 'pending';
    v_state  := 'discussion';
    v_name := left(coalesce(nullif(btrim(p_author_name),''), 'אורח'), 40);
  end if;

  insert into public.research_contributions
    (author_user_id, author_contributor_id, author_name, intent, origin, research_state, status,
     target_type, target_id, parent_id, title, body, gematria_claim, image_url)
  values
    (v_uid, v_cid, v_name, v_intent, coalesce(nullif(p_origin,''),'beit_midrash'),
     v_state, v_status, p_target_type, p_target_id, p_parent_id, p_title,
     left(p_body, 6000), p_gematria_claim, nullif(btrim(p_image_url), ''))
  returning id into new_id;

  if p_parent_id is not null then
    update public.research_contributions
       set last_activity_at = now()
     where id = p_parent_id;
  end if;

  if v_uid is not null and v_status = 'approved' then
    insert into public.contribution_events (user_id, kind, ref, value, source, metadata)
    values (
      v_uid,
      'contribution_posted',
      new_id::text,
      public.contribution_weight(v_intent, false, false, coalesce(nullif(p_origin,''),'beit_midrash') <> 'broadcast'),
      coalesce(nullif(p_origin,''),'beit_midrash'),
      jsonb_build_object('intent', v_intent, 'parent_id', p_parent_id, 'auto', true)
    );
  end if;

  return new_id;
end;
$function$
;
-- @@ function public.claim_follow_prefs_from_identity()
CREATE OR REPLACE FUNCTION public.claim_follow_prefs_from_identity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_vis text;
  v_topics text[] := '{}'::text[];
  v_guest_mute timestamptz;
  v_guest_intensity text;
begin
  if NEW.kind not in ('login', 'legacy_seed') then return NEW; end if;

  select p.account_user_id into v_uid
  from public.persons p
  where p.person_id = NEW.person_id;

  if v_uid is null then return NEW; end if;

  -- Lock every proven browser visitor in deterministic order, then the account projection.
  -- A linked guest watch takes visitor -> account in the same order; an authenticated watch
  -- takes only account. This avoids AB-BA cycles while closing the post-claim orphan window.
  for v_vis in
    select distinct ie.legacy_id
    from public.identity_edges ie
    where ie.person_id = NEW.person_id
      and ie.kind = 'legacy_seed'
      and nullif(btrim(coalesce(ie.legacy_id, '')), '') is not null
    order by ie.legacy_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('visitor:' || v_vis || '|follow-identity', 0)
    );
  end loop;

  perform pg_advisory_xact_lock(
    hashtextextended('user:' || v_uid::text || '|follow-identity', 0)
  );

  -- Re-read only after every relevant Follow projection is quiescent.
  with raw_topics as (
    select unnest(coalesce(np.topics, '{}'::text[])) as topic
    from public.notification_prefs np
    where np.user_id = v_uid
    union all
    select unnest(coalesce(np.topics, '{}'::text[])) as topic
    from public.notification_prefs np
    join public.identity_edges ie
      on ie.kind = 'legacy_seed'
     and ie.legacy_id = np.visitor_id
     and ie.person_id = NEW.person_id
    where np.user_id is null
  ), normalized as (
    select public.canonical_follow_topic(topic) as topic
    from raw_topics
  )
  select coalesce(array_agg(distinct topic order by topic) filter (where topic <> ''), '{}'::text[])
    into v_topics
  from normalized;

  -- Carry mute/intensity only when creating the account projection. Never transfer guest
  -- delivery channels: historical guest {email} is not proof of channel consent.
  select max(np.muted_until),
         (array_agg(np.intensity order by np.updated_at desc))[1]
    into v_guest_mute, v_guest_intensity
  from public.notification_prefs np
  join public.identity_edges ie
    on ie.kind = 'legacy_seed'
   and ie.legacy_id = np.visitor_id
   and ie.person_id = NEW.person_id
  where np.user_id is null;

  if exists (select 1 from public.notification_prefs where user_id = v_uid) then
    update public.notification_prefs
       set topics = v_topics,
           updated_at = now()
     where user_id = v_uid;
  elsif coalesce(array_length(v_topics, 1), 0) > 0 then
    insert into public.notification_prefs(user_id, topics, channels, intensity, muted_until)
      values (v_uid, v_topics, '{}'::text[], coalesce(v_guest_intensity, 'normal'), v_guest_mute);
  end if;

  delete from public.notification_prefs np
   where np.user_id is null
     and exists (
       select 1
       from public.identity_edges ie
       where ie.kind = 'legacy_seed'
         and ie.legacy_id = np.visitor_id
         and ie.person_id = NEW.person_id
     );

  return NEW;
end
$function$
;
-- @@ function public.community_message_context(p_id uuid)
CREATE OR REPLACE FUNCTION public.community_message_context(p_id uuid)
 RETURNS TABLE(id uuid, parent_id uuid, author_name text, author_user_id uuid, author_contributor_id uuid, title text, body text, reactions jsonb, origin text, created_at timestamp with time zone, edited_at timestamp with time zone, is_deleted boolean, contributor_id uuid, contributor_user_id uuid, contributor_display_name text, contributor_avatar_url text, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with recursive up(rid, pid, depth, tomb) as (
    select r.id, r.parent_id, 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r where r.id = p_id
    union all
    select r.id, r.parent_id, up.depth + 1,
           case when r.status = 'approved' and r.deleted_at is null and r.thread_hidden_at is null
                     and r.origin in ('openweb','community_2029') and nullif(btrim(r.body), '') is not null then false
                when r.deleted_at is not null and r.thread_hidden_at is null and r.origin in ('openweb','community_2029') then true
                else null end
    from public.research_contributions r join up on r.id = up.pid
    where up.tomb is not null and up.depth < 30
  ), chain as (
    select * from up where tomb is not null
  )
  select r.id, r.parent_id,
         case when c.tomb then null else r.author_name end,
         case when c.tomb then null else r.author_user_id end,
         case when c.tomb then null else r.author_contributor_id end,
         case when c.tomb then null else r.title end,
         case when c.tomb then null else r.body end,
         case when c.tomb then '{}'::jsonb else r.reactions end,
         r.origin, r.created_at,
         case when c.tomb then null else r.edited_at end,
         c.tomb,
         case when c.tomb then null else ct.id end,
         case when c.tomb then null else ct.user_id end,
         case when c.tomb then null else ct.display_name end,
         case when c.tomb then null else ct.avatar_url end,
         null::bigint
  from chain c
  join public.research_contributions r on r.id = c.rid
  left join public.contributors ct on ct.id = r.author_contributor_id
  -- the target itself must be visible; ancestors stop at the first invisible one
  where exists (select 1 from chain t where t.rid = p_id)
    and exists (select 1 from chain t where t.pid is null)
  order by c.depth desc;
end;
$function$
;
-- @@ function public.edit_contribution(p_id uuid, p_body text)
CREATE OR REPLACE FUNCTION public.edit_contribution(p_id uuid, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_author uuid; v_origin text;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select author_user_id,origin into v_author,v_origin from public.research_contributions where id=p_id;
  if not found then raise exception 'not found'; end if;
  if v_origin in ('openweb','community_2029') then
    perform public.community_edit_message(p_id,p_body);
    return;
  end if;
  if p_body is null or length(btrim(p_body))=0 then raise exception 'empty body'; end if;
  if not public.rd_is_admin() and (v_author is null or v_author is distinct from v_uid) then raise exception 'not authorized'; end if;
  update public.research_contributions set body=left(p_body,6000),updated_at=now() where id=p_id;
end $function$
;
-- @@ function public.moderate_contribution(p_id uuid, p_status text)
CREATE OR REPLACE FUNCTION public.moderate_contribution(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.users u where u.id=auth.uid() and u.role='admin') then
    raise exception 'not authorized'; end if;
  if p_status not in ('hidden','rejected','pending','approved') then raise exception 'bad status'; end if;
  update public.research_contributions set status=p_status, updated_at=now() where id=p_id;
end; $function$
;
-- @@ function public.remove_contribution(p_id uuid)
CREATE OR REPLACE FUNCTION public.remove_contribution(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_author uuid; v_origin text;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select author_user_id,origin into v_author,v_origin from public.research_contributions where id=p_id;
  if not found then raise exception 'not found'; end if;
  if v_origin in ('openweb','community_2029') then
    perform public.community_delete_message(p_id);
    return;
  end if;
  if not public.rd_is_admin() and (v_author is null or v_author is distinct from v_uid) then raise exception 'not authorized'; end if;
  update public.research_contributions set status='hidden',updated_at=now() where id=p_id;
end $function$
;
-- @@ function public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text)
CREATE OR REPLACE FUNCTION public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_key text;
  v_arr jsonb;
  v_reactions jsonb;
  v_added boolean;
  v_parent uuid;
  v_chain_ids uuid[];
  v_chain_parents uuid[];
  v_approved boolean;
  v_has_root boolean;
  v_row record;
  v_locked integer := 0;
  v_repeat boolean := p_visitor in ('community-repeatable-like', 'community-repeatable-dislike');
  v_counter text := case when p_visitor = 'community-repeatable-dislike' then 'community_dislikes' else 'community_likes' end;
  v_repeat_emoji text := case when p_visitor = 'community-repeatable-dislike' then '👎' else '👍' end;
begin
  v_key := coalesce(auth.uid()::text, nullif('v:' || coalesce(nullif(btrim(p_visitor), ''), ''), 'v:'));
  if v_key is null then raise exception 'no identity'; end if;
  -- Community network protection (26.11.2026): guests only; a signed-in account is never blocked because of its network.
  if auth.uid() is null and exists (select 1 from public.research_contributions rc0 where rc0.id = p_id and rc0.origin in ('openweb','community_2029')) then
    if public.community_net_ref_v1(public.community_trusted_client_ip_v1()) is null then raise exception 'rate_limited'; end if;   -- no trusted address header: fail closed
    if public.community_net_blocked_v1(public.community_net_ref_v1(public.community_trusted_client_ip_v1())) then raise exception 'community_write_blocked'; end if;
  end if;
  if p_emoji is null or p_emoji not in ('👍','👎','💡','🔥','🙏','✨')
    or (p_emoji = '👎' and p_visitor is distinct from 'community-repeatable-dislike') then
    raise exception 'bad emoji';
  end if;

  -- A reply must reach an approved root through approved existing ancestors.
  -- Missing rows, nonpublic rows, cycles and chains over the 128-row safety
  -- bound use the same denial and never return reactions or change activity.
  with recursive ancestry as (
    select rc.id, rc.parent_id, rc.status, array[rc.id] as visited, 1 as depth
    from public.research_contributions rc where rc.id = p_id
    union all
    select rc.id, rc.parent_id, rc.status, a.visited || rc.id, a.depth + 1
    from ancestry a join public.research_contributions rc on rc.id = a.parent_id
    where a.depth < 128 and not (rc.id = any(a.visited))
  )
  select array_agg(id order by depth), array_agg(parent_id order by depth),
         bool_and(coalesce(status = 'approved', false)), bool_or(parent_id is null)
  into v_chain_ids, v_chain_parents, v_approved, v_has_root
  from ancestry;
  if v_approved is distinct from true or v_has_root is distinct from true then
    raise exception 'not found';
  end if;

  -- Lock the whole chain from target toward root, then validate its current status
  -- and links. A moderation/reparent/delete racing the initial read fails
  -- closed. This matches admin_boost_reaction's existing target -> parent order;
  -- UUID order would invert its locks for some replies and introduce deadlocks.
  for v_row in
    select rc.id, rc.parent_id, rc.status, rc.reactions, rc.origin, rc.deleted_at, rc.thread_hidden_at
    from public.research_contributions rc where rc.id = any(v_chain_ids)
    order by array_position(v_chain_ids, rc.id) for update
  loop
    if v_row.status is distinct from 'approved'
      or v_row.parent_id is distinct from v_chain_parents[array_position(v_chain_ids, v_row.id)] then
      raise exception 'not found';
    end if;
    if v_repeat and (p_emoji <> v_repeat_emoji or coalesce(v_row.origin,'') not in ('openweb','community_2029')
      or v_row.thread_hidden_at is not null or (v_row.id = p_id and v_row.deleted_at is not null)) then
      raise exception 'not found';
    end if;
    v_locked := v_locked + 1;
    if v_row.id = p_id then
      v_reactions := v_row.reactions;
      v_parent := v_row.parent_id;
    end if;
  end loop;
  if v_locked <> cardinality(v_chain_ids) then raise exception 'not found'; end if;

  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  if v_repeat then
    v_reactions := jsonb_set(v_reactions, array[v_counter],
      to_jsonb(greatest(coalesce((v_reactions->>v_counter)::bigint,0),0) + 1));
    update public.research_contributions set reactions = v_reactions, last_activity_at = now() where id = p_id;
    if v_parent is not null then
      update public.research_contributions set last_activity_at = now() where id = v_parent;
    end if;
    return v_reactions;
  end if;
  v_arr := coalesce(v_reactions -> p_emoji, '[]'::jsonb);
  if v_arr ? v_key then
    v_arr := (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements_text(v_arr) e where e <> v_key);
    v_added := false;
  else
    v_arr := v_arr || to_jsonb(v_key);
    v_added := true;
  end if;

  v_reactions := jsonb_set(v_reactions, array[p_emoji], v_arr);
  if v_added then
    update public.research_contributions set reactions = v_reactions, last_activity_at = now() where id = p_id;
    if v_parent is not null then
      update public.research_contributions set last_activity_at = now() where id = v_parent;
    end if;
  else
    update public.research_contributions set reactions = v_reactions where id = p_id;
  end if;
  return v_reactions;
end;
$function$
;
-- @@ function public.watch_toggle(p_topic text, p_source text, p_on boolean, p_visitor text)
CREATE OR REPLACE FUNCTION public.watch_toggle(p_topic text, p_source text DEFAULT NULL::text, p_on boolean DEFAULT true, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_auth_uid uuid := auth.uid();
  v_uid uuid := v_auth_uid;
  v_topics text[];
  v_has boolean;
  v_vis text;
  v_changed boolean := false;
  v_topic text := public.canonical_follow_topic(p_topic);
  v_equivs text[];
begin
  if v_topic = '' then raise exception 'bad topic'; end if;
  -- Only the explicit Community source gains this public-root capability.
  if p_source = 'community_thread' then
    if v_auth_uid is null then raise exception 'account required' using errcode='42501'; end if;
    if v_topic !~ '^thread:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'invalid community thread' using errcode='22023';
    end if;
    if p_on and not exists (
      select 1 from public.community_message_context(substr(v_topic,8)::uuid) c
      where c.id=substr(v_topic,8)::uuid and c.parent_id is null and not c.is_deleted
    ) then raise exception 'public thread unavailable' using errcode='42501'; end if;
  end if;
  v_equivs := public.follow_topic_aliases(v_topic);

  if v_auth_uid is not null then
    -- Authenticated caller: account identity is authoritative; p_visitor is ignored.
    perform pg_advisory_xact_lock(
      hashtextextended('user:' || v_auth_uid::text || '|follow-identity', 0)
    );
  else
    v_vis := nullif(btrim(coalesce(p_visitor, '')), '');
    if v_vis is null then raise exception 'no identity'; end if;

    -- Guest capability lock first. If a concurrent claim currently owns it we wait; after it
    -- commits, the re-check below sees the new identity edge and routes into the account row.
    perform pg_advisory_xact_lock(
      hashtextextended('visitor:' || v_vis || '|follow-identity', 0)
    );

    select p.account_user_id into v_uid
    from public.identity_edges ie
    join public.persons p on p.person_id = ie.person_id
    where ie.kind = 'legacy_seed'
      and ie.legacy_id = v_vis
      and p.account_user_id is not null
    limit 1;

    if v_uid is not null then
      -- Same order as claim_follow_prefs_from_identity(): visitor -> account.
      perform pg_advisory_xact_lock(
        hashtextextended('user:' || v_uid::text || '|follow-identity', 0)
      );
    end if;
  end if;

  if v_uid is not null then
    select topics into v_topics
    from public.notification_prefs
    where user_id = v_uid
    for update;
  else
    select topics into v_topics
    from public.notification_prefs
    where visitor_id = v_vis
    for update;
  end if;

  v_topics := coalesce(v_topics, '{}');
  v_has := v_topics && v_equivs;

  if p_on then
    if not v_has then
      v_topics := array_append(v_topics, v_topic);
      v_changed := true;
      -- For a linked guest, keep both account and browser provenance. For authenticated calls
      -- visitor_id is NULL; for an unlinked guest user_id is NULL.
      insert into public.subscribe_events(user_id, visitor_id, topic, source, action)
        values (v_uid, v_vis, v_topic, p_source, 'follow');
    elsif not (v_topic = any(v_topics)) or (
      select count(*) from unnest(v_topics) x where x = any(v_equivs)
    ) > 1 then
      -- Representation reconciliation only; never a second Follow event.
      v_topics := array(
        select distinct x
        from unnest(v_topics) x
        where not (x = any(v_equivs))
      );
      v_topics := array_append(v_topics, v_topic);
      v_changed := true;
    end if;
  elsif v_has then
    v_topics := array(
      select distinct x
      from unnest(v_topics) x
      where not (x = any(v_equivs))
    );
    v_changed := true;
    insert into public.subscribe_events(user_id, visitor_id, topic, source, action)
      values (v_uid, v_vis, v_topic, p_source, 'unfollow');
  end if;

  if v_changed then
    if v_uid is not null then
      insert into public.notification_prefs(user_id, topics, channels)
        values (v_uid, v_topics, '{}'::text[])
        on conflict (user_id) do update
          set topics = excluded.topics, updated_at = now();
    else
      insert into public.notification_prefs(visitor_id, topics, channels)
        values (v_vis, v_topics, '{}'::text[])
        on conflict (visitor_id) do update
          set topics = excluded.topics, updated_at = now();
    end if;
  end if;

  return jsonb_build_object(
    'following', p_on and (v_has or v_changed),
    'topic', v_topic,
    'aliases', v_equivs,
    'claimed_account', v_auth_uid is null and v_uid is not null
  );
end
$function$
;
-- @@ function public._community_message_owned_by_caller_v1(p_row research_contributions)
CREATE OR REPLACE FUNCTION public._community_message_owned_by_caller_v1(p_row research_contributions)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select (select auth.uid()) is not null
    and (p_row).origin in ('openweb', 'community_2029')
    and case
      -- An explicit current author cannot be superseded by a conflicting alias.
      when (p_row).author_user_id is not null then
        (p_row).author_user_id = (select auth.uid())
      else exists (
        select 1 from public.contributors c
        where c.id = (p_row).author_contributor_id
          and (
            c.user_id = (select auth.uid())
            or (
              c.user_id is null
              and exists (
                select 1 from public.identity_edges e
                join public.persons p on p.person_id = e.person_id
                where e.kind = 'legacy_seed'
                  and e.legacy_id = 'contributor:' || c.id::text
                  and e.confidence = 100
                  and e.meta->'human_gate' = 'true'::jsonb
                  and p.account_user_id = (select auth.uid())
              )
              and not exists (
                select 1 from public.identity_edges other
                left join public.persons p on p.person_id = other.person_id
                where other.kind = 'legacy_seed'
                  and other.legacy_id = 'contributor:' || c.id::text
                  and p.account_user_id is distinct from (select auth.uid())
              )
            )
          )
      )
    end;
$function$
;
-- @@ function public.canonical_follow_subject(p_entity_type text, p_stable_id text)
CREATE OR REPLACE FUNCTION public.canonical_follow_subject(p_entity_type text, p_stable_id text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  v_type text := lower(btrim(coalesce(p_entity_type, '')));
  v_id text := btrim(coalesce(p_stable_id, ''));
begin
  if v_type = '' or v_id = '' then return ''; end if;

  return case v_type
    when 'number'         then public.canonical_follow_topic('number:' || v_id)
    when 'author'         then public.canonical_follow_topic('author:' || v_id)
    when 'category'       then public.canonical_follow_topic('cat:' || v_id)
    when 'cipher_feed'    then 'codes:new'
    when 'reality_stream' then 'stream:reality'
    when 'media_channel'  then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula') then 'channel:or-geula'
      else public.canonical_follow_topic('channel:' || v_id)
    end
    when 'channel'        then case
      when lower(replace(v_id, '_', '-')) in ('or-geula', 'orgeula') then 'channel:or-geula'
      else public.canonical_follow_topic('channel:' || v_id)
    end
    else ''
  end;
end
$function$
;
-- @@ function public.canonical_follow_topic(p_topic text)
CREATE OR REPLACE FUNCTION public.canonical_follow_topic(p_topic text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  v_topic text := btrim(coalesce(p_topic, ''));
  v_label text;
begin
  if v_topic = '' then return ''; end if;

  if v_topic like 'category:%' then
    v_topic := 'cat:' || substr(v_topic, 10);
  elsif v_topic ~ '^num_[0-9]+$' then
    v_topic := 'number:' || substr(v_topic, 5);
  elsif v_topic = 'els' then
    v_topic := 'codes:new';
  elsif v_topic in ('orgeula:new', 'or-geula', 'channel:orgeula') then
    v_topic := 'channel:or-geula';
  end if;

  if v_topic like 'cat:%' then
    v_label := substr(v_topic, 5);
    v_label := replace(replace(replace(v_label, '"', '״'), '“', '״'), '”', '״');
    return 'cat:' || v_label;
  end if;

  return v_topic;
end
$function$
;
-- @@ function public.community_delete_message(p_id uuid)
CREATE OR REPLACE FUNCTION public.community_delete_message(p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_row public.research_contributions%rowtype;
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'auth required' using errcode='42501'; end if;
  select * into v_row from public.research_contributions where id=p_id for update;
  if not found then raise exception 'not authorized' using errcode='42501'; end if;
  if v_row.author_contributor_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('person_contributor:'||v_row.author_contributor_id::text,1820));
  end if;
  if v_row.origin is null or v_row.origin not in ('openweb','community_2029')
     or not (public.rd_is_admin() or coalesce(public._community_message_owned_by_caller_v1(v_row),false)) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if v_row.graph_node_id is not null or v_row.projected_insight_id is not null then
    raise exception 'source_requires_review' using errcode='55000';
  end if;
  if v_row.deleted_at is not null then return 'already_deleted'; end if;
  if v_row.thread_hidden_at is not null or v_row.status is null or v_row.status not in ('approved','pending') then
    raise exception 'not deletable' using errcode='55000';
  end if;
  insert into public.research_contribution_deletions(contribution_id,body,title,image_url,media,status,deleted_by,deleted_at)
  values(v_row.id,v_row.body,v_row.title,v_row.image_url,v_row.media,v_row.status,v_uid,v_now);
  update public.research_contributions
     set body=null,title=null,image_url=null,media='[]'::jsonb,status='hidden',
         deleted_at=v_now,deleted_by=v_uid,updated_at=v_now
   where id=p_id;
  return 'deleted';
end $function$
;
-- @@ function public.community_edit_message(p_id uuid, p_body text)
CREATE OR REPLACE FUNCTION public.community_edit_message(p_id uuid, p_body text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_row public.research_contributions%rowtype;
  v_body text := btrim(coalesce(p_body,''));
  v_now timestamptz := now();
begin
  if v_uid is null then raise exception 'auth required' using errcode='42501'; end if;
  if length(v_body)=0 or length(v_body)>6000 then
    raise exception 'body must contain 1 to 6000 characters' using errcode='22023';
  end if;
  select * into v_row from public.research_contributions where id=p_id for update;
  if not found then raise exception 'not authorized' using errcode='42501'; end if;
  if v_row.author_contributor_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('person_contributor:'||v_row.author_contributor_id::text,1820));
  end if;
  if not coalesce(public._community_message_owned_by_caller_v1(v_row),false) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if v_row.graph_node_id is not null or v_row.projected_insight_id is not null then
    raise exception 'source_requires_review' using errcode='55000';
  end if;
  if v_row.status is distinct from 'approved' or v_row.deleted_at is not null or v_row.thread_hidden_at is not null then
    raise exception 'not editable' using errcode='55000';
  end if;
  if btrim(coalesce(v_row.body,''))=v_body then return v_row.edited_at; end if;
  insert into public.research_contribution_edits(contribution_id,body,edited_by,edited_at)
  values(v_row.id,v_row.body,v_uid,v_now);
  update public.research_contributions set body=v_body,edited_at=v_now,updated_at=v_now where id=p_id;
  return v_now;
end $function$
;
-- @@ function public.community_has_live_descendant(p_id uuid)
CREATE OR REPLACE FUNCTION public.community_has_live_descendant(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with recursive d(id, deleted, live, depth) as (
    select c.id,
           c.deleted_at is not null and c.thread_hidden_at is null,
           c.status = 'approved' and c.deleted_at is null and c.thread_hidden_at is null
             and c.origin in ('openweb','community_2029') and nullif(btrim(c.body), '') is not null,
           1
    from public.research_contributions c
    where c.parent_id = p_id
    union all
    select c.id,
           c.deleted_at is not null and c.thread_hidden_at is null,
           c.status = 'approved' and c.deleted_at is null and c.thread_hidden_at is null
             and c.origin in ('openweb','community_2029') and nullif(btrim(c.body), '') is not null,
           d.depth + 1
    from public.research_contributions c
    join d on c.parent_id = d.id
    where d.deleted and d.depth < 64
  )
  select exists (select 1 from d where live);
$function$
;
-- @@ function public.community_net_blocked_v1(p_ref text)
CREATE OR REPLACE FUNCTION public.community_net_blocked_v1(p_ref text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select p_ref is not null and exists (select 1 from public.community_net_blocks b
    where b.net_ref = p_ref and b.lifted_at is null and (b.expires_at is null or b.expires_at > now()))
$function$
;
-- @@ function public.community_net_ref_v1(p_ip text)
CREATE OR REPLACE FUNCTION public.community_net_ref_v1(p_ip text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_norm text; v_key bytea;
begin
  if p_ip is null or btrim(p_ip) = '' then return null; end if;
  begin
    v_norm := case when family(btrim(p_ip)::inet) = 6 then host(network(set_masklen(btrim(p_ip)::inet, 64))) else host(btrim(p_ip)::inet) end;
  exception when others then return null;
  end;
  select key into v_key from public.community_net_key where singleton;
  if v_key is null then return null; end if;
  return encode(sha256(v_key || convert_to(v_norm, 'UTF8')), 'hex');
end $function$
;
-- @@ function public.community_reply_counts(p_ids uuid[])
CREATE OR REPLACE FUNCTION public.community_reply_counts(p_ids uuid[])
 RETURNS TABLE(parent_id uuid, reply_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.parent_id, count(*)::bigint
  from public.research_contributions c
  where c.parent_id = any (p_ids[1:200])
    and c.origin in ('openweb','community_2029')
    and c.thread_hidden_at is null
    and (
      (c.status = 'approved' and c.deleted_at is null and nullif(btrim(c.body), '') is not null)
      or (c.deleted_at is not null and public.community_has_live_descendant(c.id))
    )
  group by c.parent_id;
$function$
;
-- @@ function public.community_trusted_client_ip_v1()
CREATE OR REPLACE FUNCTION public.community_trusted_client_ip_v1()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_h jsonb; v_ip text;
begin
  begin v_h := nullif(current_setting('request.headers', true), '')::jsonb; exception when others then return null; end;
  v_ip := nullif(btrim(coalesce(v_h->>'cf-connecting-ip', '')), '');
  if v_ip is null then return null; end if;
  begin perform v_ip::inet; exception when others then return null; end;
  return v_ip;
end $function$
;
-- @@ function public.community_write_scope_v1(p_origin text, p_parent uuid)
CREATE OR REPLACE FUNCTION public.community_write_scope_v1(p_origin text, p_parent uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce(nullif(p_origin, ''), 'beit_midrash') in ('openweb', 'community_2029')
      or (p_parent is not null and exists (select 1 from public.research_contributions r where r.id = p_parent and r.origin in ('openweb', 'community_2029')))
$function$
;
-- @@ function public.contribution_weight(p_intent text, p_verified boolean, p_promoted boolean, p_onsite boolean)
CREATE OR REPLACE FUNCTION public.contribution_weight(p_intent text, p_verified boolean, p_promoted boolean, p_onsite boolean DEFAULT false)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select (case p_intent
    when 'חידוש' then 10 when 'צופן' then 8 when 'גימטריה' then 8 when 'השערה' then 6
    when 'תצפית' then 5 when 'מקור' then 5 when 'תיקון' then 4 when 'קשר' then 3
    when 'שאלה' then 2 else 1 end)
  + case when p_verified then 5 else 0 end
  + case when p_promoted then 5 else 0 end
  + case when p_onsite   then 3 else 0 end;   -- 🏆 עדיפות לכותב-האתר (רשום, לא-משודר)
$function$
;
-- @@ function public.follow_subject_state(p_entity_type text, p_stable_id text, p_visitor text)
CREATE OR REPLACE FUNCTION public.follow_subject_state(p_entity_type text, p_stable_id text, p_visitor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_vis text;
  v_topic text := public.canonical_follow_subject(p_entity_type, p_stable_id);
  v_equivs text[];
  v_topics text[] := '{}'::text[];
begin
  if v_topic = '' then raise exception 'unsupported follow subject'; end if;
  v_equivs := public.follow_topic_aliases(v_topic);

  if v_uid is not null then
    select coalesce(np.topics, '{}'::text[]) into v_topics
    from public.notification_prefs np
    where np.user_id = v_uid;
  else
    v_vis := nullif(btrim(coalesce(p_visitor, '')), '');
    if v_vis is null then raise exception 'no identity'; end if;
    select coalesce(np.topics, '{}'::text[]) into v_topics
    from public.notification_prefs np
    where np.user_id is null and np.visitor_id = v_vis;
  end if;

  v_topics := coalesce(v_topics, '{}'::text[]);
  return jsonb_build_object(
    'following', v_topics && v_equivs,
    'topic', v_topic
  );
end
$function$
;
-- @@ function public.follow_topic_aliases(p_topic text)
CREATE OR REPLACE FUNCTION public.follow_topic_aliases(p_topic text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare
  v_topic text := public.canonical_follow_topic(p_topic);
  v_label text;
  v_straight text;
begin
  if v_topic = '' then return array[]::text[]; end if;

  if v_topic like 'cat:%' then
    v_label := substr(v_topic, 5);
    v_straight := replace(v_label, '״', '"');
    return array(
      select distinct x
      from unnest(array[
        v_topic,
        'cat:' || v_straight,
        'category:' || v_label,
        'category:' || v_straight
      ]) as x
      where x <> ''
    );
  end if;

  if v_topic like 'number:%' then
    v_label := substr(v_topic, 8);
    return array[v_topic, 'num_' || v_label];
  end if;

  if v_topic = 'codes:new' then
    return array['codes:new', 'els'];
  end if;

  if v_topic = 'channel:or-geula' then
    return array['channel:or-geula', 'orgeula:new', 'or-geula', 'channel:orgeula'];
  end if;

  return array[v_topic];
end
$function$
;
-- @@ function public.forum_feed_contributions(p_limit integer)
CREATE OR REPLACE FUNCTION public.forum_feed_contributions(p_limit integer DEFAULT 200)
 RETURNS TABLE(id uuid, author_name text, author_user_id uuid, intent text, research_state text, status text, target_type text, target_id text, title text, body text, image_url text, gematria_claim jsonb, reactions jsonb, reaction_boosts jsonb, pinned_at timestamp with time zone, created_at timestamp with time zone, last_activity_at timestamp with time zone, trusted boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with t as (
    select coalesce(array_agg(user_id) filter (where user_id is not null), '{}') as uids,
           coalesce(array_agg(display_name) filter (where display_name is not null), '{}') as names
    from public.contributors where trusted = true
  ),
  active as (
    select distinct parent_id as id
    from public.research_contributions
    where parent_id is not null and status = 'approved'
  )
  select rc.id, rc.author_name, rc.author_user_id, rc.intent, rc.research_state,
         rc.status, rc.target_type, rc.target_id, rc.title, rc.body, rc.image_url,
         rc.gematria_claim, rc.reactions, coalesce(rc.reaction_boosts,'{}'::jsonb) as reaction_boosts,
         rc.pinned_at, rc.created_at,
         coalesce(rc.last_activity_at, rc.created_at) as last_activity_at,
         ( (rc.author_user_id is not null and rc.author_user_id = any(t.uids))
           or (rc.author_name is not null and rc.author_name = any(t.names)) ) as trusted
  from public.research_contributions rc, t
  where rc.parent_id is null
    and (
      rc.status = 'approved'
      or (rc.status = 'published' and rc.id in (select id from active))
    )
  order by coalesce(rc.last_activity_at, rc.created_at) desc
  limit greatest(1, coalesce(p_limit, 200));
$function$
;
-- @@ function public.rc_unique_contributor_for_user_v1(p_user uuid)
CREATE OR REPLACE FUNCTION public.rc_unique_contributor_for_user_v1(p_user uuid)
 RETURNS TABLE(id uuid, trusted boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH m AS (SELECT c.id, coalesce(c.trusted, false) AS trusted FROM public.contributors c WHERE c.user_id = p_user AND c.active AND c.merged_into IS NULL)
SELECT m.id, m.trusted FROM m WHERE (SELECT count(*) FROM m) = 1;
$function$
;
-- @@ function public.rd_is_admin()
CREATE OR REPLACE FUNCTION public.rd_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin');
$function$
;
-- @@ trigger public.contribution_events.ce_award_after_insert
CREATE TRIGGER ce_award_after_insert AFTER INSERT ON public.contribution_events FOR EACH ROW EXECUTE FUNCTION ce_award();
-- @@ trigger public.identity_edges.trg_identity_edges_claim_follow_prefs
CREATE TRIGGER trg_identity_edges_claim_follow_prefs AFTER INSERT OR UPDATE ON public.identity_edges FOR EACH ROW WHEN ((new.kind = ANY (ARRAY['login'::text, 'legacy_seed'::text]))) EXECUTE FUNCTION claim_follow_prefs_from_identity();
-- @@ trigger public.research_contributions.trg_00_rc_resolve_author_contributor
CREATE TRIGGER trg_00_rc_resolve_author_contributor BEFORE INSERT ON public.research_contributions FOR EACH ROW EXECUTE FUNCTION rc_resolve_author_contributor();
-- @@ trigger public.research_contributions.trg_00_zvi_standing_approve_research_contribution
CREATE TRIGGER trg_00_zvi_standing_approve_research_contribution BEFORE INSERT OR UPDATE OF status, author_contributor_id, author_user_id ON public.research_contributions FOR EACH ROW EXECUTE FUNCTION fn_zvi_standing_approve_research_contribution();
-- @@ trigger public.research_contributions.trg_community_thread_bump_v1
CREATE TRIGGER trg_community_thread_bump_v1 AFTER INSERT OR UPDATE OF status ON public.research_contributions FOR EACH ROW EXECUTE FUNCTION fn_community_thread_bump_v1();
-- @@ trigger public.research_contributions.trg_rc_normalize_author
CREATE TRIGGER trg_rc_normalize_author BEFORE INSERT OR UPDATE OF author_user_id, author_name ON public.research_contributions FOR EACH ROW EXECUTE FUNCTION rc_normalize_author_name();
-- @@ trigger public.research_contributions.trg_rc_notify
CREATE TRIGGER trg_rc_notify AFTER INSERT OR UPDATE OF status ON public.research_contributions FOR EACH ROW EXECUTE FUNCTION notify_on_contribution();
-- @@ trigger public.research_contributions.trg_research_contribution_hint_media_exclusion
CREATE TRIGGER trg_research_contribution_hint_media_exclusion BEFORE INSERT OR UPDATE OF media ON public.research_contributions FOR EACH ROW EXECUTE FUNCTION private_research_item_hint_media_cross_source_guard();
-- @@ tablegrant public.anon_contrib_log
grant DELETE on public.anon_contrib_log to service_role;
grant INSERT on public.anon_contrib_log to service_role;
grant REFERENCES on public.anon_contrib_log to service_role;
grant SELECT on public.anon_contrib_log to service_role;
grant TRIGGER on public.anon_contrib_log to service_role;
grant TRUNCATE on public.anon_contrib_log to service_role;
grant UPDATE on public.anon_contrib_log to service_role;
-- @@ tablegrant public.beit_midrash
grant SELECT on public.beit_midrash to anon;
grant SELECT on public.beit_midrash to authenticated;
grant DELETE on public.beit_midrash to service_role;
grant INSERT on public.beit_midrash to service_role;
grant REFERENCES on public.beit_midrash to service_role;
grant SELECT on public.beit_midrash to service_role;
grant TRIGGER on public.beit_midrash to service_role;
grant TRUNCATE on public.beit_midrash to service_role;
grant UPDATE on public.beit_midrash to service_role;
-- @@ tablegrant public.community_net_blocks
grant DELETE on public.community_net_blocks to service_role;
grant INSERT on public.community_net_blocks to service_role;
grant REFERENCES on public.community_net_blocks to service_role;
grant SELECT on public.community_net_blocks to service_role;
grant TRIGGER on public.community_net_blocks to service_role;
grant TRUNCATE on public.community_net_blocks to service_role;
grant UPDATE on public.community_net_blocks to service_role;
-- @@ tablegrant public.community_net_key
grant DELETE on public.community_net_key to service_role;
grant INSERT on public.community_net_key to service_role;
grant REFERENCES on public.community_net_key to service_role;
grant SELECT on public.community_net_key to service_role;
grant TRIGGER on public.community_net_key to service_role;
grant TRUNCATE on public.community_net_key to service_role;
grant UPDATE on public.community_net_key to service_role;
-- @@ tablegrant public.contribution_events
grant SELECT on public.contribution_events to authenticated;
grant DELETE on public.contribution_events to service_role;
grant INSERT on public.contribution_events to service_role;
grant REFERENCES on public.contribution_events to service_role;
grant SELECT on public.contribution_events to service_role;
grant TRIGGER on public.contribution_events to service_role;
grant TRUNCATE on public.contribution_events to service_role;
grant UPDATE on public.contribution_events to service_role;
-- @@ tablegrant public.contributors
grant DELETE on public.contributors to service_role;
grant INSERT on public.contributors to service_role;
grant REFERENCES on public.contributors to service_role;
grant SELECT on public.contributors to service_role;
grant TRIGGER on public.contributors to service_role;
grant TRUNCATE on public.contributors to service_role;
grant UPDATE on public.contributors to service_role;
-- @@ tablegrant public.identity_edges
grant DELETE on public.identity_edges to service_role;
grant INSERT on public.identity_edges to service_role;
grant REFERENCES on public.identity_edges to service_role;
grant SELECT on public.identity_edges to service_role;
grant TRIGGER on public.identity_edges to service_role;
grant TRUNCATE on public.identity_edges to service_role;
grant UPDATE on public.identity_edges to service_role;
-- @@ tablegrant public.persons
grant DELETE on public.persons to service_role;
grant INSERT on public.persons to service_role;
grant REFERENCES on public.persons to service_role;
grant SELECT on public.persons to service_role;
grant TRIGGER on public.persons to service_role;
grant TRUNCATE on public.persons to service_role;
grant UPDATE on public.persons to service_role;
-- @@ tablegrant public.research_contribution_deletions
grant DELETE on public.research_contribution_deletions to service_role;
grant INSERT on public.research_contribution_deletions to service_role;
grant REFERENCES on public.research_contribution_deletions to service_role;
grant SELECT on public.research_contribution_deletions to service_role;
grant TRIGGER on public.research_contribution_deletions to service_role;
grant TRUNCATE on public.research_contribution_deletions to service_role;
grant UPDATE on public.research_contribution_deletions to service_role;
-- @@ tablegrant public.research_contribution_edits
grant DELETE on public.research_contribution_edits to service_role;
grant INSERT on public.research_contribution_edits to service_role;
grant REFERENCES on public.research_contribution_edits to service_role;
grant SELECT on public.research_contribution_edits to service_role;
grant TRIGGER on public.research_contribution_edits to service_role;
grant TRUNCATE on public.research_contribution_edits to service_role;
grant UPDATE on public.research_contribution_edits to service_role;
-- @@ tablegrant public.research_contributions
grant SELECT on public.research_contributions to anon;
grant SELECT on public.research_contributions to authenticated;
grant DELETE on public.research_contributions to service_role;
grant INSERT on public.research_contributions to service_role;
grant REFERENCES on public.research_contributions to service_role;
grant SELECT on public.research_contributions to service_role;
grant TRIGGER on public.research_contributions to service_role;
grant TRUNCATE on public.research_contributions to service_role;
grant UPDATE on public.research_contributions to service_role;
-- @@ tablegrant public.subscribe_events
grant SELECT on public.subscribe_events to authenticated;
grant DELETE on public.subscribe_events to service_role;
grant INSERT on public.subscribe_events to service_role;
grant REFERENCES on public.subscribe_events to service_role;
grant SELECT on public.subscribe_events to service_role;
grant TRIGGER on public.subscribe_events to service_role;
grant TRUNCATE on public.subscribe_events to service_role;
grant UPDATE on public.subscribe_events to service_role;
-- @@ colgrant public.contributors
grant select (id, slug, display_name, kind, user_id, avatar_url, role, bio, vip, active, source, notes, created_at, updated_at, media, code, locked, tags, building, wa_names, feature_media, merged_into, dossier_settings, trusted, specialty, specialty_label, on_whatsapp, accent, emblem, engaged, page_config, wa_channel, wa_group_url) on public.contributors to anon;
grant select (id, slug, display_name, kind, user_id, avatar_url, role, bio, vip, active, source, notes, created_at, updated_at, media, code, locked, tags, building, wa_names, feature_media, merged_into, dossier_settings, trusted, specialty, specialty_label, on_whatsapp, accent, emblem, engaged, page_config, wa_channel, wa_group_url) on public.contributors to authenticated;
-- @@ fngrant public._community_message_owned_by_caller_v1(p_row research_contributions)
revoke all on function public._community_message_owned_by_caller_v1(p_row research_contributions) from public;
-- @@ fngrant public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text, p_target_id text, p_parent_id uuid, p_title text, p_gematria_claim jsonb, p_author_name text, p_image_url text)
revoke all on function public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text, p_target_id text, p_parent_id uuid, p_title text, p_gematria_claim jsonb, p_author_name text, p_image_url text) from public;
grant execute on function public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text, p_target_id text, p_parent_id uuid, p_title text, p_gematria_claim jsonb, p_author_name text, p_image_url text) to anon;
grant execute on function public.add_contribution(p_intent text, p_origin text, p_body text, p_target_type text, p_target_id text, p_parent_id uuid, p_title text, p_gematria_claim jsonb, p_author_name text, p_image_url text) to authenticated;
-- @@ fngrant public.canonical_follow_subject(p_entity_type text, p_stable_id text)
revoke all on function public.canonical_follow_subject(p_entity_type text, p_stable_id text) from public;
-- @@ fngrant public.canonical_follow_topic(p_topic text)
revoke all on function public.canonical_follow_topic(p_topic text) from public;
-- @@ fngrant public.claim_follow_prefs_from_identity()
revoke all on function public.claim_follow_prefs_from_identity() from public;
-- @@ fngrant public.community_delete_message(p_id uuid)
revoke all on function public.community_delete_message(p_id uuid) from public;
grant execute on function public.community_delete_message(p_id uuid) to authenticated;
-- @@ fngrant public.community_edit_message(p_id uuid, p_body text)
revoke all on function public.community_edit_message(p_id uuid, p_body text) from public;
grant execute on function public.community_edit_message(p_id uuid, p_body text) to authenticated;
-- @@ fngrant public.community_has_live_descendant(p_id uuid)
revoke all on function public.community_has_live_descendant(p_id uuid) from public;
-- @@ fngrant public.community_message_context(p_id uuid)
revoke all on function public.community_message_context(p_id uuid) from public;
grant execute on function public.community_message_context(p_id uuid) to anon;
grant execute on function public.community_message_context(p_id uuid) to authenticated;
-- @@ fngrant public.community_net_blocked_v1(p_ref text)
revoke all on function public.community_net_blocked_v1(p_ref text) from public;
-- @@ fngrant public.community_net_ref_v1(p_ip text)
revoke all on function public.community_net_ref_v1(p_ip text) from public;
-- @@ fngrant public.community_reply_counts(p_ids uuid[])
revoke all on function public.community_reply_counts(p_ids uuid[]) from public;
grant execute on function public.community_reply_counts(p_ids uuid[]) to anon;
grant execute on function public.community_reply_counts(p_ids uuid[]) to authenticated;
-- @@ fngrant public.community_trusted_client_ip_v1()
revoke all on function public.community_trusted_client_ip_v1() from public;
-- @@ fngrant public.community_write_scope_v1(p_origin text, p_parent uuid)
revoke all on function public.community_write_scope_v1(p_origin text, p_parent uuid) from public;
-- @@ fngrant public.contribution_weight(p_intent text, p_verified boolean, p_promoted boolean, p_onsite boolean)
revoke all on function public.contribution_weight(p_intent text, p_verified boolean, p_promoted boolean, p_onsite boolean) from public;
-- @@ fngrant public.edit_contribution(p_id uuid, p_body text)
revoke all on function public.edit_contribution(p_id uuid, p_body text) from public;
grant execute on function public.edit_contribution(p_id uuid, p_body text) to authenticated;
-- @@ fngrant public.follow_subject_state(p_entity_type text, p_stable_id text, p_visitor text)
revoke all on function public.follow_subject_state(p_entity_type text, p_stable_id text, p_visitor text) from public;
grant execute on function public.follow_subject_state(p_entity_type text, p_stable_id text, p_visitor text) to anon;
grant execute on function public.follow_subject_state(p_entity_type text, p_stable_id text, p_visitor text) to authenticated;
-- @@ fngrant public.follow_topic_aliases(p_topic text)
revoke all on function public.follow_topic_aliases(p_topic text) from public;
-- @@ fngrant public.forum_feed_contributions(p_limit integer)
revoke all on function public.forum_feed_contributions(p_limit integer) from public;
grant execute on function public.forum_feed_contributions(p_limit integer) to anon;
grant execute on function public.forum_feed_contributions(p_limit integer) to authenticated;
-- @@ fngrant public.moderate_contribution(p_id uuid, p_status text)
revoke all on function public.moderate_contribution(p_id uuid, p_status text) from public;
grant execute on function public.moderate_contribution(p_id uuid, p_status text) to authenticated;
-- @@ fngrant public.rc_unique_contributor_for_user_v1(p_user uuid)
revoke all on function public.rc_unique_contributor_for_user_v1(p_user uuid) from public;
-- @@ fngrant public.rd_is_admin()
revoke all on function public.rd_is_admin() from public;
grant execute on function public.rd_is_admin() to authenticated;
grant execute on function public.rd_is_admin() to service_role;
-- @@ fngrant public.remove_contribution(p_id uuid)
revoke all on function public.remove_contribution(p_id uuid) from public;
grant execute on function public.remove_contribution(p_id uuid) to authenticated;
-- @@ fngrant public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text)
revoke all on function public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text) from public;
grant execute on function public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text) to anon;
grant execute on function public.toggle_contribution_reaction(p_id uuid, p_emoji text, p_visitor text) to authenticated;
-- @@ fngrant public.watch_toggle(p_topic text, p_source text, p_on boolean, p_visitor text)
revoke all on function public.watch_toggle(p_topic text, p_source text, p_on boolean, p_visitor text) from public;
grant execute on function public.watch_toggle(p_topic text, p_source text, p_on boolean, p_visitor text) to anon;
grant execute on function public.watch_toggle(p_topic text, p_source text, p_on boolean, p_visitor text) to authenticated;
-- @@ function public.pin_contribution(p_id uuid, p_pin boolean)
CREATE OR REPLACE FUNCTION public.pin_contribution(p_id uuid, p_pin boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.users u where u.id=auth.uid() and u.role='admin') then
    raise exception 'not authorized'; end if;
  update public.research_contributions
    set pinned_at = case when p_pin then now() else null end, updated_at = now()
    where id = p_id;
end $function$
;
-- @@ fngrant public.pin_contribution(p_id uuid, p_pin boolean)
revoke all on function public.pin_contribution(p_id uuid, p_pin boolean) from public;
grant execute on function public.pin_contribution(p_id uuid, p_pin boolean) to authenticated;
