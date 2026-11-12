-- PROPOSAL ONLY (ZURIEL, 12.11.2026) — NOT APPLIED. Group «גילוי יומי» -> community chat.
-- ZURIEL decisions: one DAILY thread per group (root «גילוי יומי — DD.MM.YYYY», messages are replies under it);
-- gilui-yomi only; writers sod1820 / יניב לוי / יצחק שחר קנדרו; only messages from Kandro's 10.11 22:41 UTC message onward.
-- Safety: same consent chain as the public group reader (verified phone identity, intake_public flag, enabled source, not held,
-- same text censoring, media only when the public copy exists and is publishable). A held/hidden source row soft-deletes its chat copy.
-- Kill switch: update public.group_chat_sync_channels set enabled=false. A failure in the sync never breaks the ingest (warning only).
-- Apply in the Supabase dashboard SQL editor (DDL). The channel is seeded DISABLED; enabling + backfill are separate, explicit steps (see end).
begin;

create table if not exists public.group_chat_sync_channels(
  channel text primary key, enabled boolean not null default false, since_at timestamptz not null);
create table if not exists public.group_chat_sync_writers(
  channel text not null, contributor_id uuid not null, primary key(channel, contributor_id));
create table if not exists public.group_chat_sync_map(
  update_id uuid primary key, contribution_id uuid not null, root_id uuid not null, channel text not null,
  synced_at timestamptz not null default now());
create table if not exists public.group_chat_daily_roots(
  channel text not null, day date not null, root_id uuid not null, primary key(channel, day));
alter table public.group_chat_sync_channels enable row level security;
alter table public.group_chat_sync_writers enable row level security;
alter table public.group_chat_sync_map enable row level security;
alter table public.group_chat_daily_roots enable row level security;
revoke all on public.group_chat_sync_channels, public.group_chat_sync_writers, public.group_chat_sync_map, public.group_chat_daily_roots from anon, authenticated;

insert into public.group_chat_sync_channels(channel, enabled, since_at) values ('gilui-yomi', false, '2026-11-10 22:41:49+00') on conflict (channel) do nothing;
insert into public.group_chat_sync_writers(channel, contributor_id) values
  ('gilui-yomi', 'fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf'),
  ('gilui-yomi', 'd0fe09cd-ccc2-4f37-9c94-0de9e75e2b86'),
  ('gilui-yomi', 'e4fc2c19-9669-49e5-9564-d27cc3558f67') on conflict do nothing;

