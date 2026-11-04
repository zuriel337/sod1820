const {test}=require('./public-world-readonly-fixture.cjs');const scenarios=require('./public-reading-release-scenarios.cjs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
for(const width of [390,1440])for(const name of ['calculator','closedScope'])test(name+' '+width,async({page},info)=>{test.setTimeout(180000);await scenarios[name](page,width,info,origin);});
for(const width of [1440,1920])test('public Plane centered '+width,async({page},info)=>{test.setTimeout(120000);await scenarios.desktopPostCenter(page,width,info,origin);});

for(const width of [1440,1920])test('Bennett controlled layout only '+width,async({page},info)=>{test.setTimeout(120000);await scenarios.bennettFixtureCenter(page,width,info,origin);});
