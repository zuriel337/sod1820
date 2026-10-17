import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [a,b]=process.argv.slice(2);
const norm=(s)=>s.replace(/([A-Za-z0-9_$.-]+?)-[A-Za-z0-9_-]{8}\.(js|css)/g,'$1-H.$2');
function load(dir){const m=new Map();(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if(/\.(js|css|html)$/.test(f.name)){const rel=norm(path.relative(dir,p));m.set(rel,crypto.createHash('sha256').update(norm(fs.readFileSync(p,'utf8'))).digest('hex'))}}})(dir);return m}
const A=load(a),B=load(b);
const only=(X,Y)=>[...X.keys()].filter(k=>!Y.has(k));
const diff=[...A.keys()].filter(k=>B.has(k)&&A.get(k)!==B.get(k));
console.log('only in base:',only(A,B));console.log('only in new:',only(B,A));console.log('content differs:',diff);
