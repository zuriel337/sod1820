with filtered as (
 select ts,path,device,props,props->>'sample_id' as sample_id,(props->>'cls')::numeric as cls
 from public.events
 where surface='performance' and event_type='web_vital'
 and ts >= '2026-11-01T00:00:00Z' and ts < '2026-11-16T00:00:00Z'
 and jsonb_typeof(props->'cls')='number' and props->>'sample_id' is not null
 and not (ts >= '2026-11-15T01:00:00Z' and ts < '2026-11-15T04:30:00Z')
 and not (ts >= '2026-11-15T13:54:00Z' and ts < '2026-11-15T13:57:00Z')
), dedup as (
 select distinct on(sample_id) * from filtered
 order by sample_id,(props->>'phase'='final') desc,ts desc
), labeled as (
 select *,case when path='/' then 'home' when path like '/community/%' then 'community'
 when path like '/tag/%' then 'tag' when path like '/post/%' then 'post'
 when path not like '/%/%' then 'root-address-or-single-route' else 'other' end as family from dedup
), families as (
 select family,count(*) as samples,count(*) filter(where device is not null) as with_device,
 round((percentile_cont(.75) within group(order by cls))::numeric,4) as p75,
 count(*) filter(where cls>.25) as poor,count(*) filter(where props->>'phase'='final') as final_samples
 from labeled group by family
), sources as (
 select family,source,count(*) as samples,round(avg(cls),4) as mean_poor_cls
 from labeled cross join lateral jsonb_array_elements_text(coalesce(props->'cls_shift_sources','[]'::jsonb)) as x(source)
 where cls>.25 group by family,source order by count(*) desc limit 22
)
select jsonb_build_object('families',(select jsonb_agg(to_jsonb(f)) from families f),
 'poor_shift_sources',(select jsonb_agg(to_jsonb(s)) from sources s),
 'first',(select min(ts) from dedup),'last',(select max(ts) from dedup),
 'note','Deduplicated by sample_id; final preferred. Affected nodes, not causal proof. All-device; no build attribution.') as report;
