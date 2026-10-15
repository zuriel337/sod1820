-- Applied live (migration runtime_switch_any_fx_key_20261014): the admin writer accepts any `fx_<name>` key (still only fx_ rows; never lock_*).
create or replace function public.admin_set_runtime_switch(p_key text, p_on boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not coalesce(public.rd_is_admin(), false) then raise exception 'admin only' using errcode = '42501'; end if;
  if p_key is null or p_key !~ '^fx_[a-z0-9_]{3,60}$' then raise exception 'unknown runtime switch' using errcode = '22023'; end if;
  insert into public.site_flags (key, enabled, mode, message) values (p_key, coalesce(p_on, true), 'all', '')
  on conflict (key) do update set enabled = excluded.enabled, updated_at = now();
  return jsonb_build_object('key', p_key, 'on', coalesce(p_on, true));
end; $$;
