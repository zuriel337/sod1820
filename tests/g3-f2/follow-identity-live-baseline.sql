-- SOD1820 G3-F2 isolated Follow/Identity release-gate baseline.
-- Captured from canonical production linswmnnkjxvweumprav on 2026-09-16 before PR #486 is applied.
-- This is intentionally a direct-dependency fixture, not a second schema owner and not a production migration.
-- It reconstructs the live objects that the five PR #486 migrations depend on, while Supabase local supplies
-- the real auth schema, auth.uid()/auth.jwt(), anon/authenticated roles and RLS execution semantics.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text,
  role text default 'user' check (role = any (array['admin'::text,'user'::text])),
  created_at timestamptz default now(),
  display_name text,
  avatar_url text,
  tier text not null default 'free' check (tier = any (array['free'::text,'member'::text])),
  is_researcher boolean not null default false,
  senior_level integer not null default 0
);
alter table public.users enable row level security;
create policy users_select_public on public.users for select to public using (true);
create policy users_update_own on public.users for update to public using (id = auth.uid()) with check (id = auth.uid());

grant all on public.users to service_role;

create table public.contributors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  user_id uuid references public.users(id)
);
alter table public.contributors enable row level security;
grant all on public.contributors to service_role;

create table public.persons (
  person_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_seen timestamptz,
  last_seen timestamptz,
  first_source text,
  first_app_context text,
  account_user_id uuid,
  primary_channel text
);
alter table public.persons enable row level security;
grant all on public.persons to service_role;

create table public.identity_edges (
  id uuid primary key default gen_random_uuid(),
  sod_id text not null,
  person_id uuid not null references public.persons(person_id) on delete cascade,
  kind text not null,
  legacy_id text,
  confidence smallint not null default 100,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  meta jsonb
);
create index identity_edges_person_idx on public.identity_edges(person_id);
create index identity_edges_legacy_idx on public.identity_edges(legacy_id) where legacy_id is not null;
create unique index identity_edges_legacy_seed_row_unique
  on public.identity_edges(sod_id, person_id, legacy_id)
  where kind='legacy_seed' and legacy_id is not null;
create unique index identity_edges_singular_kind_unique
  on public.identity_edges(sod_id, person_id, kind)
  where kind <> 'legacy_seed';
alter table public.identity_edges enable row level security;
grant all on public.identity_edges to service_role;

create table public.notification_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  visitor_id text,
  email text,
  topics text[] not null default '{}'::text[],
  channels text[] not null default '{email}'::text[],
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  intensity text not null default 'normal',
  muted_until timestamptz
);
create unique index notification_prefs_user_uidx on public.notification_prefs(user_id);
create unique index notification_prefs_visitor_uidx on public.notification_prefs(visitor_id);
alter table public.notification_prefs enable row level security;
create policy np_anon_insert on public.notification_prefs for insert to anon with check (user_id is null);
create policy np_anon_select on public.notification_prefs for select to anon using (user_id is null);
create policy np_anon_update on public.notification_prefs for update to anon using (user_id is null) with check (user_id is null);
create policy np_auth_delete on public.notification_prefs for delete to authenticated using (user_id = auth.uid());
create policy np_auth_insert on public.notification_prefs for insert to authenticated with check (user_id = auth.uid());
create policy np_auth_select on public.notification_prefs for select to authenticated using (user_id = auth.uid());
create policy np_auth_update on public.notification_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select,insert,update on public.notification_prefs to anon;
grant select,insert,update,delete on public.notification_prefs to authenticated;
grant all on public.notification_prefs to service_role;

create table public.subscribe_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  visitor_id text,
  topic text not null,
  source text,
  action text not null default 'follow',
  created_at timestamptz not null default now()
);
create index ix_subscribe_events_topic on public.subscribe_events(topic);
create index ix_subscribe_events_source on public.subscribe_events(source);
alter table public.subscribe_events enable row level security;
create policy se_owner_read on public.subscribe_events for select to public
using (user_id = auth.uid() or exists (select 1 from public.users where users.id = auth.uid() and users.role='admin'));
grant select on public.subscribe_events to authenticated;
grant all on public.subscribe_events to service_role;

create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  kind text not null default 'general',
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  source_topic text,
  source_ref text,
  channels_sent text[] not null default '{}'::text[],
  dedupe_key text
);
create index user_notifications_user_idx on public.user_notifications(user_id, created_at desc);
create index user_notifications_email_idx on public.user_notifications(lower(email), created_at desc);
create unique index uq_user_notifications_dedupe on public.user_notifications(dedupe_key) where dedupe_key is not null;
alter table public.user_notifications enable row level security;
create policy un_owner_read on public.user_notifications for select to authenticated
using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt()->>'email','\\x00')));
create policy un_owner_update on public.user_notifications for update to authenticated
using (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt()->>'email','\\x00')))
with check (user_id = auth.uid() or lower(email) = lower(coalesce(auth.jwt()->>'email','\\x00')));
grant select,update on public.user_notifications to authenticated;
grant all on public.user_notifications to service_role;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  stable_id text not null,
  kind text not null,
  source_ref text,
  topics text[] not null default '{}'::text[],
  recipients integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.notification_events enable row level security;
grant all on public.notification_events to service_role;

create table public.channel_updates (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  status text default 'live',
  created_at timestamptz default now(),
  channel text default 'main'
);
alter table public.channel_updates enable row level security;
grant select on public.channel_updates to anon;
grant select,insert,update,delete on public.channel_updates to authenticated;
grant all on public.channel_updates to service_role;

