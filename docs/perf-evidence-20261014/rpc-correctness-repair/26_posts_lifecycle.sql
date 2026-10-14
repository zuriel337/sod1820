\set ON_ERROR_STOP on
begin;
select 'baseline' step, * from pnk_verify();
insert into posts (wp_id,slug,title,tags,date) values (null,'lc1','חדש 4242 ו--9','{"תג 77"}',now());
select 'after insert' step, * from pnk_verify();
update posts set title='שונה 4243' where slug='lc1';  select 'after title update' step, * from pnk_verify();
update posts set tags=null where slug='lc1';           select 'after tags->null' step, * from pnk_verify();
update posts set content='x' where slug='lc1';         select 'after unrelated update' step, * from pnk_verify();
select 'lookup new num as old/new' step, (select count(*) from posts_by_number_strict(4243,10)) old_n, (select count(*) from posts_by_number_strict_v3(4243,10)) new_n;
delete from posts where slug='lc1';                    select 'after delete' step, * from pnk_verify();
-- simulate drift (trigger bypassed) and prove detector + rebuild
alter table posts disable trigger posts_pnk_sync; update posts set title='drift 5555' where slug='a'; alter table posts enable trigger posts_pnk_sync;
select 'drift injected' step, * from pnk_verify(); select pnk_rebuild() > 0 as rebuilt; select 'after rebuild' step, * from pnk_verify();
-- anon visibility
set local role anon; select 'anon sees keys' step, count(*)>0 from post_number_keys; select 'anon v3' step, count(*) from posts_by_number_strict_v3(787,10);
reset role;
-- RLS inheritance: restrict posts to non-draft for anon and prove keys of hidden posts are invisible
update posts set tags = array['טיוטה'] where slug='a';
drop policy posts_read on posts; create policy posts_read on posts for select using (not coalesce(tags,'{}') @> array['טיוטה']);
set local role anon; select 'anon old / v3 after hiding post a' step, (select count(*) from posts_by_number_strict(787,50)) o, (select count(*) from posts_by_number_strict_v3(787,50)) n, (select count(*) from post_number_keys k where k.post_id=(select id from posts where slug='a')) key_rows_visible_for_hidden;
reset role;
rollback;
