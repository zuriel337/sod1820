\set ON_ERROR_STOP on
\ir fixture.sql
select test_assert(test_notify_md5() = 'c99975e5af83bf4999bf702f33bab986', 'fixture notify function is the live text byte for byte');
-- The live defect, reproduced: a high-impact recommendation (how every detector writes it) and even an explicit observed severity notify nobody.
select suggest_add('data_quality', 'test', 'impact high', 'r', '{}', 90, 1, 'high', 'before:impact');
select suggest_add('data_quality', 'test', 'severity high', 'r', '{"severity":"high"}', 90, 1, 'high', 'before:severity');
select test_assert((select count(*) = 0 from user_notifications), 'live: no high notice is ever written (severity unread, email missing)');
delete from system_suggestions;
