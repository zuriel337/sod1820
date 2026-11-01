const scenarios=require('./public-world-scenarios.cjs');
const {test,expect}=require('./public-world-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
for(const width of[390,1440])test('actual Home river opens the exact public gallery image and returns '+width,async({page},info)=>{
 test.setTimeout(180000);await scenarios.riverGallery(page,width,info,origin);
});
for(const width of[390,1440])test('actual Post Number full page and exact source-region return '+width,async({page},info)=>{
 test.setTimeout(180000);await scenarios.postNumberReturn(page,width,info,origin);
});
