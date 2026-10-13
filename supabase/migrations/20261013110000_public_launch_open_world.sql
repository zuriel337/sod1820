-- The first public 2029 release includes World. Apply after the closed-capability
-- seed and the reviewed world_group_source_arrivals_v3 reader migration.
-- Heichal, Raziel, Journey and Books remain governed by their separate locks.
insert into public.site_flags (key, enabled, mode, message)
values ('lock_world', false, 'all', '')
on conflict (key) do update
set enabled = false, mode = 'all', message = '';
