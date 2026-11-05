// Actual built global SystemFrame, Raziel Provider, mobile sheet and desktop Companion.
// ALL non-local requests are intercepted; model responses are fixtures, never paid AI.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const answer = 'תשובת בדיקה — לא מודל חי.\nMatrix scan: English and עברית 583 → 239480\n' + 'LongEnglishReference'.repeat(20) + '\n' + 'ממצא מאומת במיקום שנבחר. '.repeat(70);
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml' };

test('global Raziel: three presets, 320/390/768/1440, mixed text, touch, keyboard and no automatic AI', { timeout:180000 }, async () => {
  assert.ok(existsSync(join(dist, '2029.html')), 'build the real 2029 app first');
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://test').pathname));
    const file = join(dist, path);
    const asset = file.startsWith(dist + '/') && existsSync(file) && statSync(file).isFile() ? file : join(dist, '2029.html');
    res.writeHead(200, { 'content-type': mime[extname(asset)] || 'application/octet-stream' }); res.end(readFileSync(asset));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless:true, executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':chromium.executablePath(), args:['--no-sandbox'] });
  const errors = [];
  try {
    for (const theme of ['light','parchment','dark']) for (const width of [320,390,768,1440]) {
      const context = await browser.newContext({ viewport:{width,height:900}, reducedMotion:'reduce' });
      await context.addInitScript(t => localStorage.setItem('sod-theme', t), theme);
      const page = await context.newPage(); let ai = 0;
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', route => {
        const req = route.request(), url = new URL(req.url());
        if (url.origin === origin) return route.continue();
        if (url.hostname !== 'linswmnnkjxvweumprav.supabase.co') return route.abort();
        const headers = {'access-control-allow-origin':'*', 'access-control-allow-headers':'*'};
        if (req.method() === 'OPTIONS') return route.fulfill({status:204,headers});
        let body = [];
        if (url.pathname.endsWith('/functions/v1/ai-analyze')) { ai++; body={analysis:answer,intelligence_level:'fast'}; }
        else if (url.pathname.endsWith('/rest/v1/site_flags')) body=['lock_world','lock_heichal','lock_raziel_site','lock_books','lock_number'].map(key=>({key,enabled:false,mode:'all'}));
        else if (!['GET','HEAD'].includes(req.method())) body={};
        return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)});
      });
      await page.goto(origin + '/2029');
      await page.locator('.sod29-command-island .sod29-raziel-orb').click();
      const chat = page.locator(width >= 1000 ? '[data-raziel-companion-view="open"] [data-raziel-native-chat="true"]' : '.sod29-frame-panel [data-raziel-native-chat="true"]');
      await chat.waitFor(); assert.equal(ai,0,'opening the real Raziel window never calls AI');
      assert.equal(await page.locator('html').getAttribute('data-theme-preset'),theme);
      const input=chat.getByRole('textbox',{name:'שאלה לרזיאל',exact:true});
      await input.fill('בדיקת עברית and English 2029');
      await chat.getByRole('button',{name:'שלח',exact:true}).click();
      await chat.locator('.sod29-raziel-chat-raziel > span').filter({hasText:'תשובת בדיקה'}).waitFor();
      assert.equal(ai,1,'one explicit submit, one intercepted request');
      const geometry = await chat.evaluate(el => {
        const r=el.getBoundingClientRect();
        const controls=[...el.querySelectorAll('button,input,a')].filter(n=>n.getClientRects().length);
        const body=el.querySelector('.sod29-raziel-chat-raziel > span');
        return {pageOverflow:document.documentElement.scrollWidth>innerWidth, chatOverflow:el.scrollWidth>el.clientWidth+1,
          outside:r.left < -1 || r.right>innerWidth+1,
          smallControls:controls.filter(n=>{const b=n.getBoundingClientRect();return b.width<43.5||b.height<43.5;}).map(n=>n.textContent||n.ariaLabel),
          smallType:controls.filter(n=>parseFloat(getComputedStyle(n).fontSize)<16).map(n=>n.textContent),
          bodySize:parseFloat(getComputedStyle(body).fontSize),bodyFamily:getComputedStyle(body).fontFamily,
          dir:body.getAttribute('dir'),bidi:getComputedStyle(body).unicodeBidi};
      });
      assert.deepEqual({...geometry,bodyFamily:undefined}, {pageOverflow:false,chatOverflow:false,outside:false,smallControls:[],smallType:[],bodySize:18,bodyFamily:undefined,dir:'auto',bidi:'plaintext'}, `${theme}/${width}: ${JSON.stringify(geometry)}`);
      assert.match(geometry.bodyFamily,/Noto Sans Hebrew/);
      {
        const keyboardHeight=width<1000?460:900;
        if(width<1000)
        assert.doesNotMatch(await page.locator('.sod29-frame-panel').innerText(), /Silence Gate|synthesis|Context בלבד|phrase:/);
        // Reduced viewport approximates keyboard space; no claim of an OS keyboard E2E.
        await page.setViewportSize({width,height:keyboardHeight}); await input.fill('טיוטה בלבד — no submit');
        await input.scrollIntoViewIfNeeded();
        const box=await input.boundingBox(); assert.ok(box.y>=0&&box.y+box.height<=keyboardHeight, 'composer reachable inside viewport');
        if(width<1000){
          const panel=await page.locator('.sod29-frame-panel').boundingBox();
          assert.ok(box.y+box.height<=panel.y+panel.height-1,'focused input is not clipped by the sheet edge');
        }
        await page.keyboard.press('Tab');
        assert.ok(await chat.getByRole('button',{name:'שלח',exact:true}).evaluate(n=>n===document.activeElement));
        await page.setViewportSize({width,height:900});
      }
      if(process.env.ELS_SCREENSHOT_DIR){mkdirSync(process.env.ELS_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:join(process.env.ELS_SCREENSHOT_DIR,`raziel-${theme}-${width}.png`)});}
      assert.equal(ai,1,'resizing, focus and theme do not trigger model requests');
      await context.close();
    }
  } finally {await browser.close();server.close();}
  assert.deepEqual(errors,[]);
});
