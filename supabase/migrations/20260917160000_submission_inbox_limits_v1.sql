-- G3_MEDIA_UPLOAD_RUNTIME_V1
-- Safety envelope for the private submission-inbox bucket introduced by PR #495.
-- Physical storage constraint only; no contribution/truth semantics are created here.

update storage.buckets
set
  public = false,
  file_size_limit = 2147483648,
  allowed_mime_types = array[
    'image/png','image/jpeg','image/webp','image/gif','image/avif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg',
    'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'
  ]::text[]
where id = 'submission-inbox';

-- Fail closed if the parent migration was not applied in the same release sequence.
do $$
begin
  if not exists (select 1 from storage.buckets where id='submission-inbox' and public=false) then
    raise exception 'submission-inbox bucket missing or not private';
  end if;
end
$$;
