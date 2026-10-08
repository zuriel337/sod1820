-- WORLD_2029_FOUR_WRITER_CURATED_SOURCE_BRIDGE_V1 — BRANCH-ONLY. NOT APPLIED to the live project by this change.
-- EXTEND_EXISTING: narrow sanitized READER over existing channel_updates + channel_ingest_sources + contributors.dossier_settings (wa_msg_ext only as a contradiction check).
-- No table GRANT, no RLS change, no research_objects touch, no WhatsApp settings change, no status private->live.
--   Editorial selection (dossier_settings.general_feed_enabled) is independent of trusted / dossier visibility /
--   research verification. A source message is NOT verified research.

-- 1. Public reader: returns only sanitized fields. Eligibility is proved server-side.
--    PROVENANCE (v2, source-provenance fix): the group identity of a row is derived from the canonical
--    wa-channel-ingest chain, NOT from the wa_msg_ext sidecar (stale since 2026-10-03, never required):
--      getChatHistory(channel_ingest_sources.chat_id) -> channel_updates(channel = src.channel, source = 'auto',
--      ext_msg_id = provider message id).
--    A row is therefore proven only when its channel is one of the two World group channels AND that channel's
--    configured, enabled ingest source is a real group JID (@g.us). If a wa_msg_ext sidecar row exists for the
--    message and names a DIFFERENT group, the row is rejected. Where provenance cannot be shown -> excluded.
--    Residual (documented, not provable in SQL): an admin (cu_admin_all RLS) could hand-insert source='auto'.
--    STATUS: only status='live' is eligible. Incoming research_first rows are stored as status='private' and
--    there is no stored marker separating "research_first default" from "explicitly held private", so they are
--    NOT exposed (security BLOCKER reported in the AFTER; needs a smallest extension to the existing intake).
create or replace function public.world_group_source_arrivals_v1(p_limit integer default 12)
returns table (
  id uuid, body text, created_at timestamptz,
  contributor_slug text, contributor_name text, group_proof boolean, proof_basis text
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select r.id, r.body, r.created_at, r.slug, r.display_name, true, r.proof_basis
    from (
      select distinct on (cu.ext_msg_id)
             cu.id,
             left(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(cu.text, '(https?://|www\.)\S+', '[קישור]', 'gi'),
                   '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
                 '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'),
               1200) as body,
             cu.created_at, c.slug, c.display_name,
             case when exists (select 1 from public.wa_msg_ext e where e.msg_id = cu.ext_msg_id and e.group_id = s.chat_id)
                  then 'sidecar_match' else 'ingest_chain' end as proof_basis
        from public.channel_updates cu
        join public.channel_ingest_sources s
          on s.channel = cu.channel
         and s.channel in ('torat-haremez', 'gilui-yomi')          -- World group feed: exactly these two
         and s.enabled is true
         and coalesce(s.intake_mode, '') <> 'off'
         and s.chat_id like '%@g.us' and s.chat_id <> '__ALL__'     -- real group JID only (never DM / @c.us)
        join public.contributors c on c.id = cu.contributor_id
       where cu.source = 'auto'
         and cu.ext_msg_id is not null
         and cu.ext_msg_id !~ '^mail_'                             -- not the email-ingest namespace
         and not exists (select 1 from public.wa_msg_ext e          -- sidecar, when present, must not contradict
                          where e.msg_id = cu.ext_msg_id and e.group_id is distinct from s.chat_id)
         and cu.status = 'live'                                    -- off / hidden / private / blocked never qualify
         and (cu.expires_at is null or cu.expires_at > now())
         and cu.image_url is null and cu.thumb_url is null          -- no media
         and cu.text is not null and length(btrim(cu.text)) > 0
         and cu.text !~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)'  -- contact cards / invites
         and coalesce(c.dossier_settings ->> 'general_feed_enabled', 'false') = 'true'
       order by cu.ext_msg_id, cu.created_at desc                  -- replay/dedup: one row per provider message
    ) r
   order by r.created_at desc
   limit greatest(1, least(coalesce(p_limit, 12), 40));
$$;
revoke all on function public.world_group_source_arrivals_v1(integer) from public;
grant execute on function public.world_group_source_arrivals_v1(integer) to anon, authenticated, service_role;

-- 2. Admin-only editor over the existing canonical setting. No self-toggle.
create or replace function public.admin_set_contributor_general_feed_v1(p_slug text, p_enabled boolean)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_admin boolean; v_id uuid;
begin
  select (role = 'admin') into v_admin from public.users where id = auth.uid();
  if not coalesce(v_admin, false) then raise exception 'admin only'; end if;
  if coalesce(btrim(p_slug), '') = '' or p_enabled is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_arguments');
  end if;
  update public.contributors
     set dossier_settings = jsonb_set(coalesce(dossier_settings, '{}'::jsonb), '{general_feed_enabled}', to_jsonb(p_enabled), true)
   where slug = p_slug returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'slug', p_slug, 'general_feed_enabled', p_enabled);
end;
$$;
revoke all on function public.admin_set_contributor_general_feed_v1(text, boolean) from public, anon;
grant execute on function public.admin_set_contributor_general_feed_v1(text, boolean) to authenticated, service_role;
