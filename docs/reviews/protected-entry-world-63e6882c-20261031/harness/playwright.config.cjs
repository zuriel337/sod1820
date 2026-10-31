module.exports={
  testDir:'./tests',workers:2,retries:0,timeout:60000,
  outputDir:'./results/test-results',
  reporter:[['line'],['json',{outputFile:'./results/playwright-results.json'}]],
  use:{headless:true,locale:'he-IL',serviceWorkers:'allow',
    launchOptions:{executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],
      ...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}}:{})}},
};
