-- DEF-004 - PROPOSED (not in supabase/migrations on purpose; needs explicit ZURIEL approval: production Storage policy change).
--
-- Audit finding (corrected after reading pg_policy.polpermissive): bucket `gallery` is public and has no size / MIME limit.
--   * community_anon_upload (PERMISSIVE, anon+authenticated): any object under community/ -> only restricted for videos and account paths by the
--     RESTRICTIVE community_authenticated_media_paths_v1. Anyone can store an arbitrary non-video file of any size (svg, html, archives).
--     Evidence: three image/svg+xml objects were uploaded under community/ on 2026-09-03.
--   * public_upload (PERMISSIVE, authenticated): any signed-in user may create an object at ANY path in the bucket (e.g. sod1820/posts/...).
-- Client uploaders (grep of src/): community/<uid>/<uuid>.<ext> (communityAttachments.js), community/<ts>-<rand>.<ext> (ReportHint.jsx, anon allowed),
-- avatars/<uid>-<ts>.<ext>, sod1820/hints/<uid|anon>/<ts>-<n>.<ext>, sod1820/ciphers/c-<id>.png, sod1820/<key>-thumbs/<ts>-<n>.jpg, and admin-only
-- sod1820/replaced/... All other writers use the service role (bypasses RLS) and are unaffected.
--
-- This replaces the two broad permissive INSERT policies with path- and extension-scoped ones. The RESTRICTIVE policy from 20261031090008 stays as it is.
-- Not covered by Storage RLS (can only be set per bucket / enforced in an upload gateway): object size. A size limit for client roles needs either a
-- dedicated bucket or an upload-intent function (media-upload-intent already exists); see docs/reviews/audit-remediation-20261106/README.md.
--
-- Rollback (restores the previous behaviour exactly):
--   drop policy gallery_client_upload_scoped_v1 on storage.objects;
--   drop policy gallery_flat_image_upload_v1 on storage.objects;
--   create policy community_anon_upload on storage.objects for insert to anon, authenticated
--     with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = 'community');
--   create policy public_upload on storage.objects for insert to authenticated with check (bucket_id = 'gallery');

drop policy if exists community_anon_upload on storage.objects;
drop policy if exists public_upload on storage.objects;

-- Anonymous reporting (ReportHint.jsx): flat community image, extension limited to raster images.
create policy gallery_flat_image_upload_v1 on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'gallery' and name ~* '^community/[0-9]{10,16}-[a-z0-9]{1,12}\.(jpe?g|png|webp|gif|avif)$');

-- Signed-in users: only their own prefixes, only the extensions each feature produces; administrators keep full access (admin screens upload anywhere).
create policy gallery_client_upload_scoped_v1 on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gallery' and (
      exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
      or name ~* ('^community/' || auth.uid()::text || '/[0-9a-f-]{36}\.(jpe?g|png|webp|gif|avif|pdf|txt|docx|mp4|webm|mov)$')
      or name ~* ('^avatars/' || auth.uid()::text || '-[0-9]{10,16}\.(jpe?g|png|webp|gif|avif)$')
      or name ~* ('^sod1820/hints/(' || auth.uid()::text || '|anon)/[0-9]{10,16}-[0-9]{1,8}\.(jpe?g|png|webp|gif|avif)$')
      or name ~* '^sod1820/ciphers/c-[a-z0-9]{1,16}-[a-z0-9]{1,12}\.png$'
      or name ~* '^sod1820/[a-z0-9-]{1,40}-thumbs/[0-9]{10,16}-[0-9]{1,8}\.jpg$'
    )
  );
