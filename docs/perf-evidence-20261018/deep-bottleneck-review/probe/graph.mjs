import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path'
const dist='dist2029a'; const man=JSON.parse(fs.readFileSync(dist+'/.vite/manifest.json'))
const an=JSON.parse(fs.readFileSync('analysis-modules.json'))
const gz=f=>zlib.gzipSync(fs.readFileSync(path.join(dist,f))).length
const raw=f=>fs.statSync(path.join(dist,f)).size
// manifest by file
const byFile={}; for(const [k,v] of Object.entries(man)) byFile[v.file]={key:k,...v}
function staticGraph(startKey, seen=new Set()){ const e=man[startKey]; if(!e||seen.has(startKey))return seen; seen.add(startKey); for(const i of e.imports||[]) staticGraph(i,seen); return seen }
function sum(keys){ let r=0,g=0,css=0; const files=[]; for(const k of keys){const e=man[k]; files.push(e.file); r+=raw(e.file); g+=gz(e.file); for(const c of e.css||[]){css+=raw(c)}} return {n:keys.size,raw:r,gzip:g,css,files} }
const entryKey=Object.keys(man).find(k=>man[k].isEntry)
const E=staticGraph(entryKey)
const es=sum(E)
console.log('ENTRY', entryKey, '-> static graph files:', es.n, 'raw', es.raw, 'gzip', es.gzip)
for(const k of E){const e=man[k]; console.log('  ',e.file.padEnd(48), String(raw(e.file)).padStart(8), String(gz(e.file)).padStart(7))}
// Top modules in entry chunk and supabase chunk
function topMods(file,n=18){ const c=an[file]; if(!c) return; const tot=c.mods.reduce((a,b)=>a+b.len,0); console.log('\n modules in',file,'rendered total',tot); for(const m of c.mods.slice(0,n)) console.log('   ',String(m.len).padStart(7), m.id) }
const entryFile=man[entryKey].file
topMods(entryFile,25)
for(const k of E){ const f=man[k].file; if(f!==entryFile && /supabase|shell|Shell/i.test(f)) topMods(f,12) }
// Home route graph (dynamic import from entry)
const homeKey=Object.keys(man).find(k=>/pages\/Home2029Page\.jsx$/.test(k))
const H=staticGraph(homeKey); for(const k of E) H.delete(k)
const hs=sum(H); console.log('\nHOME route graph beyond entry graph: files',hs.n,'raw',hs.raw,'gzip',hs.gzip,'css',hs.css)
for(const k of H){const e=man[k]; console.log('  ',e.file.padEnd(48), String(raw(e.file)).padStart(8), String(gz(e.file)).padStart(7))}
for(const route of ['pages/World2029Page.jsx','pages/Post2029Page.jsx','pages/Number2029Page.jsx','pages/Els2029Page.jsx','pages/Posts2029Page.jsx','pages/Topic2029Page.jsx']){
  const k=Object.keys(man).find(x=>x.endsWith(route)); if(!k){console.log(route,'not found');continue}
  const G=staticGraph(k); for(const x of E) G.delete(x); const s=sum(G); console.log('\n',route,'beyond entry: files',s.n,'raw',s.raw,'gzip',s.gzip,'css',s.css, ' | not shared w/ Home:', (()=>{const G2=new Set([...G].filter(x=>!H.has(x)));const q=sum(G2);return q.n+' files gzip '+q.gzip})())
}
