const base=require(process.env.PLAYWRIGHT_DIR+'/node_modules/@playwright/test');
const isolation=require('../scripts/ci-isolation/policy.cjs');
const {installStorageEgressGuard}=require('./playwright-storage-egress-guard.cjs');
const test=base.test.extend({
  context:async({browser},use)=>{
    const context=await browser.newContext({serviceWorkers:'block'});
    await installStorageEgressGuard(context);
    try{await use(context);}finally{await context.close();isolation.assertClean();}
  },
});
module.exports={test,expect:base.expect};
