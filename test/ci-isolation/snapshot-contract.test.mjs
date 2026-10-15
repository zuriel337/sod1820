import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import contract from '../../scripts/ci-isolation/snapshot-contract.cjs';
const {decodeSnapshot,parseKey,coverageReport,requireCoverage,verifyManifestEntry,imageWidth}=contract;
// Deliberately small synthetic unit response; never a full gate input.
const row={status:200,type:'application/json',body:Buffer.from(JSON.stringify([{id:'unit-source',title:'מקור בדיקה'}])).toString('base64')};
const small={'GET https://fixture.invalid/read ':row};
const bytes=zlib.gzipSync(JSON.stringify(small));
const digest=crypto.createHash('sha256').update(bytes).digest('hex');
test('structural decoding preserves a representative response byte for byte',()=>assert.deepEqual(decodeSnapshot(bytes),small));
for(const kind of ['performance','navigation','browser'])test(`${kind}: structurally valid but semantically incomplete input fails closed`,()=>{
  const decoded=decodeSnapshot(bytes),report=coverageReport(decoded,kind);
  assert.equal(report.passed,false);assert.ok(report.checks.some(c=>!c.passed));
  assert.throws(()=>requireCoverage(decoded,kind),/incomplete semantic snapshot coverage/);
});
test('empty and corrupted gzip/base64 input is rejected',()=>{
  assert.throws(()=>decodeSnapshot(zlib.gzipSync('{}')),/Empty snapshot/);
  assert.throws(()=>decodeSnapshot(Buffer.from('not gzip')));
  for(const body of ['a','not-base64!','YR=='])assert.throws(()=>decodeSnapshot(zlib.gzipSync(JSON.stringify({'GET https://fixture.invalid/read ':{...row,body}}))),/Noncanonical/);
});
test('hash mismatch is rejected before source metadata is trusted',()=>assert.throws(()=>verifyManifestEntry({sha256:'0'.repeat(64)},bytes),/digest mismatch/));
test('matching hash alone cannot approve unreviewed or unprovenanced bodies',()=>{
  const entry={sha256:digest};assert.throws(()=>verifyManifestEntry(entry,bytes),/Source, date/);
  entry.source={reference:'synthetic unit only',date:'2026-10-15',sha256:digest,access:'public-reviewed'};
  assert.throws(()=>verifyManifestEntry(entry,bytes),/content review/);
  entry.privacyReview={reference:'unit review, not production corpus',decision:'approved-for-this-location'};
  assert.throws(()=>verifyManifestEntry(entry,bytes),/Coverage evidence/);
  entry.coverage={reference:'unit coverage only'};verifyManifestEntry(entry,bytes);
});
test('count/range/profile signatures remain distinct request identities',()=>{
  const url='GET https://fixture.invalid/rest/v1/topic_cards_public?offset=2&limit=23 ';
  const a=parseKey(url+' '+JSON.stringify({prefer:'count=exact',range:'2-24','accept-profile':'public'}));
  const b=parseKey(url+' '+JSON.stringify({prefer:'',range:'','accept-profile':''}));
  assert.notDeepEqual(a.headers,b.headers);assert.equal(a.headers.range,'2-24');
  assert.throws(()=>parseKey(url+' '+JSON.stringify({prefer:'count=exact'})),/all three fields/);
});
test('navigation cannot accept headerless input and browser cannot silently discard headers',()=>{
  assert.equal(coverageReport(small,'navigation').checks[0].passed,false);
  const withHeaders={'GET https://fixture.invalid/read  {"prefer":"","range":"","accept-profile":""}':row};
  assert.equal(coverageReport(withHeaders,'navigation').checks[0].passed,true);
  assert.equal(coverageReport(withHeaders,'browser').checks[0].passed,false);
});
test('UTF8-corrupted image text cannot certify native JPEG width',()=>{
  assert.equal(imageWidth(Buffer.from('�PNG corrupted captured image')),null);
  assert.equal(imageWidth(Buffer.from([0xff,0xd8,0xff,0xc0,0,17,8,3,0,3,0,3,1,0x11,0,2,0x11,0,3,0x11,0,0xff,0xd9])),768);
});
test('catalog preflight preserves 2/8/24 ordering, exact totals and full continuation rows',()=>{
  const data={},items=Array.from({length:25},(_,i)=>({id:`unit-${i}`,slug:`unit-topic-${i}`,title:`נושא בדיקה ${i}`,numbers:[i+100]}));
  const add=(offset,limit,prefer)=>{
    const key=`GET https://fixture.invalid/rest/v1/topic_cards_public?order=meter_score.desc&offset=${offset}&limit=${limit}  ${JSON.stringify({prefer,range:'','accept-profile':''})}`;
    data[key]={...row,range:`${offset}-${offset+limit-1}/205`,body:Buffer.from(JSON.stringify(items.slice(offset,offset+limit))).toString('base64')};return key;
  };
  add(0,3,'');add(0,9,'');add(0,25,'count=exact');const continuation=add(2,23,'count=exact');
  const catalog=()=>coverageReport(data,'navigation').checks.find(c=>c.name.startsWith('catalog 2/8/24'));
  assert.equal(catalog().passed,true,'Only the catalog sub-contract is satisfied, not the full corpus');
  const original=data[continuation].body;
  data[continuation].body=Buffer.from(JSON.stringify([...items.slice(3),items[0]])).toString('base64');
  assert.equal(catalog().passed,false,'Nonempty, structurally valid but reordered content must fail');
  data[continuation].body=original;data[continuation].range='2-24/*';
  assert.equal(catalog().passed,false,'Unknown count cannot certify exact-count continuation');
  data[continuation].range='2-24/206';assert.equal(catalog().passed,false,'Conflicting exact totals must fail');
});
