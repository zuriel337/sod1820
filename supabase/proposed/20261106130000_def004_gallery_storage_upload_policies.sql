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
-- ===== Revision M0 · 12.11.2026 (cluster M0-C; owner decision ZURIEL 12.11.2026, Option 1: paths + a 120 MB ceiling) =====
-- Re-verified read-only against production on 12.11.2026 (pg_policy on storage.objects, storage.buckets, aggregate counts on storage.objects):
--   * the INSERT policy set is unchanged since 06.11 (community_anon_upload, public_upload, the RESTRICTIVE community_authenticated_media_paths_v1);
--     storage.objects has NO UPDATE and NO DELETE policy for `gallery` (only magar_* has them). Clients can therefore never overwrite or delete a
--     gallery object today, and this revision keeps it that way (owner decision 4: existing files are neither deleted nor changed).
--   * largest gallery object = 114,883,491 bytes (109.6 MiB, service-role video under sod1820/videos/); no object above 100 MiB except that one.
--   * "writer" (כותב) = public.contributors.kind in ('writer','author') bound by contributors.user_id to an account whose users.role is 'user'.
--     There is no writer-specific gallery path: writers use the same account paths as every signed-in user; their research media goes through
--     media-upload-intent into the private submission-inbox bucket (2 GiB, MIME allow-list), which this file does not touch.
-- Route map and evidence: docs/reviews/m0-security-stabilization-20261112/cluster-C-gallery.md.
--
-- What this revision changes compared with the 06.11 draft:
--   1. Admin is its own policy (gallery_admin_upload_v1): any path in `gallery`, any extension (admin screens and the public-reading worker's admin
--      branch upload anywhere). The RESTRICTIVE community video rule still binds everyone, admin included, exactly as today.
--   2. Signed-in users and writers (gallery_client_upload_scoped_v1) keep only the routes that a mounted 2029 component actually calls:
--      own community attachment, own avatar, cipher card. The 06.11 clauses for sod1820/hints/<uid|anon>/... (uploadHintImage) and
--      sod1820/<key>-thumbs/... (captureAndUploadPoster via broadcastChannelUpdate) are removed for non-admins: neither helper has a caller,
--      the `anon` hint folder was writable by every account, and the thumbs pattern let any account add files to the backend's
--      sod1820/channel-thumbs/ folder. Both stay available to admins. test/m0c-gallery-upload-contract.test.mjs fails if either helper gains a caller.
--   3. Community attachment extensions now equal src/lib/community/communityUploadPolicy.js and the RESTRICTIVE policy (no avif: the restrictive
--      policy already rejected it on account paths, so the 06.11 avif there was dead), and the second path segment is a strict lower-case UUID.
--   4. Bucket `gallery` gets file_size_limit = 125829120 (120 MiB). Storage enforces it on every new upload request (standard, signed URL and TUS),
--      before Postgres is involved; it changes no existing object. It also applies to admin and service-role uploads into `gallery` (assumed
--      conservatively - see the review doc). The admin path for larger files is the existing gateway, not this bucket: media-upload-intent
--      scope "public" (admin only) issues a non-overwriting signed TUS upload into bucket `media` (no bucket limit; per-kind caps up to 2 GiB video),
--      which docs/sod1820-media-ingress-storage-convention-v1.md already names as the home of approved/public 2029 media. No new bucket, no gateway change.
--   5. allowed_mime_types stays NULL on purpose: a bucket MIME list binds admin and service-role pipelines too, and those write text/vtt,
--      text/html, image/svg+xml, audio/mp4, pdf and docx into `gallery`. File type for anon/users/writers is enforced by the extension in the path
--      regexes below. (Storage RLS cannot read the declared Content-Type or the size at permission time - residual risk, see the review doc.)
--   6. Idempotent: re-running drops and re-creates only the policies named here; preconditions fail closed on drift.
-- Public SELECT (public_read), magar_* policies, other buckets and every existing object are untouched.
--
-- Rollback (restores the 12.11.2026 production state exactly):
--   supabase/proposed/ROLLBACK_20261106130000_def004_gallery_storage_upload_policies.sql

