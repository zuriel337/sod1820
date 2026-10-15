import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
