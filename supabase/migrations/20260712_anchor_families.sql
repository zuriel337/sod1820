-- 🧩 שכבת משפחות-העוגנים — נתונים + מיפוי בלבד (חוק: עוגן ≠ פרשנות).
-- עוגן = משפחה, לא נקודה. שלוש עדשות מאחדות: אפס-נע (zero_root) · מספר-הפוך (digit_reverse) · שפות.
-- מחזור-סטטוסים ידני: discovered → reviewed → approved_anchor → featured.

-- שורש-האפס (שיטת האפס הנע): 1820→182 · 370→37. X ו-X×10 = אותו שורש.
create or replace function public.zero_root(n int) returns int language sql immutable as $$
  select case when n is null or n=0 then n
              else (n / power(10, (length(n::text) - length(rtrim(n::text,'0'))))::int)::int end;
$$;

-- מספר הפוך: 45→54 · 182→281. פועל על השורש.
create or replace function public.digit_reverse(n int) returns int language sql immutable as $$
  select case when n is null then null else nullif(reverse(n::text),'')::int end;
$$;

create table if not exists public.anchor_families (
  id uuid primary key default gen_random_uuid(),
  root int not null unique,
  primary_value int,
  mirror_values int[] default '{}',
  zero_shift_values int[] default '{}',
  hebrew_terms text[] default '{}',
  bridges jsonb default '[]'::jsonb,
  evidence_count int default 0,
  methods text[] default '{}',
  status text not null default 'discovered',   -- discovered|reviewed|approved_anchor|featured
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.anchor_families enable row level security;
drop policy if exists anchor_families_public_read on public.anchor_families;
create policy anchor_families_public_read on public.anchor_families for select using (true);

-- Family Mapper: ערך → מבנה משפחה (מיפוי בלבד; hebrew_terms מהציר, לא גלם ישן).
create or replace function public.map_anchor_family(p_value int)
returns jsonb language sql stable security definer set search_path = public as $$
  with r as (select zero_root(p_value) root),
  base as (select root, digit_reverse(root) mir from r),
  fam as (
    select distinct v from unnest(array[
      (select root from base), (select root from base)*10, (select root from base)*100,
      (select mir from base),  (select mir from base)*10,  (select mir from base)*100
    ]) v where v between 10 and 1000000
  ),
  axis as (
    select distinct phrase from gematria_words
    where lead_rank is not null
       or (coalesce(array_length(source_wp_ids,1),0)=0 and coalesce(source,'') !~ '^(excel_import|promoted:|auto:|wp_id:)')
  ),
  hits as (
    select b.value, b.phrase, b.method from bidim b join axis a on a.phrase=b.phrase
    where b.value in (select v from fam)
      and b.method in ('רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר') and b.phrase !~ '[A-Za-z0-9]'
  ),
  brdg as (
    select count(distinct wa.id) n, coalesce(jsonb_agg(distinct jsonb_build_object('lang',wa.lang,'alias',wa.alias)) filter (where wa.alias is not null),'[]') list
    from word_aliases wa join gematria_words g on g.id=wa.word_id
    where g.phrase in (select distinct phrase from hits) and coalesce(wa.lang,'he') not in ('he','heb','עברית')
  )
  select jsonb_build_object(
    'root',(select root from base),'primary_value',(select root from base),
    'mirror_values', to_jsonb(array(select v from unnest(array[(select mir from base),(select mir from base)*10,(select mir from base)*100]) v where v between 10 and 1000000)),
    'zero_shift_values', to_jsonb(array[(select root from base)*10,(select root from base)*100]),
    'family_values',(select to_jsonb(array_agg(v order by v)) from fam),
    'hebrew_terms', coalesce((select to_jsonb((array_agg(distinct phrase))[1:14]) from hits),'[]'),
    'evidence_count',(select count(distinct phrase) from hits),
    'methods', coalesce((select to_jsonb(array_agg(distinct method)) from hits),'[]'),
    'n_bridges',(select n from brdg),'bridges',(select list from brdg));
$$;
revoke all on function public.map_anchor_family(int) from public;
grant execute on function public.map_anchor_family(int) to anon, authenticated, service_role;

-- Discover: סורק את הציר → משפחות-מועמדות מדורגות (floor root≥10 נגד over-merge).
create or replace function public.discover_anchor_families(p_min_words int default 8, p_limit int default 60)
returns table(root int, mirror int, n_words int, n_methods int, cross_method boolean,
              is_existing_anchor boolean, is_family boolean, family_status text, sample text[])
language sql stable security definer set search_path = public as $$
  with axis as (
    select distinct phrase from gematria_words
    where lead_rank is not null
       or (coalesce(array_length(source_wp_ids,1),0)=0 and coalesce(source,'') !~ '^(excel_import|promoted:|auto:|wp_id:)')
  ),
  anchors as (
    select distinct zero_root(v::int) rv from (
      select value v from number_anchors
      union select unnest(numbers) from topic_cards where status='approved'
      union select (jsonb_array_elements_text(metadata->'numbers'))::int from nodes where type='convergence' and is_active and metadata ? 'numbers'
    ) t where v between 10 and 1000000
  ),
  hits as (
    select zero_root(b.value::int) root, b.phrase, b.method from bidim b join axis a on a.phrase=b.phrase
    where b.method in ('רגיל','אתבש','קדמי','מילוי','סידורי','אלבם','מסתתר')
      and b.value between 100 and 1000000 and b.phrase !~ '[A-Za-z0-9]'
  )
  select h.root, digit_reverse(h.root), count(distinct h.phrase)::int, count(distinct h.method)::int,
         (count(distinct h.method)>1), (h.root in (select rv from anchors)),
         exists(select 1 from anchor_families f where f.root=h.root),
         (select status from anchor_families f where f.root=h.root),
         (array_agg(distinct h.phrase))[1:6]
  from hits h where h.root>=10 group by h.root
  having count(distinct h.phrase) >= p_min_words
  order by count(distinct h.phrase) desc, count(distinct h.method) desc limit p_limit;
$$;
revoke all on function public.discover_anchor_families(int, int) from public;
grant execute on function public.discover_anchor_families(int, int) to anon, authenticated, service_role;
