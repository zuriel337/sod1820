-- GILUI_YOMI_LIVE_ALL_MEMBERS_ACTIVATION — the ONE moment publication of «הגילוי היומי» starts (ZURIEL 11.11.2026).
-- Production DB change: needs explicit ZURIEL approval, given for this file at the moment it is applied.
-- Requires 20261111170000_gilui_yomi_writer_pins_v1_PROPOSAL.sql and a wa-channel-ingest that reads live_from (PR #1316).
--
-- What it sets, for gilui-yomi only (no other source, and NO channel_updates row, is touched):
--   live_from   = now() — the activation moment. From the next poll (≤ 5 minutes), a message whose provider time is at or after
--                 it is admitted from every member and published live. Any earlier message — also one processed later (backlog,
--                 outage recovery, targeted recovery) — keeps the previous policy: admin_ids allowlist, private.
--   admin_only  = false — research trust (wa-channel-research-intake) stops assuming every author is an allowlisted admin; trust
--                 comes from contributors.trusted / wa_vip_senders / outgoing_contributor. Intake of earlier messages is still
--                 gated by admin_ids (wa-channel-ingest gates by message time while live_from is set). admin_ids stays stored.
--   pin_writers = שחר יצחק קנדרו and יניב לוי, by WhatsApp number, with their public names. The numbers are NOT written in this
--                 file; they come from records that already exist, and the block stops (nothing written) unless each resolves to
--                 exactly one number that is already an admin of this group:
--                   קנדרו — wa_vip_senders.sender (active; approved by ZURIEL 19.7.2026)
--                   לוי   — the verified WhatsApp account link of contributor yaniv-levi (wa_account_links.verified_at is not null)
--                 The public names are the contributors' display names (shachar-kandro, yaniv-levi).
--   pin_hours   = 24.
-- Unchanged on purpose: intake_mode (research_first), use_sender_name (true; live rows of regular members are stored without name
-- by the ingest regardless), enabled, block lists, and the existing trigger trg_gilui_shachar_24h (Kandro's rows expire after
-- 24 hours; it keys on the credit, which is his registry name on his rows, so it keeps applying).
-- The 105 private gilui-yomi rows from before stay private: this file does not touch channel_updates.
-- Stop: STOP_20261111170500_gilui_yomi_live_all_members.sql. Taking published rows down: UNPUBLISH_20261111170500_… (separate approval).

do $$
declare
  v_admins text[];
  v_live_from timestamptz;
  v_kandro text[];
  v_levi text[];
  v_kandro_name text;
  v_levi_name text;
begin
  select admin_ids, live_from into v_admins, v_live_from from public.channel_ingest_sources where channel = 'gilui-yomi' for update;
  if not found then raise exception 'gilui-yomi source not found'; end if;
  if v_live_from is not null then raise exception 'gilui-yomi already activated at % (stop it first; the moment is never moved silently)', v_live_from; end if;

  select array_agg(distinct public.fn_wa_phone_digits(sender) || '@c.us') into v_kandro
    from public.wa_vip_senders
   where name_match = 'יצחק שחר קנדרו' and active is true and public.fn_wa_phone_digits(sender) is not null;
  select array_agg(distinct public.fn_wa_phone_digits(w.phone) || '@c.us') into v_levi
    from public.wa_account_links w
    join public.contributors c on c.user_id = w.user_id
   where c.slug = 'yaniv-levi' and w.verified_at is not null and public.fn_wa_phone_digits(w.phone) is not null;
  select min(display_name) into v_kandro_name from public.contributors where slug = 'shachar-kandro' and active is true having count(*) = 1;
  select min(display_name) into v_levi_name from public.contributors where slug = 'yaniv-levi' and active is true having count(*) = 1;

  if coalesce(array_length(v_kandro, 1), 0) <> 1 then raise exception 'shachar-kandro: expected exactly one number, got %', coalesce(array_length(v_kandro, 1), 0); end if;
  if coalesce(array_length(v_levi, 1), 0) <> 1 then raise exception 'yaniv-levi: expected exactly one number, got %', coalesce(array_length(v_levi, 1), 0); end if;
  if not (v_kandro[1] = any(v_admins)) then raise exception 'shachar-kandro number is not a known gilui-yomi admin'; end if;
  if not (v_levi[1] = any(v_admins)) then raise exception 'yaniv-levi number is not a known gilui-yomi admin'; end if;
  if v_kandro[1] = v_levi[1] then raise exception 'the two writers resolved to the same number'; end if;
  if coalesce(btrim(v_kandro_name), '') = '' or coalesce(btrim(v_levi_name), '') = '' then raise exception 'writer public name missing'; end if;

  update public.channel_ingest_sources
     set live_from = now(),
         admin_only = false,
         pin_writers = jsonb_build_array(
           jsonb_build_object('jid', v_kandro[1], 'name', v_kandro_name),
           jsonb_build_object('jid', v_levi[1], 'name', v_levi_name)),
         pin_hours = 24
   where channel = 'gilui-yomi';
end $$;

-- Record of the moment (returned to the operator; copy it into the AFTER work_log entry — UNPUBLISH needs it).
select channel, live_from as activated_at, admin_only, jsonb_array_length(pin_writers) as pinned_writers, pin_hours
  from public.channel_ingest_sources where channel = 'gilui-yomi';
