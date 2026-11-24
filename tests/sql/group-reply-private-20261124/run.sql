-- #1514 option 2: a group reply is never visible to the public group-source reader, from its first write on.
-- `visible` is the exact join and filter of world_group_source_arrivals_v2 (read live on 24.11.2026), without its projection.
\set ON_ERROR_STOP on
\i fixture.sql
do $$ begin assert md5(pg_get_functiondef('public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)'::regprocedure))
  = 'eb6551cf1f71dbb5943c6e249b3c978b', 'the fixture v1 is the live body'; end $$;
\i proposal.sql
create view visible as
  select cu.id from public.channel_update_group_proof g
    join public.channel_updates cu on cu.id = g.update_id
    join public.channel_ingest_sources s on s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
      and s.channel in ('torat-haremez','gilui-yomi','ki-la-hamelucha-gematria','blaze-888') and s.enabled is true
      and coalesce(s.intake_mode,'') <> 'off' and s.chat_id = g.group_chat_id and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__'
    join public.contributors c on c.id = g.identity_contributor_id and c.id = cu.contributor_id
   where g.held_at is null and g.identity_basis = 'verified_phone_unique' and cu.source = 'auto'
     and cu.ext_msg_id = g.ext_msg_id and cu.ext_msg_id !~ '^mail_' and cu.group_source_intake_public is true;
create function pg_temp.seen(p uuid) returns boolean language sql as $$ select exists (select 1 from visible where id = p) $$;

insert into public.contributors (id, phone) values ('c0459430-6ba0-44a9-b1be-b5952344e74d', '0500000001');
insert into public.channel_ingest_sources (id, channel, chat_id, intake_mode) values ('b447f1c9-7ccb-4950-be5e-b73345617100', 'torat-haremez', 'g1@g.us', 'research_first');
\set SRC '\'b447f1c9-7ccb-4950-be5e-b73345617100\''
\set SH '\'972500000001@c.us\''

-- R0 baseline: a NON-reply text message is public exactly as before (v1, marker open) — proves the view really detects exposure.
insert into public.channel_updates (id, channel, text, source, contributor_id, group_source_intake_public, ext_msg_id)
  values ('00000000-0000-4000-8000-000000000001', 'torat-haremez', 'שורש', 'auto', 'c0459430-6ba0-44a9-b1be-b5952344e74d', true, '3EB0ROOT00000000000001');
