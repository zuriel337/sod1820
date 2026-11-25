import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

test('connected palace derivatives are document-owned, fingerprinted, responsive and immutable',()=>{
 const source=fs.readFileSync('src/lib/brandAssets2029.js','utf8');
 const document=fs.readFileSync('scripts/lib/royal-backdrop-document.mjs','utf8');
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
 assert.match(document,/type="image\/avif"/);assert.match(document,/type="image\/webp"/);assert.match(document,/fetchpriority="low"/);
 const frame=fs.readFileSync('src/components/experience2029/SystemFrame2029.jsx','utf8');
 const app=fs.readFileSync("src/App2029.jsx","utf8");
 assert.doesNotMatch(app,/RoyalBackdrop/,'no React mount or client dependency delays the document background');
 assert.match(document,/replace\(\/<body/,'picture belongs to the document outside React root');
 assert.match(fs.readFileSync('vite.config.js','utf8'),/transformIndexHtml: royalBackdropDocument2029/);
 assert.doesNotMatch(frame,/RoyalBackdrop2029/);
 assert.match(frame,/introVariant === "none" \? "none"/);
 assert.match(frame,/filter\(item => item.key !== "page"\)/);
 assert.doesNotMatch(fs.readFileSync('src/components/experience2029/RoyalIntro2029.jsx','utf8'),/<picture/);
});

test('approved number and cipher strips remain available while other pages keep their layout',()=>{
 // The calculator pages keep NO pulse strip. «עכשיו» is the one reconnected place (ZURIEL 25.11.2026): «דופק האתר», mounted exactly once, nothing else of the pulse family.
 const callers=['src/pages/Calculator2029Page.jsx','src/pages/CalculatorPro2029Page.jsx','src/pages/CommunityCalculator2029Page.jsx'];
 for(const file of callers) assert.doesNotMatch(fs.readFileSync(file,'utf8'),/SectionPulseSlot2029|NowPulseLineSlot2029|CalculatorPulseLineSlot2029/);
 const now=fs.readFileSync('src/components/experience2029/NowPublications2029.jsx','utf8');
 assert.doesNotMatch(now,/SectionPulseSlot2029|CalculatorPulseLineSlot2029/);
 assert.equal((now.match(/<NowPulseLineSlot2029\b/g)||[]).length,1,'the Now pulse line is mounted once');
 // ZURIEL 25.11.2026 (no empty places on the Home either): the same line, mounted once on the Home, lazily.
 assert.equal((fs.readFileSync('src/components/experience2029/HomeComposition2029.jsx','utf8').match(/<NowPulseLineSlot2029\b/g)||[]).length,1,'the Home mounts the pulse line once');
 for(const [file, mount] of [
   ['Number2029Page', '<SectionPulseSlot2029 inline section="number" value={root} />'],
   ['Els2029Page', '<SectionPulseSlot2029 section="els" />'],
   ['PublicLibraryContinuity2029Page', 'kind === "codes" ? <SectionPulseSlot2029 section="els" />'],
 ]) assert.ok(fs.readFileSync('src/pages/'+file+'.jsx','utf8').includes(mount), file);
 assert.ok(fs.existsSync('src/components/experience2029/SectionPulse2029.jsx'),'statistics capability is retained, only page-strip mounts removed');
});


test('retired page backgrounds and early fetches cannot compete with the document-owned image',()=>{
 for(const file of ['src/pages/community2029.css','src/pages/post2029-legacy-grade.css','src/components/experience2029/homeComposition2029.css','src/components/experience2029/guestNewsletterInvite2029.css'])
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/url\(|var\(--(?:post-background|home-atmosphere)/);
 assert.doesNotMatch(fs.readFileSync('src/components/experience2029/GuestNewsletterInvite2029.jsx','utf8'),/HOME_ATMOSPHERE/);
 const early=fs.readFileSync('src/lib/homeAtmospherePreload2029.js','utf8').split('function run()')[1];
 assert.doesNotMatch(early,/createElement|appendChild|homeAtmospherePreloadHref/);
 assert.match(early,/startHomePinnedLeadEarly2029/);
 assert.doesNotMatch(fs.readFileSync('src/lib/research/post2029ReadingProjection.js','utf8'),/preloadPostBackground2029/);
});
