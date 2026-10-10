const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const BASE='http://127.0.0.1:4173';
const OUT=process.env.KINGDOM_ARTIFACTS||'test-results/kingdom';
test.use({launchOptions:{executablePath:process.env.KINGDOM_CHROMIUM||'/usr/bin/chromium',args:['--enable-unsafe-swiftshader']}});
test('measure initial map, optional outlines and explicit GPU loading boundaries',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:390,height:844});
  await page.route('**/*',route=>new URL(route.request().url()).origin===BASE?route.continue():route.abort());
  await page.addInitScript(()=>{
    window.kingdomLongTasks=[];
    new PerformanceObserver(list=>window.kingdomLongTasks.push(...list.getEntries().map(x=>({start:x.startTime,duration:x.duration})))).observe({type:'longtask',buffered:true});
  });
  const requested=[];
  page.on('request',r=>requested.push(r.url()));
  await page.goto(BASE+'/2029/kingdom');
  await page.getByRole('button',{name:'כניסה לממלכה',exact:true}).click();
  await expect(page.locator('.kingdom-world-art')).toBeVisible();
  expect(requested.filter(x=>/SpatialGlyphScene2029|GlyphVolume2029/.test(x))).toEqual([]);
  await expect(page.locator('canvas')).toHaveCount(0);
  const snapshot=()=>page.evaluate(()=>({elapsedMs:performance.now(),longTasks:window.kingdomLongTasks,
    resources:performance.getEntriesByType('resource').filter(x=>x.name.startsWith(location.origin)).map(x=>({name:new URL(x.name).pathname,transferSize:x.transferSize,encodedBodySize:x.encodedBodySize,duration:x.duration})),
    heapBytes:performance.memory?.usedJSHeapSize||null,svgElements:document.querySelectorAll('.kingdom-world-art *').length}));
  const initial=await snapshot();
  await page.getByLabel('התשובה שלכם',{exact:true}).fill('3');
  await page.evaluate(()=>{
    document.querySelector('.kingdom form').addEventListener('submit',()=>{
      const start=performance.now();
      const observer=new MutationObserver(()=>{
        if(document.querySelector('[data-testid="light"]').textContent==='20') {
          observer.disconnect();requestAnimationFrame(()=>window.kingdomFeedbackMs=performance.now()-start);
        }
      });
      observer.observe(document.querySelector('[data-testid="light"]'),{childList:true,subtree:true,characterData:true});
    },{capture:true,once:true});
  });
  await page.getByRole('button',{name:'בדיקת התשובה'}).click();
  await expect(page.getByTestId('light')).toHaveText('20');
  await page.waitForFunction(()=>Number.isFinite(window.kingdomFeedbackMs));
  const interactionMs=await page.evaluate(()=>window.kingdomFeedbackMs);
  await page.getByRole('button',{name:'מבט מקרוב באותיות'}).click();
  await expect(page.locator('.sod29-glyph-scene')).toHaveAttribute('data-renderer','outline');
  expect(requested.some(x=>/SpatialGlyphScene2029/.test(x))).toBe(true);
  expect(requested.some(x=>/GlyphVolume2029/.test(x))).toBe(false);
  const outlines=await snapshot();
  const gpuStart=Date.now();
  await page.getByRole('button',{name:'הפעלת תלת־ממד'}).click();
  await expect(page.locator('.sod29-glyph-scene')).toHaveAttribute('data-renderer','gpu',{timeout:20000});
  const gpuReadyMs=Date.now()-gpuStart;
  const gpu=await snapshot();
  expect(requested.some(x=>/GlyphVolume2029/.test(x))).toBe(true);
  await page.getByRole('button',{name:'סגירת מרחב האותיות'}).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  const root=path.resolve('dist/kingdom-preview/assets');
  const bundles=fs.readdirSync(root).filter(n=>/^(Kingdom2029Page|SpatialGlyphScene2029|GlyphVolume2029)-.*\.js$/.test(n)).map(name=>{
    const bytes=fs.readFileSync(path.join(root,name));return {name,bytes:bytes.length,gzipBytes:zlib.gzipSync(bytes).length,brotliBytes:zlib.brotliCompressSync(bytes).length};
  });
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(path.join(OUT,'performance.json'),JSON.stringify({environment:'headless Chromium / SwiftShader, local HTTP; compression sizes are offline estimates, not physical-device metrics',interactionMs,gpuReadyMs,initial,outlines,gpu,bundles},null,2));
});
