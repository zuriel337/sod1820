-- BLOCKER-EG-1 closure, correction: convergence_meter must stay genuinely STABLE.
-- The first cut (20260829172431) used a temp table, which is a write inside a STABLE
-- function and would also collide with itself when the function is invoked more than
-- once in a single statement. Replaced with ONE CTE query — same governance semantics,
-- no side effects, safe under repeated invocation.
create or replace function public.convergence_meter(p_n integer)
returns jsonb language plpgsql stable set search_path to 'public' as $$
declare
  n_ent int; n_methods int; n_gold int; n_silver int; top_cluster int; n_edges int; n_news int; n_images int;
  has_card boolean; is_anchor boolean; fired int; layers jsonb; ids uuid[];
  ent_list jsonb; card_list jsonb; anchor_name text; news_list jsonb; tier_detail text;
  gov_methods text[]; ind_methods text[]; hist_methods text[]; n_displayed_ent int;
  anchors jsonb := '{"1820":"שם ה׳ בתורה","776":"ביאת המשיח / שנת יהוה","358":"משיח","424":"משיח בן דוד","604":"משיח בן דוד (מסתתר)","26":"הוי״ה","86":"אלהים","314":"שד-י / מטטרון","543":"אהיה אשר אהיה","91":"אמן","13":"אחד / אהבה","1237":"התגלות (מסתתר) · קורונה · תשובה · דוד","541":"ישראל","137":"קבלה","248":"אברהם / רמ״ח","611":"תורה","1202":"חרבות ברזל · כב בתשרי תשפד · התגלות משיח · מצור הורמוז","318":"אליעזר","52":"בן / אליהו","630":"אליהו (אתבש)","878":"דבר מתוך דבר / משיח (מילוי)","216":"יראה / סובב עולם","300":"רוח אלהים","333":"שורש 333 — רוח אלהים / דבר מתוך דבר","1152":"שבירת הכלים (אלב״ם) → תיקון"}'::jsonb;
