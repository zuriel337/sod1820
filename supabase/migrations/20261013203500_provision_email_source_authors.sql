-- Operator-only canonical author provisioning. No addresses/names in repository.
-- The input must be the exact 13-person source set already approved by ZURIEL.
begin;
-- Independently applicable PRIVATE stage; no public bridge/table/policy dependency.
-- Contacts are service-only even for account-linked canonical contributors.
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

-- Exact batch preflight only: preserves canonical ambiguity instead of choosing
-- a profile by label/kind/age. Existing unlinked accounts require owner reconciliation.
create or replace function public.preview_email_source_authors_v1(p_approved jsonb)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if jsonb_typeof(p_approved) is distinct from 'array' or jsonb_array_length(p_approved)<>13 then
    raise exception 'expected exact thirteen approved identities';
  end if;
  if (select count(distinct lower(trim(value->>'email'))) from jsonb_array_elements(p_approved))<>13 then
    raise exception 'duplicate approved mailbox';
  end if;
  if exists(select 1 from jsonb_array_elements(p_approved) i where
    nullif(trim(i->>'email'),'') is null or trim(i->>'email') !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$'
    or nullif(trim(i->>'display'),'') is null or length(trim(i->>'display'))>200) then
    raise exception 'invalid approved source identity';
  end if;
  with approved as (
    select ordinality::integer input_index,lower(trim(value->>'email')) mailbox
    from jsonb_array_elements(p_approved) with ordinality
  ), resolved as (
    select a.input_index,
      case when count(c.id)>1 then 'ambiguous'
        when count(c.id)=1 and bool_and(c.active is true and c.merged_into is null) then 'resolved'
        when count(c.id)=1 then 'inactive_or_merged'
        when exists(select 1 from public.users u where lower(trim(u.email))=a.mailbox) then 'account_link_required'
        else 'would_create_private' end state,
      coalesce(jsonb_agg(c.id order by c.id) filter(where c.id is not null),'[]'::jsonb) contributor_ids
    from approved a left join public.contributors c on public.email_source_mailbox_v1(c.id)=a.mailbox
    group by a.input_index,a.mailbox
  ) select jsonb_build_object('total',13,
    'blocked',count(*) filter(where state in ('ambiguous','inactive_or_merged','account_link_required')),
    'entries',jsonb_agg(jsonb_build_object('input_index',input_index,'state',state,'contributor_ids',contributor_ids) order by input_index)) into result from resolved;
  return result;
end;
$$;
revoke all on function public.preview_email_source_authors_v1(jsonb) from public,anon,authenticated;
grant execute on function public.preview_email_source_authors_v1(jsonb) to service_role;

create or replace function public.provision_email_source_authors_v1(p_approved jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  item jsonb;
  mailbox text;
  display text;
  matches integer;
  author_id uuid;
  new_id uuid;
  reused integer:=0;
  created integer:=0;
begin
  if jsonb_typeof(p_approved) is distinct from 'array' or jsonb_array_length(p_approved)<>13 then
    raise exception 'expected exact thirteen approved identities';
  end if;
  if (select count(distinct lower(trim(value->>'email'))) from jsonb_array_elements(p_approved))<>13 then
    raise exception 'duplicate approved mailbox';
  end if;
  perform pg_advisory_xact_lock(hashtext('email_source_author_provisioning_v1'));
  if (public.preview_email_source_authors_v1(p_approved)->>'blocked')::integer > 0 then
    raise exception 'canonical identity reconciliation required';
  end if;
  for item in select value from jsonb_array_elements(p_approved) loop
    mailbox:=lower(trim(item->>'email'));
    display:=trim(item->>'display');
    if mailbox is null or mailbox !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$'
      or display is null or length(display)<1 or length(display)>200 then
      raise exception 'invalid approved source identity';
    end if;
    select count(*),min(c.id::text)::uuid into matches,author_id from public.contributors c
      where public.email_source_mailbox_v1(c.id)=mailbox;
    if matches>1 then raise exception 'ambiguous canonical mailbox'; end if;
    if matches=1 then
      if not exists(select 1 from public.contributors where id=author_id and active is true and merged_into is null) then
        raise exception 'canonical identity inactive or merged';
      end if;
      update public.contributors set page_config=jsonb_set(coalesce(page_config,'{}'::jsonb),
        '{email_source_approved}','true'::jsonb),updated_at=now() where id=author_id;
      reused:=reused+1;
    else
      if exists(select 1 from public.users where lower(trim(email))=mailbox) then
        raise exception 'canonical account link required';
      end if;
      new_id:=gen_random_uuid();
      -- A private source registry identity, never an inferred account/phone claim
      -- or public member profile. Only attributed source words may become visible.
      insert into public.contributors(id,slug,display_name,email,kind,active,source,
        building,engaged,trusted,user_id,dossier_settings,page_config)
      -- Legacy public contributors_feed also gates on kind; RLS alone is not
      -- sufficient for its SECURITY DEFINER projection. Use the existing private
      -- kind and never enlist these source identities into the public building feed.
      values(new_id,'mail-source-'||replace(new_id::text,'-',''),display,mailbox,'private',true,
        'email-approved-20261013',false,false,false,null,
        jsonb_build_object('visibility','private','identity_basis','approved_mailbox_source'),
        jsonb_build_object('version',1,'email_source_approved',true));
      created:=created+1;
    end if;
  end loop;
  return jsonb_build_object('approved',13,'reused',reused,'created_private_sources',created);
end;
$$;
revoke all on function public.provision_email_source_authors_v1(jsonb) from public,anon,authenticated;
grant execute on function public.provision_email_source_authors_v1(jsonb) to service_role;
commit;
