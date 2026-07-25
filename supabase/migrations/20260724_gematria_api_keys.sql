-- ⏸️ שכבת אימות-מפתח ללקוחות ה-API — אופציונלית, לא הוחלה עדיין.
-- מריצים את הקובץ הזה *רק* כשמחליטים לגדר את ה-API מאחורי מפתחות (customers משלמים / rate-limit).
-- כל עוד לא הוחל: ה-Edge Function gematria-api רץ *פתוח* (GEMATRIA_API_REQUIRE_KEY כבוי) —
--   verifyKey מחזיר ok, ו-api_usage_log נכשל בחן (fire-and-forget) בלי לחסום.
-- כדי להפעיל גידור: (1) הרץ מיגרציה זו · (2) הוסף רשומות ל-api_customers + api_keys ·
--   (3) קבע GEMATRIA_API_REQUIRE_KEY=1 ב-Edge secrets.

-- לקוחות ה-API (מי מקבל גישה).
create table if not exists public.api_customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  active     boolean not null default true,
  notes      text,
  created_at timestamptz not null default now()
);

-- מפתחות. שומרים hash של המפתח (sha256), לא את המפתח עצמו.
create table if not exists public.api_keys (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.api_customers(id) on delete cascade,
  key_hash       text not null unique,          -- encode(digest(<key>,'sha256'),'hex')
  label          text,
  active         boolean not null default true,
  daily_limit    integer default 1000,          -- 0/NULL = ללא הגבלה
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz
);
create index if not exists api_keys_hash_idx on public.api_keys(key_hash) where active;

-- יומן-שימוש (server-only, בלי grant ל-anon/authenticated — מדיניות rls_client_read_protocol).
create table if not exists public.api_usage_log (
  id          bigint generated always as identity primary key,
  customer_id uuid,
  key_hash    text,
  input_len   integer,
  created_at  timestamptz not null default now()
);
create index if not exists api_usage_log_created_idx on public.api_usage_log(created_at desc);

alter table public.api_customers  enable row level security;
alter table public.api_keys       enable row level security;
alter table public.api_usage_log  enable row level security;
-- בלי policies ל-anon/authenticated → service_role בלבד (הכל עובר דרך ה-Edge).

-- אימות מפתח: מקבל את המפתח הגולמי, בודק hash פעיל, מעדכן last_used, מחזיר {valid, customer}.
create or replace function public.api_key_verify(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h text := encode(digest(coalesce(p_key,''), 'sha256'), 'hex');
  rec record;
begin
  select k.id, k.customer_id, c.name, c.active as cust_active
    into rec
  from public.api_keys k
  join public.api_customers c on c.id = k.customer_id
  where k.key_hash = h and k.active limit 1;

  if rec.id is null or rec.cust_active is not true then
    return jsonb_build_object('valid', false);
  end if;

  update public.api_keys set last_used_at = now() where id = rec.id;
  return jsonb_build_object('valid', true, 'customer', rec.name, 'customer_id', rec.customer_id);
end;
$$;

-- תיעוד שימוש (fire-and-forget מה-Edge). p_key = המפתח הגולמי (נשמר כ-hash בלבד).
create or replace function public.api_usage_log(p_customer text, p_key text, p_input_len integer)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h text := case when p_key is null or p_key = '' then null
                 else encode(digest(p_key, 'sha256'), 'hex') end;
  cid uuid;
begin
  select customer_id into cid from public.api_keys where key_hash = h limit 1;
  insert into public.api_usage_log (customer_id, key_hash, input_len)
  values (cid, h, coalesce(p_input_len, 0));
end;
$$;

revoke all on function public.api_key_verify(text) from public, anon, authenticated;
revoke all on function public.api_usage_log(text, text, integer) from public, anon, authenticated;
grant execute on function public.api_key_verify(text) to service_role;
grant execute on function public.api_usage_log(text, text, integer) to service_role;

-- ── ליצירת מפתח ללקוח חדש (ידני, פעם אחת) ──────────────────────────────────
-- 1) בחר מפתח אקראי:  select encode(gen_random_bytes(24),'base64');  → תן ללקוח, אל תשמור אותו.
-- 2) insert into api_customers (name,email) values ('שם הלקוח','mail') returning id;
-- 3) insert into api_keys (customer_id,key_hash,label)
--      values ('<customer_id>', encode(digest('<המפתח שנתת>','sha256'),'hex'), 'label');
