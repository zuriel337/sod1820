-- Operator-only canonical author provisioning. No addresses/names in repository.
-- The input must be the exact 13-person source set already approved by ZURIEL.
begin;
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
        '{email_source_public}','true'::jsonb),updated_at=now() where id=author_id;
      reused:=reused+1;
    else
      new_id:=gen_random_uuid();
      -- A private source registry identity, never an inferred account/phone claim
      -- or public member profile. Only attributed source words may become visible.
      insert into public.contributors(id,slug,display_name,email,kind,active,source,
        building,engaged,trusted,user_id,dossier_settings,page_config)
      values(new_id,'mail-source-'||replace(new_id::text,'-',''),display,mailbox,'source',true,
        'email-approved-20261013',true,false,false,null,
        jsonb_build_object('visibility','private','identity_basis','approved_mailbox_source'),
        jsonb_build_object('version',1,'email_source_public',true));
      created:=created+1;
    end if;
  end loop;
  return jsonb_build_object('approved',13,'reused',reused,'created_private_sources',created);
end;
$$;
revoke all on function public.provision_email_source_authors_v1(jsonb) from public,anon,authenticated;
grant execute on function public.provision_email_source_authors_v1(jsonb) to service_role;
commit;
