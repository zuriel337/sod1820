import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('connected palace derivatives stay lazy, fingerprinted, responsive and immutable',()=>{
 const source=fs.readFileSync('src/components/experience2029/RoyalBackdrop2029.jsx','utf8');
 const urls=[...source.matchAll(/"(\/backgrounds\/2029\/royal-connected-[^"]+)"/g)].map(x=>x[1]);
 assert.equal(urls.length,4);
 for(const url of urls){
  const bytes=fs.readFileSync('public'+url);
  assert.ok(url.includes(createHash('sha256').update(bytes).digest('hex').slice(0,12)));
  assert.ok(bytes.length < (url.includes('mobile') ? 30100 : 89135));
  for(const config of ['public-reading-deploy/vercel.json']){
   const rules=JSON.parse(fs.readFileSync(config)).headers;
   const idx=rules.findIndex(x=>x.source===url);
   assert.ok(idx>rules.findIndex(x=>x.source==='/(.*)'));
   assert.ok(rules[idx].headers.some(x=>x.key==='Cache-Control'&&x.value==='public, max-age=31536000, immutable'));
  }
 }
 assert.match(source,/type="image\/avif"/);assert.match(source,/type="image\/webp"/);assert.match(source,/fetchPriority="low"/);
 const frame=fs.readFileSync('src/components/experience2029/SystemFrame2029.jsx','utf8');
 const app=fs.readFileSync("src/App2029.jsx","utf8");
 assert.match(app,/lazy\(\(\) => import\("\.\/components\/experience2029\/RoyalBackdrop2029.jsx"\)\)/);
 assert.ok(app.indexOf("<RoyalBackdrop2029 />") < app.indexOf("<ResearchProvider>"));
 assert.doesNotMatch(frame,/RoyalBackdrop2029/);
 assert.match(frame,/introVariant === "none" \? "none"/);
 assert.match(frame,/filter\(item => item.key !== "page"\)/);
 assert.doesNotMatch(fs.readFileSync('src/components/experience2029/RoyalIntro2029.jsx','utf8'),/<picture/);
});

test('page statistics strips no longer mount or import their lazy readers',()=>{
 const callers=['src/pages/Calculator2029Page.jsx','src/pages/CalculatorPro2029Page.jsx','src/pages/CommunityCalculator2029Page.jsx','src/pages/Number2029Page.jsx','src/pages/Els2029Page.jsx','src/pages/PublicLibraryContinuity2029Page.jsx','src/components/experience2029/NowPublications2029.jsx'];
 for(const file of callers) assert.doesNotMatch(fs.readFileSync(file,'utf8'),/SectionPulseSlot2029|NowPulseLineSlot2029|CalculatorPulseLineSlot2029/);
 assert.ok(fs.existsSync('src/components/experience2029/SectionPulse2029.jsx'),'statistics capability is retained, only page-strip mounts removed');
});


test('retired page backgrounds and early fetches cannot compete with the App-owned image',()=>{
 for(const file of ['src/pages/community2029.css','src/pages/post2029-legacy-grade.css','src/components/experience2029/homeComposition2029.css','src/components/experience2029/guestNewsletterInvite2029.css'])
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/url\(|var\(--(?:post-background|home-atmosphere)/);
 assert.doesNotMatch(fs.readFileSync('src/components/experience2029/GuestNewsletterInvite2029.jsx','utf8'),/HOME_ATMOSPHERE/);
 const early=fs.readFileSync('src/lib/homeAtmospherePreload2029.js','utf8').split('function run()')[1];
 assert.doesNotMatch(early,/createElement|appendChild|homeAtmospherePreloadHref/);
 assert.match(early,/startHomePinnedLeadEarly2029/);
 assert.doesNotMatch(fs.readFileSync('src/lib/research/post2029ReadingProjection.js','utf8'),/preloadPostBackground2029/);
});
