// Passive local inventory. Emits hashes/counts/field NAMES, never source bodies,
// contributor identities, request arguments, message text or images.
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
const files=process.argv.slice(2);if(!files.length)throw Error('Local snapshot files required');
const result=files.map(file=>{
 const bytes=fs.readFileSync(file),data=JSON.parse(zlib.gunzipSync(bytes));
 const endpoints={},sensitiveFields={},primaryPosts=new Set(),images={count:0,utf8ReplacementBodies:0};
 let legacyMd5Keys=0,headerSignatures=0,exactCounts=0;
 const sensitive=new Set(['wa_names','dossier_settings','author_user_id','owner_user_id','verified_by','fb_error','fb_post_id','engine_run_id','verified_run_id']);
 function inspect(value){
  if(Array.isArray(value))for(const item of value)inspect(item);
  else if(value&&typeof value==='object')for(const [name,item] of Object.entries(value)){
   if(sensitive.has(name))sensitiveFields[name]=(sensitiveFields[name]||0)+1;inspect(item);
  }
 }
 for(const [key,row] of Object.entries(data)){
  const url=new URL(key.split(' ')[1]),endpoint=url.pathname.startsWith('/storage/')?url.pathname.replace(/(\/public\/[^/]+)\/.*/,'$1/[asset]'):url.pathname;
  endpoints[endpoint]=(endpoints[endpoint]||0)+1;
  if(/^POST .* [a-f0-9]{32}$/.test(key))legacyMd5Keys++;
  if(/ \{"prefer":/.test(key))headerSignatures++;
  if(/^\d+-\d+\/\d+$/.test(row.range||row.cr||''))exactCounts++;
  const raw=typeof row.ct==='string';
  const body=raw?row.body:Buffer.from(row.body,'base64').toString('utf8');
  if((row.ct||row.type||'').startsWith('image/')){images.count++;if(body.includes('\ufffd'))images.utf8ReplacementBodies++;continue;}
  let parsed;try{parsed=JSON.parse(body);}catch{continue;}
  inspect(parsed);
  if(url.pathname==='/rest/v1/posts'&&url.searchParams.get('select')==='*'&&Array.isArray(parsed))for(const post of parsed)if(['seventh-to-tenth-sefirot-2027','bennett-melach-631-78'].includes(post.slug)&&typeof post.content==='string'&&post.content.length>=800)primaryPosts.add(post.slug);
 }
 return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,responses:Object.keys(data).length,endpoints,legacyMd5Keys,headerSignatures,exactCounts,requiredPrimaryPostsPresent:[...primaryPosts].sort(),images,sensitiveFieldOccurrences:sensitiveFields,eligibleAsCompleteCiInput:false,bodyPublication:'NOT_APPROVED_BY_THIS_INVENTORY'};
});
console.log(JSON.stringify(result,null,2));
