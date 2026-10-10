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
export function collectRepoRecon(input,cwd=process.cwd()) {
 if(!input||typeof input!=='object'||Array.isArray(input))return {status:'BLOCKED',reason:'INVALID_INPUT'};
 if(typeof input.task_key!=='string'||!/^[A-Z0-9_]{6,100}$/.test(input.task_key))
   return {status:'BLOCKED',reason:'INVALID_TASK_KEY'};
 const symbols=Array.isArray(input.symbols)?input.symbols:[];
 const targets=Array.isArray(input.focus_paths)?input.focus_paths:[];
 if(symbols.length>8||targets.length>20||symbols.some(x=>!safeSymbol(x))||targets.some(x=>!safePath(x))||
    (!symbols.length&&!targets.length))
   return {status:'BLOCKED',reason:'FOCUS_AND_SYMBOLS_REQUIRED'};
 const sha=run(cwd,['rev-parse','HEAD']);
 const ls=run(cwd,['ls-files','-z'],8*1024*1024);
 if(!/^[a-f0-9]{40}$/.test(sha||'')||ls===null)return {status:'BLOCKED',reason:'GIT_CHECKOUT_NOT_AVAILABLE'};
 const tracked=new Set(ls.split('\0').filter(Boolean));
 const found=new Set(targets.filter(x=>tracked.has(x)));
 const callers=new Set();
 for(const symbol of symbols){
   const result=run(cwd,['grep','-l','--fixed-strings','--',symbol],4*1024*1024);
   if(result)for(const file of result.split('\n')){
     if(tracked.has(file)&&safePath(file)&&callers.size<100)callers.add(file);
   }
 }
 const matched=[...found].slice(0,20),refs=[...callers].slice(0,80);
 const map=projectImplementationReality({
   canonical_owner:null, // MUST be independently resolved from live owner law
   implementations:matched.map(path=>({path,basis:'TRACKED_PATH_ONLY'})),
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
