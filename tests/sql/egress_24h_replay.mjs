// Replay only sanitized aggregate cache rows. Emits SQL for the isolated fixture runner.
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('./egress_24h_replay.json',import.meta.url),'utf8'));
const quote=v=>"'"+String(v).replaceAll("'","''")+"'";
console.log('truncate public.analytics_cache;');
for(const r of fixture.rows) console.log(`insert into public.analytics_cache(cache_key,computed_at,producer,producer_version,payload) values (${[r.cache_key,r.computed_at,r.producer,r.producer_version,JSON.stringify(r.payload)].map(quote).join(',')});`);
console.log(`do $$ declare r jsonb:=public.fn_storage_egress_observed_24h(${quote(fixture.window_end)}); begin
  if (r#>>'{storage_egress_observed_24h_coverage,observed_hours}')::int <> ${fixture.expected_observed_hours}
    or (r->>'storage_egress_observed_24h_observed_bytes')::numeric <> ${fixture.expected_observed_bytes}
    or r->'storage_egress_observed_24h_bytes' <> 'null'::jsonb
    or r#>>'{storage_egress_observed_24h_coverage,status}' <> 'PARTIAL' then
    raise exception 'live aggregate replay differs: %',r;
  end if;
  raise notice 'PASS: live aggregate replay, 20/24 PARTIAL and 675604227 observed bytes';
end $$;`);
