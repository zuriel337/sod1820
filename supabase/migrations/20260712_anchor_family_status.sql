-- 🧩 Anchor Dashboard — קידום-סטטוס סדרתי + review_notes + ספירת journey_trace.
alter table public.anchor_families add column if not exists review_notes text;

-- קידום סדרתי בלבד (discovered→reviewed→approved_anchor→featured). מנהל בלבד. שומר "איך הגיע לשם".
create or replace function public.set_anchor_family_status(p_root int, p_status text, p_notes text default null)
returns public.anchor_families language plpgsql security definer set search_path = public as $$
declare fam jsonb; cur text; res public.anchor_families;
  ord jsonb := '{"discovered":1,"reviewed":2,"approved_anchor":3,"featured":4}'::jsonb;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'admin only';
  end if;
  if p_status not in ('discovered','reviewed','approved_anchor','featured','rejected') then
    raise exception 'bad status %', p_status;
  end if;
  cur := coalesce((select status from public.anchor_families where root = p_root), 'discovered');
  if not (p_status = cur or p_status = 'rejected'
          or (ord ? p_status and ord ? cur and (ord->>p_status)::int = (ord->>cur)::int + 1)) then
    raise exception 'illegal transition % -> % (סדרתי בלבד, בלי דילוג)', cur, p_status;
  end if;
  fam := map_anchor_family(p_root);
  insert into public.anchor_families (root, primary_value, mirror_values, zero_shift_values, hebrew_terms, bridges, evidence_count, methods, status, review_notes, updated_at)
  values (p_root, (fam->>'primary_value')::int,
    array(select jsonb_array_elements_text(fam->'mirror_values'))::int[],
    array(select jsonb_array_elements_text(fam->'zero_shift_values'))::int[],
    array(select jsonb_array_elements_text(fam->'hebrew_terms')),
    coalesce(fam->'bridges','[]'::jsonb), (fam->>'evidence_count')::int,
    array(select jsonb_array_elements_text(fam->'methods')), p_status, p_notes, now())
  on conflict (root) do update set status = excluded.status,
    primary_value = excluded.primary_value, mirror_values = excluded.mirror_values,
    zero_shift_values = excluded.zero_shift_values, hebrew_terms = excluded.hebrew_terms,
    bridges = excluded.bridges, evidence_count = excluded.evidence_count, methods = excluded.methods,
    review_notes = coalesce(p_notes, public.anchor_families.review_notes), updated_at = now()
  returning * into res;
  return res;
end;
$$;
revoke all on function public.set_anchor_family_status(int, text, text) from public, anon;
grant execute on function public.set_anchor_family_status(int, text, text) to authenticated, service_role;

-- discover + n_traces (visitor_events section='journey_trace', מאונדקס). ראה 20260712_anchor_families.sql לבסיס.
drop function if exists public.discover_anchor_families(int, int);
create or replace function public.discover_anchor_families(p_min_words int default 8, p_limit int default 60)
returns table(root int, mirror int, n_words int, n_methods int, cross_method boolean,
              is_existing_anchor boolean, is_family boolean, family_status text, n_traces int, sample text[])
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
  ),
  traces as (
    select root, sum(c)::int c from (
      select zero_root(bb.value::int) root, count(*) c from visitor_events ve join bidim bb on bb.phrase=ve.slug
        where ve.section='journey_trace' and bb.value between 10 and 1000000 group by 1
      union all
      select zero_root(ve.slug::int) root, count(*) c from visitor_events ve
        where ve.section='journey_trace' and ve.slug ~ '^[0-9]+$' group by 1
    ) x group by root
  )
  select h.root, digit_reverse(h.root), count(distinct h.phrase)::int, count(distinct h.method)::int,
         (count(distinct h.method)>1), (h.root in (select rv from anchors)),
         exists(select 1 from anchor_families f where f.root=h.root),
         (select status from anchor_families f where f.root=h.root),
         coalesce((select c from traces t where t.root=h.root),0),
         (array_agg(distinct h.phrase))[1:6]
  from hits h where h.root>=10 group by h.root
  having count(distinct h.phrase) >= p_min_words
  order by count(distinct h.phrase) desc, count(distinct h.method) desc limit p_limit;
$$;
revoke all on function public.discover_anchor_families(int, int) from public;
grant execute on function public.discover_anchor_families(int, int) to anon, authenticated, service_role;
