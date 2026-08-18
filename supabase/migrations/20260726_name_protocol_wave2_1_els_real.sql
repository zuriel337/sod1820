-- ============================================================
--  ⛔ SUPERSEDED 18.8.2026 — this file no longer defines current state.
--
--  Two blocks in it were stale and would have reverted the ELS Corpus
--  Reconciliation + Position Normalization if this file were ever replayed
--  (supabase db push / db reset). Both have been brought in line with what
--  is live; nothing here is a new mechanism.
--
--   (a) corpus populate  — REMOVED. It rebuilt torah_stream from
--       tanach_verses (306,269 contaminated). See the block below.
--   (b) fn_els_search    — BODY REPLACED with the current live definition
--       (prosrc md5 1373a3c57a865b16ff7c3870461f4165, 2,444 chars).
--       Replaying this file now reproduces the CURRENT contract:
--       start is 0-based, and the envelope carries corpus_id /
--       position_base / engine / profile / coverage / skip_domain /
--       plain_excluded / truncated / ordering.
--       The previous body here emitted 1-based start and none of those keys.
--
--  Known, deliberate deltas still present in this file:
--   • fn_notarikon below is the ORIGINAL slow version. It is superseded in
--     replay order by 20260728_namelab_perf.sql, whose definition matches
--     live exactly (md5 78651228ae24a0062d407a9e5eacf8ce) — so an ordered
--     replay ends in the correct state. Left untouched on purpose.
--   • fn_els_for_name below already matches live byte-for-byte
--     (md5 b470633bbec779f079176c2c0983bcb3).
--   • This file keeps `set search_path=public` on fn_els_search. The live
--     function currently has proconfig=NULL and prosecdef=false — it lost
--     both `set search_path` and `security definer` in the 18.8 rewrite.
--     Restoring those on the live object is a separate decision; see work_log.
-- ============================================================

-- ============================================================
--  Name Research Protocol — Wave 2.1
--  Real ELS engine over the Torah + richer Notarikon (rashei+sofei).
--
--  Zuriel: "notarikon barely brings findings; get results out of ELS too."
--  Fix: ELS was lookup-only (few saved terms). Now a real deterministic
--  skip search over the Torah letter-stream — every name gets findings.
--  Notarikon adds sofei-tevot alongside rashei-tevot.
--
--  Still enters via the existing contract: engines only, no change to
--  fn_name_protocol / scheduler / Metatron.
-- ============================================================

-- ── Torah letter-stream (Genesis–Deuteronomy), finals→base, indexed ──
create table if not exists public.torah_stream (
  idx int primary key,
  ch  text not null,
  book_idx smallint
);
alter table public.torah_stream enable row level security;   -- server-only

