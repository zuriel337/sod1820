import {pathToFileURL,fileURLToPath} from 'node:url';
if(!process.env.PGLITE_MODULE) throw new Error('Explicit local PGLITE_MODULE required');
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
import fs from 'node:fs';import path from 'node:path';
const db=new PGlite({onNotice:n=>console.log(n.message)});
function splitSql(sql){
 let out=[],start=0,quote=null,tag=null,line=false,block=false;
 for(let i=0;i<sql.length;i++){
  const c=sql[i],n=sql[i+1];
  if(line){if(c==='\n')line=false;continue;}
  if(block){if(c==='*'&&n==='/'){block=false;i++;}continue;}
  if(tag){if(sql.startsWith(tag,i)){i+=tag.length-1;tag=null;}continue;}
  if(quote){if(c===quote){if(n===quote)i++;else quote=null;}continue;}
  if(c==='-'&&n==='-'){line=true;i++;continue;}
  if(c==='/'&&n==='*'){block=true;i++;continue;}
  if(c==="'"||c==='"'){quote=c;continue;}
  if(c==='$'){const m=sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/);if(m){tag=m[0];i+=tag.length-1;continue;}}
  if(c===';'){out.push(sql.slice(start,i+1));start=i+1;}
 }if(sql.slice(start).trim())out.push(sql.slice(start));return out;
}
function expand(file){return fs.readFileSync(file,'utf8').split('\n').map(line=>line.startsWith('\\set')?'':line.startsWith('\\ir ')?expand(path.resolve(path.dirname(file),line.slice(4))):line).join('\n');}
async function run(file){for(const stmt of splitSql(expand(file)))if(stmt.trim())await db.exec(stmt);}

try{await run(fileURLToPath(new URL('./run.sql',import.meta.url)));console.log('ALL PASS');}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
