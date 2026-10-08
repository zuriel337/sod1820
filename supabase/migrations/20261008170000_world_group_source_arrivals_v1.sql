-- Admin-only editorial setting over existing contributors.
-- Superseded public reader v1 deliberately omitted from this release: only the positive-proof v2 reader may be installed.

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
