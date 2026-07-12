-- 🌳 שכבת-הידע הציבורית של האטלס (עקרונות צוריאל: שקיפות · קריטריונים · הדרגתיות · "נבדק" לא "הוכח")
alter table public.relation_evidence add column if not exists rejection_reason text;

create or replace function public.atlas_findings(p_relation text default null, p_limit int default 80)
returns table(relation_type text, method text, a_phrase text, b_phrase text, value int, note text,
              engine_verified boolean, updated_at timestamptz,
              multi_method boolean, family_supported boolean, bridge_supported boolean)
language sql stable security definer set search_path = public as $$
  select re.relation_type, re.method, re.a_phrase, re.b_phrase, re.value, re.note,
         re.engine_verified, re.updated_at,
         (select count(*) > 1 from relation_evidence x where x.status='confirmed'
            and ((x.a_phrase=re.a_phrase and x.b_phrase=re.b_phrase) or (x.a_phrase=re.b_phrase and x.b_phrase=re.a_phrase))),
         exists(select 1 from anchor_families f where f.status in ('approved_anchor','featured')
            and f.root = zero_root(coalesce(re.value,0))),
         exists(select 1 from word_aliases wa join gematria_words g on g.id=wa.word_id
            where wa.verified and g.phrase in (re.a_phrase, re.b_phrase))
  from relation_evidence re
  where re.status = 'confirmed' and (p_relation is null or re.relation_type = p_relation)
  order by re.updated_at desc limit p_limit;
$$;
grant execute on function public.atlas_findings(text, int) to anon, authenticated, service_role;

create or replace function public.one_tree_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'axis_words', (select count(distinct phrase) from gematria_words
       where lead_rank is not null or (coalesce(array_length(source_wp_ids,1),0)=0 and coalesce(source,'') !~ '^(excel_import|promoted:|auto:|wp_id:)')),
    'anchors', (select count(*) from number_anchors),
    'families_approved', (select count(*) from anchor_families where status in ('approved_anchor','featured')),
    'findings_total', (select count(*) from relation_evidence where status='confirmed'),
    'findings_week', (select count(*) from relation_evidence where status='confirmed' and updated_at > now() - interval '7 days'),
    'bridges', (select count(*) from word_aliases where verified and coalesce(lang,'he') not in ('he','heb','עברית')),
    'by_relation', (select coalesce(jsonb_object_agg(relation_type, c), '{}'::jsonb) from
       (select relation_type, count(*) c from relation_evidence where status='confirmed' group by relation_type) t)
  );
$$;
grant execute on function public.one_tree_stats() to anon, authenticated, service_role;

-- set_relation_evidence מורחב עם p_reason (סיבת-דחייה — ללמוד מהדחויים)
drop function if exists public.set_relation_evidence(text, text, text, int, text, text);
create or replace function public.set_relation_evidence(p_method text, p_a text, p_b text, p_value int, p_status text, p_note text default null, p_reason text default null)
returns public.relation_evidence language plpgsql security definer set search_path = public as $$
declare rel text; res public.relation_evidence;
begin
  if not exists (select 1 from public.users where id = auth.uid() and role = 'admin') then
    raise exception 'admin only';
  end if;
  if p_status not in ('candidate','confirmed','rejected') then raise exception 'bad status'; end if;
  select relation_type into rel from method_semantics where method = p_method limit 1;
  insert into relation_evidence (relation_type, method, a_phrase, b_phrase, value, note, source, status, rejection_reason, updated_at)
  values (coalesce(rel,'unknown'), p_method, p_a, p_b, p_value, p_note, 'zuriel', p_status, p_reason, now())
  on conflict (method, a_phrase, b_phrase) do update
    set status = excluded.status, note = coalesce(excluded.note, relation_evidence.note),
        value = excluded.value, rejection_reason = coalesce(excluded.rejection_reason, relation_evidence.rejection_reason), updated_at = now()
  returning * into res;
  return res;
end;
$$;
revoke all on function public.set_relation_evidence(text, text, text, int, text, text, text) from public, anon;
grant execute on function public.set_relation_evidence(text, text, text, int, text, text, text) to authenticated, service_role;
