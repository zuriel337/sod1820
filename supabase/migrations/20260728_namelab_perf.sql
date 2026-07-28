-- ============================================================
--  NameLab — performance round (Zuriel: do perf before more engines)
--  fn_name_multi went ~6s → ~0.8-1.4s (warm) via:
--   • precomputed columns on the static tanach_verses (vfirst/vlast/
--     rashei/sofei) + index → fn_name_verse 504→16ms, fn_notarikon
--     1230→30ms (no per-verse string_agg).
--   • GIN index on words + rewritten same-chapter intersect →
--     fn_tanach_together 2475→16ms.
--   • fn_transforms_tanach: atbash/albam via translate() maps (verified
--     identical to the engine) instead of the heavy fn_name_research
--     (903→~50ms); also fixed a bug — now matches final-form words too.
-- ============================================================

alter table public.tanach_verses add column if not exists vfirst text;
alter table public.tanach_verses add column if not exists vlast  text;
alter table public.tanach_verses add column if not exists rashei text;
alter table public.tanach_verses add column if not exists sofei  text;

update public.tanach_verses v set
  vfirst = left(regexp_replace(text,'[^א-ת]','','g'),1),
  vlast  = right(regexp_replace(text,'[^א-ת]','','g'),1),
  rashei = (select string_agg(translate(left(x,1),'ךםןףץ','כמנפצ'),'' order by o) from unnest(v.words) with ordinality u(x,o)),
  sofei  = (select string_agg(translate(right(x,1),'ךםןףץ','כמנפצ'),'' order by o) from unnest(v.words) with ordinality u(x,o))
where vfirst is null or rashei is null;

create index if not exists tv_firstlast on public.tanach_verses(vfirst, vlast);
create index if not exists tv_words_gin  on public.tanach_verses using gin(words);
analyze public.tanach_verses;

create or replace function public.fn_name_verse(p_name text)
returns jsonb language sql stable set search_path=public as $$
  with nm as (select t, left(t,1) f, right(t,1) l
              from (select btrim(regexp_replace(coalesce(p_name,''),'['||chr(1425)||'-'||chr(1479)||'  ]','','g')) t) z),
  hits as (select book,chapter,verse,text, length(regexp_replace(text,'[^א-ת]','','g')) len
           from tanach_verses v, nm where length(nm.t)>=2 and v.vfirst=nm.f and v.vlast=nm.l)
  select jsonb_build_object(
    'name',(select t from nm), 'first',(select f from nm), 'last',(select l from nm),
    'count',(select count(*) from hits),
    'verses', coalesce((select jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text) order by len) from (select * from hits order by len limit 6) z),'[]'::jsonb),
    'note','פסוק שמתחיל באות הראשונה של השם ומסתיים באות האחרונה — «הפסוק לשמך» (נהוג לאומרו בסוף תפילת העמידה)'
  );
$$;

create or replace function public.fn_notarikon(p_word text)
returns jsonb language plpgsql stable set search_path=public as $$
declare
  v_nikud text := '[' || chr(1425) || '-' || chr(1479) || ']';
  w text; j_rashei jsonb; j_sofei jsonb; c_r int; c_s int;
