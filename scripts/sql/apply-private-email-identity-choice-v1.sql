-- Privileged, reviewed one-off DML. NOT a migration/RPC/ingress handler.
-- The trusted operator sets sod1820.email_identity_choice_v1 with private JSON
-- inside the SAME BEGIN/COMMIT as this block. No sender/contact data belongs in git.
-- Context: decision_ref, human_choice=1, approved[13], link{user_id,user_revision,
-- person_id}, alias{user_id,user_revision,person_id,contributor_id,target_id,
-- source_revision,target_revision,target_slug}, material_revision.
-- An operator role and an explicit real Human-Gate decision are BOTH required;
-- the JSON is provenance, never an authorization claim for an exposed endpoint.
do $private_email_identity_choice$
declare
  ctx jsonb := nullif(current_setting('sod1820.email_identity_choice_v1',true),'')::jsonb;
  decision_ref text;
  mailbox4 text; mailbox13 text;
  user4 uuid; user13 uuid; person4 uuid; person13 uuid;
  alias_id uuid; target_id uuid; new_id uuid;
  target_slug text; source_rev text; target_rev text; created_rev text;
  material_rev text; person_rev text;
  record_before jsonb; saved record;
  affected integer;
begin
  if current_user <> 'postgres' then raise exception 'trusted database operator required'; end if;
  if ctx is null or ctx->'human_choice' is distinct from '1'::jsonb
    or nullif(btrim(ctx->>'decision_ref'),'') is null then
    raise exception 'explicit recorded human choice required';
  end if;
  decision_ref:=ctx->>'decision_ref';
  if length(decision_ref)>200 or jsonb_typeof(ctx->'approved') is distinct from 'array'
    or jsonb_array_length(ctx->'approved')<>13 then raise exception 'invalid approved context'; end if;
  if (select count(distinct lower(btrim(value->>'email'))) from jsonb_array_elements(ctx->'approved'))<>13
    or exists(select 1 from jsonb_array_elements(ctx->'approved') i where
      nullif(btrim(i->>'display'),'') is null or length(btrim(i->>'display'))>200
      or coalesce(btrim(i->>'email'),'') !~ '^[^[:space:]@,;<>]+@[^[:space:]@,;<>]+\.[^[:space:]@,;<>]+$') then
    raise exception 'invalid approved source set';
  end if;
  mailbox4:=lower(btrim(ctx->'approved'->3->>'email'));
  mailbox13:=lower(btrim(ctx->'approved'->12->>'email'));
  user4:=(ctx->'link'->>'user_id')::uuid; user13:=(ctx->'alias'->>'user_id')::uuid;
  person4:=(ctx->'link'->>'person_id')::uuid; person13:=(ctx->'alias'->>'person_id')::uuid;
  alias_id:=(ctx->'alias'->>'contributor_id')::uuid; target_id:=(ctx->'alias'->>'target_id')::uuid;
  target_slug:=ctx->'alias'->>'target_slug';
  if user4 is null or user13 is null or user4=user13 or person4 is null or person13 is null
    or person4=person13 or alias_id is null or target_id is null or alias_id=target_id
    or nullif(target_slug,'') is null or ctx->>'material_revision' is null then
    raise exception 'incomplete identity context';
  end if;
  -- A short lock prevents contributor INSERT phantoms from non-cooperating legacy
  -- writers (there is no mailbox/user_id uniqueness constraint). Reads continue.
  -- Caller also supplies transaction-local lock_timeout and statement_timeout.
  perform pg_advisory_xact_lock(hashtext('email_source_author_provisioning_v1'));
  perform pg_advisory_xact_lock(hashtextextended('person_account:'||u::text,1820))
    from unnest(array[user4,user13]) u order by u;
  lock table public.contributors in share row exclusive mode;
  perform 1 from public.users where id in(user4,user13) order by id for share;
  perform 1 from auth.users where id in(user4,user13) order by id for share;
  perform 1 from public.persons where account_user_id in(user4,user13) order by person_id for share;
  perform 1 from public.research_contributions where author_contributor_id in(alias_id,target_id) order by id for share;
  perform 1 from public.contributor_content where contributor_id in(alias_id,target_id) order by id for share;

  if (select count(*) from public.decision_ledger d where d.decision_type='email_sender_identity_reconciliation'
    and d.provenance->>'decision_ref'=decision_ref)>1 then raise exception 'ambiguous audit decision'; end if;
  select * into saved from public.decision_ledger d
    where d.decision_type='email_sender_identity_reconciliation'
      and d.provenance->>'decision_ref'=decision_ref;
  if found then
    if saved.status is distinct from 'applied' or saved.decided_by is distinct from 'ZURIEL'
      or saved.provenance->>'authorization_scope' is distinct from 'PRIVATE_IDENTITY_ONLY'
      or saved.provenance->>'input_revision' is distinct from md5(ctx::text)
      or exists(select 1 from public.decision_ledger d where d.decision_type='email_sender_identity_reconciliation_rollback'
        and d.provenance->>'original_decision_id'=saved.id::text) then
      raise exception 'decision replay mismatch or rolled back';
    end if;
    if (select md5(to_jsonb(c)::text) from public.contributors c where c.id=(saved.result_ref->>'created_contributor_id')::uuid)
          is distinct from saved.result_ref->>'created_revision'
      or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=alias_id)
          is distinct from saved.result_ref->>'alias_revision'
      or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=target_id)
          is distinct from saved.result_ref->>'target_revision'
      or not exists(select 1 from public.persons where person_id=person4 and account_user_id=user4)
      or not exists(select 1 from public.persons where person_id=person13 and account_user_id=user13)
      or (select count(*) from public.persons where account_user_id in(user4,user13))<>2
      or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=user4
        and a.email_confirmed_at is not null and lower(btrim(a.email))=mailbox4 and lower(btrim(u.email))=mailbox4
        and md5(to_jsonb(u)::text)=ctx->'link'->>'user_revision')
      or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=user13
        and a.email_confirmed_at is not null and lower(btrim(a.email))=mailbox13 and lower(btrim(u.email))=mailbox13
        and md5(to_jsonb(u)::text)=ctx->'alias'->>'user_revision') then
      raise exception 'applied identity state changed; manual review required';
    end if;
    return; -- exact replay: no new profile, alias change or audit row
  end if;

  if (select count(*) from public.users u where lower(btrim(u.email))=mailbox4)<>1
    or (select count(*) from public.users u where lower(btrim(u.email))=mailbox13)<>1
    or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=user4
      and a.email_confirmed_at is not null and lower(btrim(u.email))=mailbox4 and lower(btrim(a.email))=mailbox4
      and md5(to_jsonb(u)::text)=ctx->'link'->>'user_revision')
    or not exists(select 1 from public.users u join auth.users a on a.id=u.id where u.id=user13
      and a.email_confirmed_at is not null and lower(btrim(u.email))=mailbox13 and lower(btrim(a.email))=mailbox13
      and md5(to_jsonb(u)::text)=ctx->'alias'->>'user_revision') then
    raise exception 'verified account state changed';
  end if;
  if (select count(*) from public.persons p where p.account_user_id=user4)<>1
    or (select count(*) from public.persons p where p.account_user_id=user13)<>1
    or not exists(select 1 from public.persons where person_id=person4 and account_user_id=user4)
    or not exists(select 1 from public.persons where person_id=person13 and account_user_id=user13) then
    raise exception 'account Person state changed';
  end if;
  if exists(select 1 from public.contributors c left join public.users u on u.id=c.user_id
    where c.user_id=user4 or coalesce(lower(nullif(btrim(c.email),'')),lower(nullif(btrim(u.email),'')))=mailbox4)
    or (select count(*) from public.contributors where user_id=user13)<>1
    or (select count(*) from public.contributors c left join public.users u on u.id=c.user_id
      where coalesce(lower(nullif(btrim(c.email),'')),lower(nullif(btrim(u.email),'')))=mailbox13)<>2 then
    raise exception 'contributor candidate state changed';
  end if;
  select md5(to_jsonb(c)::text) into source_rev from public.contributors c where c.id=alias_id
    and c.active is true and c.merged_into is null and c.user_id is null
    and c.kind='external' and c.source='openweb_import'
    and c.dossier_settings->>'visibility'='private' and lower(btrim(c.email))=mailbox13;
  select md5(to_jsonb(c)::text) into target_rev from public.contributors c where c.id=target_id
    and c.active is true and c.merged_into is null and c.user_id=user13
    and c.source='self-dossier' and c.slug=target_slug
    and coalesce(lower(nullif(btrim(c.email),'')),mailbox13)=mailbox13;
  if source_rev is distinct from ctx->'alias'->>'source_revision'
    or target_rev is distinct from ctx->'alias'->>'target_revision'
    or source_rev is null or target_rev is null
    or (select count(*) from public.contributors where slug=target_slug or id::text=target_slug)<>1 then
    raise exception 'canonical profile state changed';
  end if;
  select md5(jsonb_build_object(
    'research',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.research_contributions r where r.author_contributor_id in(alias_id,target_id)),'[]'::jsonb),
    'content',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.contributor_content r where r.contributor_id in(alias_id,target_id)),'[]'::jsonb))::text) into material_rev;
  select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.person_id),'[]'::jsonb)::text) into person_rev
    from public.persons p where p.account_user_id in(user4,user13);
  if material_rev is distinct from ctx->>'material_revision' then raise exception 'material state changed'; end if;
  record_before:=jsonb_build_object('alias_revision',source_rev,'target_revision',target_rev,
    'alias_merged_into',null,'material_revision',material_rev,'person_revision',person_rev);

  new_id:=gen_random_uuid();
  insert into public.contributors(id,slug,display_name,email,user_id,kind,active,source,
    building,engaged,trusted,dossier_settings,page_config)
    values(new_id,'mail-source-'||replace(new_id::text,'-',''),btrim(ctx->'approved'->3->>'display'),mailbox4,
      user4,'private',true,'email-approved-20261013',false,false,false,
      jsonb_build_object('visibility','private','identity_basis','human_gate_account_link'),jsonb_build_object('version',1));
  update public.contributors set merged_into=target_slug where id=alias_id and merged_into is null;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'alias write count changed'; end if;
  -- Source profile changes one field only; no material ownership/status transfer.
  if (select md5((to_jsonb(c)-'merged_into')::text) from public.contributors c where c.id=alias_id)
       is distinct from ctx->'alias'->>'source_without_pointer_revision'
    or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=target_id) is distinct from target_rev
    or (select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.person_id),'[]'::jsonb)::text) from public.persons p where p.account_user_id in(user4,user13)) is distinct from person_rev
    or (select md5(jsonb_build_object(
      'research',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.research_contributions r where r.author_contributor_id in(alias_id,target_id)),'[]'::jsonb),
      'content',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.contributor_content r where r.contributor_id in(alias_id,target_id)),'[]'::jsonb))::text)) is distinct from material_rev then
    raise exception 'preservation check failed';
  end if;
  select md5(to_jsonb(c)::text) into created_rev from public.contributors c where c.id=new_id;
  select md5(to_jsonb(c)::text) into source_rev from public.contributors c where c.id=alias_id;
  insert into public.decision_ledger(decision_type,subject_type,subject_ref,candidate,domain,
    created_by_agent,evidence,rules_version,human_decision,human_reason,decided_by,result_ref,provenance,status)
    values('email_sender_identity_reconciliation','contributor',alias_id::text,
      jsonb_build_object('account_user_id',user4,'canonical_contributor_id',target_id,'alias_contributor_id',alias_id),
      'person_identity','GPT',record_before,
      jsonb_build_object('person_foundation_contract_law',6,'inter_agent_coordination_law',16),
      'modify','Explicit ZURIEL choice 1: account-linked primary and retained native private alias; preserve material/access.','ZURIEL',
      jsonb_build_object('created_contributor_id',new_id,'created_revision',created_rev,'alias_contributor_id',alias_id,
        'alias_revision',source_rev,'canonical_contributor_id',target_id,'canonical_slug',target_slug,'target_revision',target_rev,
        'account_user_id',user4,'account_person_id',person4,'canonical_account_user_id',user13,'canonical_account_person_id',person13),
      jsonb_build_object('decision_ref',decision_ref,'human_choice',1,'input_revision',md5(ctx::text),
        'authorization_scope','PRIVATE_IDENTITY_ONLY','public_permission_changed',false,'material_transferred',false),
      'applied');
end
$private_email_identity_choice$;
