import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePostExperienceConnections } from '../src/lib/research/post2029ReadingProjection.js';

test('historical connection reopens the actual existing Post identity, preserving its meaning', async () => {
  const connection = { id: 'historical', label: 'הסיפור', href: '/old%20slug/', reason: 'הקשר קיים', truthState: 'interpretation' };
  const calls=[];
  const experience = { media: { original: true }, connections:[connection] };
  const result = await resolvePostExperienceConnections(experience, { readPost: async slug => { calls.push(slug); return { id:7,slug:'old%20slug' }; } });
  assert.deepEqual(calls,['old%20slug']);
  assert.deepEqual(result.connections[0], { ...connection, href:'/post/old%2520slug' });
  assert.equal(result.media,experience.media);
  assert.equal(experience.connections[0].href,'/old%20slug/');
});

test('current Post and public Topic destinations are resolved by their existing readers; Number remains Number', async () => {
  const connections=[{href:'/post/existing',id:'post'},{href:'/topic/topic-718',id:'topic'},{href:'/2029/number/1073',id:'number'}];
  const result=await resolvePostExperienceConnections({connections},{readPost:async()=>({id:5113,slug:'existing'}),readTopic:async()=>({slug:'topic-718'})});
  assert.deepEqual(result.connections.map(c=>c.href),connections.map(c=>c.href));
});

test('missing or denied sources cannot create an actionable route; failures are isolated per connection', async () => {
  const connections=[{href:'/missing',id:'missing'},{href:'/post/denied',id:'denied'},{href:'/topic/private',id:'topic'},{href:'/2029/number/710',id:'number'}];
  const result=await resolvePostExperienceConnections({connections},{readPost:async slug=>{if(slug==='denied')throw Error('denied');return null;},readTopic:async()=>null});
  assert.deepEqual(result.connections.map(c=>c.href),[null,null,null,'/2029/number/710']);
});

test('external URLs, unknown routes and malformed encodings never grant a destination', async () => {
  const hrefs=['https://example.test/post/x','//example.test/x','javascript:alert(1)','/world','/not/a/post','/post/%xx','/post/a?private=true'];
  const calls=[];
  const result=await resolvePostExperienceConnections({connections:hrefs.map(href=>({href}))},{readPost:async slug=>{calls.push(slug);return null;}});
  assert.ok(result.connections.every(c=>c.href===null));
  assert.deepEqual(calls,[]);
});

test('exact source locators survive only an admitted public Topic destination', async () => {
  const sourceLocator='#topic-source-media-post-5112-source-region-smit-machchhar';
  const experience={connections:[{href:`/topic/india-axis${sourceLocator}`}]};
  const admitted=await resolvePostExperienceConnections(experience,{readTopic:async()=>({slug:'india-axis'})});
  assert.equal(admitted.connections[0].href,`/topic/india-axis${sourceLocator}`);
  const denied=await resolvePostExperienceConnections(experience,{readTopic:async()=>null});
  assert.equal(denied.connections[0].href,null);
  const malformed=await resolvePostExperienceConnections({connections:[{href:'/topic/india-axis',sourceLocator:'#else?redirect=private'}]},{readTopic:async()=>({slug:'india-axis'})});
  assert.equal(malformed.connections[0].href,'/topic/india-axis');
});

// Load budget: the default connection reader must not download whole Post rows (content, tags...).
import { readFileSync } from "node:fs";
{
  const src = readFileSync(new URL("../src/lib/research/post2029ReadingProjection.js", import.meta.url), "utf8");
  const reader = src.slice(src.indexOf("export async function readPostIdentityBySlug"), src.indexOf("export async function resolvePostExperienceConnections"));
  assert.match(reader, /\.select\("id,slug"\)/, "connection existence check selects only id and slug");
  assert.doesNotMatch(reader, /select\(["']\*["']\)/);
  assert.match(src, /resolvePostExperienceConnections\(experience, \{ readPost = readPostIdentityBySlug/);
}
