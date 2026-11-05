import fs from "node:fs"; import { execSync } from "node:child_process";
const inv=JSON.parse(fs.readFileSync(process.argv[2]));
const cls=o=>o.A?(o.B?"shared":"2029-only"):(o.B?"legacy-only":"orphan");
const L=inv.filter(o=>cls(o)==="legacy-only").map(o=>o.file);
const Lset=new Set(L);
// searchable non-src, non-doc text files
const files=execSync("git ls-files | grep -v -E '^(src/|docs/|audits/|research|planning/|work_log|public/|supabase/migrations/|exports/)' | grep -E '\\.(m?js|cjs|ts|tsx|jsx|json|ya?ml|html|py|sh|md)$' | grep -v -E '(package-lock|\\.md$)'",{encoding:"utf8"}).split("\n").filter(Boolean);
const hit=new Map();
for(const f of files){let s;try{s=fs.readFileSync(f,"utf8")}catch{continue}
 for(const p of L){ if(s.includes(p)){(hit.get(f)??hit.set(f,new Set()).get(f)).add(p)} }}
const rows=[...hit].map(([f,ps])=>[f,ps.size,[...ps].slice(0,3).join(", ")]).sort((a,b)=>b[1]-a[1]);
console.log("non-src files that name a Legacy-only src path as text:",rows.length);
for(const r of rows)console.log(String(r[1]).padStart(3),r[0].padEnd(64),r[2].slice(0,90));
