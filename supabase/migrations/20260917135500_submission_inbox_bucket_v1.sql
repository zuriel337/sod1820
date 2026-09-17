-- G3_SUBMISSION_INBOX_STORAGE_V1
-- Private physical intake boundary for unreviewed person/contributor submissions.
-- This extends existing Research Intake / contributor identity semantics and the
-- existing AGENT_MEDIA_UPLOAD_BRIDGE_V1 path allowlist. It is NOT a new semantic
-- store, registry, truth layer, or publication system.

insert into storage.buckets (id, name, public)
values ('submission-inbox', 'submission-inbox', false)
on conflict (id) do update
set public = false;

-- Keep historical agent-upload compatibility and add the forward 2029 public media root.
-- The ticket bridge remains image-only until later media transport work expands MIME handling.
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

-- Deliberately no anon/authenticated storage.objects policies are added for submission-inbox.
-- The bucket remains private/server-mediated by default. Future user-facing upload flows must
-- use a governed signed/ticketed path and must not weaken this read boundary for convenience.
-- submission-inbox is not yet admitted to agent_upload_allowed_prefixes because the existing
-- ticket response assumes a public URL; the private adapter must be implemented explicitly.
