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
