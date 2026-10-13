-- Branch-only: SECURITY/HUMAN/PROVIDER gates are prerequisites, not an approval receipt.
begin;
-- Approval and activation are separate. This shared capability stays off until
-- the explicitly held legacy release; private normalization may operate now.
insert into public.site_flags(key,enabled,mode,message)
values('mail_source_publication',false,'all','פרסום עדכוני מייל ממתין להפעלת גרסת הלגאסי המאושרת')
on conflict(key) do nothing;

-- Keep source contact identity private. Existing account-linked contributors use
-- the canonical users mailbox without copying it into a public contributor row.
create or replace function public.email_source_mailbox_v1(p_contributor_id uuid)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(lower(nullif(trim(c.email),'')),lower(nullif(trim(u.email),'')))
  from public.contributors c left join public.users u on u.id=c.user_id where c.id=p_contributor_id;
$$;
revoke all on function public.email_source_mailbox_v1(uuid) from public,anon,authenticated;
grant execute on function public.email_source_mailbox_v1(uuid) to service_role;

create or replace function public.email_source_author_v1(p_mailbox text)
returns table(email text,active boolean,author_key text,author_display text,contributor_id uuid)
language sql stable security definer set search_path=public,pg_temp as $$
  select public.email_source_mailbox_v1(c.id),true,c.slug,c.display_name,c.id
  from public.contributors c where c.active is true and c.merged_into is null
    and public.email_source_mailbox_v1(c.id)=lower(trim(p_mailbox))
    and c.page_config->'email_source_approved'='true'::jsonb
    and (select count(*) from public.contributors unique_author where unique_author.active is true
      and unique_author.merged_into is null and public.email_source_mailbox_v1(unique_author.id)=lower(trim(p_mailbox)))=1;
$$;
revoke all on function public.email_source_author_v1(text) from public,anon,authenticated;
grant execute on function public.email_source_author_v1(text) to service_role;

alter table public.channel_updates add column if not exists source_email_v1 jsonb;
create unique index if not exists channel_updates_email_lineage_unique
  on public.channel_updates ((source_email_v1->>'id'))
  where source='email' and source_email_v1->>'id' is not null;

-- Evaluate the CURRENT canonical contributor, private identity proof and source hold
-- for every public read. No mailbox/raw header/body is copied to the public carrier.
create or replace function public.email_source_eligible_v1(p_update_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.channel_updates u
    join public.inbound_emails i on i.id::text = u.source_email_v1->>'inbound_id'
    join public.contributors c on c.id = u.contributor_id
    where u.id = p_update_id and u.source = 'email' and u.status = 'live'
      and exists(select 1 from public.site_flags where key='mail_source_publication' and enabled is true and mode='all')
      and i.meta->'intake_projection_v1'->>'state' = 'published'
      and jsonb_array_length(i.meta->'intake_projection_v1'->'destinations') > 0
      and u.page_only is false and (u.expires_at is null or u.expires_at > now())
      and c.active is true and c.merged_into is null
      and c.page_config->'email_source_public' = 'true'::jsonb
      and c.page_config->'email_source_approved' = 'true'::jsonb
      and public.email_source_mailbox_v1(c.id) = i.from_email
      and (select count(*) from public.contributors unique_author where unique_author.active is true
        and unique_author.merged_into is null and public.email_source_mailbox_v1(unique_author.id)=i.from_email) = 1
      and i.id not in (56,57)
      and i.meta->>'provider' = 'resend' and i.meta->'verified_webhook' = 'true'::jsonb
      and i.meta->'source_email_v1'->'technical_test' = 'false'::jsonb
      and i.meta->'source_email_v1'->>'text_state' = 'available'
      and i.meta->'source_email_v1'->>'sanitizer_version' = 'mail-source-v2'
      and i.meta->'source_email_v1'->>'publication_state' = 'public'
      and i.meta->'source_email_v1'->>'full_text' = u.text
      and i.meta->'source_email_v1'->>'id' = u.source_email_v1->>'id'
      and i.meta->'source_email_v1'->>'admission' = 'approved_source_candidate'
      and i.meta->'source_email_v1'->'held' is distinct from 'true'::jsonb
      and i.meta->'source_email_v1'->'author'->>'contributor_id' = c.id::text
      and i.meta->'source_email_v1'->'identity_proof'->>'provider' = 'resend'
      and i.meta->'source_email_v1'->'identity_proof'->>'provider_id' = i.meta->>'provider_id'
      and i.meta->'source_email_v1'->'identity_proof'->>'dmarc' = 'pass'
      and i.meta->'source_email_v1'->'identity_proof'->>'dkim' = 'pass'
      and i.meta->'source_email_v1'->'identity_proof'->>'basis' = 'resend_receiving_api_v1'
      and i.meta->'source_email_v1'->'identity_proof'->'from_aligned' = 'true'::jsonb
  );
