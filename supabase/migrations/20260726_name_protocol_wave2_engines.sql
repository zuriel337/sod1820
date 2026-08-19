-- ============================================================
--  Name Research Protocol — Wave 2 (three missing engines)
--  GOLD-STANDARD TEST: each engine enters via the existing contract
--  ONLY — a new function + an allowlist row + an agent row.
--  NO change to fn_name_protocol, the scheduler, or Metatron.
--
--  1. root      — deterministic Hebrew root candidate (suffix-strip +
--                 final-normalize), grounded against the corpus.
--  2. els       — ELS results tied to THIS name (normalized forms),
--                 not the whole saved set.
--  3. notarikon — deterministic rashei-tevot search over the Tanach
--                 (engine is the source; AI may only interpret later).
-- ============================================================

-- ── ENGINE 1: Hebrew root (deterministic candidate) ─────────
create or replace function public.fn_hebrew_root(p_word text)
returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_nikud  text := '[' || chr(1425) || '-' || chr(1479) || ']';
  w text; root text; conf text; rel jsonb; pat text; i int; ch text;
  suffixes text[] := array['ימ','ות','יה','נו','כמ','המ','ונ','ית','ה','ת','י','כ'];  -- normalized (finals→base)
begin
  w := regexp_replace(coalesce(p_word,''), v_nikud, '', 'g');
  w := regexp_replace(w, '[^א-ת]', '', 'g');
  w := translate(w, 'ךםןףץ', 'כמנפצ');                     -- finals → base
  if length(w) = 0 then
    return jsonb_build_object('input', p_word, 'root_candidate', null, 'note', 'אין אותיות עבריות');
  end if;
  -- conservative: strip the longest recognized suffix only (prefix/binyan = future)
  select coalesce((
     select substr(w, 1, length(w)-length(s))
     from unnest(suffixes) s
     where w like '%'||s and length(w)-length(s) >= 3
     order by length(s) desc limit 1), w) into root;
  conf := case when length(root) = 3 then 'medium' else 'low' end;
  -- grounding: real words whose letters open with the root, in order
  pat := '';
  for i in 1..length(root) loop
    ch := substr(root,i,1);
    ch := case ch when 'כ' then '[כך]' when 'מ' then '[מם]' when 'נ' then '[נן]'
                  when 'פ' then '[פף]' when 'צ' then '[צץ]' else ch end;
    pat := pat || ch || case when i < length(root) then '.*' else '' end;
  end loop;
  select coalesce(jsonb_agg(distinct phrase), '[]'::jsonb) into rel
  from (select phrase from gematria_words
        where phrase ~ ('^'||pat) and length(phrase) between length(root) and length(root)+4
        order by phrase limit 10) q;
  return jsonb_build_object(
    'input', p_word, 'normalized', w, 'root_candidate', root,
    'method', 'suffix_strip_deterministic', 'confidence', conf, 'related', rel,
    'note', 'שורש-מועמד דטרמיניסטי (הסרת סופיות + נרמול). מורפולוגיית תחיליות/בניינים = העשרה עתידית — לא ניתוח סמכותי.');
end $$;

-- ── ENGINE 2: ELS for THIS name ─────────────────────────────
create or replace function public.fn_els_for_name(p_word text)
returns jsonb
language sql stable
set search_path = public
as $$
  with w as (select btrim(regexp_replace($1,'['||chr(1425)||'-'||chr(1479)||']','','g')) t),
  recs as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'title', r.title, 'term', r.search_term, 'skip', r.skip_distance,
             'scope', r.scope, 'book', r.torah_book, 'direction', r.direction,
             'positions', case when jsonb_typeof(r.positions)='array' then jsonb_array_length(r.positions) else 0 end,
             'image_url', r.image_url, 'primary_number', r.primary_number
           ) order by r.importance desc nulls last), '[]'::jsonb) j, count(*) c
    from els_records r, w
    where coalesce(r.status,'published') <> 'rejected'
      and coalesce(r.visibility,'public') <> 'private'
      and (r.search_term = w.t or replace(r.search_term,' ','') = replace(w.t,' ',''))
  ),
  live as (select fn_els_search((select t from w), 40, 16) d)
  select jsonb_build_object(
    'term', (select t from w),
    'on_file', (select j from recs),
    'saved_count', (select c from recs),
    'search', (select d from live),
    'plain', (select (d->>'plain')::int from live),
    'els_count', (select (d->>'els_count')::int from live),
    'min_skip', (select (d->>'min_skip')::int from live),
    'count', (select c from recs) + coalesce((select (d->>'els_count')::int from live),0),
    'low_signal', coalesce(length((select t from w)) < 3, true),
    'note', case
      when coalesce((select (d->>'els_count')::int from live),0) = 0 and (select c from recs)=0
        then 'לא נמצא דילוג לשם זה בתורה (עד דילוג 40)'
      when length((select t from w)) < 3
        then 'מונח קצר (2 אותיות) — דילוגים שכיחים מאוד בתורה, ערך-מחקר נמוך'
      else 'דילוגים בתורה שאותרו לשם זה — הדילוג הקצר ביותר הוא המשמעותי. הכלי החי המלא: הצופן (tzofen).'
    end
  );
