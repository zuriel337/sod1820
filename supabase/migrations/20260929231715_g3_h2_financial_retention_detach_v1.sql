-- G3 H2: Human-Gated financial retention closure — RETAIN + DETACH.
-- ZURIEL decision: keep financial history; erase direct account identity.
-- Extends existing H2 erasure/export owner. No financial rows are deleted.

begin;

alter table public.credit_ledger alter column user_id drop not null;
alter table public.credit_ledger drop constraint if exists credit_ledger_user_id_fkey;
alter table public.credit_ledger
  add constraint credit_ledger_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.payment_requests alter column user_id drop not null;

comment on column public.credit_ledger.user_id is
  'Nullable attribution. Financial rows survive account erasure; direct identity is detached.';
comment on column public.payment_requests.user_id is
  'Nullable attribution. Payment-request rows survive account erasure; direct identity is detached.';

do $patch$
declare
  v_def text;
  v_new text;
  v_guard text := $guard$  if exists(select 1 from public.credit_ledger where user_id=v_uid)
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
  end if;$guard$;
  v_phone_anchor text := $anchor$  select coalesce(array_agg(distinct regexp_replace(l.phone,'@.*$','')),'{}'::text[]) into v_phones from public.wa_account_links l where l.user_id=v_uid;$anchor$;
  v_detach text := $detach$

  -- Human Gate 2026-09-30: retain financial history, detach/redact account identity.
  update public.credit_ledger
     set user_id=null,
         meta=(coalesce(meta,'{}'::jsonb)-'user_id'-'email'-'phone'-'display_name')
              || jsonb_build_object('erasure_state','financial_retained_identity_detached')
   where user_id=v_uid;

  if nullif(btrim(coalesce(v_email,'')),'') is not null then
    update public.credit_ledger
       set meta=(coalesce(meta,'{}'::jsonb)-'invitee')
                || jsonb_build_object('erasure_state','financial_retained_counterparty_detached')
     where reason='referral'
       and lower(coalesce(meta->>'invitee',''))=lower(v_email);
  end if;

  update public.payment_requests
     set user_id=null, proof_url=null
   where user_id=v_uid;

  if coalesce(array_length(v_phones,1),0) > 0 then
    update public.subscriber_payments sp
       set notes=null
     where sp.subscriber_id in (
       select ps.id
       from public.paid_subscribers ps
       where ps.wa_sender is not null
         and exists (
           select 1 from unnest(v_phones) p(phone)
           where public.wa_norm_phone(p.phone)=public.wa_norm_phone(ps.wa_sender)
         )
     );

    update public.paid_subscribers ps
       set display_name='חשבון שנמחק', wa_sender=null, ai_sources='{}'::text[], active=false, notes=null
     where ps.wa_sender is not null
       and exists (
         select 1 from unnest(v_phones) p(phone)
         where public.wa_norm_phone(p.phone)=public.wa_norm_phone(ps.wa_sender)
       );
  end if;
$detach$;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='erasure_my_account_prepare_v2' and p.pronargs=0;

  if v_def is null then raise exception 'erasure_my_account_prepare_v2 missing'; end if;
  if position('financial_retained_identity_detached' in v_def) > 0 then return; end if;

  v_new := replace(v_def, v_guard, '');
  if v_new=v_def then raise exception 'financial guard removal failed'; end if;

  v_new := replace(v_new, v_phone_anchor, v_phone_anchor || v_detach);
  if v_new=v_def or position('financial_retained_identity_detached' in v_new)=0 then
    raise exception 'financial detach injection failed';
  end if;

  v_new := replace(v_new,
    '''financial_retention_guard'',''passed_no_rows''',
    '''financial_retention_policy'',''retain_detach''');

  execute v_new;
end
$patch$;

-- The export must describe the resolved Human-Gate policy truthfully.
do $patch$
declare v_def text; v_new text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='export_my_data_v1' and p.pronargs=0;

  if v_def is null then raise exception 'export_my_data_v1 missing'; end if;
  if position('Financial records are retained after erasure with account identity detached/redacted;' in v_def) > 0 then return; end if;

  v_new := replace(
    v_def,
    'Retention/erasure disposition is Human-Gate pending; export does not authorize deletion.',
    'Financial records are retained after erasure with account identity detached/redacted; export does not authorize deletion.'
  );
  if v_new=v_def then raise exception 'export retention-note patch failed'; end if;
  execute v_new;
end
$patch$;

commit;
