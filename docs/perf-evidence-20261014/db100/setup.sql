-- Synthetic isolated copy of the posts access pattern (NOT live data). :S = scale (1 = today's 1302 rows)
drop table if exists posts;
create table posts (id bigint primary key, title text, content text, date timestamptz, slug text, categories text[], tags text[], modified timestamptz,
  source text, home_hidden boolean default false, excerpt text, author text, image_url text, thumb_url text, space text, tree_priority smallint, wp_id bigint unique);
insert into posts
select g, 'title '||g, repeat(md5(g::text)||' ', 530), now() - (g||' minutes')::interval * (1.0/:S) * 1000,
  'slug-'||g,
  (select array_agg(c) from (select distinct (array['תיעוד אירועים','התחזקות','מסרים','וידאו','רמזים חזקים','סוד האותיות והמספרים','סוד החשמל','עלוני גאולה','צפונות בתורה','ארה"ב','אסונות/תופעות טבע','רמזים מצדיקים','שבילי שפה','הצופן בסרטים','מימד חמש', 'קטגוריה '||(g%37)])[1 + floor(power(random(),2.2)*16)::int] c from generate_series(1,2)) x),
  case when g%140=0 then array['טיוטה','x'] when g%430=0 then array['פורום'] else array['t'||(g%50),'u'||(g%97),'v'||(g%11)] end,
  now() - ((random()*30000)::int||' minutes')::interval, (array['wordpress','SOD1820','sod1820','manual','import','x'])[1+g%6], (g%54=0), 'excerpt '||g, 'a', null, null, 'core', (g%3)::smallint, g+1000000
from generate_series(1, 1302*:S) g;
analyze posts;
