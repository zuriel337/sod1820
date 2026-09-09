-- AGENT_MEDIA_UPLOAD_BRIDGE_V1 — least-privilege upload tickets for agent-originated media.
--
-- WHY THIS EXISTS (owner check recorded in work_log 334315e0-c48d-4fcf-8b69-677570bca662):
-- The four existing upload primitives do not cover the agent case.
--   * storage-put / storage-put-raw / sign-upload (Edge) all take FB_ADMIN_KEY as their ONLY
--     auth factor. That is a reusable admin credential; handing it to an agent runtime is
--     exactly what must not happen.
--   * public.admin_storage_put is the closest secure primitive — it checks the admin gate
--     BEFORE reading the Vault secret, so the secret never leaves the server. But its gate is
--     `auth.uid()` against public.users.role='admin', so an agent running as postgres/service_role
--     always fails it (same trap as get_work_log_current). It also carries the payload as inline
--     base64 through SQL and enforces no bucket / path / mime / size / TTL / replay boundary.
--
-- WHAT THIS ADDS: a short-lived, single-use, fully-bound upload ticket. The ticket is minted only
-- from a trusted server context, and it names exactly one bucket + one object path + one mime +
-- one size cap. The Edge function agent-upload redeems it using its OWN service role. No reusable
-- admin credential is ever handed out, and no new secret is introduced: the ticket's random token
-- IS the bearer credential, so single-use semantics fall out of the row itself rather than needing
-- an HMAC key that would have to be duplicated into Edge secrets.
--
-- EXTEND_EXISTING: this does not replace any upload path. storage-put, storage-put-raw,
-- sign-upload, admin_storage_put and the PostEditor browser upload all keep their current
-- behavior untouched.
--
-- SCOPE OF V1 = IMAGES ONLY, deliberately. Persisting research source binaries (the open DOCX
-- blocker in the SOD_HASHMAL threads) needs a document mime/prefix allowlist and is a separate
-- authorized step, not a silent widening of this one.

