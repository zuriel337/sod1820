-- Public dossier "convergences" block as in live fn_number_dossier (top 8 methods by size, 12 phrases each) -- CURRENT (via unbounded fn_number_lookup) vs GROUPED v2
create or replace function dossier_conv_cur(p bigint) returns jsonb language sql stable as $$
  with rows as (select l.method,l.phrase,row_number() over(partition by l.method order by l.phrase,l.bid_id) rn from public.fn_number_lookup(p) l),
  grouped as (select method,count(*) group_size,coalesce(jsonb_agg(phrase order by phrase) filter(where rn<=12),'[]'::jsonb) phrases from rows group by method),
  top_groups as (select * from grouped order by group_size desc,method limit 8)
  select coalesce(jsonb_agg(jsonb_build_object('method',method,'group_size',group_size,'phrases',phrases) order by group_size desc,method),'[]'::jsonb) from top_groups $$;
create or replace function dossier_conv_v2(p bigint) returns jsonb language sql stable as $$
  with hits as (select b.method, b.phrase, b.bid_id from public.bidim b join public.gematria_words gw on gw.id=b.word_id where b.value=p and gw.is_verified and coalesce(gw.is_published,false)),
  rows as (select method,phrase,row_number() over(partition by method order by phrase,bid_id) rn from hits),
  grouped as (select method,count(*) group_size,coalesce(jsonb_agg(phrase order by phrase) filter(where rn<=12),'[]'::jsonb) phrases from rows group by method),
  top_groups as (select * from grouped order by group_size desc,method limit 8)
  select coalesce(jsonb_agg(jsonb_build_object('method',method,'group_size',group_size,'phrases',phrases) order by group_size desc,method),'[]'::jsonb) from top_groups $$;
