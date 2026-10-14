// Public captured bodies stay private; emit counts/fingerprints only, not source rows.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const fixtures=JSON.parse(zlib.gunzipSync(fs.readFileSync(process.argv[2])));
function rows(offset,limit,prefer){
 const found=[];
 for(const[key,row]of Object.entries(fixtures)){
  const match=key.match(/^GET (.*?)  (\{.*\})$/);if(!match)continue;
  const url=new URL(match[1]),headers=JSON.parse(match[2]);
  if(url.pathname!=='/rest/v1/topic_cards_public'||!url.searchParams.get('order')?.startsWith('meter_score.desc')||url.searchParams.has('numbers')||url.searchParams.has('or')||url.searchParams.get('offset')!==String(offset)||url.searchParams.get('limit')!==String(limit)||headers.prefer!==prefer)continue;
  assert.ok(row.status===200||row.status===206,'Successful PostgREST range response required');found.push(JSON.parse(Buffer.from(row.body,'base64')));
 }
 assert.equal(found.length,1,'Exact public reader/profile/args snapshot required');assert.ok(found[0].length<=limit,'Reader data budget exceeded');return found[0];
}
const before=rows(0,25,'count=exact').slice(0,24);
const initial=rows(0,3,'').slice(0,2),next=rows(2,23,'count=exact').slice(0,22),after=[...initial,...next];
assert.equal(initial.length,2);assert.equal(before.length,24);assert.deepEqual(after,before,'All public columns, duplicate-sensitive order and full page must remain equal');
const hash=rows=>crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const result={mode:'captured-public-functional-parity',initialItems:initial.length,fullPageItems:after.length,beforeSha256:hash(before),afterSha256:hash(after),equal:true};
fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
