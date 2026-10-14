-- Privileged, reviewed one-off DML. NOT a migration/RPC/ingress handler.
-- The trusted operator sets sod1820.email_identity_choice_v1 with private JSON
-- inside the SAME BEGIN/COMMIT as this block. No sender/contact data belongs in git.
-- Context: decision_ref, human_choice=1, approved[13], link{user_id,user_revision,
-- person_id}, alias{user_id,user_revision,person_id,contributor_id,target_id,
-- source_revision,source_without_pointer_revision,target_revision,target_slug},
-- material_revision. All PL/pgSQL locals use v_ to avoid live-column shadowing.
-- An operator role and an explicit real Human-Gate decision are BOTH required;
-- the JSON is provenance, never an authorization claim for an exposed endpoint.
do $private_email_identity_choice$
declare
  v_ctx jsonb := nullif(current_setting('sod1820.email_identity_choice_v1',true),'')::jsonb;
  v_decision_ref text;
  v_mailbox4 text; v_mailbox13 text;
  v_user4 uuid; v_user13 uuid; v_person4 uuid; v_person13 uuid;
  v_alias_id uuid; v_target_id uuid; v_new_id uuid;
  v_target_slug text; v_source_rev text; v_target_rev text; v_created_rev text;
  v_material_rev text; v_person_rev text;
  v_record_before jsonb; v_saved record;
  v_affected integer;
