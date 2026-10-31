const base=require('./playwright.config.cjs');
module.exports={...base,outputDir:'./results-remaining/test-results',reporter:[['line'],['json',{outputFile:'./results-remaining/playwright-results.json'}]]};
