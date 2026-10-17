import fs from 'node:fs'; import zlib from 'node:zlib';
const dir=process.argv[2];
const html=fs.readFileSync(dir+'/index.html','utf8');
const hrefs=[...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map(m=>m[1]);
// follow static imports of every js (import ...from"./x.js" or import"./x.js")
const seen=new Set();const walk=(f)=>{if(seen.has(f))return;seen.add(f);if(!f.endsWith('.js'))return;const s=fs.readFileSync(dir+'/'+f,'utf8');for(const m of s.matchAll(/(?:^|[;}\s])(?:import|export)\s*(?:[^"'`;]*?from\s*)?["']\.\/([^"']+\.js)["']/g))walk('assets/'+m[1])};
hrefs.forEach(walk);
let raw=0,gz=0;const norm=n=>n.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/,'-H.$1');
const names=[...seen].map(norm).sort();
for(const f of seen){const b=fs.readFileSync(dir+'/'+f);raw+=b.length;gz+=zlib.gzipSync(b).length}
console.log(JSON.stringify({entryGraphFiles:seen.size,raw,gz,names}));
