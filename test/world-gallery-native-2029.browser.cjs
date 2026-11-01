const {test}=require('./public-world-readonly-fixture.cjs'),scenarios=require('./world-gallery-native-scenarios.cjs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4271';
for(const width of[390,1440])for(const name of Object.keys(scenarios))test(name+' '+width,async({page},info)=>{
 test.setTimeout(360000);await page.setViewportSize({width,height:900});await scenarios[name](page,width,info,origin);
});