-- Live pre-PR resolver.
create or replace function public.resolve_topics(p_entity_type text, p_stable_id text)
returns text[]
language plpgsql
immutable
set search_path to 'public'
as $function$
begin
  return case p_entity_type
    when 'number' then array['number:' || p_stable_id]
    when 'author' then array['author:' || p_stable_id]
    when 'category' then array['cat:' || p_stable_id]
    when 'cipher_feed' then array['codes:new','els']
    when 'reality_stream' then array['stream:reality']
    else array[]::text[]
  end;
end
$function$;

-- Live pre-PR Watch RPC. PR #486 replaces this function during replay.
create or replace function public.watch_toggle(
  p_topic text,
  p_source text default null,
  p_on boolean default true,
  p_visitor text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_topics text[];
  v_has boolean;
  v_vis text;
  v_changed boolean := false;
begin
  if p_topic is null or btrim(p_topic)='' then raise exception 'bad topic'; end if;
  if v_uid is not null then
    select topics into v_topics from public.notification_prefs where user_id=v_uid for update;
  else
    v_vis := nullif(btrim(coalesce(p_visitor,'')), '');
    if v_vis is null then raise exception 'no identity'; end if;
    select topics into v_topics from public.notification_prefs where visitor_id=v_vis for update;
  end if;
  v_topics := coalesce(v_topics, '{}');
  v_has := p_topic = any(v_topics);
  if p_on and not v_has then
    v_topics := array_append(v_topics, p_topic); v_changed := true;
    insert into public.subscribe_events(user_id,visitor_id,topic,source,action)
      values (v_uid,v_vis,p_topic,p_source,'follow');
  elsif (not p_on) and v_has then
    v_topics := array_remove(v_topics,p_topic); v_changed := true;
    insert into public.subscribe_events(user_id,visitor_id,topic,source,action)
      values (v_uid,v_vis,p_topic,p_source,'unfollow');
  end if;
  if v_changed then
    if v_uid is not null then
      insert into public.notification_prefs(user_id,topics,channels)
        values (v_uid,v_topics,array['email'])
        on conflict (user_id) do update set topics=excluded.topics, updated_at=now();
    else
      insert into public.notification_prefs(visitor_id,topics,channels)
        values (v_vis,v_topics,array['email'])
        on conflict (visitor_id) do update set topics=excluded.topics, updated_at=now();
    end if;
  end if;
  return jsonb_build_object('following',p_on and (v_has or v_changed),'topic',p_topic);
end
$function$;
revoke all on function public.watch_toggle(text,text,boolean,text) from public;
grant execute on function public.watch_toggle(text,text,boolean,text) to anon,authenticated;

-- Live pre-PR follower side effect + trigger. PR #486 tightens this function.
create or replace function public.notify_on_new_follower()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_new text[]; v_topic text; v_name text; v_writer uuid; v_follower_name text; v_body text;
begin
  if TG_OP='INSERT' then
    v_new := coalesce(NEW.topics,'{}');
  else
    select array(select t from unnest(coalesce(NEW.topics,'{}')) t except select o from unnest(coalesce(OLD.topics,'{}')) o) into v_new;
  end if;
  if v_new is null or array_length(v_new,1) is null then return NEW; end if;
  select coalesce(nullif(display_name,''),nullif(username,'')) into v_follower_name from public.users where id=NEW.user_id;
  v_follower_name := coalesce(v_follower_name,'חבר קהילה');
  foreach v_topic in array v_new loop
    if v_topic like 'author:%' then
      v_name := substring(v_topic from 8);
      v_writer := null;
      select id into v_writer from public.users where display_name=v_name limit 1;
      if v_writer is null then
        select user_id into v_writer from public.contributors where user_id is not null and display_name=v_name limit 1;
      end if;
      if v_writer is not null and v_writer is distinct from NEW.user_id then
        v_body := v_follower_name || ' התחיל לעקוב אחריך';
        if not exists (select 1 from public.user_notifications where user_id=v_writer and kind='new_follower' and body=v_body) then
          insert into public.user_notifications(user_id,email,kind,title,body,link)
          select v_writer,lower(u.email),'new_follower','עוקב חדש 👀',v_body,null from public.users u where u.id=v_writer;
        end if;
      end if;
    end if;
  end loop;
  return NEW;
end
$function$;
create trigger trg_np_new_follower after insert or update of topics on public.notification_prefs
for each row execute function public.notify_on_new_follower();

-- Existing single fan-out dispatcher. PR #486 must keep using this path.
create or replace function public.dispatch(
  p_entity_type text,
  p_stable_id text,
  p_kind text,
  p_source_ref text,
  p_title text,
  p_body text,
  p_link text,
  p_exclude uuid default null
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_topics text[];
  v_n integer;
begin
  v_topics := public.resolve_topics(p_entity_type,p_stable_id);
  if v_topics is null or array_length(v_topics,1) is null then return 0; end if;
  insert into public.user_notifications(user_id,email,kind,title,body,link,source_topic,source_ref,channels_sent,dedupe_key)
  select np.user_id,lower(u.email),p_kind,p_title,p_body,p_link,
         (select t from unnest(v_topics) t where t=any(np.topics) limit 1),
         p_source_ref,array['in_app'],np.user_id::text || '|' || p_kind || '|' || coalesce(p_source_ref,'')
  from public.notification_prefs np
  join public.users u on u.id=np.user_id
  where np.user_id is not null
    and np.topics && v_topics
    and np.user_id is distinct from p_exclude
    and (np.muted_until is null or np.muted_until < now())
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count;
  insert into public.notification_events(entity_type,stable_id,kind,source_ref,topics,recipients)
  values (p_entity_type,p_stable_id,p_kind,p_source_ref,v_topics,v_n);
  return v_n;
end
$function$;
