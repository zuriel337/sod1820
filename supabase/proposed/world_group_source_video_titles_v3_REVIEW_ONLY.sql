-- REVIEW-ONLY PROPOSAL — DO NOT APPLY before Claude/security audit and explicit owner SQL approval.
-- World source video-link/title projection without modifying the live v2 gate.
-- The v2 SECURITY DEFINER function is the admission barrier: only its already-authorized IDs appear here.
-- This proposal creates a distinct v3 API, revoked by default. It does NOT enable a new public reader.
begin;

create or replace function public.world_group_source_arrivals_v3(
  p_limit integer default 12,
  p_before timestamptz default null
)
returns table(
  id uuid, body text, created_at timestamptz, contributor_slug text,
  contributor_name text, group_proof boolean, proof_basis text,
  group_channel text, media_kind text, media_url text, thumb_url text,
  source_video_href text, source_video_title text
)
language sql stable security definer
set search_path = public, pg_temp
as $function$
  select b.id, b.body, b.created_at, b.contributor_slug, b.contributor_name,
         b.group_proof, b.proof_basis, b.group_channel, b.media_kind, b.media_url, b.thumb_url,
         case
           -- Only a provider path segment; original queries/credentials never leave the server.
           when cu.text ~ 'https://vt\.tiktok\.com/[A-Za-z0-9]{5,24}/?([[:space:]]|$)'
             then (regexp_match(cu.text, '(https://vt\.tiktok\.com/[A-Za-z0-9]{5,24}/?)([[:space:]]|$)'))[1]
           when cu.text ~ 'https://(www\.)?tiktok\.com/@[A-Za-z0-9_.-]+/video/[0-9]{5,25}/?([[:space:]]|$)'
             then (regexp_match(cu.text, '(https://(www\.)?tiktok\.com/@[A-Za-z0-9_.-]+/video/[0-9]{5,25}/?)([[:space:]]|$)'))[1]
           else null
         end as source_video_href,
         case
           when cu.enrichment_source in ('youtube_oembed','tiktok_oembed','vimeo_oembed')
             and cu.enrichment_status = 'enriched'
             and length(btrim(coalesce(cu.seo_title,''))) between 5 and 160
             then cu.seo_title
           else null
         end as source_video_title
  from public.world_group_source_arrivals_v2(p_limit, p_before) b
  join public.channel_updates cu on cu.id = b.id
$function$;

-- A new SECURITY DEFINER API defaults to executable by PUBLIC unless revoked.
-- No grants are added by this proposal. A later explicit read-policy/role review is required.
revoke all on function public.world_group_source_arrivals_v3(integer,timestamptz) from public;
revoke all on function public.world_group_source_arrivals_v3(integer,timestamptz) from anon, authenticated;
commit;

-- Acceptance and release sequencing, NOT executed here:
-- 1. Compare every row/id from v3 with v2 for identical timestamps/proof/writer/media (v3 may have NO extra rows).
-- 2. Test fake but syntactically valid provider URLs containing ?token, #secret, credentials, private host,
--    embedded e-mail/phone, newlines, and Unicode separators. Require no disclosure of private values.
-- 3. Test row visibility for private-intake-without-proof and held writers: neither appears.
-- 4. Validate strict grants/RLS, function owner, search_path, and callable roles before any GRANT.
-- 5. A separate client PR may then switch to v3 after an authorized SQL deployment (never before).
-- 6. Do not consider this executed, active, or compatible until independently verified in staging.
