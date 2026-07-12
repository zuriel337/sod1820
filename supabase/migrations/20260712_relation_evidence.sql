-- 🔁 לולאת-האימות (relation_evidence) — "המנועים בודקים תוך כדי תנועה" (ליבת המערכת, צוריאל).
-- עדות = זוג שבו יחס מהמודל הפרשני מתקיים בין שני צדדים משמעותיים. נצבר גוף-ראיות פר-יחס.
-- משמעת: candidate (המנוע מצא) → confirmed (צוריאל) / rejected. עדויות-יסוד: חכמה↔בינה (מסתתר 67) · גאולה↔דן (45↔54).
create table if not exists public.relation_evidence (
  id uuid primary key default gen_random_uuid(),
  relation_type text not null,
  method text not null,
  a_phrase text not null,
  b_phrase text not null,
  value int,
  note text,
  source text not null default 'engine_scan',
  engine_verified boolean not null default false,
  status text not null default 'candidate' check (status in ('candidate','confirmed','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(method, a_phrase, b_phrase)
);
alter table public.relation_evidence enable row level security;
drop policy if exists relation_evidence_public_read on public.relation_evidence;
create policy relation_evidence_public_read on public.relation_evidence for select using (true);

create or replace function public.relation_evidence_stats()
returns table(relation_type text, confirmed int, candidates int)
language sql stable security definer set search_path = public as $$
  select relation_type,
         count(*) filter (where status='confirmed')::int,
         count(*) filter (where status='candidate')::int
  from relation_evidence group by relation_type order by 2 desc, 3 desc;
$$;
grant execute on function public.relation_evidence_stats() to anon, authenticated, service_role;

create or replace function public.set_relation_evidence(p_method text, p_a text, p_b text, p_value int, p_status text, p_note text default null)
returns public.relation_evidence language plpgsql security definer set search_path = public as $$
declare rel text; res public.relation_evidence;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'admin only';
  end if;
  if p_status not in ('candidate','confirmed','rejected') then raise exception 'bad status'; end if;
  select relation_type into rel from method_semantics where method = p_method limit 1;
  insert into relation_evidence (relation_type, method, a_phrase, b_phrase, value, note, source, status, updated_at)
  values (coalesce(rel,'unknown'), p_method, p_a, p_b, p_value, p_note, 'zuriel', p_status, now())
  on conflict (method, a_phrase, b_phrase) do update
    set status = excluded.status, note = coalesce(excluded.note, relation_evidence.note), value = excluded.value, updated_at = now()
  returning * into res;
  return res;
end;
$$;
revoke all on function public.set_relation_evidence(text, text, text, int, text, text) from public, anon;
grant execute on function public.set_relation_evidence(text, text, text, int, text, text) to authenticated, service_role;

-- מגלה מועמדי-עדות (קריאה בלבד): שני הצדדים בעלי-משקל (lead/world/graph). המנוע מגלה, החוקר מאשר.
create or replace function public.discover_relation_candidates(p_method text default null, p_limit int default 40)
returns table(method text, relation_type text, a_phrase text, b_phrase text, value int, already_logged boolean)
language sql stable security definer set search_path = public as $$
  with weighty as (
    select distinct phrase from gematria_words
    where lead_rank is not null or world is not null or node_id is not null
  ),
  hits as (
    select a.method, a.phrase a_phrase, b.phrase b_phrase, a.value
    from bidim a
    join bidim b on b.value = a.value and b.method = 'רגיל' and b.phrase <> a.phrase
    where a.method in ('אתבש','אלבם','מסתתר','מילוי','קדמי')
      and (p_method is null or a.method = p_method)
      and a.value between 10 and 100000
      and a.phrase in (select phrase from weighty)
      and b.phrase in (select phrase from weighty)
      and a.phrase !~ '[A-Za-z0-9]' and b.phrase !~ '[A-Za-z0-9]'
  )
  select h.method, coalesce(ms.relation_type,'unknown'), h.a_phrase, h.b_phrase, h.value,
         exists(select 1 from relation_evidence re where re.method=h.method and re.a_phrase=h.a_phrase and re.b_phrase=h.b_phrase)
  from hits h
  left join method_semantics ms on ms.method = h.method
  order by h.method, char_length(h.a_phrase) + char_length(h.b_phrase), h.value
  limit p_limit;
$$;
grant execute on function public.discover_relation_candidates(text, int) to anon, authenticated, service_role;
