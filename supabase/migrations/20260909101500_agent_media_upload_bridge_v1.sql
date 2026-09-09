-- AGENT_MEDIA_UPLOAD_BRIDGE_V1 — least-privilege upload tickets for agent-originated media.
create table if not exists public.agent_upload_tickets (
  id uuid primary key default gen_random_uuid(), token text not null unique, bucket text not null,
  path text not null, mime text not null, max_bytes bigint not null, sha256 text,
  allow_overwrite boolean not null default false, issued_by text,
  expires_at timestamptz not null, consumed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.agent_upload_tickets enable row level security;
alter table public.agent_upload_tickets force row level security;
revoke all on table public.agent_upload_tickets from public, anon, authenticated;
create index if not exists agent_upload_tickets_expires_idx on public.agent_upload_tickets (expires_at);

create or replace function public.agent_upload_allowed_prefixes(p_bucket text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case p_bucket when 'gallery' then array['sod1820/posts/', 'sod1820/agent/']
                       when 'media' then array['sod1820/agent/'] else array[]::text[] end;
$$;
create or replace function public.agent_upload_allowed_mimes()
returns text[] language sql immutable set search_path to 'public' as $$
  select array['image/png','image/jpeg','image/webp','image/gif'];
$$;
create or replace function public.agent_upload_mime_extensions(p_mime text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case p_mime when 'image/png' then array['png'] when 'image/jpeg' then array['jpg','jpeg']
                     when 'image/webp' then array['webp'] when 'image/gif' then array['gif'] else array[]::text[] end;
$$;

create or replace function public.agent_upload_ticket_issue(
  p_bucket text, p_path text, p_mime text, p_max_bytes bigint default 10485760,
  p_ttl_seconds integer default 600, p_sha256 text default null,
  p_allow_overwrite boolean default false, p_issued_by text default null
) returns jsonb language plpgsql volatile set search_path to 'public' as $$
declare
  v_path text := regexp_replace(coalesce(p_path,''), '^/+', '');
  v_mime text := lower(btrim(coalesce(p_mime,'')));
  v_bucket text := btrim(coalesce(p_bucket,''));
  v_ttl integer := coalesce(p_ttl_seconds,600); v_max bigint := coalesce(p_max_bytes,10485760);
  v_ext text; v_token text; v_row public.agent_upload_tickets%rowtype;
begin
  if array_length(public.agent_upload_allowed_prefixes(v_bucket),1) is null then raise exception 'agent_upload: bucket % is not allowed',v_bucket using errcode='42501'; end if;
  if v_path='' or length(v_path)>400 then raise exception 'agent_upload: path missing or too long' using errcode='22023'; end if;
  if v_path like '%..%' or v_path like '%//%' or v_path like '%\%' or v_path ~ '[[:cntrl:]]' or v_path ~ '[[:space:]]' then raise exception 'agent_upload: path contains an unsafe sequence' using errcode='22023'; end if;
  if not exists(select 1 from unnest(public.agent_upload_allowed_prefixes(v_bucket)) pre where v_path like pre||'%') then raise exception 'agent_upload: path % is outside the allowed prefixes for bucket %',v_path,v_bucket using errcode='42501'; end if;
  if not (v_mime = any(public.agent_upload_allowed_mimes())) then raise exception 'agent_upload: mime % is not allowed',v_mime using errcode='42501'; end if;
  v_ext := lower(substring(v_path from '\.([A-Za-z0-9]+)$'));
  if v_ext is null or not (v_ext = any(public.agent_upload_mime_extensions(v_mime))) then raise exception 'agent_upload: file extension % does not match mime %',coalesce(v_ext,'(none)'),v_mime using errcode='22023'; end if;
  if v_max<=0 or v_max>26214400 then raise exception 'agent_upload: max_bytes % is outside 1..26214400',v_max using errcode='22023'; end if;
  if v_ttl<=0 or v_ttl>600 then raise exception 'agent_upload: ttl_seconds % is outside 1..600',v_ttl using errcode='22023'; end if;
  if p_sha256 is not null and p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'agent_upload: sha256 must be 64 lowercase hex chars' using errcode='22023'; end if;
  v_token := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.agent_upload_tickets(token,bucket,path,mime,max_bytes,sha256,allow_overwrite,issued_by,expires_at)
  values(v_token,v_bucket,v_path,v_mime,v_max,p_sha256,coalesce(p_allow_overwrite,false),p_issued_by,now()+make_interval(secs=>v_ttl)) returning * into v_row;
  return jsonb_build_object('ok',true,'token',v_row.token,'bucket',v_row.bucket,'path',v_row.path,'mime',v_row.mime,'max_bytes',v_row.max_bytes,'allow_overwrite',v_row.allow_overwrite,'expires_at',v_row.expires_at,'public_url','https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/'||v_row.bucket||'/'||v_row.path);
end; $$;

create or replace function public.agent_upload_ticket_consume(p_token text)
returns jsonb language plpgsql volatile set search_path to 'public' as $$
declare v_row public.agent_upload_tickets%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok',false,'error','invalid ticket'); end if;
  update public.agent_upload_tickets set consumed_at=now() where token=p_token and consumed_at is null and expires_at>now() returning * into v_row;
  if not found then return jsonb_build_object('ok',false,'error','invalid ticket'); end if;
  return jsonb_build_object('ok',true,'bucket',v_row.bucket,'path',v_row.path,'mime',v_row.mime,'max_bytes',v_row.max_bytes,'sha256',v_row.sha256,'allow_overwrite',v_row.allow_overwrite,'public_url','https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/'||v_row.bucket||'/'||v_row.path);
end; $$;

create or replace function public.agent_upload_tickets_gc() returns integer language plpgsql volatile set search_path to 'public' as $$
declare v_n integer; begin delete from public.agent_upload_tickets where expires_at < now()-interval '24 hours'; get diagnostics v_n=row_count; return v_n; end; $$;

revoke all on function public.agent_upload_ticket_issue(text,text,text,bigint,integer,text,boolean,text) from public,anon,authenticated;
revoke all on function public.agent_upload_ticket_consume(text) from public,anon,authenticated;
revoke all on function public.agent_upload_tickets_gc() from public,anon,authenticated;
revoke all on function public.agent_upload_allowed_prefixes(text) from public,anon,authenticated;
revoke all on function public.agent_upload_allowed_mimes() from public,anon,authenticated;
revoke all on function public.agent_upload_mime_extensions(text) from public,anon,authenticated;
grant execute on function public.agent_upload_ticket_issue(text,text,text,bigint,integer,text,boolean,text) to service_role;
grant execute on function public.agent_upload_ticket_consume(text) to service_role;
grant execute on function public.agent_upload_tickets_gc() to service_role;
grant execute on function public.agent_upload_allowed_prefixes(text) to service_role;
grant execute on function public.agent_upload_allowed_mimes() to service_role;
grant execute on function public.agent_upload_mime_extensions(text) to service_role;
