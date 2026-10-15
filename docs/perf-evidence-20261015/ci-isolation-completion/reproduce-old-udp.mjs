// Historical negative control: loopback traps only. Does not run in acceptance.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
const previous='da86e7e06771391e1b8003461e349fbc7204488f';
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'sod-old-udp-control-'));
const results=[];
try{
  for(const file of ['run.mjs','network-guard.c','node-preload.cjs','policy.cjs']){
    const source=spawnSync('git',['show',`${previous}:scripts/ci-isolation/${file}`]);
    assert.equal(source.status,0);fs.writeFileSync(path.join(scratch,file),source.stdout);
  }
  const binary=path.join(scratch,'probe');
  assert.equal(spawnSync('cc',['-Wall','-Wextra','-o',binary,'test/ci-isolation/udp-write-probe.c']).status,0);
  for(const host of ['127.0.0.1','::1'])for(const mode of ['write','writev']){
    let hits=0;const trap=dgram.createSocket(host==='::1'?'udp6':'udp4');trap.on('message',()=>hits++);
    await new Promise(resolve=>trap.bind(0,host,resolve));
    try{
      const audit=path.join(scratch,`audit-${results.length}`);
      const child=spawn(process.execPath,[path.join(scratch,'run.mjs'),'--',binary,mode,host,String(trap.address().port)],{env:{...process.env,SOD_CI_AUDIT_OUT:audit},stdio:['ignore','pipe','pipe']});
      let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',b=>output+=b);
      const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
      await new Promise(resolve=>setTimeout(resolve,50));
      const auditBytes=fs.statSync(audit).size;
      assert.equal(hits,1,output);assert.equal(code,0,output);assert.equal(auditBytes,0,output);
      results.push({host,mode,forbiddenLocalTrapHits:hits,outerExit:code,auditBytes,oldGuardRejectsForbiddenWrite:false});
    }finally{await new Promise(resolve=>trap.close(resolve));}
  }
  console.log(JSON.stringify({source:previous,guardSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(scratch,'network-guard.c'))).digest('hex'),target:'local UDP loopback traps only',results},null,2));
}finally{fs.rmSync(scratch,{recursive:true,force:true});}
