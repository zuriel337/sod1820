-- PROPOSAL ONLY (ZURIEL, 12.11.2026) — NOT APPLIED. Group «גילוי יומי» -> community chat, per research_intake_foundation_contract §10.
-- WRITE CLASSIFICATION (§10.5): SOURCE_INGRESS_PROVENANCE projected into the community chat input pipeline (research_contributions, "input
-- pipeline only, not Truth owner"). OWNER CHECK: EXTEND_EXISTING — NO new table. Provenance link = the existing (target_type, target_id) of
-- research_contributions ("no duplicated storage", g3 community core). ONE entrance stays: wa-channel-ingest -> channel_updates + group proof.
-- ONE eligibility + censoring source: the public group reader world_group_source_arrivals_v2 (verified identity, consent marker, enabled source,
-- not held, censored text, public media). The chat copy is exactly that reader row; nothing here decides eligibility on its own.
-- ZURIEL decisions: one DAILY thread per group; gilui-yomi only; writers sod1820 / יניב לוי / יצחק שחר קנדרו; from Kandro's 10.11 22:41 UTC message on.
-- Stop: per writer = the reader's own flag (contributors.dossier_settings.general_feed_enabled), which also hides the writer from the public reader;
-- whole feature = disable the two triggers trg_group_chat_sync_v1 (see ROLLBACK). Apply in the Supabase dashboard (DDL), in the three parts below.

-- ===== PART 1 — reader literal (add sod1820 to the reader's list) + sod1820 flag + the two provenance indexes =====
do $do$
declare d text;
begin
  d := pg_get_functiondef('public.world_group_source_arrivals_v2(integer,timestamp with time zone)'::regprocedure);
  if position($q$'shimon-haimov')$q$ in d) = 0 then raise exception 'reader slug list is not as expected: stop'; end if;
  if position('r-b6ce542a2b0747498aba532c886f6de7' in d) = 0 then
    execute replace(d, $q$'shimon-haimov')$q$, $q$'shimon-haimov','r-b6ce542a2b0747498aba532c886f6de7')$q$);
  end if;
end
$do$;
update public.contributors set dossier_settings = coalesce(dossier_settings, '{}'::jsonb) || '{"general_feed_enabled": true}'::jsonb
 where id = 'fc0451e9-2dc8-4ac2-b54c-6b9ae88102bf' and coalesce(dossier_settings ->> 'general_feed_enabled', 'false') <> 'true';
create unique index if not exists research_contributions_group_source_copy_uq on public.research_contributions (target_id)
  where target_type = 'channel_update' and origin = 'community_2029';
create unique index if not exists research_contributions_group_day_uq on public.research_contributions (target_id)
  where target_type = 'group_day' and origin = 'community_2029';

-- ===== PART 2 — the projection functions (no trigger yet: nothing runs until PART 3) =====
create or replace function public.group_chat_sync_update_v1(p_update_id uuid) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $f$
declare
  v_since constant timestamptz := '2026-11-10 22:41:49+00';
  v_channel constant text := 'gilui-yomi';
  v_at timestamptz; a record; c public.contributors%rowtype; v_day date; v_root uuid; v_body text; v_new uuid;
begin
  select cu.created_at into v_at from public.channel_updates cu where cu.id = p_update_id and cu.channel = v_channel and cu.created_at >= v_since;
  if not found then return null; end if;
  if exists (select 1 from public.research_contributions r where r.target_type = 'channel_update' and r.target_id = p_update_id::text and r.origin = 'community_2029') then return null; end if;
  -- the single source of eligibility and censoring: the public reader row of this exact message
  select r.* into a from public.world_group_source_arrivals_v2(10, v_at + interval '1 second') r where r.id = p_update_id and r.group_channel = v_channel;
  if not found then return null; end if;
  select * into c from public.contributors where slug = a.contributor_slug and active is true;
  if not found then return null; end if;
  v_body := coalesce(a.body, '');
  if a.media_url is not null then v_body := btrim(v_body || E'\n' || case when a.media_kind = 'video' then '🎬 ' else '📷 ' end || a.media_url, E'\n'); end if;
  if nullif(btrim(v_body), '') is null then return null; end if;

  v_day := (a.created_at at time zone 'Asia/Jerusalem')::date;
  perform pg_advisory_xact_lock(hashtextextended('group_chat_sync:' || v_channel || ':' || v_day::text, 0));
  select r.id into v_root from public.research_contributions r where r.target_type = 'group_day' and r.target_id = v_channel || ':' || v_day::text and r.origin = 'community_2029';
  if v_root is null then
    insert into public.research_contributions(author_name, intent, origin, research_state, status, title, body, target_type, target_id, created_at)
    values ('גילוי יומי', 'תגובה', 'community_2029', 'discussion', 'approved', 'גילוי יומי — ' || to_char(v_day, 'DD.MM.YYYY'),
            'הודעות מקבוצת גילוי יומי · ' || to_char(v_day, 'DD.MM.YYYY'), 'group_day', v_channel || ':' || v_day::text, a.created_at)
    returning id into v_root;
  end if;
  insert into public.research_contributions(author_user_id, author_contributor_id, author_name, intent, origin, research_state, status, parent_id, body, target_type, target_id, created_at)
  values (c.user_id, c.id, coalesce(nullif(c.display_name, ''), 'חבר הקבוצה'), 'תגובה', 'community_2029', 'discussion', 'approved', v_root, v_body, 'channel_update', p_update_id::text, a.created_at)
  returning id into v_new;
  return v_new;
