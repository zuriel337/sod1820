// Old and new Number addresses in the public release, in a real browser. Read-only transport (public-frame-readonly-fixture denies
// every write and every non-allowlisted read); no account, no model call (any request to a model endpoint fails the test).
// Run against a public-release build served at SOD_ACCEPTANCE_ORIGIN (default http://127.0.0.1:4251).
const {test,expect}=require('./public-frame-readonly-fixture.cjs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
const watchModels=page=>{const attempts=[];page.on('request',request=>{if(/\/api\/preview-raziel|\/functions\/v1\/(?:ai-analyze|research-run|els-matrix-reading)/.test(request.url()))attempts.push(new URL(request.url()).pathname);});return attempts;};
const numberPage=page=>page.locator('.sod29-number-page');
const heading=page=>page.locator('.sod29-number-v10-expression-line>:is(h1,strong)');

for(const width of[390,1440])test('the older /2029/number address and the leading zero reach the one canonical /number address; query, fragment and expression are kept '+width,async({page})=>{
 test.setTimeout(150000);await page.setViewportSize({width,height:900});const models=watchModels(page);
 // Old spelling with a query and a fragment: one replace, no extra history entry.
 await page.goto(origin+'/2029/number/1820?source=connection&part=2&part=7#number-essential');
 await expect(numberPage(page)).toHaveAttribute('data-number-root','1820',{timeout:60000});
 let url=new URL(page.url());expect(url.pathname).toBe('/number/1820');expect(url.search).toBe('?source=connection&part=2&part=7');expect(url.hash).toBe('#number-essential');
 expect(await page.evaluate(()=>history.length)).toBeLessThanOrEqual(2);
 // New spelling opened directly.
 await page.goto(origin+'/number/1820');await expect(numberPage(page)).toHaveAttribute('data-number-root','1820',{timeout:60000});expect(new URL(page.url()).pathname).toBe('/number/1820');
 // A number with leading zeros goes to the number without them (the real zero of a value such as 10 stays).
 await page.goto(origin+'/number/01820?x=1');await expect(numberPage(page)).toHaveAttribute('data-number-root','1820',{timeout:60000});
 url=new URL(page.url());expect(url.pathname).toBe('/number/1820');expect(url.search).toBe('?x=1');
 await page.goto(origin+'/number/10');await expect(numberPage(page)).toHaveAttribute('data-number-root','10',{timeout:60000});expect(new URL(page.url()).pathname).toBe('/number/10');
 // An expression keeps its own address (never replaced by the number it computes to), in both spellings.
 const expression='משיח',encoded=encodeURIComponent(expression);
 await page.goto(origin+'/number/'+encoded);await expect(heading(page)).toHaveText(expression,{timeout:60000});expect(new URL(page.url()).pathname).toBe('/number/'+encoded);
 await page.goto(origin+'/2029/number/'+encoded);await expect(heading(page)).toHaveText(expression,{timeout:60000});expect(new URL(page.url()).pathname).toBe('/number/'+encoded);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 expect(models).toEqual([]);
});

for(const start of['/number/358','/2029/number/358'])for(const width of[390,1440])test('an expression chosen on the Number page stays in the address and the stored context and the return goes back to the number, from '+start+' at '+width,async({page})=>{
 test.setTimeout(150000);await page.setViewportSize({width,height:900});const models=watchModels(page);
 await page.goto(origin+start);const page358=numberPage(page);await expect(page358).toHaveAttribute('data-number-root','358',{timeout:60000});
 expect(new URL(page.url()).pathname).toBe('/number/358');
 const chip=page.locator('[data-experience-capability="number-regular-expressions"] button').filter({hasText:'משיח'}).first();
 await expect(chip).toBeVisible({timeout:60000});await chip.click();
 await expect.poll(()=>{const u=new URL(page.url());return[u.pathname,u.searchParams.get('focus')];},{timeout:30000}).toEqual(['/number/358','משיח']);
 await expect(heading(page)).toHaveText('משיח');
 const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')||'null'));
 expect(JSON.stringify(stored)).toContain('משיח');expect(String(stored?.subject?.href||'')).toMatch(/^\/number\/358/);
 // Reload keeps the expression; the address is replayable.
 await page.reload();await expect(heading(page)).toHaveText('משיח',{timeout:60000});expect(new URL(page.url()).searchParams.get('focus')).toBe('משיח');
 // The return button restores the number address without the expression.
 const back=page.getByRole('button',{name:/^↩ /}).first();await expect(back).toBeVisible({timeout:30000});await back.click();
 await expect.poll(()=>{const u=new URL(page.url());return[u.pathname,u.searchParams.get('focus')];},{timeout:30000}).toEqual(['/number/358',null]);
 await expect(page358).toHaveAttribute('data-number-root','358');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 expect(models).toEqual([]);
});
