#!/usr/bin/env node
/**
 * Read-only RECON evidence collector for the CURRENT checkout.
 * No git fetch, no writes, no DB/API/AI call, no execution of project code.
 * Results are CANDIDATE source references, not canonical consumer proof.
 */
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {projectImplementationReality} from './codex-workflow-modes.mjs';
const err=(reason)=>{console.log(JSON.stringify({status:'BLOCKED',reason,executed:false,writes:false}));process.exitCode=2;};
const safeSymbol=s=>typeof s==='string'&&/^[A-Za-z_][A-Za-z0-9_]{2,70}$/.test(s);
const safePath=p=>typeof p==='string'&&p.length<=240&&!p.startsWith('/')&&
  !p.includes('..')&&!p.includes('\\')&&!p.startsWith('.env')&&!p.includes('/.env')&&
  !p.startsWith('.git/')&&!/[\0\r\n]/.test(p);
const run=(cwd,args,maxBuffer=4*1024*1024)=>{
 try{return execFileSync('git',args,{cwd,encoding:'utf8',timeout:8000,maxBuffer}).trim();}
 catch{return null;}
};
const CONTEXT_MAP='docs/2029-unified-control-center-architecture-freeze-v1.md';
const contextId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{2,50}$/.test(id);

// Reuse the existing documentation index, not a second capability registry.
// Read the committed snapshot, never an untracked file or executable config.
export function readImplementationContext(id,cwd=process.cwd()) {
 if(!contextId(id))return {status:'BLOCKED',reason:'INVALID_CONTEXT_ID'};
 const sha=run(cwd,['rev-parse','HEAD']);
 const body=run(cwd,['show',`HEAD:${CONTEXT_MAP}`]);
 if(!body||!/^[a-f0-9]{40}$/.test(sha||''))return {status:'BLOCKED',reason:'CONTEXT_MAP_NOT_COMMITTED'};
 const start=`<!-- implementation-context:${id}:start -->`,end=`<!-- implementation-context:${id}:end -->`;
 const first=body.indexOf(start),last=body.indexOf(end);
 if(first<0||last<first)return {status:'BLOCKED',reason:'CONTEXT_NOT_INDEXED'};
 if(body.indexOf(start,first+start.length)!==-1||body.indexOf(end,last+end.length)!==-1)
   return {status:'BLOCKED',reason:'AMBIGUOUS_CONTEXT_ID'};
 const markdown=body.slice(first,last+end.length);
 if(markdown.length>14000)return {status:'BLOCKED',reason:'CONTEXT_CARD_TOO_LARGE'};
 const values=label=>{
   const rows=markdown.split('\n').filter(line=>line.startsWith(`${label}:`));
   if(rows.length!==1)return null;
   return [...rows[0].matchAll(/`([^`]+)`/g)].map(m=>m[1]);
 };
 const focus=values('Focus paths'),symbols=values('Symbols'),owners=values('Owner refs'),related=values('Related contexts');
 if(!focus?.length||focus.length>20||focus.some(p=>!safePath(p))||
    !symbols||symbols.length>8||symbols.some(s=>!safeSymbol(s))||!owners?.length||
    !related||related.length>8||related.some(id=>!contextId(id)))
   return {status:'BLOCKED',reason:'INVALID_CONTEXT_ROUTING_METADATA'};
 const start_line=body.slice(0,first).split('\n').length;
 const end_line=start_line+markdown.split('\n').length-1;
 const index_locator={path:CONTEXT_MAP,ref:sha,start_line,end_line,
   url:`https://github.com/zuriel337/sod1820/blob/${sha}/${CONTEXT_MAP}#L${start_line}`};
 const source_refs=focus.map(path=>({path,ref:sha,
   exists_at_ref:run(cwd,['cat-file','-t',`${sha}:${path}`])==='blob',
   url:`https://github.com/zuriel337/sod1820/blob/${sha}/${path}`}));
 return {status:'INDEXED_CONTEXT_NOT_LIVE_VERIFICATION',context_id:id,index_locator,markdown,
   focus_paths:focus,symbols,owner_refs:owners,related_context_ids:related,source_refs,
   authority:'DATED_NAVIGATION_ONLY; ACTIVE_OWNER_AND_LIVE_STATE_REQUIRE_SEPARATE_VERIFICATION',
   dependencies_loaded:false,live_verified:false};
}
export function collectRepoRecon(input,cwd=process.cwd()) {
 if(!input||typeof input!=='object'||Array.isArray(input))return {status:'BLOCKED',reason:'INVALID_INPUT'};
 if(typeof input.task_key!=='string'||!/^[A-Z0-9_]{6,100}$/.test(input.task_key))
   return {status:'BLOCKED',reason:'INVALID_TASK_KEY'};
 let context=null;
 if(Object.hasOwn(input,'context_id')){
   if(Object.hasOwn(input,'symbols')||Object.hasOwn(input,'focus_paths'))
     return {status:'BLOCKED',reason:'CONTEXT_OR_EXPLICIT_FOCUS_NOT_BOTH'};
   context=readImplementationContext(input.context_id,cwd);
   if(context.status==='BLOCKED')return context;
 }
 const symbols=context?.symbols??(Array.isArray(input.symbols)?input.symbols:[]);
 const targets=context?.focus_paths??(Array.isArray(input.focus_paths)?input.focus_paths:[]);
 if(symbols.length>8||targets.length>20||symbols.some(x=>!safeSymbol(x))||targets.some(x=>!safePath(x))||
    (!symbols.length&&!targets.length))
   return {status:'BLOCKED',reason:'FOCUS_AND_SYMBOLS_REQUIRED'};
 const sha=run(cwd,['rev-parse','HEAD']);
 const ls=run(cwd,context?['ls-tree','-r','--name-only','-z',sha]:['ls-files','-z'],8*1024*1024);
 if(!/^[a-f0-9]{40}$/.test(sha||'')||ls===null)return {status:'BLOCKED',reason:'GIT_CHECKOUT_NOT_AVAILABLE'};
 const tracked=new Set(ls.split('\0').filter(Boolean));
 const found=new Set(targets.filter(x=>tracked.has(x)));
 const callers=new Set();
 for(const symbol of symbols){
   const result=run(cwd,context?
     ['grep','-l','--fixed-strings','-e',symbol,sha,'--']:
     ['grep','-l','--fixed-strings','--',symbol],4*1024*1024);
   if(result)for(const file of result.split('\n')){
     const path=context&&file.startsWith(`${sha}:`)?file.slice(sha.length+1):file;
     if(tracked.has(path)&&safePath(path)&&callers.size<100)callers.add(path);
   }
 }
 const matched=context?context.source_refs.filter(x=>x.exists_at_ref).map(x=>x.path):[...found].slice(0,20);
 const refs=[...callers].slice(0,context?20:80);
 const map=projectImplementationReality({
   canonical_owner:null, // MUST be independently resolved from live owner law
   implementations:matched.map(path=>({path,basis:context?'COMMITTED_PATH_ONLY':'TRACKED_PATH_ONLY'})),
   consumers:refs.map(path=>({path,basis:'CANDIDATE_TEXT_REFERENCE_NOT_LIVE_CONSUMER'})),
   dependencies:null,legacy_duplicates:null,active_writers:null,
   branch_release_live:{checkout_sha:sha,origin_main:'UNKNOWN_NOT_FETCHED',production:'UNKNOWN'},
   drift:null,blast_radius:{candidate_reference_files:refs.length,verified_live_consumers:'UNKNOWN'},
   recommendation:'GPT/owner must inspect current main, live DB/schema, runtime writers, migrations and PR/work_log before authorizing bounded WRITE',
   sources:[{source:'LOCAL_GIT_CHECKOUT_READ_ONLY',observed_at:new Date().toISOString()}]
 });
 return {status:'RECON_EVIDENCE_PARTIAL_READ_ONLY',writes:false,executed:false,paidRequest:false,
   task_key:input.task_key,checkout_sha:sha,symbols,matched_tracked_paths:matched,
   candidate_reference_paths:refs,
   candidate_reference_basis:context?'COMMITTED_TEXT_MATCH_NOT_CONSUMER_PROOF':'WORKTREE_TEXT_MATCH_NOT_CONSUMER_PROOF',
   candidate_reference_limit:context?20:80,
   candidate_references_truncated:callers.size>refs.length,
   ...(context?{context_pack:context}:{}),
   completeness:'LOCAL_REPO_ONLY; NO LIVE DB, PR LIST OR VERIFIED CODEX AGENT',
   reality_map:map};
}
const invoked=Boolean(process.argv[1]) && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 let input;
 try{
  const raw=readFileSync(0,'utf8');if(raw.length>4096)throw Error('oversized');
  input=JSON.parse(raw);
 }catch{err('INVALID_INPUT_JSON');process.exit();}
 const data=collectRepoRecon(input);
 console.log(JSON.stringify(data));
 if(data.status==='BLOCKED')process.exitCode=2;
}
