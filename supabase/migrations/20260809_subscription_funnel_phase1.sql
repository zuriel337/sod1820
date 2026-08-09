-- 🧲 מנוע-משפך המנויים — שלב 1 (subscription_funnel_law v3). In-App בלבד. אידמפוטנטיות נאכפת ב-DB.
-- (A) עמודות ל-user_notifications + unique חלקי ל-dedupe (אירוע כפול = התראה אחת).
alter table public.user_notifications
  add column if not exists source_topic text,
  add column if not exists source_ref  text,
  add column if not exists channels_sent text[] not null default '{}',
  add column if not exists dedupe_key   text;
create unique index if not exists uq_user_notifications_dedupe
  on public.user_notifications(dedupe_key) where dedupe_key is not null;

-- (B) subscribe_events — append-only (מקור-מנוי + Audit).
create table if not exists public.subscribe_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, visitor_id text, topic text not null, source text,
  action text not null default 'follow', created_at timestamptz not null default now()
);
alter table public.subscribe_events enable row level security;
drop policy if exists se_owner_read on public.subscribe_events;
create policy se_owner_read on public.subscribe_events for select
  using (user_id = auth.uid() or exists(select 1 from public.users where id=auth.uid() and role='admin'));
grant select on public.subscribe_events to authenticated;
create index if not exists ix_subscribe_events_topic on public.subscribe_events(topic);
create index if not exists ix_subscribe_events_source on public.subscribe_events(source);

-- (C) notify_topic — מנוע ה-fan-out היחיד. In-App בלבד. dedupe: (recipient|kind|source_ref).
create or replace function public.notify_topic(
  p_topic text, p_title text, p_body text, p_link text,
  p_kind text default 'topic_update', p_source_ref text default null, p_exclude_user uuid default null)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_n int;
begin
  insert into public.user_notifications
    (user_id, email, kind, title, body, link, source_topic, source_ref, channels_sent, dedupe_key)
  select np.user_id, lower(u.email), p_kind, p_title, p_body, p_link, p_topic, p_source_ref,
         array['in_app'], np.user_id::text || '|' || p_kind || '|' || coalesce(p_source_ref,'')
  from public.notification_prefs np
  join public.users u on u.id = np.user_id
  where np.user_id is not null and np.topics @> array[p_topic]
    and np.user_id is distinct from p_exclude_user
    and (np.muted_until is null or np.muted_until < now())
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  get diagnostics v_n = row_count; return v_n;
end $function$;

-- (D) watch_toggle — Follow/Unfollow אחיד עם source (append-only · no-dup · refollow=אירוע חדש).
create or replace function public.watch_toggle(
  p_topic text, p_source text default null, p_on boolean default true, p_visitor text default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_uid uuid := auth.uid(); v_topics text[]; v_has boolean; v_vis text; v_changed boolean := false;
begin
  if p_topic is null or btrim(p_topic)='' then raise exception 'bad topic'; end if;
  if v_uid is not null then
    select topics into v_topics from public.notification_prefs where user_id=v_uid for update;
  else
    v_vis := nullif(btrim(coalesce(p_visitor,'')), '');
    if v_vis is null then raise exception 'no identity'; end if;
    select topics into v_topics from public.notification_prefs where visitor_id=v_vis for update;
  end if;
  v_topics := coalesce(v_topics, '{}'); v_has := p_topic = any(v_topics);
  if p_on and not v_has then
    v_topics := array_append(v_topics, p_topic); v_changed := true;
    insert into public.subscribe_events(user_id, visitor_id, topic, source, action) values (v_uid, v_vis, p_topic, p_source, 'follow');
  elsif (not p_on) and v_has then
    v_topics := array_remove(v_topics, p_topic); v_changed := true;
    insert into public.subscribe_events(user_id, visitor_id, topic, source, action) values (v_uid, v_vis, p_topic, p_source, 'unfollow');
  end if;
  if v_changed then
    if v_uid is not null then
      insert into public.notification_prefs(user_id, topics, channels) values (v_uid, v_topics, array['email'])
        on conflict (user_id) do update set topics=excluded.topics, updated_at=now();
    else
      insert into public.notification_prefs(visitor_id, topics, channels) values (v_vis, v_topics, array['email'])
        on conflict (visitor_id) do update set topics=excluded.topics, updated_at=now();
    end if;
  end if;
  return jsonb_build_object('following', p_on and (v_has or v_changed), 'topic', p_topic);
end $function$;
revoke all on function public.watch_toggle(text,text,boolean,text) from public;
grant execute on function public.watch_toggle(text,text,boolean,text) to anon, authenticated;

-- (E) fan-out: פוסט חדש → מנויי cat:<קטגוריה> (התראה אחת לאדם לפוסט; dedupe בלי topic).
create or replace function public.notify_on_post_publish()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if NEW.categories is null or array_length(NEW.categories,1) is null then return NEW; end if;
  if coalesce(NEW.date, now()) < now() - interval '2 hours' then return NEW; end if;
  insert into public.user_notifications
    (user_id, email, kind, title, body, link, source_topic, source_ref, channels_sent, dedupe_key)
  select np.user_id, lower(u.email), 'post_new', 'פוסט חדש ב' || t.cat, NEW.title, '/' || NEW.slug,
         'cat:' || t.cat, NEW.id::text, array['in_app'], np.user_id::text || '|post_new|' || NEW.id::text
  from public.notification_prefs np
  join public.users u on u.id = np.user_id
  cross join lateral unnest(NEW.categories) as t(cat)
  where np.user_id is not null and np.topics @> array['cat:' || t.cat]
    and (np.muted_until is null or np.muted_until < now())
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  return NEW;
end $function$;
drop trigger if exists trg_posts_notify on public.posts;
create trigger trg_posts_notify after insert on public.posts for each row execute function public.notify_on_post_publish();

-- (F) fan-out: צופן-קהילה חדש (published) → מנויי codes:new.
create or replace function public.notify_on_cipher_publish()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if coalesce(NEW.status,'') = 'published' and coalesce(NEW.source,'') = 'community'
     and (TG_OP = 'INSERT' or coalesce(OLD.status,'') <> 'published') then
    perform public.notify_topic('codes:new', 'צופן חדש עלה 🔐',
       coalesce(nullif(NEW.title,''), nullif(NEW.search_term,''), 'צופן חדש'),
       '/codes/' || NEW.slug, 'code_new', NEW.id::text, null);
  end if;
  return NEW;
end $function$;
drop trigger if exists trg_cipher_notify on public.els_records;
create trigger trg_cipher_notify after insert or update of status on public.els_records
  for each row execute function public.notify_on_cipher_publish();
