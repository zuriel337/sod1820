-- G2 P0-C · Person/account erasure Foundation only.
-- No UI surface is introduced. No existing active user is mutated by this migration.
-- Preserve governed/public knowledge; delete personal working state; break re-identification links.

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_email text;
  v_person_ids uuid[] := '{}'::uuid[];
  v_memory_refs text[] := '{}'::text[];
  v_kept int := 0;
  v_hidden int := 0;
  v_memory_deleted int := 0;
  v_personal_deleted int := 0;
  v_events_detached int := 0;
  v_persons_deleted int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok',false,'error','not_authenticated');
  end if;

  select u.email into v_email from public.users u where u.id=v_uid;
  select c.display_name into v_name from public.contributors c where c.user_id=v_uid limit 1;
  select coalesce(array_agg(p.person_id),'{}'::uuid[]) into v_person_ids
    from public.persons p where p.account_user_id=v_uid;

  select coalesce(array_agg(distinct ref),'{}'::text[]) into v_memory_refs
  from (
    select v_uid::text as ref
    union all
    select l.phone::text from public.wa_account_links l where l.user_id=v_uid
    union all
    select regexp_replace(l.phone::text,'@.*$','') from public.wa_account_links l where l.user_id=v_uid
    union all
    select regexp_replace(l.phone::text,'@.*$','') || '@c.us' from public.wa_account_links l where l.user_id=v_uid
  ) r
  where nullif(btrim(ref),'') is not null;

  -- A. Preserve governed/public knowledge, detach personal attribution.
  update public.research_contributions
     set author_user_id=null, author_name='חוקר לשעבר', updated_at=now()
   where author_user_id=v_uid and status in ('approved','published');
  get diagnostics v_kept = row_count;

  update public.research_contributions
     set status='hidden', author_user_id=null, updated_at=now()
   where author_user_id=v_uid and status not in ('approved','published');
  get diagnostics v_hidden = row_count;

  if v_name is not null then
    update public.els_records
       set author_name='חוקר לשעבר'
     where author_name=v_name and status='published';
  end if;
  update public.els_records set owner_user_id=null where owner_user_id=v_uid and status='published';
  update public.gematria_words set created_by=null where created_by=v_uid;
  update public.gallery_posts set uploaded_by=null where uploaded_by=v_uid;
  update public.word_review_queue set submitted_by=null where submitted_by=v_uid;
  update public.contribution_events set user_id=null where user_id=v_uid;

  update public.contributors
     set user_id=null, active=false, display_name='חוקר לשעבר', avatar_url=null, bio=null,
         dossier_settings='{}'::jsonb, page_config=jsonb_build_object('version',1), updated_at=now()
   where user_id=v_uid;

  -- B. Delete personal working state / memory.
  delete from public.agent_user_memory where user_ref=any(v_memory_refs);
  get diagnostics v_memory_deleted = row_count;

  delete from public.research_items where user_id=v_uid;
  get diagnostics v_personal_deleted = row_count;
  delete from public.user_notes where user_id=v_uid;
  delete from public.user_research where user_id=v_uid;
  delete from public.user_activity where user_id=v_uid;
  delete from public.visitor_identity where user_id=v_uid or (v_email is not null and email=v_email);
  delete from public.wa_link_codes where user_id=v_uid;
  delete from public.push_subscriptions where user_id=v_uid;
  delete from public.notification_prefs where user_id=v_uid;

  -- C. Preserve aggregate telemetry facts but remove account/device/session linkage.
  if coalesce(array_length(v_person_ids,1),0) > 0 then
    update public.events
       set person_id=null, sod_id=null, session_id=null
     where person_id=any(v_person_ids);
    get diagnostics v_events_detached = row_count;

    -- Existing FK semantics: identity_edges CASCADE; research_objects/family_claims SET NULL.
    delete from public.persons where person_id=any(v_person_ids);
    get diagnostics v_persons_deleted = row_count;
  end if;

  -- D. Remove account-link surfaces after memory refs were captured.
  delete from public.wa_account_links where user_id=v_uid;
  delete from public.profiles where user_id=v_uid;
  delete from public.users where id=v_uid;
  delete from auth.users where id=v_uid;

  return jsonb_build_object(
    'ok',true,
    'knowledge_preserved',v_kept,
    'personal_hidden',v_hidden,
    'memory_deleted',v_memory_deleted,
    'research_items_deleted',v_personal_deleted,
    'telemetry_detached',v_events_detached,
    'persons_deleted',v_persons_deleted,
    'identity_edges','cascade_deleted',
    'research_owner_refs','set_null_by_fk',
    'ui_exposure','none_g2'
  );
end
$function$;

revoke all on function public.delete_my_account() from public, anon, service_role;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
'Foundation-only self-service account erasure primitive. No G2 UI surface. Caller is auth.uid only. Deletes personal memory/workspace and account identity links, detaches telemetry identifiers, preserves governed/public knowledge with attribution removed, and removes account-linked Person rows. Financial/compliance ledgers are intentionally outside this function pending their owning retention policy.';
