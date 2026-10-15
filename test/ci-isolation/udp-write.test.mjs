import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import dgram from 'node:dgram';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'sod-udp-write-test-'));
const binary=path.join(scratch,'probe');
assert.equal(spawnSync('cc',['-Wall','-Wextra','-o',binary,path.join(root,'test/ci-isolation/udp-write-probe.c')],{encoding:'utf8'}).status,0);
test.after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
async function probe(mode,host,{guarded=true,permitted=false}={}){
  let hits=0;const trap=dgram.createSocket(host==='::1'?'udp6':'udp4');
  trap.on('message',()=>hits++);
  await new Promise((resolve,reject)=>{trap.once('error',reject);trap.bind(0,host,resolve);});
  try{
    const args=[binary,mode,host,String(trap.address().port)];
    let command=process.execPath,env={...process.env};
    if(guarded){
      // The allowed control registers only this test's local trap, in the child.
      const setup=permitted?`require('node:fs').appendFileSync(process.env.SOD_CI_PORTS,process.argv[4]+'\\n');`:'';
      args.unshift('-e',`${setup}process.exitCode=require('node:child_process').spawnSync(process.argv[1],process.argv.slice(2),{stdio:'inherit'}).status;`);
      args.unshift(command);args.unshift('--');args.unshift(path.join(root,'scripts/ci-isolation/run.mjs'));
    }else{command=args.shift();delete env.LD_PRELOAD;delete env.NODE_OPTIONS;}
    const child=spawn(command,args,{cwd:scratch,env,stdio:['ignore','pipe','pipe']});
    let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',b=>output+=b);
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
    // Let the local datagram receiver drain before checking the trap counter.
    await new Promise(resolve=>setTimeout(resolve,50));
    const blocked=guarded&&!permitted&&['write','writev'].includes(mode);
    assert.equal(hits,(!guarded||permitted)&&mode!=='connect'&&mode!=='file'?1:0,output);
    assert.equal(code,blocked?1:0,output);assert.match(output,/Child completed/);
    if(blocked){assert.match(output,/result=-1 errno=13/);assert.match(output,/CI_EGRESS_FAILURE \(child exit 0\)/);}
    if(mode==='file')assert.equal(fs.readFileSync(path.join(scratch,'ordinary-write-proof.txt'),'utf8'),'LOCAL_REVIEW_TRAP'.repeat(2));
  }finally{await new Promise(resolve=>trap.close(resolve));}
}
for(const host of ['127.0.0.1','::1'])for(const mode of ['write','writev']){
  test(`UDP ${mode} ${host}: unguarded local trap control receives one packet`,()=>probe(mode,host,{guarded:false}));
  test(`UDP ${mode} ${host}: swallowed denial fails parent with zero trap hits`,()=>probe(mode,host));
  test(`UDP ${mode} ${host}: explicitly registered local peer works`,()=>probe(mode,host,{permitted:true}));
}
test('packetless UDP connect remains permitted',()=>probe('connect','127.0.0.1'));
test('ordinary file write and writev remain permitted',()=>probe('file','127.0.0.1'));
