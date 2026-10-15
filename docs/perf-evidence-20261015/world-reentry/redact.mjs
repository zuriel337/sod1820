// Publish timings and equality evidence without exporting live content, URLs or source IDs.
// The original response snapshot and reports remain local; hashes preserve matched comparisons.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const sha=x=>crypto.createHash('sha256').update(String(x)).digest('hex');
for(const file of process.argv.slice(2)){
  const report=JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
  if(report.redaction)continue;
  report.fixtureManifest=(report.fixtureManifest||[]).map(({key,...entry})=>({requestSha256:sha(key),...entry}));
  for(const sample of report.samples){
    if(sample.target){sample.targetSha256=sha(sample.target);delete sample.target;}
    sample.reads=sample.reads.map(({key,...entry})=>({requestSha256:sha(key),...entry}));
    for(const step of sample.steps){
      const id=step.identity;
      step.identity={pathSha256:sha(id.path),slugSha256:id.slug?sha(id.slug):null,textSha256:sha(id.text),topics:id.topics.map(sha)};
    }
    for(const key of ['anchor','forwardAnchor','inPageAnchor','afterInput']){
      if(sample[key]?.items)sample[key].items=sample[key].items.map(sha);
    }
  }
  report.redaction='SHA256 replaces live DOM text, dynamic topic paths, source IDs and request URLs/bodies. Only timings/counts/statuses/hashes and repository build asset names are published. Raw snapshots remain local.';
  fs.writeFileSync(file,zlib.gzipSync(JSON.stringify(report,null,2)+'\n',{mtime:0}));
}
