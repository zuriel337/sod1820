-- CardCom production payment bridge v1
-- Purpose: add provider-backed CardCom checkout without creating a second credit economy.
-- Canonical package price/credits stay in public.credit_packages; successful provider verification
-- grants through the existing public.credit_grant() ledger path.

begin;

alter table public.payment_requests
  drop constraint if exists payment_requests_method_check;

alter table public.payment_requests
  add constraint payment_requests_method_check
  check (method = any (array['bit'::text, 'bank'::text, 'cardcom'::text]));

alter table public.payment_requests
  add column if not exists provider_ref text,
  add column if not exists cardcom_low_profile_id text,
  add column if not exists cardcom_transaction_id text,
  add column if not exists cardcom_document_url text,
  add column if not exists cardcom_payment_vector integer,
  add column if not exists cardcom_response_code integer,
  add column if not exists cardcom_verified_at timestamptz;

create unique index if not exists payment_requests_provider_ref_uidx
  on public.payment_requests(provider_ref)
  where provider_ref is not null;

create unique index if not exists payment_requests_cardcom_low_profile_uidx
  on public.payment_requests(cardcom_low_profile_id)
  where cardcom_low_profile_id is not null;

create unique index if not exists payment_requests_cardcom_transaction_uidx
  on public.payment_requests(cardcom_transaction_id)
  where cardcom_transaction_id is not null;

comment on column public.payment_requests.provider_ref is
  'Merchant-generated stable reference returned through CardCom ReturnValue; no card data.';
comment on column public.payment_requests.cardcom_low_profile_id is
  'CardCom LowProfileId used for server-to-server verification.';
comment on column public.payment_requests.cardcom_transaction_id is
  'Verified CardCom transaction id stored as text to preserve Int64 precision.';
comment on column public.payment_requests.cardcom_document_url is
  'Verified provider document URL when CardCom returns one.';
comment on column public.payment_requests.cardcom_verified_at is
  'Last server-to-server verification time against CardCom GetLpResult.';

