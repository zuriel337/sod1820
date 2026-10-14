// Static graph size per route from the Vite manifest of a 2029 build (READ_ONLY on product).
// usage: node static-graph.mjs <distDir>   -> JSON: per route {chunks, jsBrKB, cssBrKB, jsRawKB}
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
const dist=process.argv[2]; const m=JSON.parse(fs.readFileSync(path.join(dist,'.vite/manifest.json')));
const br=f=>zlib.brotliCompressSync(fs.readFileSync(path.join(dist,f))).length;
const entryKey=Object.keys(m).find(k=>m[k].isEntry);
function graph(key,seen=new Set()){const e=m[key];if(!e||seen.has(key))return seen;seen.add(key);for(const i of e.imports||[])graph(i,seen);return seen}
function size(keys){const js=new Set(),css=new Set();for(const k of keys){const e=m[k];if(e.file.endsWith('.js'))js.add(e.file);for(const c of e.css||[])css.add(c)}
  let jb=0,jr=0,cb=0;for(const f of js){jb+=br(f);jr+=fs.statSync(path.join(dist,f)).size}for(const f of css)cb+=br(f);return {chunks:js.size,jsBrKB:+(jb/1024).toFixed(1),jsRawKB:+(jr/1024).toFixed(1),cssBrKB:+(cb/1024).toFixed(1)}}
const base=graph(entryKey); const out={entry:size(base)};
for(const [name,k] of Object.entries({home:'Home2029Page',world:'World2029Page',post:'Post2029Page',topic:'Topic2029Page',number:'Number2029Page'})){
  const key=Object.keys(m).find(x=>x.endsWith(`pages/${k}.jsx`)); if(!key){out[name]=null;continue}
  const all=graph(key,new Set(base)); out[name]=size(all)}
console.log(JSON.stringify(out));