$$;
revoke all on function public.email_source_eligible_v1(uuid) from public;
grant execute on function public.email_source_eligible_v1(uuid) to anon, authenticated, service_role;

drop policy if exists cu_public_read on public.channel_updates;
create policy cu_public_read on public.channel_updates for select to public using (
  status = 'live' and (expires_at is null or expires_at > now())
  and (source is distinct from 'email' or public.email_source_eligible_v1(id))
);

create or replace function public.admit_email_source_v1(p_inbound_id bigint)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  mail public.inbound_emails%rowtype;
  author public.contributors%rowtype;
  src jsonb;
  existing_id uuid;
  update_id uuid;
begin
  if not exists(select 1 from public.site_flags where key='mail_source_publication' and enabled is true and mode='all') then
    return jsonb_build_object('state','standby');
  end if;
  select * into mail from public.inbound_emails where id=p_inbound_id for update;
  if not found then return jsonb_build_object('state','missing_source'); end if;
  if mail.meta->'intake_projection_v1'->>'state' is distinct from 'published'
    or jsonb_typeof(mail.meta->'intake_projection_v1'->'destinations') is distinct from 'array'
    or jsonb_array_length(mail.meta->'intake_projection_v1'->'destinations') = 0 then
    return jsonb_build_object('state','routing_pending');
  end if;
  src := mail.meta->'source_email_v1';
  if mail.id in (56,57) or src is null
    or src->'technical_test' is distinct from 'false'::jsonb
    or src->>'text_state' is distinct from 'available'
    or src->>'sanitizer_version' is distinct from 'mail-source-v2'
    or src->>'admission' is distinct from 'approved_source_candidate'
    or src->'held' = 'true'::jsonb
    or nullif(src->>'full_text','') is null
    or nullif(src->>'id','') is null
    or nullif(src->>'storage_key','') is null
    or src->>'arrival_at' is null
    or mail.meta->>'provider' is distinct from 'resend'
    or mail.meta->'verified_webhook' is distinct from 'true'::jsonb
    or src->'identity_proof'->>'provider' is distinct from 'resend'
    or src->'identity_proof'->>'dmarc' is distinct from 'pass'
    or src->'identity_proof'->>'dkim' is distinct from 'pass'
    or src->'identity_proof'->>'basis' is distinct from 'resend_receiving_api_v1'
    or src->'identity_proof'->'from_aligned' is distinct from 'true'::jsonb
    or src->'identity_proof'->>'provider_id' is distinct from mail.meta->>'provider_id'
    then return jsonb_build_object('state','private'); end if;
  -- Count before selecting: a duplicate canonical mailbox must not resolve by LIMIT 1.
  if (select count(*) from public.contributors c where c.active is true and c.merged_into is null
      and public.email_source_mailbox_v1(c.id)=mail.from_email) <> 1 then
    return jsonb_build_object('state','unresolved_author');
  end if;
  select * into author from public.contributors c where c.active is true and c.merged_into is null
    and public.email_source_mailbox_v1(c.id)=mail.from_email;
  if author.page_config->'email_source_public' is distinct from 'true'::jsonb
    or author.page_config->'email_source_approved' is distinct from 'true'::jsonb
    or src->'author'->>'contributor_id' is distinct from author.id::text then
    return jsonb_build_object('state','author_not_approved');
  end if;
  select id into existing_id from public.channel_updates where ext_msg_id=src->>'storage_key';
  if existing_id is not null then
    return jsonb_build_object('state',case when public.email_source_eligible_v1(existing_id) then 'public' else 'held' end,'id',existing_id);
  end if;
  -- RFC IDs are lineage hints, never delivery dedup. Preserve collisions privately;
  -- don't make two public identities for one ambiguous lineage locator.
  if exists(select 1 from public.channel_updates where source='email'
      and source_email_v1->>'id'=src->>'id') then
    return jsonb_build_object('state','lineage_collision');
  end if;
  insert into public.channel_updates(source,status,page_only,channel,text,credit,contributor_id,created_at,ext_msg_id,source_email_v1)
    values('email','live',false,'main',src->>'full_text',author.display_name,author.id,
      (src->>'arrival_at')::timestamptz,src->>'storage_key',
      jsonb_build_object('inbound_id',mail.id::text,'id',src->>'id','parent_id',src->>'parent_id',
        'source_published_at',src->>'source_published_at','quoted_omitted',src->'quoted_omitted'))
    returning id into update_id;
  update public.inbound_emails set meta=jsonb_set(meta,'{source_email_v1,publication_state}','"public"'::jsonb)
    where id=mail.id;
  return jsonb_build_object('state','public','id',update_id);
