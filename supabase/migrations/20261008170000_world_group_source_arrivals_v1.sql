-- WORLD_2029_FOUR_WRITER_CURATED_SOURCE_BRIDGE_V1 — BRANCH-ONLY. NOT APPLIED to the live project by this change.
-- EXTEND_EXISTING: narrow sanitized READER over existing channel_updates + wa_msg_ext + contributors.dossier_settings.
-- No table GRANT, no RLS change, no research_objects touch, no WhatsApp settings change, no status private->live.
--   Editorial selection (dossier_settings.general_feed_enabled) is independent of trusted / dossier visibility /
--   research verification. A source message is NOT verified research.

-- 1. Public reader: returns only sanitized fields. Eligibility is proved server-side.
create or replace function public.world_group_source_arrivals_v1(p_limit integer default 12)
returns table (
  id uuid, body text, created_at timestamptz,
  contributor_slug text, contributor_name text, group_proof boolean
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select cu.id,
         left(
           regexp_replace(
             regexp_replace(
               regexp_replace(cu.text, '(https?://|www\.)\S+', '[קישור]', 'gi'),
               '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[דוא״ל]', 'g'),
             '(\+?\d[\d\s().-]{7,}\d)', '[מספר]', 'g'),
           1200),
         cu.created_at, c.slug, c.display_name, true
    from public.channel_updates cu
    join public.wa_msg_ext e on e.msg_id = cu.ext_msg_id
    join public.wa_bot_config g on g.group_id = e.group_id and g.group_id like '%@g.us' and g.group_id <> '__ALL__'
    join public.contributors c on c.id = cu.contributor_id
   where cu.source = 'auto'
     and cu.ext_msg_id is not null
     and cu.status = 'live'                       -- off / hidden / private / blocked never qualify
     and (cu.expires_at is null or cu.expires_at > now())
     and cu.image_url is null and cu.thumb_url is null   -- no media
     and cu.text is not null and length(btrim(cu.text)) > 0
     and cu.text !~* '(vcard|begin:vcard|wa\.me/|chat\.whatsapp\.com)'  -- contact cards / invites
     and coalesce(c.dossier_settings ->> 'general_feed_enabled', 'false') = 'true'
   order by cu.created_at desc
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
