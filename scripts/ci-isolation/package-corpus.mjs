// Offline packaging only. This file cannot acquire or fall back to live data.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import privacy from './corpus-privacy.cjs';
import contract from './snapshot-contract.cjs';
const [input,reviewFile,outDir]=process.argv.slice(2);
if(!input||!reviewFile||!outDir)throw Error('Usage: package-corpus.mjs staged-responses.json reviewed-source.json output-directory');
const staged=JSON.parse(fs.readFileSync(input)),review=JSON.parse(fs.readFileSync(reviewFile));
if(review.experiment!=='new-offline-public-corpus-v1'||review.liveParity!==false)throw Error('Explicit new offline experiment classification required');
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const bytes=value=>Buffer.from(JSON.stringify(stable(value)));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const navigation={};
for(const [key,row] of Object.entries(staged)){
 const request=contract.parseKey(key);if(!request.headers)continue;
 // Keep actual public-schema GET/HEAD and default RPC/asset negotiation.
 // Legacy header hints are not promoted to additional observed contracts.
 const profile=['GET','HEAD'].includes(request.method)&&request.url.pathname.startsWith('/rest/v1/')?'public':'';
 if(request.headers['accept-profile']!==profile)continue;
 navigation[key]=row;
}
const headerless={},resolutions=[];
for(const [key,row] of Object.entries(navigation)){
 const base=key.replace(/ (\{"prefer":.*\})$/,'');
 if(headerless[base]&&JSON.stringify(stable(headerless[base]))!==JSON.stringify(stable(row))){
  const previous=headerless[base];
  for(const field of ['status','type','body'])if(previous[field]!==row[field])throw Error('Ambiguous header collapse: '+base);
  if(previous.range?.split('/').at(-1)==='*'&&row.range?.split('/').at(-1)!=='*')headerless[base]=row;
  resolutions.push({key:base,decision:'equal status/type/body; retain exact canonical count metadata; no payload collision accepted'});
 }else headerless[base]=row;
}
// Review before writing any publishable output.
privacy.reviewCorpus(navigation,review.publicAttribution);
privacy.reviewCorpus(headerless,review.publicAttribution);
const sourceIndex={...review,records:Object.entries(navigation).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,row])=>({key,status:row.status,type:row.type,range:row.range||null,bytes:Buffer.from(row.body,'base64').length,sha256:sha(Buffer.from(row.body,'base64'))})),headerResolution:resolutions};
const indexBytes=Buffer.from(JSON.stringify(stable(sourceIndex),null,2)+'\n');
const manifest={},coverage={};
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'source-index.json'),indexBytes);
for(const [kind,data] of [['performance',headerless],['navigation',navigation],['browser',headerless]]){
 const compressed=zlib.gzipSync(bytes(data),{level:9});
 coverage[kind]=contract.coverageReport(data,kind);
 fs.writeFileSync(path.join(outDir,kind+'.json.gz'),compressed);
 manifest[kind]={version:1,experiment:review.experiment,liveParity:false,sha256:sha(compressed),source:{reference:'test/fixtures/ci-2029/source-index.json',date:review.date,sha256:sha(indexBytes),access:'public-reviewed'},privacyReview:{reference:'docs/perf-evidence-20261015/ci-corpus/README.md#privacy-and-source-admission',decision:'approved-for-this-location',publicAttribution:review.publicAttribution},coverage:{reference:'test/fixtures/ci-2029/coverage.json',passed:coverage[kind].passed},readiness:'INCOMPLETE_NOT_ACCEPTED'};
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'coverage.json'),JSON.stringify(coverage,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest).map(([kind,row])=>[kind,{sha256:row.sha256,coverage:row.coverage.passed}]))));
