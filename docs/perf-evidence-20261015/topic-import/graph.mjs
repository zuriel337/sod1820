import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const [base,out]=process.argv.slice(2),result={};
for(const arm of ['a','b','preview-a','preview-b']) {
  const dir=path.join(base,`build-${arm}`),raw=fs.readFileSync(path.join(dir,'.vite/manifest.json')),m=JSON.parse(raw);
  const closure=start=>{const seen=new Set(),pending=[start];while(pending.length){const k=pending.pop();if(seen.has(k))continue;seen.add(k);pending.push(...m[k].imports||[]);}return seen;};
  const entry=closure('2029.html'),world=closure('src/pages/World2029Page.jsx'),topic=closure('src/pages/Topic2029Page.jsx');
  const summary=keys=>({chunks:keys.length,gzipKiB:keys.reduce((n,k)=>n+(m[k].file.endsWith('.js')?zlib.gzipSync(fs.readFileSync(path.join(dir,m[k].file)),{level:9}).length:0),0)/1024,keys:[...keys].sort()});
  result[arm]={manifestSha256:crypto.createHash('sha256').update(raw).digest('hex'),World:summary([...world].filter(k=>!entry.has(k))),Topic:summary([...topic].filter(k=>!entry.has(k))),TopicNewAfterWorld:summary([...topic].filter(k=>!world.has(k)))};
}
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
