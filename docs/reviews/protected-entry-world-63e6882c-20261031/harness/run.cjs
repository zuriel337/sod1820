const {createInterface}=require('node:readline'),{spawnSync}=require('node:child_process');
(async()=>{
  let access;const input=createInterface({input:process.stdin});for await(const line of input){access=line.trim();input.close();process.stdin.pause();break;}
  if(!access||!access.startsWith('https://sod1820-26of53pw9-sod1820-s-projects.vercel.app/'))throw new Error('Private access input missing');
  const env={...process.env,PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS:'1'};
  const proof=spawnSync(process.execPath,['guard-preflight.cjs'],{cwd:__dirname,env,stdio:'inherit'});if(proof.status!==0)process.exit(2);
  const run=spawnSync(process.execPath,['node_modules/@playwright/test/cli.js','test','--config','playwright.config.cjs','--grep-invert','Number 2029 global drawer reuses the same method-first Core and carries Raziel context|direct Post opens Number; contextual teaching and help retain the same focus at 390px|completed Post entry stays compact after reload'],{cwd:__dirname,env:{...env,SOD_PREVIEW_ACCESS_URL:access,SOD_GUARD_PREFLIGHT_PASSED:'1',SOD_WORLD_PRE_CUTOVER_FIXTURE:'1'},stdio:'inherit'});
  process.exitCode=run.status??2;
})().catch(()=>{console.error('Protected acceptance runner failed; credentials withheld');process.exitCode=2;});
