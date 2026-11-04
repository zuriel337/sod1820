CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $function$
declare
  v_acq jsonb := null;
  v_visitor text := null;
begin
  insert into public.users (id, email, username, display_name, avatar_url, role, tier)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'user', 'free'
  )
  on conflict (id) do nothing;

  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;

  if jsonb_typeof(new.raw_user_meta_data->'acquisition') = 'object' then
    v_acq := new.raw_user_meta_data->'acquisition';
  end if;
  v_visitor := coalesce(v_acq->>'visitor_id', new.raw_user_meta_data->>'visitor_id');

  if new.email is not null then
    insert into public.subscribers (email, name, source, active, acquisition)
    select new.email,
           coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@','1')),
           'site-signup', true, v_acq
    where not exists (select 1 from public.subscribers s where lower(s.email) = lower(new.email));
  end if;

  if v_visitor is not null and v_visitor <> '' then
    begin
      insert into public.subscribe_events (visitor_id, source, action, topic)
      values (v_visitor, 'site-signup', 'signup', 'newsletter');
    exception when others then null;
    end;
  end if;

  return new;
end $function$;
