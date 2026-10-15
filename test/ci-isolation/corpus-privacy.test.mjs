import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {execFileSync} from 'node:child_process';
import privacy from '../../scripts/ci-isolation/corpus-privacy.cjs';
import contract from '../../scripts/ci-isolation/snapshot-contract.cjs';
const labels={authors:['public-author'],creators:['public-creator']};
const snapshot=value=>({'GET https://example.invalid/public ': {status:200,type:'application/json',body:Buffer.from(JSON.stringify(value)).toString('base64')}});
test('preserve public source IDs and reviewed display attribution',()=>{
 assert.equal(privacy.reviewCorpus(snapshot([{wp_id:37047,author:'public-author',authors:['public-author'],created_by:'public-creator',steps:[{token:'א',contribution:1}]}]),labels).responses,1);
});
for(const value of [{user_id:'account'},{nested:{owner_user_id:'account'}},{authors:[{name:'public-author',email:'private@example.invalid'}]},{created_by:'00000000-0000-4000-8000-000000000001'},{authors:['unreviewed']},{dossier_settings:{visibility:'public'}},{body:'contact private@example.invalid'},{token:'opaque-session-token'},{refresh_token:'session'},{api_key:'credential'}]){
 test('reject excluded fields or unreviewed attribution: '+Object.keys(value)[0],()=>assert.throws(()=>privacy.reviewCorpus(snapshot(value),labels)));
}
test('review the actual retained corpus before publication',()=>{
 const root=new URL('../fixtures/ci-2029/',import.meta.url);
 const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));
 for(const kind of ['performance','navigation','browser']){
  const bytes=fs.readFileSync(new URL(kind+'.json.gz',root));
  contract.verifyManifestEntry(manifest[kind],bytes);
  assert.ok(privacy.reviewCorpus(contract.decodeSnapshot(bytes),manifest[kind].privacyReview.publicAttribution).responses>0);
 }
});
const source=JSON.parse(fs.readFileSync(new URL('../fixtures/ci-2029/source/public-profile-cards.json',import.meta.url)));
const card=source.slug_set[0];
const contributorSnapshot=value=>({'GET https://example.invalid/rest/v1/contributors?select=id,slug,display_name,kind,role,trusted,active ': {status:200,type:'application/json',body:Buffer.from(JSON.stringify(value)).toString('base64')}});
const cardReview={...labels,contributorCards:source.slug_set};
test('retain all seven approved source fields including real admission flags',()=>{
 assert.equal(privacy.reviewCorpus(contributorSnapshot(source.slug_set),cardReview).responses,1);
});
for(const [label,value] of [
 ['unapproved alias',{...card,wa_names:['alias']}],
 ['public dossier object',{...card,dossier_settings:{visibility:'public'}}],
 ['changed trust flag',{...card,trusted:!card.trusted}],
 ['unknown public-card identity',{...card,id:'00000000-0000-4000-8000-000000000099'}],
])test('reject contributor DTO: '+label,()=>assert.throws(()=>privacy.reviewCorpus(contributorSnapshot([value]),cardReview)));
test('reproduce all six package files from the retained source index',()=>{
 const root=new URL('../fixtures/ci-2029/',import.meta.url);
 const tmp=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'sod-corpus-repack-'));
 try{
  fs.writeFileSync(path.join(tmp,'responses.json'),zlib.gunzipSync(fs.readFileSync(new URL('navigation.json.gz',root))));
  execFileSync(process.execPath,[new URL('../../scripts/ci-isolation/package-corpus.mjs',import.meta.url).pathname,path.join(tmp,'responses.json'),new URL('source-index.json',root).pathname,path.join(tmp,'result')]);
  for(const name of ['performance.json.gz','navigation.json.gz','browser.json.gz','manifest.json','source-index.json','coverage.json'])assert.deepEqual(fs.readFileSync(path.join(tmp,'result',name)),fs.readFileSync(new URL(name,root)),name+' must reproduce byte-for-byte');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
