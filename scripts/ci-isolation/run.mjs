import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,spawn} from 'node:child_process';
const dir=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);if(args[0]==='--')args.shift();
if(!args.length)throw new Error('Command required');
if(process.platform!=='linux')throw new Error('Linux network boundary required; no unguarded fallback');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'sod-ci-isolation-'));
const audit=path.join(scratch,'violations.log'),ports=path.join(scratch,'ports'),library=path.join(scratch,'network-guard.so');
fs.writeFileSync(audit,'');fs.writeFileSync(ports,'');
const cc=spawnSync('cc',['-shared','-fPIC','-O2','-Wall','-Wextra','-o',library,path.join(dir,'network-guard.c'),'-ldl'],{stdio:'inherit'});
if(cc.status!==0)throw new Error('Cannot install native network boundary');
const env={...process.env,SOD_CI_ISOLATION:'1',SOD_CI_AUDIT:audit,SOD_CI_PORTS:ports,LD_PRELOAD:library,
  NODE_OPTIONS:`--require=${path.join(dir,'node-preload.cjs')}`,npm_config_offline:'true',npm_config_audit:'false',npm_config_fund:'false',npm_config_update_notifier:'false',NPM_CONFIG_OFFLINE:'true',NPM_CONFIG_AUDIT:'false',NPM_CONFIG_FUND:'false',NPM_CONFIG_UPDATE_NOTIFIER:'false'};
// Discard inherited credentials/proxies for the isolated child. Dependency setup
// is a separate reviewed phase; this never alters the host network configuration.
for(const key of Object.keys(env))if(/proxy|token|secret|password|api_key|service_role|^supabase_/i.test(key))delete env[key];
const child=spawn(args[0],args.slice(1),{env,stdio:'inherit'});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>child.kill(sig));
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('close',code=>{
  const violations=fs.readFileSync(audit,'utf8');
  if(process.env.SOD_CI_AUDIT_OUT)fs.copyFileSync(audit,process.env.SOD_CI_AUDIT_OUT);
  if(violations.trim()){console.error(`CI_EGRESS_FAILURE (child exit ${code}):\n${violations}`);process.exitCode=1;}
  else process.exitCode=code===0?0:1;
});
