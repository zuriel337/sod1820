const {test}=require('./public-world-readonly-fixture.cjs');
const {galleryPrivacyFault}=require('./public-world-scenarios.cjs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
for(const width of[390,1440])test('controlled gallery privacy, failure, deduplication and withdrawn-source refresh '+width,async({page},info)=>{
 test.setTimeout(180000);await galleryPrivacyFault(page,width,info,origin);
});
