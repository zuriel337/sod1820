import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const dist=process.argv[2]; const m=JSON.parse(fs.readFileSync(path.join(dist,'.vite/manifest.json')));
const entry=Object.keys(m).find(k=>m[k].isEntry);
function closure(start){const seen=new Set();(function walk(k){if(seen.has(k)||!m[k])return;seen.add(k);(m[k].imports||[]).forEach(walk)})(start);return seen}
const gz=f=>zlib.gzipSync(fs.readFileSync(path.join(dist,f)),{level:9}).length;
const ent=closure(entry); let t=0;for(const k of ent)t+=gz(m[k].file);
console.log(JSON.stringify({entryChunks:ent.size,entryGzKB:+(t/1024).toFixed(1)}));
// World page chunk graph beyond entry
const wk=Object.keys(m).find(k=>/pages\/World2029Page/.test(k)); if(wk){const w=closure(wk);let wt=0,c=0;for(const k of w){if(ent.has(k))continue;wt+=gz(m[k].file);c++}console.log(JSON.stringify({worldBeyondEntryChunks:c,worldBeyondEntryGzKB:+(wt/1024).toFixed(1)}))}
