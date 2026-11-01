const scenarios=require('./public-world-scenarios.cjs');
// Real public data only. The fixture forwards GET/HEAD, never account writes,
// models, follows, publication or messages. Fault fixtures are tested separately.
const {test,expect}=require('./public-world-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
const sourceId='bc0aa8ce-30fc-4a22-b42d-113a456f5e58'; // Public source actually returned for Number1820.
for(const width of[390,1440])test('real World writer source, findings, map and exact replay '+width,async({page},info)=>{
 test.setTimeout(180000);await scenarios.worldWriter(page,width,info,origin);
});
for(const width of[390,1440])test('real corpus text, unified word search, Topic and Number return '+width,async({page},info)=>{
 test.setTimeout(180000);await scenarios.worldCorpus(page,width,info,origin);
});
