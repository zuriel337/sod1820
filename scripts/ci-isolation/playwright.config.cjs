const {browserArgs}=require('./policy.cjs');
module.exports={testDir:'../../tests',workers:1,use:{serviceWorkers:'block',launchOptions:{executablePath:process.env.PERF_CHROME,args:browserArgs}}};
