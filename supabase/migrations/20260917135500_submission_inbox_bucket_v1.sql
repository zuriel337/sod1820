-- G3_SUBMISSION_INBOX_STORAGE_V1
insert into storage.buckets (id, name, public)
values ('submission-inbox', 'submission-inbox', false)
on conflict (id) do update set public = false;

create or replace function public.agent_upload_allowed_prefixes(p_bucket text)
returns text[] language sql immutable set search_path to 'public' as $$
  select case p_bucket
    when 'gallery' then array['sod1820/posts/', 'sod1820/agent/']
    when 'media' then array['sod1820/agent/', 'sod1820/2029/']
    else array[]::text[]
  end;
$$;

revoke all on function public.agent_upload_allowed_prefixes(text) from public,anon,authenticated;
grant execute on function public.agent_upload_allowed_prefixes(text) to service_role;
