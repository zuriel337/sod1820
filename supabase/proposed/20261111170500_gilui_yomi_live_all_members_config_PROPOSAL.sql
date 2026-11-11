-- GILUI_YOMI_LIVE_ALL_MEMBERS_CONFIG — registry data change for «הגילוי היומי» only (ZURIEL 11.11.2026).
-- Requires 20261111170000_gilui_yomi_writer_pins_v1_PROPOSAL.sql. Production DB change: needs explicit ZURIEL approval.
--   * admin_only = false: messages of every member enter (the 7-number allowlist stays stored in admin_ids for rollback).
--   * pin_ids: the two writers ZURIEL named, by WhatsApp number. The numbers are NOT written in this file; they are taken from
--     records that already exist, and the block stops unless each resolves to exactly one number that is already a known admin
--     of this group:
--       שחר יצחק קנדרו — wa_vip_senders.sender (active, approved by ZURIEL 19.7.2026)
--       יניב לוי        — the verified WhatsApp account link of contributor yaniv-levi (wa_account_links.verified_at is not null)
--   * pin_hours = 24 (the daily cadence of the group).
-- intake_mode stays research_first: research intake of this channel does not change.
-- Rollback: ROLLBACK_20261111170500_gilui_yomi_live_all_members_config.sql

do $$
declare
  v_admins text[];
  v_kandro text[];
  v_levi text[];
begin
  select admin_ids into v_admins from public.channel_ingest_sources where channel = 'gilui-yomi';
  if v_admins is null then raise exception 'gilui-yomi source not found'; end if;

  select array_agg(distinct public.fn_wa_phone_digits(sender) || '@c.us') into v_kandro
    from public.wa_vip_senders
   where name_match = 'יצחק שחר קנדרו' and active is true and public.fn_wa_phone_digits(sender) is not null;

  select array_agg(distinct public.fn_wa_phone_digits(w.phone) || '@c.us') into v_levi
    from public.wa_account_links w
    join public.contributors c on c.user_id = w.user_id
   where c.slug = 'yaniv-levi' and w.verified_at is not null and public.fn_wa_phone_digits(w.phone) is not null;

  if coalesce(array_length(v_kandro, 1), 0) <> 1 then raise exception 'shachar-kandro: expected exactly one number, got %', coalesce(array_length(v_kandro, 1), 0); end if;
  if coalesce(array_length(v_levi, 1), 0) <> 1 then raise exception 'yaniv-levi: expected exactly one number, got %', coalesce(array_length(v_levi, 1), 0); end if;
  if not (v_kandro[1] = any(v_admins)) then raise exception 'shachar-kandro number is not a known gilui-yomi admin'; end if;
  if not (v_levi[1] = any(v_admins)) then raise exception 'yaniv-levi number is not a known gilui-yomi admin'; end if;
  if v_kandro[1] = v_levi[1] then raise exception 'the two writers resolved to the same number'; end if;

  update public.channel_ingest_sources
     set admin_only = false,
         pin_ids = array[v_kandro[1], v_levi[1]],
         pin_hours = 24
   where channel = 'gilui-yomi';
end $$;
