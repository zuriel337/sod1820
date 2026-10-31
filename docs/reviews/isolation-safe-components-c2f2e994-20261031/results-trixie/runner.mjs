import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {networkInterfaces} from 'node:os';
const steps=JSON.parse(readFileSync('/evidence/steps.json','utf8'));
const receipt={sha:'c2f2e9948dd119c96b69e377b33be2eb2a886efb',node:process.version,networkInterfaces:networkInterfaces(),started:new Date().toISOString(),steps:[]};
for (let i=0;i<steps.length;i++) {
  const step=steps[i],started=Date.now();
  const out=spawnSync('/bin/sh',['-ec',step.command],{cwd:'/source',encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});
  const log=(out.stdout||'')+(out.stderr||'')+(out.error?'\n'+out.error.stack:'');
  const file=String(i+1).padStart(2,'0')+'.log';
  writeFileSync('/evidence/'+file,log);
  const row={...step,exit:out.status,signal:out.signal,seconds:(Date.now()-started)/1000,log:file};
  receipt.steps.push(row);
  writeFileSync('/evidence/results.json',JSON.stringify(receipt,null,2));
  console.log(JSON.stringify({step:i+1,name:step.name,exit:out.status,seconds:row.seconds}));
}
receipt.finished=new Date().toISOString();
writeFileSync('/evidence/results.json',JSON.stringify(receipt,null,2));
process.exitCode=receipt.steps.every(s=>s.exit===0)?0:1;
