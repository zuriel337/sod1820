-- ROLLBACK for supabase/proposed/20261106130000_def004_gallery_storage_upload_policies.sql (DEF-004, revision M0 · 12.11.2026).
-- Restores the production state read on 12.11.2026 (pg_policy on storage.objects + storage.buckets), verbatim:
--   community_anon_upload  PERMISSIVE INSERT TO anon, authenticated
--     WITH CHECK ((bucket_id = 'gallery'::text) AND ((storage.foldername(name))[1] = 'community'::text))
--   public_upload          PERMISSIVE INSERT TO authenticated
--     WITH CHECK ((bucket_id = 'gallery'::text))
--   bucket gallery: public = true, file_size_limit = NULL, allowed_mime_types = NULL
-- Not touched (they were never changed by the proposal): community_authenticated_media_paths_v1 (RESTRICTIVE), public_read, magar_*,
-- every other bucket and every object. Needs the same explicit ZURIEL approval as the forward file (production Storage change).
-- Rolling back re-opens the DEF-004 exposure (any signed-in account can write anywhere in gallery, anyone can write any file under community/,
-- no size limit). Objects uploaded while the proposal was live stay where they are.

drop policy if exists gallery_admin_upload_v1 on storage.objects;
drop policy if exists gallery_client_upload_scoped_v1 on storage.objects;
drop policy if exists gallery_flat_image_upload_v1 on storage.objects;
drop policy if exists community_anon_upload on storage.objects;
drop policy if exists public_upload on storage.objects;

create policy community_anon_upload on storage.objects as permissive for insert to anon, authenticated
  with check ((bucket_id = 'gallery'::text) AND ((storage.foldername(name))[1] = 'community'::text));
create policy public_upload on storage.objects as permissive for insert to authenticated
  with check ((bucket_id = 'gallery'::text));

update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'gallery';

do $$
begin
  if (select file_size_limit from storage.buckets where id = 'gallery') is not null
     or (select allowed_mime_types from storage.buckets where id = 'gallery') is not null then
    raise exception 'DEF-004 rollback: gallery bucket limits were not restored to NULL';
  end if;
  if (select count(*) from pg_policy where polrelid = 'storage.objects'::regclass
      and polname in ('community_anon_upload', 'public_upload') and polcmd = 'a' and polpermissive) <> 2 then
    raise exception 'DEF-004 rollback: the two original INSERT policies are not both present';
  end if;
end $$;