-- 0. Preconditions (read-only; fail closed if production drifted from what the owner decision was based on).
do $$
declare v_bucket storage.buckets%rowtype;
begin
  select * into v_bucket from storage.buckets where id = 'gallery';
  if not found or v_bucket.public is not true then
    raise exception 'DEF-004: bucket gallery missing or not public';
  end if;
  if v_bucket.file_size_limit is not null and v_bucket.file_size_limit <> 125829120 then
    raise exception 'DEF-004: gallery.file_size_limit drifted (%); re-check before applying', v_bucket.file_size_limit;
  end if;
  if v_bucket.allowed_mime_types is not null then
    raise exception 'DEF-004: gallery.allowed_mime_types drifted; re-check before applying';
  end if;
  if exists (select 1 from storage.objects
             where bucket_id = 'gallery' and metadata->>'size' ~ '^[0-9]+$' and (metadata->>'size')::bigint > 125829120) then
    raise exception 'DEF-004: an existing gallery object is larger than 120 MiB; the ceiling needs a new owner decision first';
  end if;
end $$;

-- 1. Remove the two broad INSERT grants (and any earlier copy of the scoped ones, so the file can be re-run).
drop policy if exists community_anon_upload on storage.objects;
drop policy if exists public_upload on storage.objects;
drop policy if exists gallery_flat_image_upload_v1 on storage.objects;
drop policy if exists gallery_client_upload_scoped_v1 on storage.objects;
drop policy if exists gallery_admin_upload_v1 on storage.objects;

-- 2. Anonymous reporting (ReportHint.jsx): flat community image, extension limited to raster images. Signed-in reporters use the same form.
create policy gallery_flat_image_upload_v1 on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'gallery' and name ~* '^community/[0-9]{10,16}-[a-z0-9]{1,12}\.(jpe?g|png|webp|gif|avif)$');

-- 3. Signed-in users and writers: only their own prefixes and only the extensions each mounted feature produces.
create policy gallery_client_upload_scoped_v1 on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gallery' and (
      -- communityAttachments.js (CommunityLive2029): images, documents and videos; client caps 8 MB / 50 MB
      name ~* ('^community/' || (select auth.uid())::text
               || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp|gif|pdf|txt|docx|mp4|webm|mov)$')
      -- ProfileSettings.jsx / public-reading personal-request.js: a new name on every replacement (no overwrite); client cap 5 MB
      or name ~* ('^avatars/' || (select auth.uid())::text || '-[0-9]{10,16}\.(jpe?g|png|webp|gif|avif)$')
      -- TzofenEmbed.jsx cipher card (matrix save by a signed-in researcher)
      or name ~* '^sod1820/ciphers/c-[a-z0-9]{1,16}-[a-z0-9]{1,12}\.png$'
    )
  );

-- 4. Administrators (public.users.role = 'admin', the same rule media-upload-intent, upload-image and wa-avatars use): any path.
create policy gallery_admin_upload_v1 on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gallery'
    and exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role = 'admin')
  );

-- 5. 120 MiB ceiling on new uploads into gallery (existing objects are not touched by a bucket setting).
update storage.buckets set file_size_limit = 125829120 where id = 'gallery';

-- 6. Postconditions.
do $$
begin
  if (select file_size_limit from storage.buckets where id = 'gallery') is distinct from 125829120::bigint
     or (select allowed_mime_types from storage.buckets where id = 'gallery') is not null
     or (select public from storage.buckets where id = 'gallery') is not true then
    raise exception 'DEF-004: gallery bucket settings are not as proposed';
  end if;
  if not exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polname = 'public_read' and polcmd = 'r') then
    raise exception 'DEF-004: public_read is missing';
  end if;
  if exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass and polcmd in ('w', 'd', '*')
             and coalesce(pg_get_expr(polqual, polrelid), '') || coalesce(pg_get_expr(polwithcheck, polrelid), '') like '%''gallery''%') then
    raise exception 'DEF-004: an UPDATE/DELETE/ALL policy exists for gallery; existing files must stay unchangeable by clients';
  end if;
end $$;
