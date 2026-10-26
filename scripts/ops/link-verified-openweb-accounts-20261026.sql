-- Explicit ZURIEL instruction: connect proven historical identities, 2026-10-26.
-- Operational DML only; no schema, RPC, authentication impersonation or publication.
-- The two owner display-pair conflicts are deliberately outside this allowlist.
-- One DO statement is atomic. All evidence is rechecked inside it before each link.
do $batch$
declare
  v_task constant text := 'VERIFIED_LEGACY_ACCOUNT_LINKS_20261026';
  v_ids constant uuid[] := array[
    'b8c49719-6fd4-4027-ada1-1a986466eaf9',
    '4a6ae4d2-5372-4b7b-8e3b-3a230dc1a291',
    '8894bec6-b252-4405-bcd9-3773488e2a91',
    '2b189295-f30d-4061-a1a0-b26afb313863'
  ]::uuid[];
  c record;
  e record;
  v_email text;
  v_email_count integer;
  v_source text;
  v_source_count integer;
  v_first timestamptz;
  v_last timestamptz;
  v_accounts uuid[];
  v_uid uuid;
  v_person uuid;
  v_person_count integer;
  v_person_before jsonb;
  v_edge uuid;
  v_new_edges uuid[];
  v_primary_set boolean;
begin
  if (select count(*) from public.contributors where id=any(v_ids)) <> 4 then
    raise exception 'allowlisted historical contributors changed';
  end if;
  for c in select * from public.contributors where id=any(v_ids) order by id for update loop
    perform pg_advisory_xact_lock(hashtextextended('person_contributor:'||c.id::text,1820));
    if c.source is distinct from 'openweb_import' or c.active is false
       or coalesce(c.locked,false) or coalesce(c.trusted,false) or coalesce(c.vip,false)
       or nullif(btrim(c.merged_into),'') is not null then
      raise exception 'historical contributor is no longer eligible';
    end if;

    -- Exact source-message provenance, never names, client pairs or user_metadata.
    select count(distinct lower(btrim(s.email))) filter(where s.email_verified is true and nullif(btrim(s.email),'') is not null),
           min(lower(btrim(s.email))) filter(where s.email_verified is true and nullif(btrim(s.email),'') is not null),
           count(distinct s.user_id), min(s.user_id), min(s.created_at), max(s.created_at)
      into v_email_count,v_email,v_source_count,v_source,v_first,v_last
      from public.research_contributions rc
      join public.contribution_links cl on cl.from_contribution_id=rc.id and cl.target_type='openweb_message'
      join public.g3_openweb_import_stage s on s.message_id=cl.target_id
     where rc.author_contributor_id=c.id and rc.origin='openweb';
    if v_email_count<>1 or v_source_count<>1 or v_email is distinct from lower(btrim(c.email))
       or v_source is null or v_first is null or v_last is null then
      raise exception 'unique source-verified historical identity required';
    end if;
    if exists (
      select 1 from public.research_contributions rc
      join public.contribution_links cl on cl.from_contribution_id=rc.id and cl.target_type='openweb_user'
      where rc.author_contributor_id=c.id and cl.target_id is distinct from v_source
    ) or not exists (
      select 1 from public.research_contributions rc
      join public.contribution_links cl on cl.from_contribution_id=rc.id and cl.target_type='openweb_user'
      where rc.author_contributor_id=c.id and cl.target_id=v_source
    ) then raise exception 'source user provenance conflict'; end if;

    select array_agg(u.id order by u.id) into v_accounts from auth.users u
     where lower(btrim(u.email))=v_email and u.email_confirmed_at is not null
       and u.deleted_at is null and not coalesce(u.is_anonymous,false)
       and coalesce(u.banned_until,'-infinity')<now();
    if coalesce(cardinality(v_accounts),0)<>1 then raise exception 'one verified current account required'; end if;
    v_uid:=v_accounts[1];
    if c.user_id is not null and c.user_id<>v_uid then raise exception 'historical contributor already has a different owner'; end if;
    perform pg_advisory_xact_lock(hashtextextended('person_account:'||v_uid::text,1820));
    perform pg_advisory_xact_lock(hashtextextended('person_openweb_source:'||v_source,1820));
    select count(*) into v_person_count from public.persons where account_user_id=v_uid;
    if v_person_count<>1 then raise exception 'one existing account Person required'; end if;
    select person_id,jsonb_build_object('first_seen',first_seen,'last_seen',last_seen)
      into v_person,v_person_before from public.persons where account_user_id=v_uid for update;
    if (select count(*) from public.contributors where user_id=v_uid)>1 then
      raise exception 'existing primary contributor is ambiguous';
    end if;

    v_new_edges:=array[]::uuid[];
    -- Same reserved historical keys and existing spine as the reviewed materializer.
    for e in select * from (values
      ('historical:contributor:'||c.id::text,'contributor:'||c.id::text,'contributors'),
      ('historical:openweb:'||v_source,'openweb_user:'||v_source,'openweb_import')
    ) keys(sod_id,legacy_id,provider) loop
      if exists(select 1 from public.identity_edges ie
        where (ie.sod_id=e.sod_id or (ie.kind='legacy_seed' and ie.legacy_id=e.legacy_id))
          and (ie.person_id<>v_person or ie.sod_id<>e.sod_id or ie.kind<>'legacy_seed' or ie.legacy_id is distinct from e.legacy_id)) then
        raise exception 'historical identity already belongs to a conflicting Person';
      end if;
      v_edge:=null;
      insert into public.identity_edges(sod_id,person_id,kind,legacy_id,confidence,first_seen,last_seen,meta)
      select e.sod_id,v_person,'legacy_seed',e.legacy_id,100,v_first,v_last,
        jsonb_build_object('provider',e.provider,'contributor_id',c.id,'source_id',v_source,
          'human_gate',true,'authorized_by','ZURIEL','task_key',v_task,
          'application_path','approved_maintenance_batch','evidence','source_verified_email_and_current_confirmed_email')
      where not exists(select 1 from public.identity_edges ie where ie.sod_id=e.sod_id and ie.person_id=v_person and ie.kind='legacy_seed' and ie.legacy_id=e.legacy_id)
      returning id into v_edge;
      if v_edge is not null then v_new_edges:=array_append(v_new_edges,v_edge); end if;
    end loop;

    v_primary_set:=false;
    if c.user_id is null and not exists(select 1 from public.contributors where user_id=v_uid) then
      update public.contributors set user_id=v_uid,updated_at=now() where id=c.id and user_id is null;
      if not found then raise exception 'contributor owner changed during linking'; end if;
      v_primary_set:=true;
      insert into public.contributor_claim_events(contributor_id,user_id,method)
      values(c.id,v_uid,'verified_source_email_human_gate');
    end if;
    -- Existing primary writers remain primary; their older aliases live on Person.
    update public.persons set first_seen=least(coalesce(first_seen,v_first),v_first),last_seen=greatest(coalesce(last_seen,v_last),v_last)
     where person_id=v_person and (first_seen is null or first_seen>v_first or last_seen is null or last_seen<v_last);

    if not exists(select 1 from public.decision_ledger where subject_type='contributor' and subject_ref=c.id::text and provenance->>'task_key'=v_task and status='applied') then
      insert into public.decision_ledger(decision_type,subject_type,subject_ref,candidate,sources,domain,created_by_agent,
        evidence,rules_version,human_decision,human_reason,decided_by,result_ref,provenance,status)
      values('historical_identity_materialization','contributor',c.id::text,
        jsonb_build_object('person_id',v_person,'contributor_id',c.id),
        jsonb_build_object('source_id',v_source),'person_identity','GPT',
        jsonb_build_object('source_verified_email',true,'current_confirmed_email',true,'unique_account',true,'existing_person',true),
        jsonb_build_object('person_foundation_contract_law',6),'modify',
        'ZURIEL explicitly requested connecting proven historical identities on 2026-10-26; ambiguous personal display pairs excluded.',
        'ZURIEL',jsonb_build_object('person_id',v_person,'contributor_id',c.id,'new_edge_ids',v_new_edges,'primary_link_created',v_primary_set),
        jsonb_build_object('task_key',v_task,'user_id_before',c.user_id,'person_bounds_before',v_person_before,
          'primary_link_created',v_primary_set,'new_edge_ids',v_new_edges,
          'source_rows_deleted',false,'visibility_changed',false,'merged_into_changed',false,
          'rollback','Review these exact edge IDs and optional primary link; preserve source rows and existing Person/account.'),'applied');
    end if;
  end loop;
end
$batch$;
