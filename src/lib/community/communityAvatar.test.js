import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import source from './communityAvatarSources2029.json' with {type:'json'};
import { historicalCommunityAvatar } from './communityAvatar.js';
import { writerAvatarStyle } from '../avatar.js';
const row={authorKey:source.rows[0].contributor_id,origin:'openweb'};
test('only exact unclaimed public historical credit receives its original copied avatar',()=>{
 assert.match(historicalCommunityAvatar(row),/^\/community-avatars\/[a-f0-9]+\.jpg$/);
 for(const input of [{...row,authorKey:'same-name-only',authorName:'שינשין'},{...row,origin:'community_2029'},{...row,authorUserId:'claimed-account'},{...row,linkedUserId:'claimed-account'},{...row,isDeleted:true}])assert.equal(historicalCommunityAvatar(input,'https://sod1820.co.il'),null);
 assert.ok(historicalCommunityAvatar(row));
});
test('all restored source images retain the original public bytes and exact provenance without account fields',()=>{
 assert.equal(source.rows.length,9);assert.equal(new Set(source.rows.map(r=>r.contributor_id)).size,9);
 for(const r of source.rows){assert.equal(r.visibility,'public');assert.match(r.source_url,/^https:\/\/images.spot.im\/image\/upload\//);assert.ok(Number.isFinite(Date.parse(r.observed_at)));const data=readFileSync(new URL('../../../public'+r.asset,import.meta.url));assert.equal(createHash('sha256').update(data).digest('hex'),r.sha256);assert.ok(data.length<250000)}
 assert.doesNotMatch(JSON.stringify(source),/accessToken|sso_data|email|account_user_id|user_name/);
});
const rgb=hsl=>{const[h,s0,l0]=hsl.match(/[\d.]+/g).map(Number),s=s0/100,l=l0/100;const a=s*Math.min(l,1-l);return[0,8,4].map(n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1))})};
const luminance=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
test('color fallback is stable per reader key and keeps initials readable throughout each gradient',()=>{
 assert.deepEqual(writerAvatarStyle('writer-one'),writerAvatarStyle('writer-one'));assert.notDeepEqual(writerAvatarStyle('writer-one'),writerAvatarStyle('writer-two'));
 for(let i=0;i<2000;i++){const c=writerAvatarStyle('writer-'+i),a=rgb(c['--user-badge-fallback-start']),b=rgb(c['--user-badge-fallback-end']),ink=luminance(rgb(c['--user-badge-fallback-ink']));for(let j=0;j<=10;j++){const bg=luminance(a.map((v,k)=>v*(1-j/10)+b[k]*j/10));assert.ok((bg+.05)/(ink+.05)>=7,'initial contrast')}}
});