-- ⛔ NEUTRALIZED 18.8.2026 — do NOT repopulate torah_stream from tanach_verses.
-- The original block here was:
--     truncate public.torah_stream;
--     insert into public.torah_stream(idx, ch)
--     select ord::int, ch from (
--       select string_agg(translate(regexp_replace(text,'[^א-ת]','','g'),
--                                   'ךםןףץ','כמנפצ'),''
--                         order by book_idx,chapter,verse) s
--       from tanach_verses where book_idx <= 4
--     ) letters, regexp_split_to_table(letters.s,'') with ordinality as t(ch, ord);
--
-- Why it was removed (verified empirically, read-only, 18.8.2026):
--   Re-running that expression against the live schema yields exactly
--     length 306,269 · md5 d4351c0237a8b5e98e7d1652ec599aa6
--   which is byte-identical to the contaminated pre-SWAP stream
--   (public.torah_stream_bak_20260818). tanach_verses.text carries masorah notes
--   inline as ordinary Hebrew words (e.g. Gen 4:13 «מנשא בספרי ספרד ואשכנז מנשוא»),
--   so it cannot be cleaned by any rule — it is not a valid corpus source.
--   Left in place, this block silently reverts the approved corpus reconciliation.
--
-- The canonical corpus source of truth is the file, not this table:
--   tools/els/data/tk-letters.txt
--     full stream   1,204,583 letters
--                   sha256 0b022e8eef6f9c16a20c3836c11e652e5cac45469016766f7f4fc670c9f84e1b
--     Torah prefix    304,805 letters
--                   sha256 9692eb34eca2f7a10f6e828d04b3dac50d5b0b688bf1d74d6936a6bd2fb92be4
--                   md5    0066c2431821863d258745e664d3883e
--     corpus_id     0b022e8eef6f9c16   (= sha256(full)[0:16], content-addressed)
--
-- public.torah_stream is a MATERIALIZATION of that Torah prefix, populated only by
-- the approved ELS Corpus Reconciliation procedure (staging load -> checksum verify
-- -> SWAP), executed and verified 18.8.2026 under Human-Gate. It is deliberately not
-- reproduced here: a migration must never be able to overwrite the canonical corpus.
--
-- On a fresh database this migration therefore leaves torah_stream EMPTY. That is
-- intentional and fail-safe: fn_els_search then returns zero hits (visibly nothing)
-- instead of hits computed over a wrong 306,269-letter stream (silently wrong data).
-- Populate it by running the reconciliation procedure — see work_log
-- 'ELS — נטרול מקור הרגרסיה של הקורפוס' (18.8.2026).

create index if not exists torah_stream_ch on public.torah_stream(ch, idx);

-- ── Deterministic ELS search (both directions, index range-join) ──
--  Perf: match first two letters via an index range-join (idx BETWEEN a±skip),
--  then verify the rest with pk point-lookups. ~0.8s worst case; allh MATERIALIZED
--  so it is computed once. Skip 1 = plain consecutive text; skip≥2 = hidden ELS.
create or replace function public.fn_els_search(p_term text, p_maxskip int default 40, p_maxhits int default 16)
returns jsonb language sql stable set search_path=public as $$
  with qq as (
    select t, length(t) ln, (select max(idx) from torah_stream) hi, substr(t,1,1) c1, substr(t,2,1) c2
    from (select translate(regexp_replace(coalesce(p_term,''),'[^א-ת]','','g'),'ךםןףץ','כמנפצ') t) z
  ),
  fpair as (
    select a.idx st, (b.idx-a.idx) skip
    from torah_stream a
    join torah_stream b on b.ch=(select c2 from qq) and b.idx between a.idx+1 and a.idx+p_maxskip
    where a.ch=(select c1 from qq) and (select ln from qq)>=2
  ),
  bpair as (
    select a.idx st, (a.idx-b.idx) skip
    from torah_stream a
    join torah_stream b on b.ch=(select c2 from qq) and b.idx between a.idx-p_maxskip and a.idx-1
    where a.ch=(select c1 from qq) and (select ln from qq)>=2
  ),
  allh as materialized (
    select skip, 1 dir, st from fpair
    where st+((select ln from qq)-1)*skip<=(select hi from qq)
      and not exists(select 1 from generate_series(3,(select ln from qq)) j
        where coalesce((select ch from torah_stream t3 where t3.idx=st+(j-1)*skip),'')<>substr((select t from qq),j,1))
    union all
    select skip, -1 dir, st from bpair
    where st-((select ln from qq)-1)*skip>=1
      and not exists(select 1 from generate_series(3,(select ln from qq)) j
        where coalesce((select ch from torah_stream t3 where t3.idx=st-(j-1)*skip),'')<>substr((select t from qq),j,1))
  )
  select jsonb_build_object(
    'term', (select t from qq),
    'letters', (select ln from qq),
    'plain', (select count(*) from allh where skip=1 and dir=1),
    'els_count', (select count(*) from allh where skip>=2),
    'min_skip', (select min(skip) from allh where skip>=2),
    'hits', coalesce((select jsonb_agg(jsonb_build_object('skip',skip,'dir',dir,'start',st-1) order by skip, st)
                      from (select * from allh where skip>=2 order by skip, st limit p_maxhits) z),'[]'::jsonb),
    'searched_maxskip', p_maxskip, 'scope','torah',
    'corpus_id', '0b022e8eef6f9c16',
    'position_base', 0,
    'engine', 'sql-scan',
    'profile', 'server-scan',
    'coverage', 'partial',
    'skip_domain', jsonb_build_object('min', 2, 'max', p_maxskip,
      'full_domain_max', case when (select ln from qq) > 1
                              then floor(((select hi from qq)-1)::numeric / ((select ln from qq)-1))::int
                              else null end),
    'plain_excluded', true,
    'truncated', (select count(*) from allh where skip>=2) > p_maxhits,
    'ordering', 'skip,start'
  );
