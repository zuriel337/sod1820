-- GILUI_YOMI_KANDRO_IDENTITY_BINDING_V1 — PROPOSAL, NOT APPLIED. Runs only with ZURIEL's explicit approval for this exact file (CLAUDE.md 0.4),
-- and only after ZURIEL confirms that the WhatsApp sender of the «הגילוי היומי» messages signed "קנדרו" is שחר יצחק קנדרו (Human Gate).
-- Rollback: supabase/proposed/ROLLBACK_20261111231000_gilui_yomi_kandro_identity_binding_v1.sql · Test: bash scripts/run-gilui-yomi-kandro-sql-test.sh
--
-- ZURIEL 11.11.2026 chose "קישור מספר על ידי מנהל" for the contributor shachar-kandro. Zvi is proved by a verified WhatsApp link; Kandro has
-- no account, so the proof function (record_channel_update_group_proof_v1) can reach him only through contributors.phone.
-- Where the number comes from: the sender of the group messages signed קנדרו. Read live on 11.11.2026, counts only, no number printed:
-- exactly one sender; all 12 of its group proofs carry the name; it is one of the 7 admins of the group; the number matches no contributor
-- phone and no linked WhatsApp account. This file never contains the number: it copies it inside the database, and refuses unless all of
-- that still holds when it runs.
-- What changes: contributors.phone of shachar-kandro only. The column is not readable by anon or authenticated (no column privilege).
-- What does not: every existing proof and row. The first proof of a message stands, so the 12 older messages stay unverified and private.
-- The public reader, the proof function and the ingest are unchanged. From the next message on, his text messages in the group are proved
-- like Zvi's (verified_phone_unique) and shown under «הגילוי היומי», pinned 24 hours in Now.
begin;

do $$
declare n int; k record; v_digits text; v_senders int;
begin
  select count(*) into n from public.contributors where slug = 'shachar-kandro';
  if n <> 1 then raise exception 'KANDRO_BINDING precondition: expected one shachar-kandro contributor, found %', n; end if;
  select * into k from public.contributors where slug = 'shachar-kandro' for update;
  if k.active is not true or k.phone is not null or k.user_id is not null then
    raise exception 'KANDRO_BINDING precondition: shachar-kandro is not in the state read on 11.11.2026 (active, no phone, no account); nothing changed';
  end if;

  select count(*), min(d) into v_senders, v_digits from (
    select distinct public.fn_wa_phone_digits(g.sender_jid) as d
      from public.channel_update_group_proof g join public.channel_updates cu on cu.id = g.update_id
     where g.channel = 'gilui-yomi' and g.incoming is true
       and (coalesce(cu.credit, '') ilike '%קנדרו%' or coalesce(cu.speaker, '') ilike '%קנדרו%')) s;
  if v_senders <> 1 or v_digits is null or length(v_digits) < 9 then
    raise exception 'KANDRO_BINDING precondition: expected exactly one sender of the messages signed קנדרו, found %; nothing changed', v_senders;
  end if;

  if exists (select 1 from public.channel_update_group_proof g join public.channel_updates cu on cu.id = g.update_id
              where public.fn_wa_phone_digits(g.sender_jid) = v_digits
                and not (coalesce(cu.credit, '') ilike '%קנדרו%' or coalesce(cu.speaker, '') ilike '%קנדרו%')) then
    raise exception 'KANDRO_BINDING precondition: the same sender also wrote under another name; nothing changed';
  end if;

  if not exists (select 1 from public.channel_ingest_sources s
                  where s.channel = 'gilui-yomi' and exists (select 1 from unnest(s.admin_ids) a where public.fn_wa_phone_digits(a) = v_digits)) then
    raise exception 'KANDRO_BINDING precondition: the sender is not an admin of gilui-yomi; nothing changed';
  end if;

  if exists (select 1 from public.contributors c where public.fn_wa_phone_digits(c.phone) = v_digits)
     or exists (select 1 from public.wa_account_links w where public.fn_wa_phone_digits(w.phone) = v_digits) then
    raise exception 'KANDRO_BINDING precondition: the number already belongs to a contributor or a linked account; nothing changed';
  end if;

  update public.contributors set phone = v_digits where id = k.id and phone is null;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'KANDRO_BINDING: expected one row updated, got %', n; end if;
end $$;

-- Postcondition: the number resolves to shachar-kandro alone, exactly as the proof function computes candidates.
do $$
declare v_digits text; v_ids uuid[]; v_kandro uuid;
begin
  select id, public.fn_wa_phone_digits(phone) into v_kandro, v_digits from public.contributors where slug = 'shachar-kandro';
  select array_agg(distinct id) into v_ids from (
    select c.id from public.contributors c where v_digits is not null and public.fn_wa_phone_digits(c.phone) = v_digits
    union
    select c.id from public.contributors c join public.wa_account_links w on w.user_id = c.user_id and w.verified_at is not null
     where c.user_id is not null and v_digits is not null and public.fn_wa_phone_digits(w.phone) = v_digits) t;
  if coalesce(array_length(v_ids, 1), 0) <> 1 or v_ids[1] is distinct from v_kandro then
    raise exception 'KANDRO_BINDING postcondition: the number does not resolve to shachar-kandro alone';
  end if;
end $$;

commit;
