-- Optional separately approved rollback. No deletes/cascades/Person mutations.
-- SAME transaction context as apply: sod1820.email_identity_choice_v1 JSON with
-- human_choice="rollback", decision_ref and a new rollback_decision_ref.
-- Deactivate the exact unused new private source and restore ONLY alias pointer.
-- Any subsequent source approval/material/row change holds for manual review.
do $rollback_private_email_identity_choice$
declare
  ctx jsonb:=nullif(current_setting('sod1820.email_identity_choice_v1',true),'')::jsonb;
  saved record;
  created_id uuid; alias_id uuid; target_id uuid;
  user4 uuid; user13 uuid;
  affected integer;
begin
  if current_user<>'postgres' then raise exception 'trusted database operator required'; end if;
  if ctx is null or ctx->>'human_choice' is distinct from 'rollback'
    or nullif(ctx->>'decision_ref','') is null or nullif(ctx->>'rollback_decision_ref','') is null then
    raise exception 'explicit recorded rollback choice required';
  end if;
  perform pg_advisory_xact_lock(hashtext('email_source_author_provisioning_v1'));
  if (select count(*) from public.decision_ledger d where d.decision_type='email_sender_identity_reconciliation'
    and d.provenance->>'decision_ref'=ctx->>'decision_ref')<>1 then raise exception 'original audit decision not unique'; end if;
  select * into saved from public.decision_ledger d where d.decision_type='email_sender_identity_reconciliation'
    and d.provenance->>'decision_ref'=ctx->>'decision_ref';
  if saved.status is distinct from 'applied' or saved.decided_by is distinct from 'ZURIEL'
    or saved.provenance->>'authorization_scope' is distinct from 'PRIVATE_IDENTITY_ONLY' then raise exception 'original decision is not eligible'; end if;
  if exists(select 1 from public.decision_ledger d where d.decision_type='email_sender_identity_reconciliation_rollback'
      and (d.provenance->>'original_decision_id'=saved.id::text or d.provenance->>'decision_ref'=ctx->>'rollback_decision_ref')) then
    raise exception 'rollback already recorded; do not repeat or reuse approval';
  end if;
  created_id:=(saved.result_ref->>'created_contributor_id')::uuid;
  alias_id:=(saved.result_ref->>'alias_contributor_id')::uuid;
  target_id:=(saved.result_ref->>'canonical_contributor_id')::uuid;
  user4:=(saved.result_ref->>'account_user_id')::uuid;user13:=(saved.result_ref->>'canonical_account_user_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended('person_account:'||u::text,1820))
    from unnest(array[user4,user13]) u order by u;
  lock table public.contributors in share row exclusive mode;
  if (select md5(to_jsonb(c)::text) from public.contributors c where c.id=created_id) is distinct from saved.result_ref->>'created_revision'
    or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=alias_id) is distinct from saved.result_ref->>'alias_revision'
    or (select md5(to_jsonb(c)::text) from public.contributors c where c.id=target_id) is distinct from saved.result_ref->>'target_revision' then
    raise exception 'rollback state changed; manual review required';
  end if;
  if exists(select 1 from public.research_contributions where author_contributor_id=created_id)
    or exists(select 1 from public.contributor_content where contributor_id=created_id)
    or exists(select 1 from public.channel_updates where contributor_id=created_id)
    or exists(select 1 from public.channel_update_group_proof where identity_contributor_id=created_id)
    or exists(select 1 from public.inbound_emails where meta->'source_email_v1'->'author'->>'contributor_id'=created_id::text)
    or exists(select 1 from public.identity_edges where legacy_id='contributor:'||created_id::text
      or sod_id='historical:contributor:'||created_id::text) then
    raise exception 'new source has references; manual rollback required';
  end if;
  update public.contributors set merged_into=null where id=alias_id
    and merged_into=saved.result_ref->>'canonical_slug';
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'rollback alias count changed'; end if;
  update public.contributors set active=false where id=created_id and kind='private'
    and dossier_settings->>'visibility'='private' and user_id=user4;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'rollback source count changed'; end if;
  if (select md5(to_jsonb(c)::text) from public.contributors c where c.id=alias_id)
    is distinct from saved.evidence->>'alias_revision' then raise exception 'alias rollback preservation failed'; end if;
  insert into public.decision_ledger(decision_type,subject_type,subject_ref,candidate,domain,created_by_agent,
    evidence,rules_version,human_decision,human_reason,decided_by,result_ref,provenance,status)
    values('email_sender_identity_reconciliation_rollback','contributor',alias_id::text,saved.candidate,
      'person_identity','GPT',jsonb_build_object('original_decision_id',saved.id),saved.rules_version,
      'modify','Separately approved expected-state rollback; preserve rows/material/Persons.','ZURIEL',
      jsonb_build_object('retained_inactive_private_source',created_id,'restored_alias',alias_id),
      jsonb_build_object('original_decision_id',saved.id,'decision_ref',ctx->>'rollback_decision_ref',
        'deleted_rows',false,'material_transferred',false,'public_permission_changed',false), 'applied');
end
$rollback_private_email_identity_choice$;
