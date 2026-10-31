-- Preserve existing gallery owners and legacy flat Community image/document
-- paths. New account-scoped paths and native Community videos require Auth.
-- This restrictive policy narrows existing permissive upload policies; it does
-- not create an upload grant, update permission, bucket or public-read policy.
create policy community_authenticated_media_paths_v1
on storage.objects as restrictive for insert to anon, authenticated
with check (
  bucket_id <> 'gallery'
  or name not like 'community/%'
  or (
    name !~* '\.(mp4|webm|mov)$'
    and name !~* '^community/[0-9a-f-]{36}/'
  )
  or (
    auth.uid() is not null
    and name ~* ('^community/' || auth.uid()::text || '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif|pdf|txt|docx|mp4|webm|mov)$')
  )
);