create or replace function public.cardcom_purchase_register(
  p_package_id integer,
  p_provider_ref text,
  p_low_profile_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_pkg public.credit_packages%rowtype;
  v_id bigint;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_provider_ref is null
     or length(p_provider_ref) > 80
     or p_provider_ref !~ '^SODC-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    raise exception 'bad_provider_ref';
  end if;
  if p_low_profile_id is null or btrim(p_low_profile_id) = '' or length(p_low_profile_id) > 120 then
    raise exception 'bad_low_profile_id';
  end if;

  select * into v_pkg
  from public.credit_packages
  where id = p_package_id and active;

  if not found then raise exception 'bad_package'; end if;

  insert into public.payment_requests(
    user_id, package_id, price_ils, credits, method, reference,
    provider_ref, cardcom_low_profile_id
  )
  values (
    v_uid, v_pkg.id, v_pkg.price_ils, v_pkg.credits, 'cardcom', p_provider_ref,
    p_provider_ref, btrim(p_low_profile_id)
  )
  returning id into v_id;

  return jsonb_build_object(
    'request_id', v_id,
    'status', 'pending',
    'provider_ref', p_provider_ref,
    'credits', v_pkg.credits,
    'price_ils', v_pkg.price_ils
  );
end
$$;

revoke all on function public.cardcom_purchase_register(integer,text,text) from public, anon;
grant execute on function public.cardcom_purchase_register(integer,text,text) to authenticated;

create or replace function public.cardcom_purchase_status(p_provider_ref text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_pr public.payment_requests%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_pr
  from public.payment_requests
  where provider_ref = p_provider_ref
    and user_id = v_uid
    and method = 'cardcom'
  limit 1;

  if not found then raise exception 'not_found'; end if;

  return jsonb_build_object(
    'request_id', v_pr.id,
    'status', v_pr.status,
    'credits', v_pr.credits,
    'price_ils', v_pr.price_ils,
    'document_url', v_pr.cardcom_document_url,
    'verified', v_pr.cardcom_verified_at is not null,
    'provider_response_code', v_pr.cardcom_response_code
  );
end
$$;

revoke all on function public.cardcom_purchase_status(text) from public, anon;
grant execute on function public.cardcom_purchase_status(text) to authenticated;

create or replace function public.cardcom_purchase_record_attempt(
  p_bridge_secret text,
  p_provider_ref text,
  p_low_profile_id text,
  p_response_code integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions'
as $$
declare
  v_pr public.payment_requests%rowtype;
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;

  select * into v_pr
  from public.payment_requests
  where provider_ref = p_provider_ref
    and method = 'cardcom'
  for update;

  if not found then raise exception 'not_found'; end if;
  if v_pr.cardcom_low_profile_id is distinct from btrim(p_low_profile_id) then
    raise exception 'low_profile_mismatch';
  end if;

  update public.payment_requests
  set cardcom_response_code = p_response_code,
      cardcom_verified_at = now()
  where id = v_pr.id;

  return jsonb_build_object('status', v_pr.status, 'request_id', v_pr.id);
end
$$;

revoke all on function public.cardcom_purchase_record_attempt(text,text,text,integer) from public, authenticated;
grant execute on function public.cardcom_purchase_record_attempt(text,text,text,integer) to anon, service_role;

create or replace function public.cardcom_purchase_finalize(
  p_bridge_secret text,
  p_provider_ref text,
  p_low_profile_id text,
  p_transaction_id text,
  p_amount numeric,
  p_coin_id integer,
  p_document_url text default null,
  p_payment_vector integer default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions'
as $$
declare
  v_pr public.payment_requests%rowtype;
  v_ledger uuid;
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;

  if p_transaction_id is null or btrim(p_transaction_id) = '' or length(p_transaction_id) > 80 then
    raise exception 'bad_transaction_id';
  end if;
  if p_coin_id <> 1 then raise exception 'bad_coin'; end if;

  select * into v_pr
  from public.payment_requests
  where provider_ref = p_provider_ref
    and method = 'cardcom'
  for update;

  if not found then raise exception 'not_found'; end if;
  if v_pr.cardcom_low_profile_id is distinct from btrim(p_low_profile_id) then
    raise exception 'low_profile_mismatch';
  end if;
  if p_amount is null or p_amount <> v_pr.price_ils::numeric then
    raise exception 'amount_mismatch';
  end if;
  if v_pr.user_id is null then raise exception 'detached_user'; end if;

  if v_pr.status = 'approved' then
    if v_pr.cardcom_transaction_id is not null
       and v_pr.cardcom_transaction_id <> btrim(p_transaction_id)
    then
      raise exception 'transaction_mismatch';
    end if;
    return jsonb_build_object(
      'status','approved',
      'already',true,
      'request_id',v_pr.id,
      'ledger_id',v_pr.ledger_id
    );
  end if;

  if v_pr.status <> 'pending' then
    raise exception 'invalid_status';
  end if;

  v_ledger := public.credit_grant(
    v_pr.user_id,
    v_pr.credits,
    'purchase',
    jsonb_build_object(
      'request_id', v_pr.id,
      'price_ils', v_pr.price_ils,
      'method', 'cardcom',
      'provider_ref', v_pr.provider_ref,
      'transaction_id', btrim(p_transaction_id)
    )
  );

  update public.payment_requests
  set status = 'approved',
      ledger_id = v_ledger,
      decided_at = now(),
      decided_by = null,
      cardcom_transaction_id = btrim(p_transaction_id),
      cardcom_document_url = nullif(btrim(coalesce(p_document_url,'')), ''),
      cardcom_payment_vector = p_payment_vector,
      cardcom_response_code = 0,
      cardcom_verified_at = now()
  where id = v_pr.id;

  return jsonb_build_object(
    'status','approved',
    'already',false,
    'request_id',v_pr.id,
    'credits_granted',v_pr.credits,
    'ledger_id',v_ledger
  );
end
$$;

revoke all on function public.cardcom_purchase_finalize(text,text,text,text,numeric,integer,text,integer) from public, authenticated;
grant execute on function public.cardcom_purchase_finalize(text,text,text,text,numeric,integer,text,integer) to anon, service_role;

-- Provider-backed rows are never manual admin approvals.
create or replace function public.credit_purchase_pending()
returns table(
  id bigint, user_id uuid, email text, name text, price_ils integer, credits integer,
  method text, reference text, proof_url text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not exists(select 1 from public.users u where u.id = auth.uid() and u.role='admin') then
    raise exception 'forbidden';
  end if;
  return query
  select pr.id, pr.user_id, u.email, coalesce(u.display_name, p.full_name), pr.price_ils,
         pr.credits, pr.method, pr.reference, pr.proof_url, pr.created_at
  from public.payment_requests pr
  left join public.users u on u.id=pr.user_id
  left join public.profiles p on p.user_id=pr.user_id
  where pr.status='pending'
    and pr.method in ('bit','bank')
  order by pr.created_at;
end
$$;

create or replace function public.credit_purchase_decide(
  p_request_id bigint,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_pr public.payment_requests%rowtype;
  v_ledger uuid;
begin
  if not exists(select 1 from public.users where id=v_uid and role='admin') then raise exception 'forbidden'; end if;
  select * into v_pr from public.payment_requests where id=p_request_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_pr.method = 'cardcom' then raise exception 'provider_managed'; end if;
  if v_pr.status <> 'pending' then
    return jsonb_build_object('already', v_pr.status, 'request_id', v_pr.id);
  end if;
  if p_approve then
    v_ledger := public.credit_grant(
      v_pr.user_id, v_pr.credits, 'purchase',
      jsonb_build_object('request_id', v_pr.id, 'price_ils', v_pr.price_ils, 'method', v_pr.method)
    );
    update public.payment_requests
    set status='approved', ledger_id=v_ledger, decided_at=now(), decided_by=v_uid
    where id=v_pr.id;
    return jsonb_build_object('status','approved','credits_granted',v_pr.credits,'ledger_id',v_ledger);
  else
    update public.payment_requests
    set status='rejected', decided_at=now(), decided_by=v_uid,
        reference=coalesce(nullif(trim(p_note),''), reference)
    where id=v_pr.id;
    return jsonb_build_object('status','rejected');
  end if;
end
$$;

-- Manual payment notification remains unchanged for bit/bank; provider checkout is automatic.
create or replace function public.notify_payment_request_tg()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text;
  v_name text;
  v_text text;
begin
  if new.method = 'cardcom' then
    return new;
  end if;

  select u.email,coalesce(u.display_name,p.full_name)
  into v_email,v_name
  from public.users u
  left join public.profiles p on p.user_id=u.id
  where u.id=new.user_id;

  v_text:=concat_ws(E'\n',
    '💳 בקשת רכישת קרדיטים חדשה',
    format('₪%s · %s קרדיטים',coalesce(new.price_ils::text,'—'),coalesce(new.credits::text,'—')),
    format('אמצעי: %s',case when new.method='bit' then 'ביט/פייבוקס' else 'העברה בנקאית' end),
    format('גולש: %s%s',coalesce(v_name,'—'),case when v_email is not null then ' ('||v_email||')' else '' end),
    case when nullif(new.reference,'') is not null then 'הערה: '||new.reference else null end,
    'לאישור: אתר ← אדמין ← אישורי תשלום'
  );
  perform public.notify_admin(v_text,nullif(new.proof_url,''));
  return new;
exception when others then
  return new;
end
$$;

commit;