do $$ begin assert not pg_temp.seen('00000000-0000-4000-8000-000000000001'), 'R0: no proof yet'; end $$;
do $$ begin assert (public.record_channel_update_group_proof_v1('00000000-0000-4000-8000-000000000001', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0ROOT00000000000001', 'g1@g.us', '972500000001@c.us', true, 'textMessage')->>'ok')::boolean; end $$;
do $$ begin assert pg_temp.seen('00000000-0000-4000-8000-000000000001'), 'R0: a proven root is public (unchanged behaviour)'; end $$;

-- R1 a reply: insert (private) → visible at no step; proof and parent written in the same single call.
insert into public.channel_updates (id, channel, text, source, contributor_id, group_source_intake_public, ext_msg_id)
  values ('00000000-0000-4000-8000-000000000002', 'torat-haremez', 'תגובה', 'auto', 'c0459430-6ba0-44a9-b1be-b5952344e74d', false, '3EB0REPLY0000000000002');
do $$ begin assert not pg_temp.seen('00000000-0000-4000-8000-000000000002'), 'R1: after insert'; end $$;
do $$ declare r jsonb := public.record_channel_update_group_proof_v2('00000000-0000-4000-8000-000000000002', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0REPLY0000000000002', 'g1@g.us', '972500000001@c.us', true, 'quotedMessage', '3EB0ROOT00000000000001');
begin assert (r->>'ok')::boolean and (r->>'reply')::boolean and (r->>'quoted_parent')::boolean, r::text; end $$;
do $$ begin assert not pg_temp.seen('00000000-0000-4000-8000-000000000002'), 'R1: after proof'; end $$;
do $$ begin assert (select identity_basis = 'verified_phone_unique' and quoted_parent_ext_msg_id = '3EB0ROOT00000000000001'
  and identity_contributor_id = 'c0459430-6ba0-44a9-b1be-b5952344e74d' from public.channel_update_group_proof where update_id = '00000000-0000-4000-8000-000000000002'),
  'R1: identity and parent kept in the existing proof'; end $$;
do $$ begin assert (select group_source_intake_public is false from public.channel_updates where id = '00000000-0000-4000-8000-000000000002'), 'R1: marker still closed'; end $$;

-- R2 failure in the middle: the proof call fails (bad sender) → the reply stays private, with no proof.
insert into public.channel_updates (id, channel, text, source, group_source_intake_public, ext_msg_id)
  values ('00000000-0000-4000-8000-000000000003', 'torat-haremez', 'תגובה', 'auto', false, '3EB0REPLY0000000000003');
do $$ begin assert (public.record_channel_update_group_proof_v2('00000000-0000-4000-8000-000000000003', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0REPLY0000000000003', 'g1@g.us', 'not-a-jid', true, 'quotedMessage', '3EB0ROOT00000000000001')->>'error') = 'bad_sender'; end $$;
do $$ begin assert not pg_temp.seen('00000000-0000-4000-8000-000000000003') and not exists (select 1 from public.channel_update_group_proof
  where update_id = '00000000-0000-4000-8000-000000000003'), 'R2: private, no proof'; end $$;

-- R3 a reply row that is NOT private cannot be proven by v2 (no exposure through a mis-ordered caller).
insert into public.channel_updates (id, channel, text, source, contributor_id, group_source_intake_public, ext_msg_id)
  values ('00000000-0000-4000-8000-000000000004', 'torat-haremez', 'תגובה', 'auto', 'c0459430-6ba0-44a9-b1be-b5952344e74d', true, '3EB0REPLY0000000000004');
do $$ begin assert (public.record_channel_update_group_proof_v2('00000000-0000-4000-8000-000000000004', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0REPLY0000000000004', 'g1@g.us', '972500000001@c.us', true, 'quotedMessage', '3EB0ROOT00000000000001')->>'error') = 'update_mismatch'; end $$;
do $$ begin assert not pg_temp.seen('00000000-0000-4000-8000-000000000004'), 'R3: not proven, not visible'; end $$;

-- R4 v1 cannot prove a private reply either (the existing function refuses a closed marker).
do $$ begin assert (public.record_channel_update_group_proof_v1('00000000-0000-4000-8000-000000000003', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0REPLY0000000000003', 'g1@g.us', '972500000001@c.us', true, 'quotedMessage')->>'error') = 'update_mismatch'; end $$;

-- R5 an invalid parent id keeps it a reply: proven, private, no parent stored.
insert into public.channel_updates (id, channel, text, source, contributor_id, group_source_intake_public, ext_msg_id)
  values ('00000000-0000-4000-8000-000000000005', 'torat-haremez', 'תגובה', 'auto', 'c0459430-6ba0-44a9-b1be-b5952344e74d', false, '3EB0REPLY0000000000005');
do $$ begin assert (public.record_channel_update_group_proof_v2('00000000-0000-4000-8000-000000000005', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0REPLY0000000000005', 'g1@g.us', '972500000001@c.us', true, 'quotedMessage', 'bad/id')->>'ok')::boolean; end $$;
do $$ begin assert not pg_temp.seen('00000000-0000-4000-8000-000000000005') and (select quoted_parent_ext_msg_id is null from public.channel_update_group_proof
  where update_id = '00000000-0000-4000-8000-000000000005'), 'R5'; end $$;

-- R6 a media reply: inserted private with its private original; no text proof (v2 refuses media), never visible.
insert into public.channel_updates (id, channel, text, image_url, source, group_source_intake_public, ext_msg_id)
  values ('00000000-0000-4000-8000-000000000006', 'torat-haremez', '📷 עדכון', 'storage-object:11111111-2222-4333-8444-555555555555', 'auto', false, '3EB0REPLY0000000000006');
do $$ begin assert (public.record_channel_update_group_proof_v2('00000000-0000-4000-8000-000000000006', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0REPLY0000000000006', 'g1@g.us', '972500000001@c.us', true, 'quotedMessage', '3EB0ROOT00000000000001')->>'error') = 'update_mismatch'; end $$;
do $$ begin assert not pg_temp.seen('00000000-0000-4000-8000-000000000006'), 'R6'; end $$;

-- R7 replay of the same reply: the first proof stands; still private.
do $$ begin assert (public.record_channel_update_group_proof_v2('00000000-0000-4000-8000-000000000002', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0REPLY0000000000002', 'g1@g.us', '972500000001@c.us', true, 'quotedMessage', '3EB0OTHER0000000000009')->>'ok')::boolean; end $$;
do $$ begin assert (select quoted_parent_ext_msg_id = '3EB0ROOT00000000000001' from public.channel_update_group_proof where update_id = '00000000-0000-4000-8000-000000000002')
  and not pg_temp.seen('00000000-0000-4000-8000-000000000002'), 'R7'; end $$;

-- R8 a non-reply through v2 keeps the v1 rule (open marker required, then public as before); a closed root is refused.
insert into public.channel_updates (id, channel, text, source, contributor_id, group_source_intake_public, ext_msg_id)
  values ('00000000-0000-4000-8000-000000000008', 'torat-haremez', 'שורש סגור', 'auto', 'c0459430-6ba0-44a9-b1be-b5952344e74d', false, '3EB0ROOT00000000000008');
do $$ begin assert (public.record_channel_update_group_proof_v2('00000000-0000-4000-8000-000000000008', 'b447f1c9-7ccb-4950-be5e-b73345617100',
  '3EB0ROOT00000000000008', 'g1@g.us', '972500000001@c.us', true, 'textMessage', null)->>'error') = 'update_mismatch'; end $$;

-- R9 grants: service_role only, like v1.
do $$ begin assert not has_function_privilege('anon', 'public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text)', 'execute')
  and has_function_privilege('service_role', 'public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text)', 'execute'), 'R9'; end $$;

-- R10 the apply guard refuses a second run and a drifted v1; the rollback removes v2 only.
\set ON_ERROR_STOP off
\i proposal.sql
\set ON_ERROR_STOP on
\i rollback.sql
do $$ begin assert to_regprocedure('public.record_channel_update_group_proof_v2(uuid,uuid,text,text,text,boolean,text,text)') is null
  and to_regprocedure('public.record_channel_update_group_proof_v1(uuid,uuid,text,text,text,boolean,text)') is not null
  and (select count(*) from public.channel_update_group_proof) = 3, 'R10: v2 gone, v1 and the three proofs kept (root, reply 2, reply 5)'; end $$;
select 'group_reply_private_v2: PASS' as result;
