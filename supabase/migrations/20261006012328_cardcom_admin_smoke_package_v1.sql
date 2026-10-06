-- CardCom admin-only 1 ILS smoke package v1
-- Extends the existing canonical credit package/payment path.
-- Public package prices are unchanged. Only admins can see/use this package.

begin;

alter table public.credit_packages
  add column if not exists admin_only boolean not null default false;

comment on column public.credit_packages.admin_only is
  'When true, package is visible/purchasable only to authenticated users.role=admin.';

insert into public.credit_packages(price_ils, credits, label, active, sort, admin_only)
select 1, 1, '🧪 בדיקת סליקה למנהל · ₪1', true, -100, true
where not exists (
  select 1
  from public.credit_packages
  where admin_only
    and price_ils = 1
    and credits = 1
    and label = '🧪 בדיקת סליקה למנהל · ₪1'
);

create or replace function public.credit_packages_list()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'packages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cp.id,
          'price_ils', cp.price_ils,
          'credits', cp.credits,
          'label', cp.label
        )
        order by cp.sort, cp.price_ils
      )
      from public.credit_packages cp
      where cp.active
        and (
          not cp.admin_only
          or exists(
            select 1
            from public.users u
            where u.id = auth.uid()
              and u.role = 'admin'
          )
        )
    ), '[]'::jsonb),
    'pay', (
      select jsonb_build_object(
        'bank_name', bank_name,
        'bank_branch', bank_branch,
        'bank_account', bank_account,
        'account_name', account_name,
        'bit_number', bit_number,
        'note', note
      )
      from public.credit_pay_info
      where id = 1
    )
  );
$$;

create or replace function public.credit_purchase_request(
  p_package_id integer,
  p_method text,
  p_reference text default null,
  p_proof_url text default null
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
  if p_method not in ('bit','bank') then raise exception 'bad_method'; end if;

  select * into v_pkg
  from public.credit_packages
  where id = p_package_id
    and active
    and (
      not admin_only
      or exists(
        select 1
        from public.users u
        where u.id = v_uid
          and u.role = 'admin'
      )
    );

  if not found then raise exception 'bad_package'; end if;

  insert into public.payment_requests(
    user_id, package_id, price_ils, credits, method, reference, proof_url
  )
  values (
    v_uid, v_pkg.id, v_pkg.price_ils, v_pkg.credits, p_method,
    nullif(trim(p_reference),''), nullif(trim(p_proof_url),'')
  )
  returning id into v_id;

  return jsonb_build_object(
    'request_id', v_id,
    'status','pending',
    'credits', v_pkg.credits,
    'price_ils', v_pkg.price_ils
  );
end
$$;

create or replace function public.cardcom_purchase_register(
  p_bridge_secret text,
  p_user_id uuid,
  p_package_id integer,
  p_provider_ref text,
  p_low_profile_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','extensions'
as $$
declare
  v_pkg public.credit_packages%rowtype;
  v_id bigint;
  v_hash constant text := 'b9b2b927e7c1337b8cc9ef33693eb1d9f58da14cd9ac21bc8ab8ad70dc1264ea';
begin
  if encode(extensions.digest(convert_to(coalesce(p_bridge_secret,''), 'UTF8'), 'sha256'), 'hex') <> v_hash then
    raise exception 'forbidden';
  end if;
  if p_user_id is null then raise exception 'bad_user'; end if;
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
  where id = p_package_id
    and active
    and (
      not admin_only
      or exists(
        select 1
        from public.users u
        where u.id = p_user_id
          and u.role = 'admin'
      )
    );

  if not found then raise exception 'bad_package'; end if;

  insert into public.payment_requests(
    user_id, package_id, price_ils, credits, method, reference,
    provider_ref, cardcom_low_profile_id
  )
  values (
    p_user_id, v_pkg.id, v_pkg.price_ils, v_pkg.credits, 'cardcom', p_provider_ref,
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

commit;
