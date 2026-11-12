-- GILUI_YOMI_ZVI_PARITY_INTAKE_V1 — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4).
-- Rollback: supabase/proposed/ROLLBACK_20261111230000_gilui_yomi_zvi_parity_intake_v1.sql
-- Test (throwaway local PostgreSQL only): bash scripts/run-gilui-yomi-zvi-parity-sql-test.sh
--
-- ZURIEL 11.11.2026: «הגילוי היומי» — "בדיוק באותו מתכונת כמו צבי מקבוצת תורת הרמז, זה תוכן ציבורי, להכיל את אותם הגדרות".
-- Read live on 11.11.2026, the two sources differ in ONE intake setting: «תורת הרמז» admin_only=false, «הגילוי היומי» admin_only=true
-- (7 admin ids). Everything else that defines the model is already equal: enabled, intake_mode=research_first, use_sender_name,
-- capture_outgoing, poll_every_min=5, a real group chat. The ingest (v33), the proof function and the public reader already treat
-- «הגילוי היומי» exactly like «תורת הרמז».
--
-- What this changes: the ingest admits every member's message of «הגילוי היומי» (not only the 7 admins) — as research intake
-- (status private), exactly like «תורת הרמז». A message becomes public ONLY through world_group_source_arrivals_v2: group proof +
-- verified_phone_unique + an approved writer + the editorial flag + text-only + redaction. A regular member's message is never public.
-- What this does NOT change: intake_mode, enabled, use_sender_name, capture_outgoing, poll_every_min, admin_ids (kept, so the rollback
-- restores the exact previous admission), block lists, min_ts, the ingest function, the proof function, the public reader, triggers,
-- RLS, grants, or any existing row. Older messages are not re-read: the ingest continues from its saved position, so nothing older
-- than the switch is admitted, and old private rows stay private.
begin;

do $$
declare n int; s record; t record;
begin
  select count(*) into n from public.channel_ingest_sources where channel = 'gilui-yomi';
  if n <> 1 then raise exception 'GILUI_YOMI_PARITY precondition: expected exactly one gilui-yomi source, found %', n; end if;
  select count(*) into n from public.channel_ingest_sources where channel = 'torat-haremez';
  if n <> 1 then raise exception 'GILUI_YOMI_PARITY precondition: expected exactly one torat-haremez source, found %', n; end if;

  select * into s from public.channel_ingest_sources where channel = 'gilui-yomi' for update;
  select * into t from public.channel_ingest_sources where channel = 'torat-haremez';

  -- The model it copies, exactly as read live.
  if t.enabled is not true or t.intake_mode is distinct from 'research_first' or t.admin_only is not false
     or t.use_sender_name is not true or t.capture_outgoing is not true or t.poll_every_min is distinct from 5
     or t.chat_id not like '%@g.us' then
    raise exception 'GILUI_YOMI_PARITY precondition: torat-haremez is not in the reference state; nothing changed';
  end if;
  -- The source it changes, exactly as read live (admin_only=true with its admin list).
  if s.enabled is not true or s.intake_mode is distinct from 'research_first' or s.admin_only is not true
     or coalesce(array_length(s.admin_ids, 1), 0) = 0
     or s.use_sender_name is not true or s.capture_outgoing is not true or s.poll_every_min is distinct from 5
     or s.chat_id not like '%@g.us' then
    raise exception 'GILUI_YOMI_PARITY precondition: gilui-yomi is not in the expected state (already applied, or changed since 11.11.2026); nothing changed';
  end if;

  update public.channel_ingest_sources set admin_only = false where id = s.id and admin_only is true;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'GILUI_YOMI_PARITY: expected one row updated, got %', n; end if;
end $$;

-- Postcondition: the intake settings that define the model are now identical; nothing else moved.
do $$
declare g record; t record;
begin
  select * into g from public.channel_ingest_sources where channel = 'gilui-yomi';
  select * into t from public.channel_ingest_sources where channel = 'torat-haremez';
  if (g.enabled, g.intake_mode, g.admin_only, g.use_sender_name, g.capture_outgoing, g.poll_every_min)
     is distinct from (t.enabled, t.intake_mode, t.admin_only, t.use_sender_name, t.capture_outgoing, t.poll_every_min) then
    raise exception 'GILUI_YOMI_PARITY postcondition: gilui-yomi intake settings still differ from torat-haremez';
  end if;
  if coalesce(array_length(g.admin_ids, 1), 0) = 0 then
    raise exception 'GILUI_YOMI_PARITY postcondition: admin_ids must be kept for the rollback';
  end if;
end $$;

commit;
