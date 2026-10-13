import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Exercise the actual World reader without private credentials or outbound I/O.
// Only unrelated backend/import boundaries are stubbed; source admission,
// proven revision, source sequence and World composition run unmodified.
const posts = [
  {id:5107,slug:'sharshar-elections-redemption-hints-draft',title:'פוסט הבחירות',source:'ai',home_hidden:false,tags:[],date:'2026-09-30T08:55:06.593419Z',modified:'2026-10-12T13:52:58.270789Z'},
  {id:5113,slug:'bennett-melach-631-78',title:'טיוטה',source:'ai',home_hidden:false,tags:['טיוטה'],date:'2026-09-30T23:57:13.947791Z',modified:'2026-10-12T14:06:54.127591Z'},
];
const calls = [];
globalThis.__sourceChainBackend = { from(table) {
  calls.push(table); assert.equal(table,'posts','public path must not read private revision/research/inbox tables');
  const query = {select(){return query;},eq(){return query;},not(){return query;},in(){return query;},order(){return query;},limit(){return Promise.resolve({data:posts,error:null});}};
  return query;
} };
const modules = new Map([
  ['topicConvergence.js','export async function fetchTopicCardList(){return {rows:[]}}'],
  ['canonicalPresentation.js','export function canonicalResearchPublicLabel(v){return v}'],
  ['format.js','export function stripHtml(v){return String(v||" ").replace(/<[^>]*>/g," ").trim()}'],
  ['sourceBundleProjection.js','export function researchSourceOccurrenceKey(v){return String(v).split("#")[0]}'],
  ['worldGroupSource.js','export const GROUP_ARRIVALS_CONNECTED={state:"connected"}; export async function fetchGroupSourceArrivals(){return []}'],
  ['supabase.js','export const supabase=globalThis.__sourceChainBackend'],
]);
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  const basename=specifier.split('/').at(-1);
  if(modules.has(basename) && context.parentURL) return {url:new URL(specifier,context.parentURL).href,shortCircuit:true};
  return nextResolve(specifier,context);
}, load(url, context, nextLoad) {
  const basename = new URL(url).pathname.split('/').at(-1);
  if(modules.has(basename)) return {format:'module',source:modules.get(basename),shortCircuit:true};
  return nextLoad(url,context);
} });
const reader = await import('../src/lib/research/worldDiscoveryStream.js');
test('actual public World reader composes the same source-sequence bundle with one posts query and no private I/O', async()=>{
  const result=await reader.fetchWorldDiscoveryStream({includeResearch:false});
  assert.deepEqual(calls,['posts']);
  assert.deepEqual(result.items.map(row=>row.id),['post:5107']);
  assert.deepEqual(result.sourceSequenceBundle.events.map(row=>row.id),['posts:5107']);
  assert.equal(result.sourceSequenceBundle.updates.length,3);
  assert.ok(!JSON.stringify(result).includes('5113')); assert.ok(!JSON.stringify(result).includes('טיוטה'));
  assert.equal(result.items[0].sourceUpdate.revision,206);
  assert.ok(result.items[0].href.includes('#sharshar-shoes-66'));
});
test.after(()=>{hooks.deregister();delete globalThis.__sourceChainBackend;});
