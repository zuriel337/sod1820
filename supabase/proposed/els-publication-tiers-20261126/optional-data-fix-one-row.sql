-- OPTIONAL, separate approval. After apply.sql the row below is already unreadable to others; this only makes its flag consistent.
-- One row only: the private draft "אליהו" whose self_published flag was set by the owner. Guarded on its exact identity and state.
begin;
update public.els_records set self_published = false
 where id = '838615a3-905d-4ce4-9a50-9d2a81c7aae0' and status = 'draft' and visibility = 'private' and self_published = true;
do $$ begin if (select count(*) from public.els_records where id = '838615a3-905d-4ce4-9a50-9d2a81c7aae0' and self_published) <> 0 then raise exception 'not applied'; end if; end $$;
commit;
