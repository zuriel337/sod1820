import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getHealthObservations,applyStorageSnapshot,freshState,parseState,simulate} from '../src/lib/admin/resourceSimulator.js';
const at='2026-10-04T01:30:00.000Z';
test('canonical health projection retains null and separates observed, historical and billed provider axes',()=>{
 const missing=getHealthObservations(null);assert.equal(missing.storage.valueGB,null);assert.equal(missing.providerCached.valueGB,null);assert.equal(missing.database.valueGB,null);
 const observed=getHealthObservations({generated_at:at,media:{storage:{total_bytes:'1200000000'}},db:{database_bytes:500000000},usage:{storage_egress_observed_24h_bytes:9000000000,storage_egress_observed_basis:'OBSERVED_STORAGE_LOGS',supabase_cached_egress:null,supabase_cached_egress_basis:'UNKNOWN',supabase_egress_historical_exact:{cached_egress_gb:340,cycle_start:'2026-09-01',cycle_end:'2026-09-30'}}});
 assert.equal(observed.storage.valueGB,1.2);assert.equal(observed.database.valueGB,.5);assert.equal(observed.egress24h.valueGB,9);
 assert.equal(observed.providerCached.valueGB,null);assert.equal(observed.historicalCached.valueGB,340);assert.equal(observed.historicalCached.basis,'EXACT_BILLING_HISTORY');
 assert.equal(getHealthObservations({media:{storage:{total_bytes:0}}},at).storage.valueGB,0);
 assert.equal(getHealthObservations({media:{storage:{total_bytes:[]}}},at).storage.valueGB,null);
});
test('stock is imported only by explicit action as a monthly planning assumption with source and timestamp',()=>{
 const s=freshState(),facts=getHealthObservations({generated_at:at,media:{storage:{total_bytes:50000000000}},db:{database_bytes:2e9},usage:{storage_egress_observed_24h_bytes:5e9,supabase_cached_egress:7e9,supabase_cached_egress_basis:'EXACT'}},at);
 assert.equal(s.values.baseStorage,0);const seeded=applyStorageSnapshot(s,facts);
 assert.equal(seeded.values.baseStorage,50);assert.equal(seeded.provenance.baseStorage,'snapshot_assumption');assert.equal(seeded.assumptionSources.baseStorage.observedAt,at);
 assert.equal(seeded.values.baseData,0);assert.equal(seeded.values.baseUncached,0);assert.equal(seeded.values.baseCached,0);
 assert.equal(s.values.baseStorage,0);assert.deepEqual(parseState(JSON.parse(JSON.stringify(seeded))),seeded);
 assert.throws(()=>applyStorageSnapshot(s,getHealthObservations(null)));
});
test('legacy private lab JSON imports unchanged; snapshot provenance cannot be fabricated without source',()=>{
 const old=freshState();old.values.uploads=22;old.provenance.uploads='user';assert.deepEqual(parseState(JSON.parse(JSON.stringify(old))),old);
 old.provenance.baseStorage='snapshot_assumption';assert.equal(parseState(old).provenance.baseStorage,'example');
 const seeded=applyStorageSnapshot(freshState(),getHealthObservations({generated_at:at,media:{storage:{total_bytes:3e9}}},at));
 seeded.saved.push({name:'snapshot',values:{...seeded.values},provenance:{...seeded.provenance},assumptionSources:structuredClone(seeded.assumptionSources)});
 assert.deepEqual(parseState(JSON.parse(JSON.stringify(seeded))),seeded);assert.equal(simulate(seeded.values).v.baseStorage,3);
});
test('simulation stays behind the existing admin route and reuses parent health; no new network/store owner',()=>{
 const page=fs.readFileSync(new URL('../src/pages/ControlPlane2029Page.jsx',import.meta.url),'utf8');
 const component=fs.readFileSync(new URL('../src/components/experience2029/ResourceSimulator2029.jsx',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../src/components/experience2029/resourceSimulator2029.css',import.meta.url),'utf8');
 assert.match(page,/if \(!isAdmin\) return <Navigate replace to="\/2029" \/>/);
 assert.match(page,/lazy\(\(\) => import\("\.\.\/components\/experience2029\/ResourceSimulator2029\.jsx"\)\)/);
 assert.match(page,/health=\{state.health\} healthReadAt=\{state.readAt\}/);
 assert.match(page,/role="tablist"/);assert.match(page,/role="tabpanel"/);
 assert.doesNotMatch(component,/\bfetch\s*\(|\.rpc\(|\.from\(|createClient|service_role|new WebSocket/);
 assert.doesNotMatch(css,/#(?:[0-9a-f]{3}){1,2}\b/i);assert.match(css,/var\(--s29-/);
});
