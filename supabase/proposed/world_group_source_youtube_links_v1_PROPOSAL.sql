-- PROPOSAL ONLY — NOT APPLIED. Not in supabase/migrations; needs an explicit ZURIEL decision (privacy + DB change, CLAUDE.md 0.4).
-- Task: SOD1820 2029 media completion (11.11.2026). Owner: world group source provenance v2 (migration 20261008190000).
--
-- Today world_group_source_arrivals_v2 replaces EVERY address in a public group message with [קישור], so a public YouTube link
-- shared in a World group never reaches the site. This proposal changes only that one expression: a canonical YouTube address
-- (youtube.com/watch?v=, /shorts/, /live/, /embed/, youtu.be/, with or without www./m., followed by an exact 11-character id)
-- is kept; every other address, a look-alike host and a malformed id stay redacted exactly as now. E-mail and phone redaction,
-- the proof join, the public flag, ordering, limits and grants are unchanged. Verified read-only on 11.11.2026 with a SELECT
-- over sample text (youtu.be / m.youtube shorts kept; evil.com/youtube.com/..., youtube.com.evil.test, 12-char id redacted).
-- The client side already keeps YouTube hosts (redactGroupText) and renders them through the shared click-to-load card only
-- where the presentation decision allows it; group sources stay labelled "מקור · טרם נבדק".
--
-- Rollback: re-apply the function body from supabase/migrations/20261008190000_world_group_source_provenance_v2.sql.
create or replace function public.world_group_source_arrivals_v2(p_limit integer default 12, p_before timestamptz default null)
returns table (id uuid, body text, created_at timestamptz, contributor_slug text, contributor_name text,
               group_proof boolean, proof_basis text)
language sql stable security definer set search_path = public, pg_temp as $$
  select cu.id,
         left(regexp_replace(regexp_replace(regexp_replace(cu.text, '(https?://|www\.)(?!(www\.|m\.)?(youtube\.com/(watch\?v=|shorts/|live/|embed/)|youtu\.be/)[A-Za-z0-9_-]{11}(?![A-Za-z0-9_-]))\S+', '[קישור]', 'gi'),
              '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
              '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'), 1200),
         cu.created_at, c.slug, c.display_name, true, g.identity_basis
    from public.channel_update_group_proof g
    join public.channel_updates cu on cu.id = g.update_id
    join public.channel_ingest_sources s
      on s.id = g.source_id and s.channel = cu.channel and s.channel = g.channel
     and s.channel in ('torat-haremez','gilui-yomi')
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
$$;
