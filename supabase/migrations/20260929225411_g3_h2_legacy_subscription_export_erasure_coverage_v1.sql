-- G3 H2 fresh defect: legacy subscription/payment export + erasure fail-closed coverage
-- Live migration: 20260929225411_g3_h2_legacy_subscription_export_erasure_coverage_v1
-- Policy-neutral: legacy subscription/payment rows are not deleted; disposition remains Human-Gate pending.
-- work_log BEFORE: d29fc5b8-6570-4bd1-8ba5-91431a295fe7

CREATE OR REPLACE FUNCTION public.erasure_my_account_prepare_v2()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_person_ids uuid[] := '{}'::uuid[];
  v_visitors text[] := '{}'::text[];
  v_phones text[] := '{}'::text[];
  v_paths int := 0;
  v_private_revisions int := 0;
  v_governed_revisions int := 0;
begin
  if v_uid is null then raise exception 'authentication required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('account-erasure:'||v_uid::text,0));
  if exists(select 1 from public.credit_ledger where user_id=v_uid)
     or exists(select 1 from public.payment_requests where user_id=v_uid)
     or exists(
       select 1
       from public.paid_subscribers ps
       where exists (
         select 1
         from public.wa_account_links l
         where l.user_id=v_uid
           and public.wa_norm_phone(l.phone)=public.wa_norm_phone(ps.wa_sender)
       )
     ) then
    raise exception 'account_erasure_financial_retention_policy_pending' using errcode='P0001';
  end if;
  select u.email into v_email from public.users u where u.id=v_uid;
  select coalesce(array_agg(distinct p.person_id),'{}'::uuid[]) into v_person_ids from public.persons p where p.account_user_id=v_uid;
  select coalesce(array_agg(distinct x.visitor),'{}'::text[]) into v_visitors
  from (
    select vi.visitor from public.visitor_identity vi where vi.user_id=v_uid or (v_email is not null and lower(vi.email)=lower(v_email))
    union select ie.sod_id from public.identity_edges ie where ie.person_id=any(v_person_ids)
  ) x where nullif(btrim(x.visitor),'') is not null;
  select coalesce(array_agg(distinct regexp_replace(l.phone,'@.*$','')),'{}'::text[]) into v_phones from public.wa_account_links l where l.user_id=v_uid;

  delete from public.authorized_uploaders where user_id=v_uid;
  delete from public.ai_router_usage where user_id=v_uid;
  update public.ai_analysis_log set user_id=null,visitor=null,subject=null,content=null
    where user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and visitor=any(v_visitors));
  update public.ai_token_log set user_id=null,visitor=null,ref=null,ref_name=null
    where user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and visitor=any(v_visitors));
  update public.subscribe_events set user_id=null,visitor_id=null
    where user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors));
  delete from public.community_hints
    where status not in ('approved','published')
      and (reporter_user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors)));
  update public.community_hints set reporter_user_id=null,visitor_id=null,reporter_name='חוקר לשעבר'
    where status in ('approved','published')
      and (reporter_user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors)));
  update public.els_records set visitor_id=null
    where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  update public.language_links set created_by_visitor=null
    where coalesce(array_length(v_visitors,1),0)>0 and created_by_visitor=any(v_visitors);
  delete from public.journey_saves where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  update public.journey_ab_log set visitor_id=null where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  delete from public.visitor_events where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  update public.site_visits set visitor=null where coalesce(array_length(v_visitors,1),0)>0 and visitor=any(v_visitors);
  update public.feedback set visitor_id=null where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  update public.share_events set visitor_id=null where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  delete from public.notification_prefs where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  delete from public.push_subscriptions where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  delete from public.analytics_excluded_visitors where coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors);
  delete from public.research_leads
    where user_id=v_uid or (v_email is not null and lower(email)=lower(v_email))
       or (coalesce(array_length(v_visitors,1),0)>0 and visitor_id=any(v_visitors));
  delete from public.bot_referrals
    where registered_user_id=v_uid
       or (coalesce(array_length(v_phones,1),0)>0 and regexp_replace(phone,'@.*$','')=any(v_phones));
  if v_email is not null then
    update public.g3_openweb_import_stage set email=null,email_verified=false where lower(email)=lower(v_email);
  end if;

  update public.research_path_revisions r
     set created_by_user_id=null,steps='[]'::jsonb,
         provenance=jsonb_build_object('erasure_state','private_redacted','erased_at',now()),
         representation='{}'::jsonb
   where r.path_id in (select id from public.research_paths where created_by_user_id=v_uid)
     and r.access_scope='private' and r.governance_status in ('candidate','rejected') and r.published_at is null;
  get diagnostics v_private_revisions=row_count;
  update public.research_path_revisions r
     set created_by_user_id=null,
         provenance=(coalesce(r.provenance,'{}'::jsonb)-'user_id'-'created_by_user_id'-'visitor_id'-'email'-'phone'-'saved_by_user')
           || jsonb_build_object('erasure_state','attribution_detached')
   where r.path_id in (select id from public.research_paths where created_by_user_id=v_uid)
     and not (r.access_scope='private' and r.governance_status in ('candidate','rejected') and r.published_at is null);
  get diagnostics v_governed_revisions=row_count;
  update public.research_paths p
     set created_by_user_id=null,
         identity_metadata=(coalesce(p.identity_metadata,'{}'::jsonb)-'user_id'-'created_by_user_id'-'visitor_id'-'email'-'phone')
           || jsonb_build_object('erasure_state','attribution_detached')
   where p.created_by_user_id=v_uid;
  get diagnostics v_paths=row_count;

  return jsonb_build_object('ok',true,'identity_detach','extended_v2',
    'research_paths_detached',v_paths,'private_path_revisions_redacted',v_private_revisions,
    'governed_path_revisions_detached',v_governed_revisions,'financial_retention_guard','passed_no_rows');