begin
  if current_user <> 'postgres' then raise exception 'trusted database operator required'; end if;
  if v_ctx is null or v_ctx->'human_choice' is distinct from '1'::jsonb
    or nullif(btrim(v_ctx->>'decision_ref'),'') is null then
    raise exception 'explicit recorded human choice required';
  end if;
  v_decision_ref:=v_ctx->>'decision_ref';
  if length(v_decision_ref)>200 or jsonb_typeof(v_ctx->'approved') is distinct from 'array'
    or jsonb_array_length(v_ctx->'approved')<>13 then raise exception 'invalid approved context'; end if;
  if (select count(distinct lower(btrim(value->>'email'))) from jsonb_array_elements(v_ctx->'approved'))<>13
    or exists(select 1 from jsonb_array_elements(v_ctx->'approved') i where
      nullif(btrim(i->>'display'),'') is null or length(btrim(i->>'display'))>200
      or coalesce(btrim(i->>'email'),'') !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$') then
    raise exception 'invalid approved source set';
  end if;
  v_mailbox4:=lower(btrim(v_ctx->'approved'->3->>'email'));
  v_mailbox13:=lower(btrim(v_ctx->'approved'->12->>'email'));
  v_user4:=(v_ctx->'link'->>'user_id')::uuid; v_user13:=(v_ctx->'alias'->>'user_id')::uuid;
  v_person4:=(v_ctx->'link'->>'person_id')::uuid; v_person13:=(v_ctx->'alias'->>'person_id')::uuid;
  v_alias_id:=(v_ctx->'alias'->>'contributor_id')::uuid; v_target_id:=(v_ctx->'alias'->>'target_id')::uuid;
  v_target_slug:=v_ctx->'alias'->>'target_slug';
  if v_user4 is null or v_user13 is null or v_user4=v_user13 or v_person4 is null or v_person13 is null
    or v_person4=v_person13 or v_alias_id is null or v_target_id is null or v_alias_id=v_target_id
    or nullif(v_target_slug,'') is null or v_ctx->>'material_revision' is null then
    raise exception 'incomplete identity context';
  end if;
  -- A short lock prevents contributor INSERT phantoms from non-cooperating legacy
  -- writers (there is no mailbox/user_id uniqueness constraint). Reads continue.
  -- Caller also supplies transaction-local lock_timeout and statement_timeout.
  perform pg_advisory_xact_lock(hashtext('email_source_author_provisioning_v1'));
  perform pg_advisory_xact_lock(hashtextextended('person_account:'||u::text,1820))
    from unnest(array[v_user4,v_user13]) u order by u;
  lock table public.contributors in share row exclusive mode;
  perform 1 from public.users where id in(v_user4,v_user13) order by id for share;
  perform 1 from auth.users where id in(v_user4,v_user13) order by id for share;
  perform 1 from public.persons where account_user_id in(v_user4,v_user13) order by person_id for share;
  perform 1 from public.research_contributions where author_contributor_id in(v_alias_id,v_target_id) order by id for share;
  perform 1 from public.contributor_content where contributor_id in(v_alias_id,v_target_id) order by id for share;

  if (select count(*) from public.decision_ledger d where d.decision_type='email_sender_identity_reconciliation'
    and d.provenance->>'decision_ref'=v_decision_ref)>1 then raise exception 'ambiguous audit decision'; end if;
  select * into v_saved from public.decision_ledger d
    where d.decision_type='email_sender_identity_reconciliation'
      and d.provenance->>'decision_ref'=v_decision_ref;
  if found then
    if v_saved.status is distinct from 'applied' or v_saved.decided_by is distinct from 'ZURIEL'
      or v_saved.provenance->>'authorization_scope' is distinct from 'PRIVATE_IDENTITY_ONLY'
      or v_saved.provenance->>'input_revision' is distinct from md5(v_ctx::text)
      or exists(select 1 from public.decision_ledger d where d.decision_type='email_sender_identity_reconciliation_rollback'
        and d.provenance->>'original_decision_id'=v_saved.id::text) then
      raise exception 'decision replay mismatch or rolled back';
    end if;
    if (select md5(to_jsonb(c)::text) from public.contributors c where c.id=(v_saved.result_ref->>'created_contributor_id')::uuid)
          is distinct from v_saved.result_ref->>'created_revision'
      or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=v_alias_id)
          is distinct from v_saved.result_ref->>'alias_revision'
      or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=v_target_id)
          is distinct from v_saved.result_ref->>'target_revision'
      or not exists(select 1 from public.persons where person_id=v_person4 and account_user_id=v_user4)
      or not exists(select 1 from public.persons where person_id=v_person13 and account_user_id=v_user13)
      or (select count(*) from public.persons where account_user_id in(v_user4,v_user13))<>2
      or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=v_user4
        and a.email_confirmed_at is not null and lower(btrim(a.email))=v_mailbox4 and lower(btrim(u.email))=v_mailbox4
        and md5(to_jsonb(u)::text)=v_ctx->'link'->>'user_revision')
      or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=v_user13
        and a.email_confirmed_at is not null and lower(btrim(a.email))=v_mailbox13 and lower(btrim(u.email))=v_mailbox13
        and md5(to_jsonb(u)::text)=v_ctx->'alias'->>'user_revision') then
      raise exception 'applied identity state changed; manual review required';
    end if;
    return; -- exact replay: no new profile, alias change or audit row
  end if;

  if (select count(*) from public.users u where lower(btrim(u.email))=v_mailbox4)<>1
    or (select count(*) from public.users u where lower(btrim(u.email))=v_mailbox13)<>1
    or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=v_user4
      and a.email_confirmed_at is not null and lower(btrim(u.email))=v_mailbox4 and lower(btrim(a.email))=v_mailbox4
      and md5(to_jsonb(u)::text)=v_ctx->'link'->>'user_revision')
    or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=v_user13
      and a.email_confirmed_at is not null and lower(btrim(u.email))=v_mailbox13 and lower(btrim(a.email))=v_mailbox13
      and md5(to_jsonb(u)::text)=v_ctx->'alias'->>'user_revision') then
    raise exception 'verified account state changed';
  end if;
  if (select count(*) from public.persons p where p.account_user_id=v_user4)<>1
    or (select count(*) from public.persons p where p.account_user_id=v_user13)<>1
    or not exists(select 1 from public.persons where person_id=v_person4 and account_user_id=v_user4)
    or not exists(select 1 from public.persons where person_id=v_person13 and account_user_id=v_user13) then
    raise exception 'account Person state changed';
  end if;
  if exists(select 1 from public.contributors c left join public.users u on u.id=c.user_id
    where c.user_id=v_user4 or coalesce(lower(nullif(btrim(c.email),'')),lower(nullif(btrim(u.email),'')))=v_mailbox4)
    or (select count(*) from public.contributors where user_id=v_user13)<>1
    or (select count(*) from public.contributors c left join public.users u on u.id=c.user_id
      where coalesce(lower(nullif(btrim(c.email),'')),lower(nullif(btrim(u.email),'')))=v_mailbox13)<>2 then
    raise exception 'contributor candidate state changed';
  end if;
  select md5(to_jsonb(c)::text) into v_source_rev from public.contributors c where c.id=v_alias_id
    and c.active is true and c.merged_into is null and c.user_id is null
    and c.kind='external' and c.source='openweb_import'
    and c.dossier_settings->>'visibility'='private' and lower(btrim(c.email))=v_mailbox13;
  select md5(to_jsonb(c)::text) into v_target_rev from public.contributors c where c.id=v_target_id
    and c.active is true and c.merged_into is null and c.user_id=v_user13
    and c.source='self-dossier' and c.slug=v_target_slug
    and coalesce(lower(nullif(btrim(c.email),'')),v_mailbox13)=v_mailbox13;
  if v_source_rev is distinct from v_ctx->'alias'->>'source_revision'
    or v_target_rev is distinct from v_ctx->'alias'->>'target_revision'
    or v_source_rev is null or v_target_rev is null
    or (select count(*) from public.contributors where slug=v_target_slug or id::text=v_target_slug)<>1 then
    raise exception 'canonical profile state changed';
  end if;
  select md5(jsonb_build_object(
    'research',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.research_contributions r where r.author_contributor_id in(v_alias_id,v_target_id)),'[]'::jsonb),
    'content',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.contributor_content r where r.contributor_id in(v_alias_id,v_target_id)),'[]'::jsonb))::text) into v_material_rev;
  select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.person_id),'[]'::jsonb)::text) into v_person_rev
    from public.persons p where p.account_user_id in(v_user4,v_user13);
  if v_material_rev is distinct from v_ctx->>'material_revision' then raise exception 'material state changed'; end if;
  v_record_before:=jsonb_build_object('alias_revision',v_source_rev,'target_revision',v_target_rev,
    'alias_merged_into',null,'material_revision',v_material_rev,'person_revision',v_person_rev);

  v_new_id:=gen_random_uuid();
  insert into public.contributors(id,slug,display_name,email,user_id,kind,active,source,
    building,engaged,trusted,dossier_settings,page_config)
    values(v_new_id,'mail-source-'||replace(v_new_id::text,'-',''),btrim(v_ctx->'approved'->3->>'display'),v_mailbox4,
      v_user4,'private',true,'email-approved-20261013',false,false,false,
      jsonb_build_object('visibility','private','identity_basis','human_gate_account_link'),jsonb_build_object('version',1));
  update public.contributors set merged_into=v_target_slug where id=v_alias_id and merged_into is null;
  get diagnostics v_affected=row_count;
  if v_affected<>1 then raise exception 'alias write count changed'; end if;
  -- Source profile changes one field only; no material ownership/status transfer.
  if (select md5((to_jsonb(c)-'merged_into')::text) from public.contributors c where c.id=v_alias_id)
       is distinct from v_ctx->'alias'->>'source_without_pointer_revision'
    or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=v_target_id) is distinct from v_target_rev
    or (select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.person_id),'[]'::jsonb)::text) from public.persons p where p.account_user_id in(v_user4,v_user13)) is distinct from v_person_rev
    or (select md5(jsonb_build_object(
      'research',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.research_contributions r where r.author_contributor_id in(v_alias_id,v_target_id)),'[]'::jsonb),
      'content',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.contributor_content r where r.contributor_id in(v_alias_id,v_target_id)),'[]'::jsonb))::text)) is distinct from v_material_rev then
    raise exception 'preservation check failed';
  end if;
  select md5(to_jsonb(c)::text) into v_created_rev from public.contributors c where c.id=v_new_id;
  select md5(to_jsonb(c)::text) into v_source_rev from public.contributors c where c.id=v_alias_id;
  insert into public.decision_ledger(decision_type,subject_type,subject_ref,candidate,domain,
    created_by_agent,evidence,rules_version,human_decision,human_reason,decided_by,result_ref,provenance,status)
    values('email_sender_identity_reconciliation','contributor',v_alias_id::text,
      jsonb_build_object('account_user_id',v_user4,'canonical_contributor_id',v_target_id,'alias_contributor_id',v_alias_id),
      'person_identity','GPT',v_record_before,
      jsonb_build_object('person_foundation_contract_law',6,'inter_agent_coordination_law',16),
      'modify','Explicit ZURIEL choice 1: account-linked primary and retained native private alias; preserve material/access.','ZURIEL',
      jsonb_build_object('created_contributor_id',v_new_id,'created_revision',v_created_rev,'alias_contributor_id',v_alias_id,
        'alias_revision',v_source_rev,'canonical_contributor_id',v_target_id,'canonical_slug',v_target_slug,'target_revision',v_target_rev,
        'account_user_id',v_user4,'account_person_id',v_person4,'canonical_account_user_id',v_user13,'canonical_account_person_id',v_person13),
      jsonb_build_object('decision_ref',v_decision_ref,'human_choice',1,'input_revision',md5(v_ctx::text),
        'authorization_scope','PRIVATE_IDENTITY_ONLY','public_permission_changed',false,'material_transferred',false),
      'applied');
end
$private_email_identity_choice$;
