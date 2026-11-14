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
-- Revision 14.11.2026 (foundation package): the file runs as ONE transaction with lock and statement timeouts (it either applies completely or not at all) and, where the objects are policies or grants, with a catalogue fingerprint guard
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Catalogue guard: this rollback runs only on the exact state its apply produced (fingerprint 9fbf59431d86a0c4453d1e31302b0c66). The state before the apply
-- (fc57c5ec4289358741cd622b02d39556) means there is nothing to roll back; any other state is a later change that needs a human decision. Nothing is changed then.
create or replace function pg_temp.def004_fp_s8() returns text language sql stable as $f$
  select md5(string_agg(x, E'\n' order by x collate "C")) from (
    select 'p|'||policyname||'|'||cmd||'|'||permissive||'|'||(select string_agg(r, ',' order by r) from unnest(roles) r)||'|'||coalesce(qual,'-')||'|'||coalesce(with_check,'-') as x from pg_policies where schemaname='storage' and tablename='objects'
    union all select 'b|'||id||'|'||public::text||'|'||coalesce(file_size_limit::text,'-')||'|'||coalesce(allowed_mime_types::text,'-') from storage.buckets where id='gallery'
    union all select 'rls|objects|'||relrowsecurity::text from pg_class where oid='storage.objects'::regclass
  ) q
$f$;
do $$
declare v text := pg_temp.def004_fp_s8();
begin
  if v = 'fc57c5ec4289358741cd622b02d39556' then
    raise exception 'DEF-004 rollback: the catalogue is already the state before the apply; nothing to roll back, nothing changed';
  end if;
  if v <> '9fbf59431d86a0c4453d1e31302b0c66' then
    raise exception 'DEF-004 rollback: the catalogue is not the state the apply produced (fingerprint %, expected 9fbf59431d86a0c4453d1e31302b0c66): changed since; nothing changed, a human decision is needed', v;
  end if;
end $$;

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

-- Postcondition: the exact state before the apply, as read live on 14.11.2026 (fingerprint fc57c5ec4289358741cd622b02d39556).
do $$
declare v text := pg_temp.def004_fp_s8();
begin
  if v <> 'fc57c5ec4289358741cd622b02d39556' then
    raise exception 'DEF-004 rollback: the catalogue after the rollback is not the state before the apply (fingerprint %, expected fc57c5ec4289358741cd622b02d39556)', v;
  end if;
end $$;

commit;
