-- Applied live (migration runtime_switches_fx_20261014) at the owner's request.
-- Owner runtime switches extend site_flags (site_flags_lock_law v3) with `fx_` rows. For fx_* ONLY: enabled=true => function ON.
-- fx_now_feed seeded OFF per owner instruction; others ON. Admin-only writer RPC; reads stay the public site_flags read.
create or replace function public.admin_set_runtime_switch(p_key text, p_on boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not coalesce(public.rd_is_admin(), false) then raise exception 'admin only' using errcode = '42501'; end if;
  if p_key is null or p_key not in ('fx_now_feed','fx_number_journey','fx_number_dossier','fx_home_convergences') then
    raise exception 'unknown runtime switch' using errcode = '22023'; end if;
  insert into public.site_flags (key, enabled, mode, message) values (p_key, coalesce(p_on, true), 'all', '')
  on conflict (key) do update set enabled = excluded.enabled, updated_at = now();
  return jsonb_build_object('key', p_key, 'on', coalesce(p_on, true));
end; $$;
revoke all on function public.admin_set_runtime_switch(text, boolean) from public, anon;
grant execute on function public.admin_set_runtime_switch(text, boolean) to authenticated;
insert into public.site_flags (key, enabled, mode, message) values
  ('fx_now_feed', false, 'all', ''), ('fx_number_journey', true, 'all', ''),
  ('fx_number_dossier', true, 'all', ''), ('fx_home_convergences', true, 'all', '')
on conflict (key) do nothing;