-- Same censoring as world_group_source_arrivals_v2 (YouTube links kept without tracking tail, other links/emails/phones masked, 1200 chars).
create or replace function public.group_chat_safe_text_v1(p text) returns text language sql immutable set search_path = public, pg_temp as $f$
  select left(regexp_replace(regexp_replace(regexp_replace(regexp_replace(p,
    '((https?://)?(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])\S*', '\1', 'gi'),
    '(https?://|www\.)(?!(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}(?![A-Za-z0-9_-]))\S+', '[קישור]', 'gi'),
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
    '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'), 1200)
$f$;

create or replace function public.group_chat_sync_update_v1(p_update_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $f$
declare
  g public.channel_update_group_proof%rowtype; cu public.channel_updates%rowtype; c public.contributors%rowtype;
  cfg public.group_chat_sync_channels%rowtype; m public.group_source_public_media%rowtype;
  v_day date; v_root uuid; v_body text; v_url text; v_new uuid; v_label text;
begin
  if exists (select 1 from public.group_chat_sync_map where update_id = p_update_id) then return null; end if;
  select * into g from public.channel_update_group_proof where update_id = p_update_id;
  if not found then return null; end if;
  select * into cfg from public.group_chat_sync_channels where channel = g.channel and enabled is true;
  if not found then return null; end if;
  select * into cu from public.channel_updates where id = p_update_id;
  if not found or cu.created_at < cfg.since_at then return null; end if;
  if g.held_at is not null or g.identity_basis is distinct from 'verified_phone_unique' or g.identity_contributor_id is null then return null; end if;
  if not exists (select 1 from public.group_chat_sync_writers w where w.channel = g.channel and w.contributor_id = g.identity_contributor_id) then return null; end if;
  select * into c from public.contributors where id = g.identity_contributor_id and active is true;
  if not found or c.id is distinct from cu.contributor_id then return null; end if;
  if not exists (select 1 from public.channel_ingest_sources s where s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
      and s.enabled is true and coalesce(s.intake_mode,'') <> 'off' and s.chat_id = g.group_chat_id and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__') then return null; end if;
  if cu.source is distinct from 'auto' or cu.ext_msg_id is distinct from g.ext_msg_id or cu.ext_msg_id ~ '^mail_'
     or cu.group_source_intake_public is not true or cu.status not in ('live','private') then return null; end if;
  if cu.text is null or length(btrim(cu.text)) = 0 or cu.text ~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)' then return null; end if;

  if g.text_only is true then
    if cu.image_url is not null or cu.thumb_url is not null then return null; end if;
    v_body := public.group_chat_safe_text_v1(cu.text);
  else
    select * into m from public.group_source_public_media where update_id = p_update_id and media_kind = g.media_kind;
    if not found or not exists (select 1 from storage.objects o where o.bucket_id = 'media' and o.name = m.object_path)
       or not public.group_source_media_publishable_v1(p_update_id) then return null; end if;
    v_url := 'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/' || m.object_path;
    v_label := case when m.media_kind = 'video' then '🎬 ' else '📷 ' end;
    v_body := case when btrim(cu.text) in ('📷 עדכון', '🎬 עדכון וידאו') then '' else public.group_chat_safe_text_v1(cu.text) end;
    v_body := btrim(v_body || E'\n' || v_label || v_url, E'\n');
  end if;
  if nullif(btrim(v_body), '') is null then return null; end if;

  v_day := (cu.created_at at time zone 'Asia/Jerusalem')::date;
  perform pg_advisory_xact_lock(hashtextextended('group_chat_sync:' || g.channel || ':' || v_day::text, 0));
  select root_id into v_root from public.group_chat_daily_roots where channel = g.channel and day = v_day;
  if v_root is null then
    insert into public.research_contributions(author_name, intent, origin, research_state, status, title, body, created_at)
    values ('גילוי יומי', 'תגובה', 'community_2029', 'discussion', 'approved',
            'גילוי יומי — ' || to_char(v_day, 'DD.MM.YYYY'), 'הודעות מקבוצת גילוי יומי · ' || to_char(v_day, 'DD.MM.YYYY'), cu.created_at)
    returning id into v_root;
    insert into public.group_chat_daily_roots(channel, day, root_id) values (g.channel, v_day, v_root);
  end if;

  insert into public.research_contributions(author_user_id, author_contributor_id, author_name, intent, origin, research_state, status, parent_id, body, created_at)
  values (c.user_id, c.id, coalesce(nullif(c.display_name, ''), 'חבר הקבוצה'), 'תגובה', 'community_2029', 'discussion', 'approved', v_root, v_body, cu.created_at)
  returning id into v_new;
  insert into public.group_chat_sync_map(update_id, contribution_id, root_id, channel) values (p_update_id, v_new, v_root, g.channel);
  return v_new;
end
$f$;

-- Trigger wrapper: the sync can never break the ingest.
create or replace function public.tg_group_chat_sync_v1() returns trigger language plpgsql security definer set search_path = public, pg_temp as $f$
begin
  begin
    perform public.group_chat_sync_update_v1(new.update_id);
  exception when others then
    raise warning 'group_chat_sync_v1 % failed: %', new.update_id, sqlerrm;
  end;
  return new;
end $f$;
drop trigger if exists trg_group_chat_sync_v1 on public.channel_update_group_proof;
create trigger trg_group_chat_sync_v1 after insert on public.channel_update_group_proof
  for each row execute function public.tg_group_chat_sync_v1();
drop trigger if exists trg_group_chat_sync_v1 on public.group_source_public_media;
create trigger trg_group_chat_sync_v1 after insert on public.group_source_public_media
  for each row execute function public.tg_group_chat_sync_v1();

-- Held / hidden at the source -> the chat copy is soft-deleted (never restored automatically).
create or replace function public.tg_group_chat_unsync_v1() returns trigger language plpgsql security definer set search_path = public, pg_temp as $f$
declare v_id uuid;
begin
  if TG_TABLE_NAME = 'channel_update_group_proof' then v_id := new.update_id; else v_id := new.id; end if;
  update public.research_contributions r set deleted_at = now()
   where r.deleted_at is null and r.id in (select contribution_id from public.group_chat_sync_map where update_id = v_id);
  return new;
end $f$;
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_update_group_proof;
create trigger trg_group_chat_unsync_v1 after update of held_at on public.channel_update_group_proof
  for each row when (new.held_at is not null and old.held_at is null) execute function public.tg_group_chat_unsync_v1();
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_updates;
create trigger trg_group_chat_unsync_v1 after update of status on public.channel_updates
  for each row when (new.status not in ('live','private') and old.status in ('live','private')) execute function public.tg_group_chat_unsync_v1();

-- Catch-up (backfill and late media / flags): safe to call repeatedly.
create or replace function public.group_chat_sync_pending_v1(p_limit integer default 50) returns integer
language plpgsql security definer set search_path = public, pg_temp as $f$
declare r record; n integer := 0;
begin
  for r in
    select g.update_id from public.channel_update_group_proof g
      join public.group_chat_sync_channels cfg on cfg.channel = g.channel and cfg.enabled is true
      join public.group_chat_sync_writers w on w.channel = g.channel and w.contributor_id = g.identity_contributor_id
      join public.channel_updates cu on cu.id = g.update_id and cu.created_at >= cfg.since_at
     where g.held_at is null and not exists (select 1 from public.group_chat_sync_map x where x.update_id = g.update_id)
     order by cu.created_at asc limit greatest(1, least(coalesce(p_limit, 50), 200))
  loop
    begin
      if public.group_chat_sync_update_v1(r.update_id) is not null then n := n + 1; end if;
    exception when others then raise warning 'group_chat_sync_pending_v1 % failed: %', r.update_id, sqlerrm;
    end;
  end loop;
  return n;
end $f$;

revoke all on function public.group_chat_safe_text_v1(text), public.group_chat_sync_update_v1(uuid), public.tg_group_chat_sync_v1(),
  public.tg_group_chat_unsync_v1(), public.group_chat_sync_pending_v1(integer) from public, anon, authenticated;

commit;

-- ===== SEPARATE STEPS, each only on ZURIEL's explicit go =====
-- (a) enable + backfill (publishes the 5 messages since Kandro's, in two daily threads):
--   update public.group_chat_sync_channels set enabled = true where channel = 'gilui-yomi';
--   select public.group_chat_sync_pending_v1(50);
-- (b) 2-minute catch-up job (late media / flags):
--   select cron.schedule('group-chat-sync-v1', '*/2 * * * *', $$select public.group_chat_sync_pending_v1(50)$$);