begin
  w := regexp_replace(coalesce(p_word,''), v_nikud, '', 'g');
  w := translate(regexp_replace(w, '[^א-ת]', '', 'g'), 'ךםןףץ', 'כמנפצ');
  if length(w) < 2 or length(w) > 6 then
    return jsonb_build_object('term', w, 'rashei_tevot','[]'::jsonb, 'sofei_tevot','[]'::jsonb, 'count',0,
      'note','נוטריקון נבדק דטרמיניסטית לשמות באורך 2–6 אותיות');
  end if;
  with m as (select tv.book,tv.chapter,tv.verse,tv.words, position(w in tv.rashei) pos
             from tanach_verses tv where array_length(tv.words,1) >= length(w) and tv.rashei like '%'||w||'%')
  select coalesce(jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,
            'words',(select jsonb_agg(words[i] order by i) from generate_series(pos,pos+length(w)-1) i),
            'kind','ראשי','score',100) order by book,chapter,verse), '[]'::jsonb), count(*)
  into j_rashei, c_r from (select * from m order by book,chapter,verse limit 12) z;
  with m as (select tv.book,tv.chapter,tv.verse,tv.words, position(w in tv.sofei) pos
             from tanach_verses tv where array_length(tv.words,1) >= length(w) and tv.sofei like '%'||w||'%')
  select coalesce(jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,
            'words',(select jsonb_agg(words[i] order by i) from generate_series(pos,pos+length(w)-1) i),
            'kind','סופי','score',90) order by book,chapter,verse), '[]'::jsonb), count(*)
  into j_sofei, c_s from (select * from m order by book,chapter,verse limit 12) z;
  return jsonb_build_object('term', w, 'method','rashei_and_sofei_tevot',
    'rashei_tevot', j_rashei, 'sofei_tevot', j_sofei, 'count', coalesce(c_r,0)+coalesce(c_s,0),
    'rashei_count', coalesce(c_r,0), 'sofei_count', coalesce(c_s,0),
    'note','ראשי-תיבות + סופי-תיבות של מילים רצופות בתנ״ך המאייתות את השם (עובדת-מנוע דטרמיניסטית; הפרשנות נפרדת)');
end $$;

create or replace function public.fn_tanach_together(p_words text[])
returns jsonb language sql stable set search_path=public as $$
  with sv as (
    select book,chapter,verse,text from tanach_verses
    where p_words is not null and array_length(p_words,1)>=2 and words @> p_words
    order by book_idx,chapter,verse limit 12
  ),
  wc as (select distinct w, book, chapter from tanach_verses, unnest(p_words) w
         where array_length(p_words,1)>=2 and words @> array[w]),
  ch as (select book, chapter from wc group by book, chapter having count(distinct w)=array_length(p_words,1)),
  sc as (select c.book, c.chapter,
           (select count(*) from tanach_verses v where v.book=c.book and v.chapter=c.chapter and v.words && p_words) hits
         from ch c)
  select jsonb_build_object(
    'same_verse', coalesce((select jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,'text',text)) from sv),'[]'::jsonb),
    'same_verse_count', (select count(*) from tanach_verses where array_length(p_words,1)>=2 and words @> p_words),
    'same_chapter', coalesce((select jsonb_agg(jsonb_build_object('ref',book||' '||chapter,'verses',hits) order by hits desc) from (select * from sc order by hits desc limit 12) z),'[]'::jsonb),
    'same_chapter_count', (select count(*) from ch)
  );
$$;

create or replace function public.fn_transforms_tanach(p_word text)
returns jsonb language sql stable set search_path=public as $$
  with base as (select translate(regexp_replace(coalesce(p_word,''),'['||chr(1425)||'-'||chr(1479)||'  ]','','g'),'ךםןףץ','כמנפצ') b),
  tf as (
    select 'אתב״ש' method, translate(b,'אבגדהוזחטיכלמנסעפצקרשת','תשרקצפעסנמלכיטחזוהדגבא') w from base
    union all
    select 'אלב״ם', translate(b,'אבגדהוזחטיכלמנסעפצקרשת','למנסעפצקרשתאבגדהוזחטיכ') from base
  ),
  tf2 as (select method, w, left(w,length(w)-1)||translate(right(w,1),'כמנפצ','ךםןףץ') wf from tf where w<>'')
  select jsonb_build_object(
    'transforms', coalesce((select jsonb_agg(jsonb_build_object(
      'method', method, 'word', w, 'value', fn_ragil(w),
      'in_tanach', (select count(*) from tanach_verses where words @> array[w] or words @> array[wf]),
      'known_words', coalesce((select jsonb_agg(phrase) from (select phrase from gematria_words where phrase in (w,wf) limit 5) z),'[]'::jsonb),
      'verses', coalesce((select jsonb_agg(book||' '||chapter||':'||verse) from (select book,chapter,verse from tanach_verses where words @> array[w] or words @> array[wf] order by book_idx,chapter,verse limit 3) z),'[]'::jsonb)
    ) order by method) from tf2),'[]'::jsonb)
  );
$$;
