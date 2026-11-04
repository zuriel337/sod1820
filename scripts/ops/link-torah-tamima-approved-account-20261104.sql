-- Exact manual identity decision: ZURIEL knows both users and explicitly confirmed
-- they are the same person, then instructed "קדימה תעשה" on 2026-11-04.
-- This is NOT an email-match claim. Keep current Auth/email and source rows intact.
-- Operational DML only; one atomic transaction, replay safe, no new RPC/schema.
do $link$
declare
  v_task constant text := 'COMMUNITY_TORAH_IDENTITY_RECENT_TIME_20261104';
  v_cid constant uuid := '1f95f46b-b18b-480b-a2d2-8a9ce90eb194';
  v_uid constant uuid := '365fb241-77ed-4a9d-98ab-4e30ab53c093';
  v_source constant text := 'U_QAu9LlY39eZZzLYi';
  v_new_message constant uuid := '81e82bc4-5c05-408b-92b0-4779732c418f';
  v_avatar constant text := 'https://sod1820.co.il/community-avatars/1215acc5cd59c120f52d.jpg';
  c record;
  a record;
  e record;
  v_person uuid;
  v_person_created boolean := false;
  v_primary_created boolean := false;
  v_avatar_set boolean := false;
  v_avatar_before text;
  v_person_before jsonb;
  v_first timestamptz;
  v_last timestamptz;
  v_count integer;
  v_edge uuid;
  v_edges uuid[] := array[]::uuid[];
  v_claim bigint;
  v_applied boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended('person_contributor:'||v_cid::text,1820));
  perform pg_advisory_xact_lock(hashtextextended('person_account:'||v_uid::text,1820));
  perform pg_advisory_xact_lock(hashtextextended('person_openweb_source:'||v_source,1820));

  select * into c from public.contributors where id=v_cid for update;
  if not found or c.source is distinct from 'openweb_import' or c.active is not true
     or coalesce(c.locked,false) or coalesce(c.trusted,false) or coalesce(c.vip,false)
     or nullif(btrim(c.merged_into),'') is not null then
    raise exception 'approved historical contributor is missing or ineligible';
  end if;
  if c.user_id is not null and c.user_id<>v_uid then
    raise exception 'historical contributor already has another owner';
  end if;
  if exists(select 1 from public.contributors where user_id=v_uid and id<>v_cid) then
    raise exception 'account already has a different primary Contributor';
  end if;
  select * into a from auth.users where id=v_uid for share;
  if not found or a.email_confirmed_at is null or a.deleted_at is not null
     or coalesce(a.is_anonymous,false) or coalesce(a.banned_until,'-infinity')>=now() then
    raise exception 'approved current account is no longer eligible';
  end if;
  select avatar_url into v_avatar_before from public.users where id=v_uid for update;
  if not found then raise exception 'canonical public account is missing'; end if;
  if not exists(select 1 from public.research_contributions
    where id=v_new_message and author_user_id=v_uid and origin='community_2029' and status='approved') then
    raise exception 'approved new message/account provenance changed';
  end if;

  select count(*),min(created_at),max(created_at) into v_count,v_first,v_last
    from public.research_contributions where author_contributor_id=v_cid and origin='openweb';
  if v_count<>12 or v_first is null or v_last is null then
    raise exception 'reviewed twelve-message historical scope changed';
  end if;
  if exists(select 1 from public.research_contributions rc
    where rc.author_contributor_id=v_cid and rc.origin='openweb' and (
      not exists(select 1 from public.contribution_links cl where cl.from_contribution_id=rc.id
        and cl.target_type='openweb_user' and cl.target_id=v_source)
      or exists(select 1 from public.contribution_links cl where cl.from_contribution_id=rc.id
        and cl.target_type='openweb_user' and cl.target_id is distinct from v_source)))
    or exists(select 1 from public.contribution_links cl
      join public.research_contributions rc on rc.id=cl.from_contribution_id
      where cl.target_type='openweb_user' and cl.target_id=v_source
        and rc.author_contributor_id is distinct from v_cid) then
    raise exception 'exact historical source provenance conflicts';
  end if;

  -- Same account backfill primitive/eligibility and lock as the existing Person
  -- foundation; never spoof auth.uid() or create a second historical Person.
  select person_id,jsonb_build_object('first_seen',first_seen,'last_seen',last_seen)
    into v_person,v_person_before from public.persons where account_user_id=v_uid for update;
  select exists(select 1 from public.decision_ledger where subject_type='contributor'
    and subject_ref=v_cid::text and provenance->>'task_key'=v_task and status='applied') into v_applied;
  if v_applied then
    -- A replay must not undo a later user photo change/removal or repair a
    -- subsequently changed identity without a new reviewed decision.
    if c.user_id is distinct from v_uid or v_person is null
      or (select count(*) from public.identity_edges where person_id=v_person and kind='legacy_seed'
        and ((sod_id='historical:contributor:'||v_cid::text and legacy_id='contributor:'||v_cid::text)
          or (sod_id='historical:openweb:'||v_source and legacy_id='openweb_user:'||v_source)))<>2 then
      raise exception 'previously applied identity link has changed; review required';
    end if;
    return;
  end if;
  if v_person is null then
    insert into public.persons(first_seen,last_seen,first_source,first_app_context,account_user_id)
    values(a.created_at,greatest(a.created_at,(select max(created_at) from public.research_contributions where author_user_id=v_uid)),
      'account_backfill_2029','people_2029',v_uid)
    returning person_id into v_person;
    v_person_created:=true;
  end if;
  if (select count(*) from public.persons where account_user_id=v_uid)<>1 then
    raise exception 'account Person is ambiguous';
  end if;

  for e in select * from (values
    ('historical:contributor:'||v_cid::text,'contributor:'||v_cid::text,'contributors'),
    ('historical:openweb:'||v_source,'openweb_user:'||v_source,'openweb_import')
  ) keys(sod_id,legacy_id,provider) loop
    if exists(select 1 from public.identity_edges ie
      where (ie.sod_id=e.sod_id or (ie.kind='legacy_seed' and ie.legacy_id=e.legacy_id))
        and (ie.person_id is distinct from v_person or ie.sod_id<>e.sod_id
          or ie.kind is distinct from 'legacy_seed' or ie.legacy_id is distinct from e.legacy_id)) then
      raise exception 'historical identity already belongs to a conflicting Person';
    end if;
    v_edge:=null;
    insert into public.identity_edges(sod_id,person_id,kind,legacy_id,confidence,first_seen,last_seen,meta)
    select e.sod_id,v_person,'legacy_seed',e.legacy_id,100,v_first,v_last,
      jsonb_build_object('provider',e.provider,'contributor_id',v_cid,'source_id',v_source,
        'human_gate',true,'authorized_by','ZURIEL','task_key',v_task,
        'application_path','approved_maintenance_batch','evidence','explicit_owner_confirmation_same_person')
    where not exists(select 1 from public.identity_edges ie where ie.sod_id=e.sod_id
      and ie.person_id=v_person and ie.kind='legacy_seed' and ie.legacy_id=e.legacy_id)
    returning id into v_edge;
    if v_edge is not null then v_edges:=array_append(v_edges,v_edge); end if;
  end loop;
  if c.user_id is null then
    update public.contributors set user_id=v_uid,updated_at=now() where id=v_cid and user_id is null;
    if not found then raise exception 'contributor ownership changed'; end if;
    v_primary_created:=true;
    insert into public.contributor_claim_events(contributor_id,user_id,method)
    values(v_cid,v_uid,'explicit_owner_confirmation_human_gate') returning id into v_claim;
  end if;
  if nullif(btrim(v_avatar_before),'') is null then
    update public.users set avatar_url=v_avatar where id=v_uid and nullif(btrim(avatar_url),'') is null;
    v_avatar_set:=found;
  end if;
  update public.persons set first_seen=least(coalesce(first_seen,v_first),v_first),
    last_seen=greatest(coalesce(last_seen,v_last),v_last)
    where person_id=v_person and (first_seen is null or first_seen>v_first or last_seen is null or last_seen<v_last);

  if not exists(select 1 from public.decision_ledger where subject_type='contributor'
    and subject_ref=v_cid::text and provenance->>'task_key'=v_task and status='applied') then
    insert into public.decision_ledger(decision_type,subject_type,subject_ref,candidate,sources,domain,created_by_agent,
      evidence,rules_version,human_decision,human_reason,decided_by,result_ref,provenance,status)
    values('historical_identity_materialization','contributor',v_cid::text,
      jsonb_build_object('person_id',v_person,'contributor_id',v_cid),
      jsonb_build_object('source_id',v_source,'new_message_id',v_new_message),'person_identity','GPT',
      jsonb_build_object('manual_owner_confirmation',true,'email_match_claimed',false,
        'current_confirmed_email',true,'historical_message_count',v_count),
      jsonb_build_object('person_foundation_contract_law',6),'modify',
      'ZURIEL explicitly confirms the new Torah Tamima account and the historical source are the same person, requests their link and original photo, and instructs proceed on 2026-11-04.',
      'ZURIEL',jsonb_build_object('person_id',v_person,'contributor_id',v_cid,'new_edge_ids',v_edges,
        'primary_link_created',v_primary_created,'account_person_created',v_person_created,'avatar_set',v_avatar_set),
      jsonb_build_object('task_key',v_task,'user_id_before',c.user_id,'contributor_updated_at_before',c.updated_at,
        'person_bounds_before',v_person_before,'new_edge_ids',v_edges,'claim_event_id',v_claim,
        'person_id',v_person,'account_person_created',v_person_created,'primary_link_created',v_primary_created,
        'avatar_before',v_avatar_before,'avatar_after',case when v_avatar_set then v_avatar else v_avatar_before end,
        'source_rows_changed',false,'visibility_changed',false,'auth_changed',false,
        'rollback','Review exact inserted edges/claim ID and primary link. Restore avatar only if still this value. Remove created Person only if unused; otherwise retain and restore bounds. Never delete original messages or overwrite later user edits.'),'applied');
  end if;
end
$link$;
