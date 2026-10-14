-- get_category_videos vs d34 get_category_videos_v2: limit moved inside; regex columns are projection only (old WHERE has no regex). Full-output compare incl. date ties, NULL dates, limits.
\set ON_ERROR_STOP on
begin;
\i provenance-d34a910c/posts_fix.sql.cv_only
insert into posts (wp_id,slug,title,content,date,categories,tags,author) select 5000+g,'cv'||g,'v'||g,
  case g%4 when 0 then 'x https://a.b/c.mp4 y' when 1 then 'https://youtu.be/abcdefghijk' when 2 then 'plain' else 'both https://a.b/d.MP4 youtube.com/watch?v=ABCDEFGHIJK' end,
  case when g%13=0 then null else timestamptz '2025-01-01' + ((g%10)||' days')::interval end,   -- heavy date ties
  case when g%5=0 then array['אחר'] else array['וידאו'] end, case when g%7=0 then array['טיוטה'] when g%11=0 then null else array['הצופן התנכי'] end, 'au'||(g%3)
from generate_series(1,300) g;
create or replace function lab_cv(lim int) returns table(lim_in int, rows_old int, rows_new int, date_seq_equal boolean, subset_ok boolean, full_multiset_equal boolean) language plpgsql as $$
declare o jsonb; n jsonb; f jsonb; begin
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into o from get_category_videos('וידאו',lim) r;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into n from get_category_videos_v2('וידאו',lim) r;
  select coalesce(jsonb_agg(to_jsonb(r)),'[]') into f from get_category_videos('וידאו',null) r;
  return query select lim, jsonb_array_length(o), jsonb_array_length(n),
    (select coalesce(jsonb_agg(x->>'uploaded_at' order by ord),'[]') from jsonb_array_elements(o) with ordinality a(x,ord)) = (select coalesce(jsonb_agg(x->>'uploaded_at' order by ord),'[]') from jsonb_array_elements(n) with ordinality a(x,ord)),
    not exists (select x from jsonb_array_elements(n) x except select x from jsonb_array_elements(f) x),
    case when lim is null or lim>=jsonb_array_length(f) then not exists (select x from jsonb_array_elements(o) x except all select x from jsonb_array_elements(n) x) and not exists (select x from jsonb_array_elements(n) x except all select x from jsonb_array_elements(o) x) else null end;
end $$;
select * from (select (lab_cv(x)).* from unnest(array[null,0,1,5,60,100,1000]::int[]) x) s;
rollback;
