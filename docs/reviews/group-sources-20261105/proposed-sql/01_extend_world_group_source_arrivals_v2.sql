-- PROPOSAL, approved by ZURIEL ("להחיל רק את 01") but NOT YET APPLIED (the Supabase connector asked for a confirmation that got no answer). Same signature, same filters; one added column.
-- Extends the EXISTING reader (no parallel feed/RPC): same name, same arguments, same proof/hold/privacy filters, same writer allowlist
-- and the same redaction. Added: (1) the group's channel as `group_channel` so each publication can be labelled by its source group;
-- (2) the ki-la-hamelucha-gematria channel in the public group list. Old clients ignore the extra column.
-- Media is deliberately NOT part of this proposal: the proof table has `text_only boolean check (text_only is true)` and the intake never
-- flags media rows public, so public group media needs its own gated change (see README, "Blocked").
drop function if exists public.world_group_source_arrivals_v2(integer, timestamp with time zone);

create function public.world_group_source_arrivals_v2(p_limit integer default 12, p_before timestamp with time zone default null)
 returns table(id uuid, body text, created_at timestamp with time zone, contributor_slug text, contributor_name text, group_proof boolean, proof_basis text, group_channel text)
 language sql stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select cu.id,
         left(regexp_replace(regexp_replace(regexp_replace(cu.text, '(https?://|www\.)\S+', '[קישור]', 'gi'),
              '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
              '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'), 1200),
         cu.created_at, c.slug, c.display_name, true, g.identity_basis, cu.channel
    from public.channel_update_group_proof g
    join public.channel_updates cu on cu.id = g.update_id
    join public.channel_ingest_sources s
      on s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
     and s.channel in ('torat-haremez','gilui-yomi','ki-la-hamelucha-gematria')
     and s.enabled is true and coalesce(s.intake_mode,'') <> 'off'
     and s.chat_id = g.group_chat_id and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__'
    join public.contributors c on c.id = g.identity_contributor_id and c.id = cu.contributor_id
   where g.held_at is null
     and g.identity_basis = 'verified_phone_unique'
     and cu.source = 'auto' and cu.ext_msg_id = g.ext_msg_id and cu.ext_msg_id !~ '^mail_'
     and cu.group_source_intake_public is true
     and cu.status in ('live','private')                       -- off / hidden / blocked never qualify
     and (cu.expires_at is null or cu.expires_at > now())
     and cu.image_url is null and cu.thumb_url is null
     and cu.text is not null and length(btrim(cu.text)) > 0
     and cu.text !~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)'
     and c.active is true
     and c.slug in ('tzvi-opoc','yaniv-levi','shachar-kandro','shimon-haimov')
     and coalesce(c.dossier_settings ->> 'general_feed_enabled','false') = 'true'
     and (p_before is null or cu.created_at < p_before)
   order by cu.created_at desc, cu.id
   limit greatest(1, least(coalesce(p_limit,12), 40));
$function$;

revoke all on function public.world_group_source_arrivals_v2(integer, timestamp with time zone) from public;
grant execute on function public.world_group_source_arrivals_v2(integer, timestamp with time zone) to anon, authenticated, service_role;
-- ACL verified read-only before applying: {postgres=X, anon=X, authenticated=X, service_role=X}; identical after.