end;
$$;
revoke all on function public.admit_email_source_v1(bigint) from public,anon,authenticated;
grant execute on function public.admit_email_source_v1(bigint) to service_role;

-- Paginate conversations, then include all admitted messages in each selected
-- conversation. Withheld ancestors never enter this graph or the returned DTO.
create or replace function public.email_source_threads_v1(p_limit integer default 15,p_destination text default 'world')
returns table(id text,parent_id text,full_text text,author_key text,author_display text,
  arrival_at timestamptz,source_published_at text,quoted_omitted boolean,
  source_admitted boolean,status text,held boolean,source_state text,text_state text)
language sql stable security definer set search_path=public,pg_temp as $$
  with recursive eligible as (
    select u.source_email_v1->>'id' as sid,u.source_email_v1->>'parent_id' as pid,
      u.text as body,c.slug,c.display_name,u.created_at,
      u.source_email_v1->>'source_published_at' as published,
      u.source_email_v1->'quoted_omitted' = 'true'::jsonb as omitted
    from public.channel_updates u join public.contributors c on c.id=u.contributor_id
    where u.source='email' and public.email_source_eligible_v1(u.id)
      and p_destination in ('world','nowbar','writer')
      and exists(select 1 from public.inbound_emails i where i.id::text=u.source_email_v1->>'inbound_id'
        and i.meta->'intake_projection_v1'->'destinations' ? p_destination)
  ), lineage as (
    select e.sid as member,e.sid as root,e.pid,array[e.sid] as path,0 as depth,false as cycle from eligible e
    union all
    select l.member,e.sid,e.pid,l.path||e.sid,l.depth+1,e.sid=any(l.path)
    from lineage l join eligible e on e.sid=l.pid where not l.cycle and l.depth<64
  ), terminal as (
    select l.member,coalesce(l.pid,l.root) as thread_key
    from lineage l where not l.cycle and l.depth<64
      and (l.pid is null or not exists(select 1 from eligible e where e.sid=l.pid))
  ), selected as (
    select t.thread_key,max(e.created_at) as latest
    from terminal t join eligible e on e.sid=t.member group by t.thread_key
    order by latest desc,t.thread_key limit greatest(1,least(coalesce(p_limit,15),50))
  )
  select e.sid,e.pid,e.body,e.slug,e.display_name,e.created_at,e.published,e.omitted,
    true,'live'::text,false,'unverified'::text,'available'::text
  from eligible e join terminal t on t.member=e.sid join selected s using(thread_key)
  order by s.latest desc,e.created_at,e.sid;
$$;
revoke all on function public.email_source_threads_v1(integer,text) from public;
grant execute on function public.email_source_threads_v1(integer,text) to anon,authenticated,service_role;

commit;
