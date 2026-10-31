const base=require('./playwright.config.cjs');
module.exports={...base,workers:1,outputDir:'./results-focused-retry/test-results',reporter:[['line'],['json',{outputFile:'./results-focused-retry/playwright-results.json'}]]};