begin
  -- STEP 1 PUBLIC/DISCOVERABLE  ->  STEP 2 GOVERNANCE ELIGIBILITY, in one pass.
  -- The pre-existing per-phrase גדול<->base equivalence dedup is preserved verbatim
  -- (a conditional_equivalence rule — a different dependency type from composite
  -- entailment; folding it into the canonical mechanism needs phrase-level
  -- conditions and is deliberately left to a separate pass).
  with base as (
    select n.id as nid, n.label as label, n.metadata->>'world' as world,
           n.metadata->>'tier' as tier, b.method as method
    from public.nodes n
    join public.bidim b on b.phrase = n.label
    where n.type = 'entity' and n.is_active and b.value = p_n
      and not (b.method in ('גדול','משולש גדול','ריבוע גדול','הכפלה גדולה') and exists (
        select 1 from public.bidim r where r.phrase = n.label and r.value = p_n and r.method =
          case b.method when 'גדול' then 'רגיל' when 'משולש גדול' then 'קדמי'
                        when 'ריבוע גדול' then 'ריבוע' when 'הכפלה גדולה' then 'הכפלה' end))
  ),
  tagged as (select b2.*, public.fn_method_evidence_class(b2.method) as ec from base b2),
  gov as (select * from tagged where ec = 'governed')
  select
    (select count(distinct t.label) from tagged t),
    (select count(distinct g.label) from gov g),
    (select count(*) from gov g where g.tier = 'gold'),
    (select count(*) from gov g where g.tier = 'silver'),
    (select count(distinct g.label) from gov g where g.world in ('אקטואליה ואומות','דמויות בנות-זמננו','אירועי הזמן')),
    (select coalesce(max(c), 0) from (select count(distinct g.label) c from gov g group by g.world) s),
    (select coalesce(array_agg(distinct g.method), '{}'::text[]) from gov g),
    (select coalesce(array_agg(distinct t.method), '{}'::text[]) from tagged t where t.ec <> 'governed'),
    (select coalesce(array_agg(distinct g.nid), '{}'::uuid[]) from gov g),
    (select coalesce(jsonb_agg(distinct jsonb_build_object(
        'label', t.label, 'world', t.world, 'method', t.method, 'tier', t.tier,
        'evidence_class', t.ec, 'governed', t.ec = 'governed')), '[]'::jsonb) from tagged t),
    (select coalesce(jsonb_agg(distinct g.label), '[]'::jsonb) from gov g
      where g.world in ('אקטואליה ואומות','דמויות בנות-זמננו','אירועי הזמן'))
  into n_displayed_ent, n_ent, n_gold, n_silver, n_news, top_cluster,
       gov_methods, hist_methods, ids, ent_list, news_list;

  -- STEP 3 INDEPENDENCE/DEPENDENCY -> STEP 4 SCORE.
  ind_methods := public.fn_independent_method_set(gov_methods);
  n_methods := coalesce(cardinality(ind_methods), 0);

  select count(*) into n_edges from public.edges e
   where e.from_node = any(coalesce(ids, '{}'::uuid[])) and e.to_node = any(coalesce(ids, '{}'::uuid[]));
  select count(*) into n_images from public.gallery_images where primary_value = p_n;
  select exists(select 1 from public.topic_cards where status = 'approved' and p_n = any(numbers)) into has_card;
  is_anchor := anchors ? p_n::text; anchor_name := anchors->>p_n::text;

  select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'title', title, 'quality', quality)), '[]'::jsonb)
    into card_list from public.topic_cards where status = 'approved' and p_n = any(numbers);

  tier_detail := nullif(trim(both ' ·' from
    case when n_gold > 0 then n_gold||' זהב 👑 ' else '' end ||
    case when n_silver > 0 then n_silver||' כסף 🥈' else '' end), '');

  layers := jsonb_build_array(
    jsonb_build_object('icon','🔢','name','התכנסות מילים','ok', n_ent>=2,       'detail', n_ent||' ישויות', 'evidence', ent_list),
    jsonb_build_object('icon','📜','name','רב-שיטתי',      'ok', n_methods>=3,   'detail', n_methods||' שיטות'),
    jsonb_build_object('icon','🌳','name','אשכול אותו-עולם','ok', top_cluster>=2,'detail', top_cluster||' באותו עולם'),
    jsonb_build_object('icon','👑','name','ישות מסומנת',   'ok', (n_gold+n_silver)>=1, 'detail', coalesce(tier_detail,'—')),
    jsonb_build_object('icon','🖼','name','ראשי בגלריות',   'ok', n_images>=3,    'detail', n_images||' תמונות (ראשי)'),
    jsonb_build_object('icon','🕸️','name','קשרי גרף',       'ok', n_edges>=1,    'detail', n_edges||' קשרים'),
    jsonb_build_object('icon','🌍','name','אקטואליה (חדשות)','ok', n_news>=1,     'detail', n_news||' מהחדשות', 'evidence', news_list),
    jsonb_build_object('icon','🧩','name','כרטיס התכנסות',  'ok', has_card,      'detail', case when has_card then 'קיים' else '—' end, 'evidence', card_list),
    jsonb_build_object('icon','✨','name','עוגן קדוש',       'ok', is_anchor,     'detail', coalesce(anchor_name,'—'))
  );
  select count(*) into fired from jsonb_array_elements(layers) l where (l->>'ok')::boolean;

  return jsonb_build_object(
    'number', p_n, 'score', round(fired::numeric/9*100), 'layers', layers,
    'cards', card_list, 'entities', ent_list, 'anchor', anchor_name,
    'evidence_governance', jsonb_build_object(
      'contract', 'scannable AND active AND executable AND engine_verified (fn_method_is_governed_evidence)',
      'entities_displayed', n_displayed_ent,
      'entities_scored', n_ent,
      'methods_governed', coalesce(gov_methods, '{}'::text[]),
      'methods_scored_after_dependency', coalesce(ind_methods, '{}'::text[]),
      'methods_historical_displayed_not_scored', coalesce(hist_methods, '{}'::text[]),
      'note', 'HG-E4 Rank, Don''t Hide: historical/non-governed method results remain displayed but never increase the canonical convergence score.')
  );
end;
$$;