$$;

-- ── ENGINE 3: Notarikon (deterministic rashei-tevot in Tanach) ──
create or replace function public.fn_notarikon(p_word text)
returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
  v_nikud text := '[' || chr(1425) || '-' || chr(1479) || ']';
  w text; hits jsonb; cnt int;
begin
  w := regexp_replace(coalesce(p_word,''), v_nikud, '', 'g');
  w := translate(regexp_replace(w, '[^א-ת]', '', 'g'), 'ךםןףץ', 'כמנפצ');  -- letters, finals → base
  if length(w) < 2 or length(w) > 6 then
    return jsonb_build_object('term', w, 'rashei_tevot', '[]'::jsonb, 'count', 0,
      'note', 'נוטריקון ראשי-תיבות נבדק דטרמיניסטית לשמות באורך 2–6 אותיות');
  end if;
  with v as (
    select book, chapter, verse, words,
           (select string_agg(translate(left(x,1),'ךםןףץ','כמנפצ'),'' order by o)
            from unnest(words) with ordinality as u(x,o)) initials
    from tanach_verses
    where array_length(words,1) >= length(w)
  ),
  m as (
    select book, chapter, verse, words, position(w in initials) pos
    from v where initials like '%'||w||'%'
  ),
  top as (
    select * from m order by book, chapter, verse limit 15
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'ref', book||' '||chapter||':'||verse,
           'words', (select jsonb_agg(words[i] order by i) from generate_series(pos, pos+length(w)-1) i),
           'initials', w, 'score', 100)  order by book, chapter, verse), '[]'::jsonb),
         (select count(*) from m)
  into hits, cnt
  from top;
  return jsonb_build_object(
    'term', w, 'method', 'rashei_tevot_consecutive', 'rashei_tevot', hits, 'count', cnt,
    'note', 'ראשי-תיבות של מילים רצופות בתנ״ך שמאייתות את השם (עובדת-מנוע דטרמיניסטית; הפרשנות נפרדת)');
end $$;

-- ── REGISTER: allowlist + agents (the whole cost of Wave 2) ──
insert into public.name_protocol_allowed_fns (fn_name, note) values
 ('fn_hebrew_root','discovery: deterministic Hebrew root candidate'),
 ('fn_els_for_name','crossings: ELS results tied to this name'),
 ('fn_notarikon','methods: deterministic rashei-tevot in Tanach')
on conflict (fn_name) do nothing;

insert into public.name_protocol_agents (agent_id,label,stage,output_key,fn_name,fn_args,result_mode,depends_on,needs_value,sort,note) values
 ('root','סוכן השורש','discovery','root','fn_hebrew_root','[{"src":"name"}]'::jsonb,'scalar','{}',false,35,'שורש-מועמד דטרמיניסטי + עיגון'),
 ('notarikon','סוכן הנוטריקון','methods','notarikon','fn_notarikon','[{"src":"name"}]'::jsonb,'scalar','{}',false,55,'ראשי-תיבות דטרמיניסטי בתנ״ך'),
 ('els','סוכן הדילוגים','crossings','els','fn_els_for_name','[{"src":"name"}]'::jsonb,'scalar','{}',false,85,'דילוגים שמורים לשם הנוכחי')
on conflict (agent_id) do update set
  label=excluded.label, stage=excluded.stage, output_key=excluded.output_key,
  fn_name=excluded.fn_name, fn_args=excluded.fn_args, result_mode=excluded.result_mode,
  depends_on=excluded.depends_on, needs_value=excluded.needs_value, sort=excluded.sort, note=excluded.note;
