import fs from "node:fs"; import path from "node:path";
const root=process.cwd(); const exts=["",".js",".jsx",".mjs","/index.js","/index.jsx"];
const res=(f,s)=>{if(!s.startsWith("."))return null;const b=path.resolve(path.dirname(f),s);for(const e of exts){const p=b+e;if(fs.existsSync(p)&&fs.statSync(p).isFile())return p}return null};
const re=/(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
const inv=JSON.parse(fs.readFileSync(process.argv[2]));const legacyOnly=new Set(inv.filter(o=>!o.A&&o.B).map(o=>path.resolve(o.file)));
function closure(roots){const seen=new Set();const q=roots.map(r=>path.resolve(r));q.forEach(r=>seen.add(r));while(q.length){const f=q.shift();if(!/\.(jsx?|mjs)$/.test(f))continue;for(const m of fs.readFileSync(f,"utf8").matchAll(re)){const r=res(f,m[1]||m[2]);if(r&&legacyOnly.has(r)&&!seen.has(r)){seen.add(r);q.push(r)}}}return seen}
const kb=set=>[...set].reduce((a,f)=>a+fs.statSync(f).size,0)/1024;
const groups={
 "C1 admin console (AdminPage + admin/*)":["src/pages/AdminPage.jsx",...inv.filter(o=>/^src\/components\/admin\//.test(o.file)&&!o.A).map(o=>o.file)],
 "C2 post/media authoring (PostEditor, AdvancedPostEditor, ContributorStudio, UploadFindings, LeadOrderEditor)":["src/pages/PostEditorPage.jsx","src/components/AdvancedPostEditor.jsx","src/components/ContributorStudio.jsx","src/components/UploadFindings.jsx","src/components/LeadOrderEditor.jsx"].filter(f=>fs.existsSync(f)),
 "C3 credits/payments (CreditsBuyPage)":["src/pages/CreditsBuyPage.jsx"],
 "C4 WhatsApp inbox admin (WaInboxPage, WaChatWindow)":["src/pages/WaInboxPage.jsx","src/components/WaChatWindow.jsx"].filter(f=>fs.existsSync(f)),
};
const all=new Set();
for(const [g,r] of Object.entries(groups)){const c=closure(r);c.forEach(x=>all.add(x));console.log(g.padEnd(98),String(c.size).padStart(4),"files",kb(c).toFixed(0).padStart(5)+" KB")}
console.log("union of capability closures:",all.size,"files",kb(all).toFixed(0),"KB of",legacyOnly.size,"legacy-only files",kb(legacyOnly).toFixed(0),"KB");
const rest=[...legacyOnly].filter(f=>!all.has(f));console.log("legacy-only NOT needed by those capability tools:",rest.length,"files",kb(new Set(rest)).toFixed(0),"KB");
fs.writeFileSync(process.argv[3],JSON.stringify({capability:[...all].map(f=>path.relative(root,f)),rest:rest.map(f=>path.relative(root,f))}));
