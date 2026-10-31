const {createInterface}=require('node:readline'),{spawnSync}=require('node:child_process'),fs=require('node:fs');
(async()=>{
  let access;const input=createInterface({input:process.stdin});for await(const line of input){access=line.trim();input.close();process.stdin.pause();break;}
  if(!access||!access.startsWith('https://sod1820-26of53pw9-sod1820-s-projects.vercel.app/'))throw new Error();
  const cookieState=await require('./bootstrap-access.cjs')(access);
  const titles=JSON.parse(fs.readFileSync(__dirname+'/remaining-auth-titles.json','utf8'));
  const grep=titles.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const env={...process.env,PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS:'1',SOD_PREVIEW_ACCESS_URL:access,SOD_VERCELOAUTH_STATE:cookieState,SOD_GUARD_PREFLIGHT_PASSED:'1',SOD_WORLD_PRE_CUTOVER_FIXTURE:'1'};
  const result=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','--config','playwright.remaining.config.cjs','--grep',grep],{cwd:__dirname,env,stdio:'inherit'});
  process.exitCode=result.status??2;
})().catch(()=>{console.error('Remaining infrastructure retry failed; credentials withheld');process.exitCode=2;});