$$;

insert into public.name_protocol_allowed_fns (fn_name, note)
values ('fn_els_search','crossings: real ELS search over Torah letter-stream')
on conflict (fn_name) do nothing;

-- ── ELS agent: saved records + live Torah search, tied to this name ──
create or replace function public.fn_els_for_name(p_word text)
returns jsonb language sql stable set search_path = public as $$
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

-- ── Notarikon: rashei-tevot + sofei-tevot (more findings, esp. long names) ──
create or replace function public.fn_notarikon(p_word text)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v_nikud text := '[' || chr(1425) || '-' || chr(1479) || ']';
  w text; rashei jsonb; sofei jsonb; c_r int; c_s int;
begin
  w := regexp_replace(coalesce(p_word,''), v_nikud, '', 'g');
  w := translate(regexp_replace(w, '[^א-ת]', '', 'g'), 'ךםןףץ', 'כמנפצ');
  if length(w) < 2 or length(w) > 6 then
    return jsonb_build_object('term', w, 'rashei_tevot','[]'::jsonb, 'sofei_tevot','[]'::jsonb, 'count',0,
      'note','נוטריקון נבדק דטרמיניסטית לשמות באורך 2–6 אותיות');
  end if;
  with v as (
    select book, chapter, verse, words,
      (select string_agg(translate(left(x,1),'ךםןףץ','כמנפצ'),'' order by o) from unnest(words) with ordinality u(x,o)) ini
    from tanach_verses where array_length(words,1) >= length(w)
  ),
  m as (select book,chapter,verse,words, position(w in ini) pos from v where ini like '%'||w||'%')
  select coalesce(jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,
            'words',(select jsonb_agg(words[i] order by i) from generate_series(pos,pos+length(w)-1) i),
            'kind','ראשי','score',100) order by book,chapter,verse), '[]'::jsonb),
         count(*)
  into rashei, c_r from (select * from m order by book,chapter,verse limit 12) z;
  with v as (
    select book, chapter, verse, words,
      (select string_agg(translate(right(x,1),'ךםןףץ','כמנפצ'),'' order by o) from unnest(words) with ordinality u(x,o)) fin
    from tanach_verses where array_length(words,1) >= length(w)
  ),
  m as (select book,chapter,verse,words, position(w in fin) pos from v where fin like '%'||w||'%')
  select coalesce(jsonb_agg(jsonb_build_object('ref',book||' '||chapter||':'||verse,
            'words',(select jsonb_agg(words[i] order by i) from generate_series(pos,pos+length(w)-1) i),
            'kind','סופי','score',90) order by book,chapter,verse), '[]'::jsonb),
         count(*)
  into sofei, c_s from (select * from m order by book,chapter,verse limit 12) z;
  return jsonb_build_object(
    'term', w, 'method','rashei_and_sofei_tevot',
    'rashei_tevot', rashei, 'sofei_tevot', sofei,
    'count', coalesce(c_r,0)+coalesce(c_s,0),
    'rashei_count', coalesce(c_r,0), 'sofei_count', coalesce(c_s,0),
    'note','ראשי-תיבות + סופי-תיבות של מילים רצופות בתנ״ך המאייתות את השם (עובדת-מנוע דטרמיניסטית; הפרשנות נפרדת)');
end $$;
