// Alternate exact A/B targets per fresh browser context; each retains its own
// cold + actual-reload warm loop. Core journey assertions remain in the reused
// harness. Both use the same exact external Vercel-toolbar script block.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const [baselinePath,candidatePath,out]=process.argv.slice(2);
const configs={baseline:JSON.parse(fs.readFileSync(baselinePath,'utf8')),candidate:JSON.parse(fs.readFileSync(candidatePath,'utf8'))};
fs.mkdirSync(out,{recursive:true,mode:0o700});
const report={kind:'alternating-paired-code-only-performance',startedAt:new Date().toISOString(),blockedExternalURL:'https://vercel.live/_next-live/feedback/feedback.js',nativeGuardUnchanged:true,productWrites:0,modelCalls:0,contexts:[]};
const combined={baseline:null,candidate:null};
const flush=()=>{fs.writeFileSync(path.join(out,'paired.json'),JSON.stringify(report,null,2)+'\n');for(const label of['baseline','candidate'])if(combined[label])fs.writeFileSync(path.join(out,label+'-combined.json'),JSON.stringify(combined[label],null,2)+'\n');};
outer:for(const width of[390,1440])for(let trial=1;trial<=3;trial++)for(const label of['baseline','candidate']){
 const config={...configs[label],widths:[width],trials:1,trialStart:trial,expectedPrimaryPost:'/post/sprites-lightning-over-france',blockExternalVercelToolbar:true,skipPlayback:true};
 const directory=path.join(out,`${label}-${width}-${trial}`);const record={label,width,trial,sha:config.sha,startedAt:new Date().toISOString(),directory:path.basename(directory)};report.contexts.push(record);flush();
 const child=spawnSync(process.execPath,[path.join(__dirname,'native-matched-journeys.cjs')],{input:JSON.stringify(config)+'\n',encoding:'utf8',env:{...process.env,SOD_COLD_OUT:directory},timeout:480000,maxBuffer:1024*1024});
 record.finishedAt=new Date().toISOString();record.exitCode=child.status;record.signal=child.signal;
 if(child.stdout)process.stdout.write(child.stdout);if(child.stderr)process.stderr.write(child.stderr);
 const rawPath=path.join(directory,'stage-timings.json');
 if(fs.existsSync(rawPath)){
  const raw=JSON.parse(fs.readFileSync(rawPath,'utf8'));if(!combined[label])combined[label]={...raw,trials:[],rawContexts:[],ok:true};combined[label].trials.push(...raw.trials);combined[label].rawContexts.push(record.directory);combined[label].ok=combined[label].ok&&raw.ok;
  record.ok=raw.ok;record.denied=raw.trials.flatMap(t=>t.snapshot?.denied||[]);record.unexpectedDenied=record.denied.filter(r=>!(r.method==='POST'&&r.path==='/rest/v1/rpc/lang_links_list'));
  if(record.unexpectedDenied.length){record.ok=false;record.failure='unexpected_denial_retained';}
 }else{record.ok=false;record.failure='child_result_missing';}
 flush();if(child.status!==0||!record.ok){report.stoppedAfter=record.directory;break outer;}
}
report.finishedAt=new Date().toISOString();report.ok=report.contexts.length===12&&report.contexts.every(c=>c.ok);flush();console.log(JSON.stringify({pairedComplete:true,ok:report.ok,contexts:report.contexts.length,stoppedAfter:report.stoppedAfter}));process.exitCode=report.ok?0:1;
