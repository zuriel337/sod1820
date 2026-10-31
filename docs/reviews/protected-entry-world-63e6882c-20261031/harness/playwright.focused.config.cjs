const base=require('./playwright.config.cjs');
module.exports={...base,workers:1,outputDir:'./results-focused/test-results',reporter:[['line'],['json',{outputFile:'./results-focused/playwright-results.json'}]]};
