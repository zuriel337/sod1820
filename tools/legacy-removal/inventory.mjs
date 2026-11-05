import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const root=process.cwd(); const exts=["",".js",".jsx",".mjs",".cjs",".ts","/index.js","/index.jsx"];
const res=(f,s)=>{if(!s.startsWith("."))return null;const b=path.resolve(path.dirname(f),s);for(const e of exts){const p=b+e;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p}return null};
const re=/(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|new URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g;
const cssImp=/@import\s+(?:url\()?["']([^"']+)["']/g;
function crawl(entries){const seen=new Set();const q=entries.map(e=>path.resolve(e));q.forEach(e=>seen.add(e));while(q.length){const f=q.shift();if(!/\.(jsx?|mjs|cjs|ts|css)$/.test(f))continue;const s=fs.readFileSync(f,"utf8");const rx=f.endsWith(".css")?cssImp:re;let m;rx.lastIndex=0;while((m=rx.exec(s))){const spec=m[1]||m[2]||m[3]||m[4];if(!spec)continue;const r=res(f,spec);if(r&&!seen.has(r)){seen.add(r);q.push(r)}}}return seen}
const html=(h)=>[...fs.readFileSync(h,"utf8").matchAll(/(?:src|href)="(\/src\/[^"]+)"/g)].map(m=>path.join(root,m[1]));
const A=crawl(["src/main2029.jsx",...html("2029.html")]);
const B=crawl(["src/main.jsx",...html("index.html")]);
const files=execSync("git ls-files src",{encoding:"utf8"}).split("\n").filter(Boolean);
// external (non-runtime) consumers of src files
const ext=execSync("git ls-files scripts api server tools public-reading-deploy preview-deploy middleware.js middleware-core.js route-legitimacy.js supabase work",{encoding:"utf8"}).split("\n").filter(f=>/\.(m?js|cjs|ts)$/.test(f));
const tests=execSync("git ls-files test tests src | grep -E '(^test/|^tests/|\\.test\\.|\\.spec\\.)' || true",{encoding:"utf8"}).split("\n").filter(f=>/\.(m?js|cjs|jsx|ts)$/.test(f));
function direct(list){const m=new Map();for(const f of list){const p=path.resolve(f);if(!fs.existsSync(p))continue;let s;try{s=fs.readFileSync(p,"utf8")}catch{continue}let x;re.lastIndex=0;while((x=re.exec(s))){const spec=x[1]||x[2]||x[3]||x[4];if(!spec||!spec.startsWith("."))continue;const r=res(p,spec);if(r)(m.get(r)??m.set(r,new Set()).get(r)).add(f)}}return m}
const extRefs=direct(ext), testRefs=direct(tests);
const out=[];
for(const f of files){const p=path.resolve(f);const inA=A.has(p),inB=B.has(p);
 out.push({file:f,A:inA,B:inB,ext:[...(extRefs.get(p)||[])],tests:[...(testRefs.get(p)||[])].filter(t=>t!==f)})}
fs.writeFileSync(process.argv[2],JSON.stringify(out));
const cls=o=>o.A?(o.B?"shared":"2029-only"):(o.B?"legacy-only":"orphan");
const cnt={};for(const o of out){const c=cls(o);cnt[c]=(cnt[c]||0)+1}
console.log("tracked src files:",files.length,cnt);
const byKind=(k)=>{const a=out.filter(o=>cls(o)===k);const e=a.filter(o=>o.ext.length);console.log(k,"files",a.length,"| referenced by build/ops scripts:",e.length,"| referenced only by tests:",a.filter(o=>!o.ext.length&&o.tests.length).length,"| no references at all:",a.filter(o=>!o.ext.length&&!o.tests.length).length)};
for(const k of ["legacy-only","orphan"])byKind(k);
