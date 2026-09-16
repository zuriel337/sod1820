-- SOD1820 — G3-F guest/account Follow handoff concurrency barrier
-- The claim projection must share the same identity-global advisory locks as watch_toggle,
-- otherwise a Follow written while the guest row is being folded into an account could be lost.

create or replace function public.claim_follow_prefs_from_identity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid;
  v_vis text;
  v_topics text[] := '{}'::text[];
  v_guest_mute timestamptz;
  v_guest_intensity text;
begin
  if NEW.kind not in ('login', 'legacy_seed') then return NEW; end if;

  select p.account_user_id into v_uid
  from public.persons p
  where p.person_id = NEW.person_id;

  if v_uid is null then return NEW; end if;

  -- Serialize all account Follow mutations first, then each proven browser visitor in a stable
  -- order. watch_toggle holds only one of these locks, so this ordering cannot create a cycle.
  perform pg_advisory_xact_lock(
    hashtextextended('user:' || v_uid::text || '|follow-identity', 0)
  );

  for v_vis in
    select distinct ie.legacy_id
    from public.identity_edges ie
    where ie.person_id = NEW.person_id
      and ie.kind = 'legacy_seed'
      and nullif(btrim(coalesce(ie.legacy_id, '')), '') is not null
    order by ie.legacy_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('visitor:' || v_vis || '|follow-identity', 0)
    );
  end loop;

  -- Re-read only after every relevant Follow projection is quiescent.
  with raw_topics as (
    select unnest(coalesce(np.topics, '{}'::text[])) as topic
    from public.notification_prefs np
    where np.user_id = v_uid
    union all
    select unnest(coalesce(np.topics, '{}'::text[])) as topic
    from public.notification_prefs np
    join public.identity_edges ie
      on ie.kind = 'legacy_seed'
     and ie.legacy_id = np.visitor_id
     and ie.person_id = NEW.person_id
    where np.user_id is null
  ), normalized as (
    select public.canonical_follow_topic(topic) as topic
    from raw_topics
  )
  select coalesce(array_agg(distinct topic order by topic) filter (where topic <> ''), '{}'::text[])
    into v_topics
  from normalized;

  -- Carry mute/intensity only when creating the account projection. Never transfer guest
  -- delivery channels: historical guest {email} is not proof of channel consent.
  select max(np.muted_until),
         (array_agg(np.intensity order by np.updated_at desc))[1]
    into v_guest_mute, v_guest_intensity
  from public.notification_prefs np
  join public.identity_edges ie
    on ie.kind = 'legacy_seed'
   and ie.legacy_id = np.visitor_id
   and ie.person_id = NEW.person_id
  where np.user_id is null;

  if exists (select 1 from public.notification_prefs where user_id = v_uid) then
    update public.notification_prefs
       set topics = v_topics,
           updated_at = now()
     where user_id = v_uid;
  elsif coalesce(array_length(v_topics, 1), 0) > 0 then
    insert into public.notification_prefs(user_id, topics, channels, intensity, muted_until)
      values (v_uid, v_topics, '{}'::text[], coalesce(v_guest_intensity, 'normal'), v_guest_mute);
  end if;

  delete from public.notification_prefs np
   where np.user_id is null
     and exists (
       select 1
       from public.identity_edges ie
       where ie.kind = 'legacy_seed'
         and ie.legacy_id = np.visitor_id
         and ie.person_id = NEW.person_id
     );

  return NEW;
end
$function$;

revoke all on function public.claim_follow_prefs_from_identity() from public;
