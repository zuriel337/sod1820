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
