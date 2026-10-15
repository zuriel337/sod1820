import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import policy from '../../scripts/ci-isolation/policy.cjs';
test('missing safety configuration stops before a connection',()=>{
 const env={...process.env};for(const k of ['SOD_CI_ISOLATION','SOD_CI_AUDIT','SOD_CI_PORTS','LD_PRELOAD','NODE_OPTIONS'])delete env[k];
 const out=spawnSync(process.execPath,['--input-type=module','-e',`import policy from './scripts/ci-isolation/policy.cjs';policy.requireIsolation();throw Error('must not get here')`],{env,encoding:'utf8'});
 assert.equal(out.status,1);assert.match(out.stderr,/safe network configuration required/);
});
test('record and hosted paths refuse to connect, including child curl capture',()=>{
 for(const file of ['scripts/perf-execution-2029/measure.mjs','scripts/perf-execution-2029/mobile-image-gate.mjs','scripts/perf-navigation-2029/run.mjs']){
  const source=fs.readFileSync(file,'utf8');
  assert.doesNotMatch(source,/(?:run|exec)\('curl'/);assert.match(source,/Live.*capture disabled/);
 }
});
test('frozen snapshot is hash-pinned, nonempty and structurally checked',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sod-snapshot-test-'));
 try{
  for(const [label,data,accepted] of [
    ['representative',{'GET https://fixture.invalid/read ':{status:200,type:'application/json',body:Buffer.from(JSON.stringify([{id:'source-878',title:'מקור',value:878}])).toString('base64')}},true],
    ['empty',{},false],['malformed',{'GET https://fixture.invalid/read ':{status:200}},false],
  ]){
    const file=path.join(dir,label+'.gz'),bytes=zlib.gzipSync(JSON.stringify(data));fs.writeFileSync(file,bytes);
    const hash=crypto.createHash('sha256').update(bytes).digest('hex');
    const code="const p=require('./scripts/ci-isolation/policy.cjs');p.frozenSnapshot(process.argv[1],process.argv[2]);";
    const out=spawnSync(process.execPath,['scripts/ci-isolation/run.mjs','--',process.execPath,'-e',code,file,hash],{encoding:'utf8'});
    assert.equal(out.status,accepted?0:1,label+out.stderr);
    if(accepted){const bad=spawnSync(process.execPath,['scripts/ci-isolation/run.mjs','--',process.execPath,'-e',code,file,'0'.repeat(64)],{encoding:'utf8'});assert.equal(bad.status,1);assert.match(bad.stderr,/SHA256 mismatch/);}
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
