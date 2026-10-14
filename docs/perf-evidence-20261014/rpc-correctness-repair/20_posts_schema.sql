-- LOCAL lab for posts_by_number_strict / get_category_videos. Synthetic posts only (no live rows). Columns = live subset used by the functions.
\set ON_ERROR_STOP on
drop table if exists post_numbers cascade; drop table if exists posts cascade;
create table posts (id bigint generated always as identity primary key, wp_id bigint, slug text, title text, content text, date timestamptz, categories text[], tags text[],
  image_url text, thumb_url text, author text);
-- Adversarial fixed corpus (titles/tags chosen around the known counterexamples) + seeded random bulk
insert into posts (wp_id, slug, title, date, tags, categories) values
 (1,'a','הפרשה 787', '2026-01-01', null, '{x}'),
 (2,'b','0787 במקרא', '2026-01-02', null, '{x}'),
 (3,'c','00', '2026-01-03', '{0}', '{x}'),
 (4,'d','אפס 0 בלבד', '2026-01-04', null, '{x}'),
 (5,'e','מספר 2147483647 מקסימום', '2026-01-05', null, '{x}'),
 (6,'f','1000000000 מיליארד', '2026-01-06', null, '{x}'),
 (7,'g','שלילי -787 כאן', '2026-01-07', null, '{x}'),
 (8,'h','טווח 5-787 וחצי', '2026-01-08', null, '{x}'),
 (9,'i','787788 צמוד', '2026-01-09', '{787}', '{x}'),
 (10,'j',null, '2026-01-10', '{"תג 787","7870"}', '{x}'),
 (null,'k','כותרת 787 בלי wp_id', '2026-01-11', null, '{x}'),
 (null,'l','כותרת ללא מספר', '2026-01-12', '{"תג 787"}', '{x}'),
 (11,'m','787 ו-788 ו-787', null, null, '{x}'),
 (12,'n','תאריך זהה 787', '2026-01-01', null, '{x}'),
 (13,'o','תאריך זהה אחר 787', '2026-01-01', null, '{x}'),
 (14,'p','787.5 עשרוני', '2026-01-14', null, '{x}'),
 (15,'q','--787 כפול מינוס', '2026-01-15', null, '{x}'),
 (16,'r','x787y', '2026-01-16', '{a787b,"787"}', '{x}'),
 (17,'s','1e9 וגם 12345678901', '2026-01-17', null, '{x}'),
 (18,'t','', '2026-01-18', '{}', '{x}'),
 (19,'u','٧٨٧ ערבית-הודית 787', '2026-01-19', null, '{x}'),
 (20,'v','פעמיים 2147483647 ו-2147483648', '2026-01-20', null, '{x}');
insert into posts (wp_id, slug, title, date, tags, categories)
select 1000+g, 's'||g,
  case when g%9=0 then null else 'פוסט '||(abs(hashtext('t'||g))%2000)||case when g%7=0 then ' ו-'||(abs(hashtext('u'||g))%2000) else '' end end,
  case when g%41=0 then null else timestamptz '2020-01-01' + ((abs(hashtext('d'||g))%400)||' days')::interval end,
  case when g%5=0 then null when g%3=0 then array['n'||(abs(hashtext('g'||g))%2000), 'צופן'] else array['צופן'] end, '{x}'
from generate_series(1, :bulk::int) g;
update posts set wp_id = null where id % 997 = 0;   -- more NULL wp_id rows (live has 13)
analyze posts;
