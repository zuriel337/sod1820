-- edge posts (distinct dates so ordering has no ties)
insert into posts (id, wp_id, title, slug, tags, date, categories, content, source) values
 (9000001, 9000001, 'value 0787', 's1', '{}', now()-interval '1 day', '{}', 'x', 'wordpress'),
 (9000002, null, 'null wp id 787', 's2', '{}', now()-interval '2 day', '{}', 'x', 'wordpress'),
 (9000003, 9000003, 'big 1000000000 and 2147483647', 's3', array['tag 4242'], now()-interval '3 day', '{}', 'x', 'wordpress'),
 (9000004, 9000004, 'minus -787 here', 's4', '{}', now()-interval '4 day', '{}', 'x', 'wordpress'),
 (9000005, 9000005, 'in 1787 and 7870', 's5', array['787'], now()-interval '5 day', '{}', 'x', 'wordpress'),
 (9000006, 9000006, null, 's6', null, now()-interval '6 day', '{}', 'x', 'wordpress');
create or replace function eqnum(n int) returns bigint language sql stable as $$
  select (select count(*) from (select * from posts_by_number_strict(n, 100000) except all select * from posts_by_number_strict_v3(n, 100000)) a)
       + (select count(*) from (select * from posts_by_number_strict_v3(n, 100000) except all select * from posts_by_number_strict(n, 100000)) b) $$;
select 'edge requests' scope, count(*) tested, sum(eqnum(n)) row_differences from unnest(array[787,0,1000000000,2147483647,-787,1787,7870,4242,5,12]) n;
select 'random numbers (1..2100)' scope, count(*) tested, sum(eqnum(n)) row_differences from generate_series(1, 2100, 7) n;
-- maintenance: update title/tags, delete, insert, id change
update posts set title = 'moved to 31337' where id = 9000001;
select 'after title update' scope, eqnum(787) d787, eqnum(31337) d31337;
update posts set tags = array['99999'] where id = 9000002;
select 'after tag update' scope, eqnum(787) d787, eqnum(99999) d99999;
delete from posts where id = 9000003;
select 'after delete' scope, eqnum(4242) d4242, eqnum(1000000000) dbig;
insert into posts (id, wp_id, title, slug, tags, date, categories, content, source) values (9000007, null, 'fresh 555555', 's7', '{}', now(), '{}', 'x', 'wordpress');
select 'after insert (wp_id null)' scope, eqnum(555555) d555555, (select count(*) from posts_by_number_strict_v3(555555, 5)) v3_rows;
update posts set id = 9000008 where id = 9000007;
select 'after id change' scope, eqnum(555555) d555555, (select count(*) from post_numbers where post_id = 9000007) stale_tokens;
select 'rows with wp_id NULL found by v3 for 787' scope, count(*) from posts_by_number_strict_v3(787, 100) where wp_id is null;