end
$function$;
REVOKE ALL ON FUNCTION public.erasure_my_account_prepare_v2() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.erasure_my_account_prepare_v2() TO postgres;

CREATE OR REPLACE FUNCTION public.export_my_data_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(nullif(auth.jwt()->>'email',''),'');
  v_person_ids uuid[] := '{}'::uuid[];
  v_visitors text[] := '{}'::text[];
  v_phones text[] := '{}'::text[];
  v_sessions text[] := '{}'::text[];
begin
  if v_uid is null then raise exception 'authentication required' using errcode='42501'; end if;
  select coalesce(nullif(u.email,''),v_email) into v_email from public.users u where u.id=v_uid;
  v_email := coalesce(v_email,'');
  select coalesce(array_agg(distinct p.person_id),'{}'::uuid[]) into v_person_ids
    from public.persons p where p.account_user_id=v_uid;
  select coalesce(array_agg(distinct x.visitor),'{}'::text[]) into v_visitors
  from (
    select vi.visitor from public.visitor_identity vi
      where vi.user_id=v_uid or (v_email<>'' and lower(vi.email)=lower(v_email))
    union
    select ie.sod_id from public.identity_edges ie where ie.person_id=any(v_person_ids)
  ) x where nullif(btrim(x.visitor),'') is not null;
  select coalesce(array_agg(distinct regexp_replace(l.phone,'@.*$','')),'{}'::text[]) into v_phones
    from public.wa_account_links l where l.user_id=v_uid;
  select coalesce(array_agg(distinct e.session_id),'{}'::text[]) into v_sessions
    from public.events e
   where e.session_id is not null
     and (e.person_id=any(v_person_ids)
       or (coalesce(array_length(v_visitors,1),0)>0 and e.sod_id=any(v_visitors)));

  return jsonb_build_object(
    'contract','person_foundation_contract_law v6 / H2 export v1',
    'generated_at',now(),'subject_user_id',v_uid,
    'identity',jsonb_build_object(
      'account',coalesce((select to_jsonb(u) from public.users u where u.id=v_uid),'null'::jsonb),
      'profile',coalesce((select to_jsonb(p) from public.profiles p where p.user_id=v_uid),'null'::jsonb),
      'persons',coalesce((select jsonb_agg(to_jsonb(p)) from public.persons p where p.person_id=any(v_person_ids)),'[]'::jsonb),
      'identity_edges',coalesce((select jsonb_agg(to_jsonb(i)) from public.identity_edges i where i.person_id=any(v_person_ids)),'[]'::jsonb),
      'visitor_identity',coalesce((select jsonb_agg(to_jsonb(vi)) from public.visitor_identity vi where vi.user_id=v_uid or (v_email<>'' and lower(vi.email)=lower(v_email))),'[]'::jsonb),
      'wa_links',coalesce((select jsonb_agg(to_jsonb(w)) from public.wa_account_links w where w.user_id=v_uid),'[]'::jsonb)
    ),
    'private_workspace',jsonb_build_object(
      'research_items',coalesce((select jsonb_agg(to_jsonb(x)) from public.research_items x where x.user_id=v_uid),'[]'::jsonb),
      'user_research',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_research x where x.user_id=v_uid),'[]'::jsonb),
      'user_notes',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_notes x where x.user_id=v_uid),'[]'::jsonb),
      'research_paths',coalesce((select jsonb_agg(to_jsonb(x)) from public.research_paths x where x.created_by_user_id=v_uid),'[]'::jsonb),
      'research_path_revisions',coalesce((select jsonb_agg(to_jsonb(r)) from public.research_path_revisions r join public.research_paths p on p.id=r.path_id where p.created_by_user_id=v_uid or r.created_by_user_id=v_uid),'[]'::jsonb),
      'legacy_journey_saves',coalesce((select jsonb_agg(to_jsonb(j)) from public.journey_saves j where coalesce(array_length(v_visitors,1),0)>0 and j.visitor_id=any(v_visitors)),'[]'::jsonb)
    ),
    'follow_and_notifications',jsonb_build_object(
      'notification_prefs',coalesce((select jsonb_agg(to_jsonb(x)) from public.notification_prefs x where x.user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors))),'[]'::jsonb),
      'push_subscriptions',coalesce((select jsonb_agg(to_jsonb(x)) from public.push_subscriptions x where x.user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors))),'[]'::jsonb),
      'subscribe_events',coalesce((select jsonb_agg(to_jsonb(x)) from public.subscribe_events x where x.user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors))),'[]'::jsonb),
      'notifications',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_notifications x where x.user_id=v_uid),'[]'::jsonb)
    ),
    'research_and_contributions',jsonb_build_object(
      'research_contributions',coalesce((select jsonb_agg(to_jsonb(x)) from public.research_contributions x where x.author_user_id=v_uid),'[]'::jsonb),
      'community_hints',coalesce((select jsonb_agg(to_jsonb(x)) from public.community_hints x where x.reporter_user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors))),'[]'::jsonb),
      'els_records',coalesce((select jsonb_agg(to_jsonb(x)) from public.els_records x where x.owner_user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors))),'[]'::jsonb),
      'els_finds',coalesce((select jsonb_agg(to_jsonb(x)) from public.els_finds x where x.user_id=v_uid),'[]'::jsonb),
      'contribution_events',coalesce((select jsonb_agg(to_jsonb(x)) from public.contribution_events x where x.user_id=v_uid),'[]'::jsonb)
    ),
    'ai_and_operational',jsonb_build_object(
      'ai_analysis_log',coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_analysis_log x where x.user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and x.visitor=any(v_visitors))),'[]'::jsonb),
      'ai_token_log',coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_token_log x where x.user_id=v_uid or (coalesce(array_length(v_visitors,1),0)>0 and x.visitor=any(v_visitors))),'[]'::jsonb),
      'ai_router_usage',coalesce((select jsonb_agg(to_jsonb(x)) from public.ai_router_usage x where x.user_id=v_uid),'[]'::jsonb),
      'user_activity',coalesce((select jsonb_agg(to_jsonb(x)) from public.user_activity x where x.user_id=v_uid),'[]'::jsonb),
      'trace_roots',coalesce((select jsonb_agg(jsonb_build_object('trace_id',t.trace_id,'interaction_id',t.interaction_id,'capability',t.capability,'surface',t.surface,'channel',t.channel,'identity_class',t.identity_class,'session_ref',t.session_ref,'started_at',t.started_at,'ended_at',t.ended_at,'outcome',t.outcome)) from public.op_trace_roots t where coalesce(array_length(v_sessions,1),0)>0 and t.session_ref=any(v_sessions)),'[]'::jsonb)
    ),
    'visitor_telemetry',jsonb_build_object(
      'events',coalesce((select jsonb_agg(to_jsonb(e)) from public.events e where e.person_id=any(v_person_ids) or (coalesce(array_length(v_visitors,1),0)>0 and e.sod_id=any(v_visitors))),'[]'::jsonb),
      'site_visits',coalesce((select jsonb_agg(to_jsonb(x)) from public.site_visits x where coalesce(array_length(v_visitors,1),0)>0 and x.visitor=any(v_visitors)),'[]'::jsonb),
      'visitor_events',coalesce((select jsonb_agg(to_jsonb(x)) from public.visitor_events x where coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors)),'[]'::jsonb),
      'share_events',coalesce((select jsonb_agg(to_jsonb(x)) from public.share_events x where coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors)),'[]'::jsonb),
      'feedback',coalesce((select jsonb_agg(to_jsonb(x)) from public.feedback x where coalesce(array_length(v_visitors,1),0)>0 and x.visitor_id=any(v_visitors)),'[]'::jsonb)
    ),
    'financial_and_entitlement',jsonb_build_object(
      'credit_ledger',coalesce((select jsonb_agg(to_jsonb(x)) from public.credit_ledger x where x.user_id=v_uid),'[]'::jsonb),
      'payment_requests',coalesce((select jsonb_agg(to_jsonb(x)-'proof_url') from public.payment_requests x where x.user_id=v_uid),'[]'::jsonb),
      'legacy_paid_subscribers',coalesce((
        select jsonb_agg(to_jsonb(ps))
        from public.paid_subscribers ps
        where exists (
          select 1 from unnest(v_phones) p(phone)
          where public.wa_norm_phone(p.phone)=public.wa_norm_phone(ps.wa_sender)
        )
      ),'[]'::jsonb),
      'legacy_subscriber_payments',coalesce((
        select jsonb_agg(to_jsonb(sp))
        from public.subscriber_payments sp
        join public.paid_subscribers ps on ps.id=sp.subscriber_id
        where exists (
          select 1 from unnest(v_phones) p(phone)
          where public.wa_norm_phone(p.phone)=public.wa_norm_phone(ps.wa_sender)
        )
      ),'[]'::jsonb),
      'note','Retention/erasure disposition is Human-Gate pending; export does not authorize deletion.'
    ),
    'communications_and_source_history',jsonb_build_object(
      'newsletter_sends',coalesce((select jsonb_agg(to_jsonb(x)-'token') from public.newsletter_sends x where v_email<>'' and lower(x.email)=lower(v_email)),'[]'::jsonb),
      'email_events',coalesce((select jsonb_agg(to_jsonb(x)) from public.email_events x where v_email<>'' and lower(x.email)=lower(v_email)),'[]'::jsonb),
      'contact_messages',coalesce((select jsonb_agg(to_jsonb(x)) from public.contact_messages x where v_email<>'' and lower(x.email)=lower(v_email)),'[]'::jsonb),
      'chiddush_submissions',coalesce((select jsonb_agg(to_jsonb(x)) from public.chiddush_submissions x where v_email<>'' and lower(x.author_email)=lower(v_email)),'[]'::jsonb),
      'openweb_source_rows',coalesce((select jsonb_agg(to_jsonb(x)-'email') from public.g3_openweb_import_stage x where v_email<>'' and lower(x.email)=lower(v_email)),'[]'::jsonb),
      'note','Source/communications records; export visibility does not imply automatic erasure authority.'
    ),
    'coverage_notes',jsonb_build_object(
      'search_log','NOT_INDIVIDUALLY_ADDRESSABLE: no account/person/visitor identity.',
      'trace_spans','A2-owned; export exposes matched root references only.',
      'media_submissions','Account-owned research_contributions/community_hints media included above.'
    )
  );
end
$function$;
REVOKE ALL ON FUNCTION public.export_my_data_v1() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.export_my_data_v1() TO authenticated;
