import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import dgram from 'node:dgram';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
async function probe(kind){
 let hits=0;const trap=http.createServer((_,res)=>{hits++;res.end('TRAP');});
 await new Promise(r=>trap.listen(0,'127.0.0.1',r));
 const udp=dgram.createSocket('udp4');udp.on('message',()=>{hits++;});await new Promise(r=>udp.bind(trap.address().port,'127.0.0.1',r));const url=`http://127.0.0.1:${trap.address().port}`;
 try{
  const child=spawn(process.execPath,['scripts/ci-isolation/run.mjs','--',process.execPath,'test/ci-isolation/probe.mjs',kind,url],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
  let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',d=>output+=d);
  const code=await new Promise((r,j)=>{child.once('close',r);child.once('error',j);});
  assert.equal(hits,0,'Forbidden target must not receive even a local request');
  if(['permitted','browser-sw','browser-replay'].includes(kind)){assert.equal(code,0,output);return;}
  assert.equal(code,1,output);assert.match(output,/CI_EGRESS_FAILURE/,output);
  assert.match(output,/Child completed/,'Application swallowed the error; independent audit still fails');
 }finally{await new Promise(r=>trap.close(r));await new Promise(r=>udp.close(r));}
}
for(const kind of ['fetch','http','curl','child-node','udp','permitted'])test(`isolated ${kind} with local forbidden target`,()=>probe(kind));
for(const kind of ['write','rpc','research','beacon','early','teardown','close','worker','websocket','sw','replay'])
 test(`browser ${kind} cannot reach a local forbidden target`,()=>probe('browser-'+kind));
