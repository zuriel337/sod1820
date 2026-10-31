import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

test('golden river: larger dated images, stable page, no same-source scroll commits, keyboard/drag and return', async () => {
  const fixture = `import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';
    import{RealityRiver2029}from'/src/components/research/RealityRiver2029.jsx';
    const picture='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420"><rect width="700" height="420" fill="goldenrod"/><text x="100" y="230" font-size="80">456 · 45</text></svg>');
    const items=Array.from({length:12},(_,i)=>({galleryImageId:'image-'+i,imageUrl:picture,thumbUrl:picture,
      streamAddedAt:'2026-10-04T14:41:48Z',
      streamHref:'/world?view=gallery&gallery=105&image=image-'+i+'#gallery-source-image-'+i,
      legacyPlacement:{galleryName:'גלרית דוד 24',originalName:i===0?'עדכון 2/3/2021 תמונה 1':'תמונה '+(i+1),originalCaption:'כיתוב מקור מלא לקריאה. אותה תמונה, אותו מקור ואותו סיפור.'.repeat(i%2?15:1)},storedNumbers:{primary:456,all:[456,45]}}));
    window.__riverCommits=0;createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,null,React.createElement('div',{style:{display:'flex',flexDirection:'column',width:'100%',minWidth:0}},React.createElement(React.Profiler,{id:'river',onRender:()=>window.__riverCommits++},React.createElement(RealityRiver2029,{items})))));`;
  const server = await createServer({ configFile: false, root: process.cwd(), server: { host: '127.0.0.1', port: 0, watch: {ignored:['**/preview-deploy/**','**/dist/**']} }, plugins: [react(), {
    name: 'river-browser-fixture', configureServer(s) { s.middlewares.use(async (req,res,next) => {
      if(req.url?.split('?')[0] !== '/river-fixture/') return next();
      res.setHeader('Content-Type','text/html');
      res.end(await s.transformIndexHtml(req.url, '<html dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0b0b0c;--s29-ink:#f5f5f0;--s29-muted:#c6c6c1;--s29-panel:#171719;--s29-panel-soft:#202023;--s29-page:#0b0b0c;--s29-line:#625943;--s29-warm-accent:#d4af37;--s29-accent-text:#a8c7ff;--s29-font-ui:Arial;--s29-font-body:Arial;--s29-font-numeric:monospace}*{box-sizing:border-box}</style><div id="root"></div><script type="module" src="/river-fixture.jsx"></script></html>'));
    }); },
    resolveId(id) { if(id==='/river-fixture.jsx')return '\0river-fixture.jsx'; },
    load(id) { if(id==='\0river-fixture.jsx') return fixture; }
  }] });
  await server.listen();
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args:['--no-sandbox','--disable-dev-shm-usage'] });
  try {
    await mkdir('/tmp/reality-river-2029',{recursive:true});
    for(const width of [320,390,1440]) {
      const page = await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('river fixture:',error.message);});
      await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/river-fixture/`);
      await page.locator('[data-river-image]').first().waitFor();
      await page.locator('.r29-picture img').first().evaluate(im=>im.decode());
      assert.equal(await page.locator('[data-river-image]').count(),12);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const view=page.getByRole('region',{name:'התמונות בזרם — אפשר לגלול'});
      assert.ok(await view.evaluate(el=>[...el.querySelectorAll('[data-river-image]')].filter(c=>c.getBoundingClientRect().top<el.getBoundingClientRect().bottom&&c.getBoundingClientRect().bottom>el.getBoundingClientRect().top).length>=2));
      assert.equal(await page.locator('.r29-image-date time').nth(0).innerText(),'02.03.2021');
      assert.equal(await page.locator('.r29-image-date time').nth(1).innerText(),'04.10.2026');
      assert.match(await page.locator('.r29-image-date').nth(1).innerText(),/נוסף לזרם/);
      assert.match(await page.locator('.r29-gallery-name').first().innerText(),/גלרית דוד 24/);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const stationaryCommits=await page.evaluate(()=>window.__riverCommits);
      await view.evaluate(async el=>{for(let i=1;i<=20;i++){el.scrollTop=i;await new Promise(requestAnimationFrame);}});
      assert.equal(await page.evaluate(()=>window.__riverCommits),stationaryCommits,'scroll inside same source must not rerender React tree');
      const pageHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
      const initialWidth=(await page.locator('[data-reality-river]').boundingBox()).width;
      const detailHeight=await page.locator('.r29-detail').evaluate(el=>el.getBoundingClientRect().height);
      const photo=page.locator('.r29-picture img').first();
      assert.ok(await photo.evaluate(im=>{const r=im.getBoundingClientRect();return Math.abs(r.width/r.height-im.naturalWidth/im.naturalHeight)<.02;}),'image keeps its natural ratio (no crop)');
      assert.ok(await page.locator('.r29-image-date').first().evaluate(el=>{const d=el.getBoundingClientRect(),s=el.closest('.r29-image-surface').getBoundingClientRect();return d.left>=s.left&&d.right<=s.right&&d.top>=s.top&&d.bottom<=s.bottom;}),'date pill stays inside its image');
      assert.equal(await page.locator('.r29-ticks i').count(),12,'one rail mark per picture');
      assert.equal(await page.locator('.r29-picture-meta .r29-num').first().innerText(),'456','stored number tag is the hero chip beside the picture');
      assert.match(await page.locator('.r29-picture-meta .r29-num').first().getAttribute('href'),/456/);
      assert.equal(await page.locator('.r29-picture img').first().evaluate(el=>getComputedStyle(el).objectFit),'contain');
      const handle=page.getByRole('slider',{name:'ידית הגלילה של זרם המציאות'});
      await handle.focus();await handle.press('End');
      await page.waitForFunction(()=>document.querySelector('.r29-window').scrollTop>300);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),pageHeight,'changing source/caption must not change page height');
      assert.equal((await page.locator('[data-reality-river]').boundingBox()).width,initialWidth,'memory thumbnails cannot widen a flex-hosted river');
      assert.equal(await page.locator('.r29-detail').evaluate(el=>el.getBoundingClientRect().height),detailHeight,'story panel keeps a fixed height across short/long captions');
      assert.ok(await page.locator('.r29-ticks i').last().evaluate(t=>{const r=t.closest('.r29-rail').getBoundingClientRect(),y=t.getBoundingClientRect().top-r.top;return y>r.height*.8&&y<=r.height;}),'last rail mark sits at the end of the rail');
      console.log(JSON.stringify({width,sameSourceScrollCommits:0,pageHeightStable:true}));
      assert.ok(await page.locator('.r29-memory button').count()>1);
      await page.getByRole('button',{name:'חזרה לתמונה 1',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.r29-window').scrollTop<20);
      await handle.scrollIntoViewIfNeeded();
      const rect=await handle.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height*.15);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height*.7,{steps:6});await page.mouse.up();
      await page.waitForFunction(()=>document.querySelector('.r29-window').scrollTop>200);
      assert.match(await page.locator('.r29-open').getAttribute('href'),/gallery=105&image=image-/);
      assert.equal(await page.locator('.r29-detail h3').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=(innerWidth<=760?17:21)),true); // compact floating tray on phones
      assert.deepEqual(errors,[]);
      await page.screenshot({path:`/tmp/reality-river-2029/frame-${width}.png`,fullPage:true});
      for(const preset of ['light','parchment','dark']){
        await page.evaluate(async preset=>{
          const {resolve2029Palette}=await import('/src/lib/palette.js'),p=resolve2029Palette(preset);
          for(const [key,value]of Object.entries({'page':p.pageBg,'panel':p.card,'panel-soft':p.cardSoft,'line':p.border,'ink':p.ink,'muted':p.inkSoft,'warm-accent':p.warmAccent,'accent-text':p.accentText}))document.body.style.setProperty('--s29-'+key,value);
          document.body.style.background=p.pageBg;
        },preset);
        // Colour roles are resolved by the shared palette owner (Design V2 shared treatment): numbers=identity, share=discovery, actions/selection=action.
        const roles=await page.evaluate(async preset=>{
          const {setThemePreset}=await import('/src/lib/themeMode.js');setThemePreset(preset);await new Promise(r=>setTimeout(r,80));
          const {resolve2029Palette,resolveTreatment}=await import('/src/lib/palette.js'),p=resolve2029Palette(preset),want=k=>resolveTreatment(p,{purpose:k}).fg,got=sel=>document.querySelector(sel)?.style.getPropertyValue('--tr-fg').trim()??null;
          return {number:[got('.r29-num'),want('identity')],detailNumber:[got('.r29-numbers a'),want('identity')],share:[got('.r29-share'),want('discovery')],action:[got('.r29-river'),want('action')]};
        },preset);
        for(const [role,[actual,expected]] of Object.entries(roles))if(actual!==null||role!=='share')assert.equal(actual,expected,`${preset}/${width}: ${role} colour comes from the shared treatment resolver`);
        assert.equal(await page.locator('.r29-memory button[aria-current=true]').count(),1,'exactly one selected return thumbnail');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.screenshot({path:`/tmp/reality-river-2029/frame-${preset}-${width}.png`,fullPage:true});
      }
      await page.close();
    }
  } finally {await browser.close();await server.close();}
});