create table if not exists public.agent_upload_tickets (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique,
  bucket          text not null,
  path            text not null,
  mime            text not null,
  max_bytes       bigint not null,
  sha256          text,
  allow_overwrite boolean not null default false,
  issued_by       text,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.agent_upload_tickets is
  'AGENT_MEDIA_UPLOAD_BRIDGE_V1 — single-use, short-lived upload tickets. SERVER-ONLY infrastructure: '
  'RLS is on with no policies and no grants to anon/authenticated, so only postgres/service_role can '
  'reach it. The token column is a bearer credential; never expose a row to a client.';

create index if not exists agent_upload_tickets_expires_idx
  on public.agent_upload_tickets (expires_at);

-- Server-only: RLS on, deliberately zero policies, zero client grants. Matches the wa_* / events_*
-- server-only convention in rls_client_read_protocol (no grant is intentional here, not an omission,
-- so this table belongs in rls_grant_gap_ignore rather than being "fixed" by a future audit).
alter table public.agent_upload_tickets enable row level security;
alter table public.agent_upload_tickets force row level security;
revoke all on table public.agent_upload_tickets from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Allowlists. Kept as immutable functions rather than config rows so that a
-- compromised client-side write can never widen the boundary.
-- ---------------------------------------------------------------------------

create or replace function public.agent_upload_allowed_prefixes(p_bucket text)
returns text[]
language sql
immutable
set search_path to 'public'
as $$
  select case p_bucket
    when 'gallery' then array['sod1820/posts/', 'sod1820/agent/']
    when 'media'   then array['sod1820/agent/']
    else array[]::text[]
  end;
$$;

create or replace function public.agent_upload_allowed_mimes()
returns text[]
language sql
immutable
set search_path to 'public'
as $$
  select array['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
$$;

-- Extension must agree with the declared mime, so a ticket for image/png cannot be redeemed to
-- park an object that the site will later serve under a different content type.
create or replace function public.agent_upload_mime_extensions(p_mime text)
returns text[]
language sql
immutable
set search_path to 'public'
as $$
  select case p_mime
    when 'image/png'  then array['png']
    when 'image/jpeg' then array['jpg', 'jpeg']
    when 'image/webp' then array['webp']
    when 'image/gif'  then array['gif']
    else array[]::text[]
  end;
$$;

-- ---------------------------------------------------------------------------
-- Issue. Fails closed on every boundary. SECURITY INVOKER on purpose: the caller
-- must already be a trusted server context (postgres / service_role). Adding a
-- SECURITY DEFINER here would create a new privilege-escalation surface right
-- after the H4/H5 security floor spent eight migrations removing them.
-- ---------------------------------------------------------------------------

create or replace function public.agent_upload_ticket_issue(
  p_bucket          text,
  p_path            text,
  p_mime            text,
  p_max_bytes       bigint  default 10485760,   -- 10 MiB
  p_ttl_seconds     integer default 600,        -- 10 minutes
  p_sha256          text    default null,
  p_allow_overwrite boolean default false,
  p_issued_by       text    default null
)
returns jsonb
language plpgsql
volatile
set search_path to 'public'
as $$
declare
  v_path   text := regexp_replace(coalesce(p_path, ''), '^/+', '');
  v_mime   text := lower(btrim(coalesce(p_mime, '')));
  v_bucket text := btrim(coalesce(p_bucket, ''));
  v_ttl    integer := coalesce(p_ttl_seconds, 600);
  v_max    bigint  := coalesce(p_max_bytes, 10485760);
  v_ext    text;
  v_token  text;
  v_row    public.agent_upload_tickets%rowtype;
begin
  if array_length(public.agent_upload_allowed_prefixes(v_bucket), 1) is null then
    raise exception 'agent_upload: bucket % is not allowed', v_bucket
      using errcode = '42501';
  end if;

  -- Path traversal / smuggling. Checked before anything else touches the value.
  if v_path = '' or length(v_path) > 400 then
    raise exception 'agent_upload: path missing or too long' using errcode = '22023';
  end if;
  if v_path like '%..%' or v_path like '%//%' or v_path like '%\%'
     or v_path ~ '[[:cntrl:]]' or v_path ~ '[[:space:]]' then
    raise exception 'agent_upload: path contains an unsafe sequence' using errcode = '22023';
  end if;
  if not exists (
    select 1 from unnest(public.agent_upload_allowed_prefixes(v_bucket)) pre
    where v_path like pre || '%'
  ) then
    raise exception 'agent_upload: path % is outside the allowed prefixes for bucket %', v_path, v_bucket
      using errcode = '42501';
  end if;

  if not (v_mime = any (public.agent_upload_allowed_mimes())) then
    raise exception 'agent_upload: mime % is not allowed', v_mime using errcode = '42501';
  end if;

  v_ext := lower(substring(v_path from '\.([A-Za-z0-9]+)$'));
  if v_ext is null or not (v_ext = any (public.agent_upload_mime_extensions(v_mime))) then
    raise exception 'agent_upload: file extension % does not match mime %', coalesce(v_ext, '(none)'), v_mime
      using errcode = '22023';
  end if;

  if v_max <= 0 or v_max > 26214400 then           -- hard ceiling 25 MiB
    raise exception 'agent_upload: max_bytes % is outside 1..26214400', v_max using errcode = '22023';
  end if;
  if v_ttl <= 0 or v_ttl > 600 then                -- hard ceiling 10 minutes
    raise exception 'agent_upload: ttl_seconds % is outside 1..600', v_ttl using errcode = '22023';
  end if;
  if p_sha256 is not null and p_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'agent_upload: sha256 must be 64 lowercase hex chars' using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.agent_upload_tickets
    (token, bucket, path, mime, max_bytes, sha256, allow_overwrite, issued_by, expires_at)
  values
    (v_token, v_bucket, v_path, v_mime, v_max, p_sha256, coalesce(p_allow_overwrite, false),
     p_issued_by, now() + make_interval(secs => v_ttl))
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'token', v_row.token,
    'bucket', v_row.bucket,
    'path', v_row.path,
    'mime', v_row.mime,
    'max_bytes', v_row.max_bytes,
    'allow_overwrite', v_row.allow_overwrite,
    'expires_at', v_row.expires_at,
    'public_url',
      'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/'
      || v_row.bucket || '/' || v_row.path
  );
end;
$$;

comment on function public.agent_upload_ticket_issue(text, text, text, bigint, integer, text, boolean, text) is
  'AGENT_MEDIA_UPLOAD_BRIDGE_V1 — mint a single-use upload ticket bound to one bucket+path+mime+size. '
  'SERVER-ONLY: execute is revoked from anon and authenticated. Returns the bearer token; never log it.';

-- ---------------------------------------------------------------------------
-- Consume. Atomic single-use claim — the UPDATE ... WHERE consumed_at is null is
-- the whole replay defense, so two concurrent redemptions cannot both win.
-- ---------------------------------------------------------------------------

create or replace function public.agent_upload_ticket_consume(p_token text)
returns jsonb
language plpgsql
volatile
set search_path to 'public'
as $$
declare v_row public.agent_upload_tickets%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid ticket');
  end if;

  update public.agent_upload_tickets
     set consumed_at = now()
   where token = p_token
     and consumed_at is null
     and expires_at > now()
  returning * into v_row;

  if not found then
    -- Deliberately indistinguishable: unknown / already used / expired all read the same,
    -- so a caller cannot probe which tokens exist.
    return jsonb_build_object('ok', false, 'error', 'invalid ticket');
  end if;

  return jsonb_build_object(
    'ok', true,
    'bucket', v_row.bucket,
    'path', v_row.path,
    'mime', v_row.mime,
    'max_bytes', v_row.max_bytes,
    'sha256', v_row.sha256,
    'allow_overwrite', v_row.allow_overwrite,
    'public_url',
      'https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/'
      || v_row.bucket || '/' || v_row.path
  );
end;
$$;

comment on function public.agent_upload_ticket_consume(text) is
  'AGENT_MEDIA_UPLOAD_BRIDGE_V1 — atomically claim a ticket exactly once. SERVER-ONLY. '
  'Unknown, spent and expired tickets return the same opaque failure by design.';

-- Housekeeping so spent tokens do not accumulate as long-lived bearer values.
create or replace function public.agent_upload_tickets_gc()
returns integer
language plpgsql
volatile
set search_path to 'public'
as $$
declare v_n integer;
begin
  delete from public.agent_upload_tickets
   where expires_at < now() - interval '24 hours';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

comment on function public.agent_upload_tickets_gc() is
  'AGENT_MEDIA_UPLOAD_BRIDGE_V1 — drop tickets more than 24h past expiry. SERVER-ONLY.';

-- ---------------------------------------------------------------------------
-- Grants. Explicit rather than inherited, so a future change to default
-- privileges cannot quietly open these to the browser.
-- ---------------------------------------------------------------------------

revoke all on function public.agent_upload_ticket_issue(text, text, text, bigint, integer, text, boolean, text)
  from public, anon, authenticated;
revoke all on function public.agent_upload_ticket_consume(text) from public, anon, authenticated;
revoke all on function public.agent_upload_tickets_gc() from public, anon, authenticated;
revoke all on function public.agent_upload_allowed_prefixes(text) from public, anon, authenticated;
revoke all on function public.agent_upload_allowed_mimes() from public, anon, authenticated;
revoke all on function public.agent_upload_mime_extensions(text) from public, anon, authenticated;

grant execute on function public.agent_upload_ticket_issue(text, text, text, bigint, integer, text, boolean, text)
  to service_role;
grant execute on function public.agent_upload_ticket_consume(text) to service_role;
grant execute on function public.agent_upload_tickets_gc() to service_role;

-- The allowlist helpers are SECURITY INVOKER and are called from inside agent_upload_ticket_issue,
-- which is also SECURITY INVOKER — so the CALLER needs EXECUTE on them. Without these three grants
-- service_role fails every issue attempt with "permission denied for function
-- agent_upload_allowed_prefixes". Found by privilege audit before first real use; the initial
-- happy-path test only passed because it ran as postgres, which is not how this is called.
grant execute on function public.agent_upload_allowed_prefixes(text) to service_role;
grant execute on function public.agent_upload_allowed_mimes() to service_role;
grant execute on function public.agent_upload_mime_extensions(text) to service_role;
