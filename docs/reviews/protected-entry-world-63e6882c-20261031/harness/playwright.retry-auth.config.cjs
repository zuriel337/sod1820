const base=require('./playwright.config.cjs');
module.exports={...base,outputDir:'./results-retry-auth/test-results',reporter:[['line'],['json',{outputFile:'./results-retry-auth/playwright-results.json'}]]};