end
$f$;

-- Catch-up (backfill, late media): safe to call repeatedly.
create or replace function public.group_chat_sync_pending_v1(p_limit integer default 50) returns integer
language plpgsql security definer set search_path = public, pg_temp as $f$
declare r record; n integer := 0;
begin
  for r in
    select g.update_id from public.channel_update_group_proof g join public.channel_updates cu on cu.id = g.update_id
     where g.channel = 'gilui-yomi' and g.identity_contributor_id is not null and g.held_at is null and cu.created_at >= '2026-11-10 22:41:49+00'
       and not exists (select 1 from public.research_contributions x where x.target_type = 'channel_update' and x.target_id = g.update_id::text and x.origin = 'community_2029')
     order by cu.created_at asc limit greatest(1, least(coalesce(p_limit, 50), 200))
  loop
    begin
      if public.group_chat_sync_update_v1(r.update_id) is not null then n := n + 1; end if;
    exception when others then raise warning 'group_chat_sync_pending_v1 % failed: %', r.update_id, sqlerrm;
    end;
  end loop;
  return n;
end $f$;
revoke all on function public.group_chat_sync_update_v1(uuid), public.group_chat_sync_pending_v1(integer) from public, anon, authenticated;

-- ===== PART 3 — the triggers (this is the switch that turns the feature ON for new messages) =====
create or replace function public.tg_group_chat_sync_v1() returns trigger language plpgsql security definer set search_path = public, pg_temp as $f$
begin
  declare v_id uuid;
  begin
    -- the ingest records the proof first and links the contributor to the source row right after: the sync runs on both events
    if TG_TABLE_NAME = 'channel_updates' then v_id := new.id; else v_id := new.update_id; end if;
    perform public.group_chat_sync_update_v1(v_id);
  exception when others then
    raise warning 'group_chat_sync_v1 % failed: %', coalesce(v_id::text, '?'), sqlerrm;
  end;
  return new;
end $f$;
create or replace function public.tg_group_chat_unsync_v1() returns trigger language plpgsql security definer set search_path = public, pg_temp as $f$
declare v_id uuid;
begin
  if TG_TABLE_NAME = 'channel_update_group_proof' then v_id := new.update_id; else v_id := new.id; end if;
  update public.research_contributions r set deleted_at = now()
   where r.deleted_at is null and r.origin = 'community_2029' and r.target_type = 'channel_update' and r.target_id = v_id::text;
  return new;
end $f$;
revoke all on function public.tg_group_chat_sync_v1(), public.tg_group_chat_unsync_v1() from public, anon, authenticated;
drop trigger if exists trg_group_chat_sync_v1 on public.channel_update_group_proof;
create trigger trg_group_chat_sync_v1 after insert on public.channel_update_group_proof for each row execute function public.tg_group_chat_sync_v1();
drop trigger if exists trg_group_chat_sync_v1 on public.group_source_public_media;
create trigger trg_group_chat_sync_v1 after insert on public.group_source_public_media for each row execute function public.tg_group_chat_sync_v1();
drop trigger if exists trg_group_chat_sync_v1 on public.channel_updates;
create trigger trg_group_chat_sync_v1 after update of contributor_id on public.channel_updates
  for each row when (new.contributor_id is not null and new.contributor_id is distinct from old.contributor_id) execute function public.tg_group_chat_sync_v1();
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_update_group_proof;
create trigger trg_group_chat_unsync_v1 after update of held_at on public.channel_update_group_proof
  for each row when (new.held_at is not null and old.held_at is null) execute function public.tg_group_chat_unsync_v1();
drop trigger if exists trg_group_chat_unsync_v1 on public.channel_updates;
create trigger trg_group_chat_unsync_v1 after update of status on public.channel_updates
  for each row when (new.status not in ('live','private') and old.status in ('live','private')) execute function public.tg_group_chat_unsync_v1();

-- ===== SEPARATE STEPS, each only on ZURIEL's explicit go =====
-- (a) backfill the 5 messages since Kandro's (two daily threads):  select public.group_chat_sync_pending_v1(50);
-- (b) optional 2-minute catch-up job:  select cron.schedule('group-chat-sync-v1', '*/2 * * * *', $$select public.group_chat_sync_pending_v1(50)$$);
