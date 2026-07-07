-- Phase 2a — make research_items canonical for items; migrate existing user_research blobs.
-- items (cart/saved/pinned) → research_items rows. collections/journeys/history stay in user_research blob.
-- user_research is kept intact as backup. getCloudResearch/saveCloudResearch (auth.js) rewritten accordingly.
insert into public.research_items (user_id, bucket, entity_type, entity_ref, title, link, metadata)
select ur.user_id, m.bucket,
       coalesce(item->>'type','unknown'),
       coalesce(item->>'ref', item->>'id', item->>'title', md5(item::text)),
       item->>'title', item->>'link', item
from public.user_research ur
cross join lateral (values ('cart','cart'),('saved','library'),('pinned','pinned')) as m(src,bucket)
cross join lateral jsonb_array_elements(case when jsonb_typeof(ur.data->m.src)='array' then ur.data->m.src else '[]'::jsonb end) as item
where exists (select 1 from auth.users u where u.id = ur.user_id)
on conflict (user_id, bucket, entity_type, entity_ref) do nothing;
