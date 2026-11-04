const {test,expect}=require('../docs/reviews/public-foundation-20261101/evidence/safe-local-fixture.cjs');
const fs=require('node:fs');
const base=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4196';
const modern='/post/flydubai-fz1073-363-14000-remzei-geula';
const readContext=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')||'null'));
async function menuWorld(page,width){
 if(width<=980){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('link',{name:'העולם',exact:true}).click();}
 else await page.locator('.sod29-sidebar a[href="/world"]').click();
 await expect(page.locator('.sod29-root.surface-world')).toBeVisible({timeout:30000});
}
async function island(page){
 const bar=page.locator('.sod29-command-island');await expect(bar).toBeVisible({timeout:30000});
 const geometry=await bar.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height,viewport:innerWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,targets:[...e.querySelectorAll(':scope>button')].map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height};})};});
 expect(geometry.x).toBeGreaterThanOrEqual(8);expect(Math.abs(geometry.x+geometry.width/2-geometry.viewport/2)).toBeLessThan(1);
 expect(geometry.width).toBeLessThanOrEqual(331);expect(geometry.height).toBeLessThanOrEqual(70);expect(geometry.overflow).toBe(false);
 for(const r of geometry.targets){expect(r.w).toBeGreaterThanOrEqual(44);expect(r.h).toBeGreaterThanOrEqual(44);}
 await expect(page.locator('.sod29-companion')).toHaveCount(0);return geometry;
}
for(const width of [320,390,768,1440])test('compact centered island and no Companion across public/direct/closed pages '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});const results=[];
 for(const path of ['/',modern,'/world','/number/1820','/number/'+encodeURIComponent('בראשית'),'/post','/gallery','/privacy','/updates','/map','/missing-frame-context','/code?library=mine','/2029/journey']){
  await page.goto(base+path);results.push({path,...await island(page)});
 }
 fs.writeFileSync(info.outputPath('geometry.json'),JSON.stringify(results,null,2));await page.screenshot({path:info.outputPath('closed-page.png')});
});
for(const width of [320,390,1440])test('personal card follows panel width, including a narrow panel on wide screen '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto(base+'/');await expect(page.locator('.h29-hero')).toBeVisible();await page.locator('.sod29-header-workspace').click();
 const card=page.locator('.sod29-workspace-raziel-presence');await expect(card).toBeVisible();
 const results=[];
 for(const panelWidth of width===1440?[null,480,360]:[null]){
  if(panelWidth)await page.locator('[data-panel-kind="workspace"]').evaluate((e,w)=>e.style.setProperty('width',w+'px','important'),panelWidth);
  const values=await card.evaluate(e=>{const copy=e.querySelector('.sod29-workspace-raziel-copy'),actions=e.querySelector('.sod29-workspace-raziel-actions');return {cardWidth:e.getBoundingClientRect().width,copyWidth:copy.getBoundingClientRect().width,actionsTop:actions.getBoundingClientRect().top,copyBottom:copy.getBoundingClientRect().bottom,overflow:e.scrollWidth>e.clientWidth+1};});
  expect(values.copyWidth).toBeGreaterThanOrEqual(170);expect(values.actionsTop).toBeGreaterThanOrEqual(values.copyBottom-1);expect(values.overflow).toBe(false);results.push({panelWidth,...values});
 }
 await expect(card.getByRole('button',{name:'רזיאל נעול זמנית',exact:true})).toBeDisabled();
 fs.writeFileSync(info.outputPath('personal-layout.json'),JSON.stringify(results,null,2));await page.screenshot({path:info.outputPath('personal.png')});
});
for(const width of [390,1440])test('More, Actions, Tools, canonical share and keyboard return '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.__frameCopied=value;}}}));
 await page.goto(base+modern+'?part=7&_vercel_share=synthetic-grant#post-story');await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});
 const before=await readContext(page),more=page.locator('.sod29-command-island').getByRole('button',{name:/^עוד/});await more.click();
 let panel=page.getByRole('dialog',{name:'עוד',exact:true});await expect(panel).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(1);
 await expect(panel.locator('[data-share-owner="ShareActions"]')).toBeVisible();await panel.locator('[data-action="copy"]').click();
 const copied=new URL(await page.evaluate(()=>window.__frameCopied));expect(copied.origin).toBe('https://sod1820.co.il');expect(copied.pathname).toBe(modern);expect(copied.searchParams.get('part')).toBe('7');expect(copied.searchParams.has('_vercel_share')).toBe(false);expect(copied.hash).toBe('#post-story');
 await panel.getByRole('button',{name:'פעולות',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(1);await page.getByRole('button',{name:'חזרה לעוד',exact:true}).click();
 await page.getByRole('dialog',{name:'עוד',exact:true}).getByRole('button',{name:'כלים',exact:true}).click();panel=page.getByRole('dialog',{name:'כלים',exact:true});await expect(panel).toBeVisible();await expect(panel.getByRole('button',{name:/ELS.*למנהל בלבד/})).toBeDisabled();
 await panel.getByRole('button',{name:'חזרה לעוד',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(more).toBeFocused();
 const after=await readContext(page);expect(after.subject).toEqual(before.subject);expect(after.selection).toEqual(before.selection);expect(after.journey).toEqual(before.journey);await island(page);await page.screenshot({path:info.outputPath('post-and-context.png')});
});
const pathState={version:1,subject:{id:'1820',type:'number',label:'1820',href:'/number/1820'},selection:{entityId:'1820',entityType:'number'},lens:'world',journey:{id:'11111111-1111-4111-8111-111111111111',kind:'research_path',position:1,revisionId:'22222222-2222-4222-8222-222222222222',pendingSteps:[{step_index:1,entity_type:'number',entity_ref:'1820',label_key:'1820',href:'/number/1820',surface:'number',context:{subject:{id:'1820',type:'number',label:'1820',href:'/number/1820'}}}]},dimensions:{journey2029Active:true,journey2029Origin:'fixture'},returnTo:{href:'/number/1820?method=regular#source',label:'fixture return'}};
const saved={id:'fixture-save',ref:'1820',type:'number',title:'fixture saved work',link:'/number/1820'};
for(const width of [390,1440])for(const seeded of [false,true])test(`passive Home story never becomes chosen research; prior path survives ${width}/${seeded}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});if(seeded)await page.addInitScript(({pathState,saved})=>{sessionStorage.setItem('sod_research_context_v2:guest',JSON.stringify(pathState));localStorage.setItem('sod_research_v2:guest',JSON.stringify({saved:[saved]}));},{pathState,saved});
 await page.goto(base+'/?from=context-acceptance#home-plane');await expect(page.locator('[data-flight-story="home"]')).toBeVisible({timeout:30000});await page.locator('#home-plane').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
 const home=await readContext(page);expect(home?.dimensions?.readingFocus?.id).not.toBe('home-plane');expect(home?.subject||null).toEqual(seeded?pathState.subject:null);
 await menuWorld(page,width);const world=await readContext(page);expect(world?.subject||null).toEqual(seeded?pathState.subject:null);
 if(seeded){expect(world.journey.id).toBe(pathState.journey.id);expect(world.journey.pendingSteps.length).toBe(1);}
 // Ordinary World is its own destination. The saved subject remains available
 // in My Workspace, without impersonating the currently visible World object.
 await expect(page.locator('.sod29-main-stage>.sod29-surface-context-rail')).toHaveCount(0);
 const sensitive=[];page.on('request',r=>{if(/els-search-bridge|ai-analyze|(?:rest\/v1\/rpc\/)(?:els_|fn_get_or_create_my_person|fn_list_family)/.test(r.url()))sensitive.push(new URL(r.url()).pathname);});
 await page.goto(base+'/els?library=mine&id=synthetic-record');await expect(page.locator('.sod29-root.surface-els')).toBeVisible({timeout:30000});await expect(page.getByText('סגור · בבנייה')).toBeVisible();expect(sensitive).toEqual([]);
 const closed=await readContext(page);expect(closed?.subject||null).toEqual(seeded?pathState.subject:null);if(seeded){expect(closed.journey.pendingSteps.length).toBe(1);const local=await page.evaluate(()=>JSON.parse(localStorage.getItem('sod_research_v2:guest')));expect(local.state?.saved||local.saved).toContainEqual(saved);}
 fs.writeFileSync(info.outputPath('context-proof.json'),JSON.stringify({syntheticSeed:seeded,home,world,closed,sensitive},null,2));
});
for(const width of [390,1440])test('intentional Home selection keeps path and exact Home query/anchor return '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(seed=>sessionStorage.setItem('sod_research_context_v2:guest',JSON.stringify(seed)),pathState);
 const address='/?keep=1#home-plane';await page.goto(base+address);await expect(page.locator('[data-flight-story="home"]')).toBeVisible({timeout:30000});
 const card=page.locator('.h29-card-main').first();await card.click();await expect(card).toHaveAttribute('aria-pressed','true');let context=await readContext(page);expect(context.subject.type).toBe('post');expect(context.journey.id).toBe(pathState.journey.id);expect(context.journey.pendingSteps.length).toBe(1);expect(context.returnTo.href).toBe(address);expect(context.returnTo.subject).toEqual(pathState.subject);
 const chosen=context.subject;await menuWorld(page,width);context=await readContext(page);expect(context.subject).toEqual(chosen);expect(context.journey.pendingSteps.length).toBe(1);
 fs.writeFileSync(info.outputPath('intentional-context.json'),JSON.stringify(context,null,2));
});
// Synthetic caller/profile responses only: these prove UI roles, not a live login.
async function syntheticPrincipal(page,role){
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',user={id,email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',user_metadata:{role:'admin'},app_metadata:{}};
 const exp=Math.floor(Date.now()/1000)+3600,token=Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp,role:'authenticated'})).toString('base64url')+'.synthetic';
 await page.addInitScript(session=>localStorage.setItem('sb-linswmnnkjxvweumprav-auth-token',JSON.stringify(session)),{access_token:token,refresh_token:'synthetic',expires_at:exp,expires_in:3600,token_type:'bearer',user});
 await page.route('https://linswmnnkjxvweumprav.supabase.co/**',route=>{const u=new URL(route.request().url());let body=[];
  if(u.pathname==='/rest/v1/users')body={id,role,username:'fixture',display_name:'Synthetic account'};
  if(u.pathname==='/auth/v1/user')body=user;
  if(u.pathname==='/rest/v1/site_flags')body=['els','world','number','books','raziel_site','life_journey'].map(n=>({key:'lock_'+n,enabled:['raziel_site','life_journey'].includes(n),mode:'all',message:'fixture shared flag'}));
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
}
for(const role of ['user','admin'])test('synthetic '+role+' obeys the Preview gate without any live account or model calls',async({page})=>{
 await syntheticPrincipal(page,role);const models=[];page.on('request',r=>{if(/ai-analyze|preview-raziel/.test(r.url()))models.push(new URL(r.url()).pathname);});
 await page.goto(base+'/code?library=mine');await expect(page.locator('.sod29-header-workspace:not(.is-signed-out)')).toBeVisible({timeout:30000});
 if(role==='user'){await expect(page.getByText('סגור · בבנייה')).toBeVisible();await expect(page.locator('.sod29-raziel-orb')).toBeDisabled();await page.goto(base+'/2029/journey');await expect(page.getByText('סגור · בבנייה')).toBeVisible();}
 else {await expect(page.getByText('סגור · בבנייה')).toHaveCount(0);await expect(page.locator('.sod29-raziel-orb')).toBeEnabled();await expect(page.locator('.sod29-root.surface-els')).toBeVisible();}
 expect(models).toEqual([]);
});
for(const width of [320,390,1440])test('existing administrator tool dock stays centered with every action '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await syntheticPrincipal(page,'admin');
 await page.goto(base+'/code?mode=classic');const dock=page.locator('.sod29-command-island[data-command-mode="tool"]');
 await expect(dock).toBeVisible({timeout:30000});const boxes=await dock.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height,viewport:innerWidth,buttons:[...e.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,width:r.width,height:r.height};})};});
 expect(boxes.buttons).toHaveLength(6);expect(Math.abs(boxes.x+boxes.width/2-width/2)).toBeLessThan(1);expect(boxes.width).toBeLessThanOrEqual(width-24);expect(boxes.height).toBeLessThanOrEqual(70);
 for(const box of boxes.buttons){expect(box.x).toBeGreaterThanOrEqual(boxes.x);expect(box.x+box.width).toBeLessThanOrEqual(boxes.x+boxes.width+1);expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
 fs.writeFileSync(info.outputPath('tool-dock-geometry.json'),JSON.stringify(boxes,null,2));
});
for(const width of [320,1440])for(const preset of ['light','parchment','dark'])test(`one shared Now feed, context sheet and compact island ${width}/${preset}`,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto(base+modern);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});
 // Exercise the existing visible preset selector; do not invent theme state.
 const header=page.locator('.sod29-header-actions .sod29-theme-presets');
 if(width<=980)await header.locator('.sod29-theme-trigger').click();
 const labels={light:'יום',parchment:'קלף',dark:'לילה'};await header.getByRole('button',{name:labels[preset],exact:true}).click();
 await expect(page.locator('.sod29-root')).toHaveAttribute('data-frame-theme-preset',preset);await island(page);
 await page.locator('.sod29-command-island').getByRole('button',{name:/^כאן/}).click();await expect(page.getByRole('dialog',{name:'כאן · מפת העמוד וההקשר',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(1);await page.keyboard.press('Escape');
 await page.locator('.sod29-command-island').getByRole('button',{name:/^עכשיו/}).click();const now=page.getByRole('dialog',{name:'עכשיו',exact:true});await expect(now).toBeVisible();
 await expect(now.locator('.sod29-attention-projection')).toBeVisible();await expect(now.locator('.sod29-attention-projection>button').first()).toBeVisible({timeout:30000});
 await expect(page.getByRole('dialog')).toHaveCount(1);await page.screenshot({path:info.outputPath('now-and-theme.png')});
});
for(const width of [390,1440])test('real public Topic links populate additional connections and return to exact source '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto(base+'/topic/india-axis?from=sidecar');
 await expect.poll(async()=>((await readContext(page))?.dimensions?.surfaceFindings||[]).length,{timeout:45000}).toBeGreaterThan(0);
 const context=await readContext(page),links=context.dimensions.surfaceFindings;expect(links.length).toBeLessThanOrEqual(8);expect(links.some(x=>x.href.startsWith('/topic/'))).toBe(true);
 const post=links.find(x=>x.href.startsWith('/post/'));expect(post,'existing re-admitted public captain Post source').toBeTruthy();
 await page.locator('.sod29-command-island').getByRole('button',{name:/^כאן/}).click();const panel=page.getByRole('dialog',{name:'כאן · מפת העמוד וההקשר',exact:true});
 await panel.locator('.sod29-surface-context-findings').getByRole('button',{name:post.label,exact:true}).click();await panel.locator('.sod29-surface-context-deeplink').click();
 await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});const selected=await readContext(page);expect(selected.returnTo.href).toMatch(/^\/topic\/india-axis\?from=sidecar#/);expect(selected.subject.type).toBe('post');
 if(width<=980){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}
 else await page.locator('.sod29-sidebar').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
 await expect(page).toHaveURL(/\/topic\/india-axis\?from=sidecar#/);await expect.poll(async()=>(await readContext(page))?.subject?.type,{timeout:30000}).toBe('topic');
 const u=new URL(page.url());await expect(page.locator('[id="'+decodeURIComponent(u.hash.slice(1))+'"]')).toBeAttached();
 fs.writeFileSync(info.outputPath('live-public-connections.json'),JSON.stringify({source:'actual public readers; no synthetic relationships',width,links,returnedTo:u.pathname+u.search+u.hash},null,2));await page.screenshot({path:info.outputPath('topic-connections.png')});
});
for(const width of [320,1440])test('all personal action grids have equal columns, clear labels and preserved locks '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto(base+'/');await page.locator('.sod29-header-workspace').click();const panel=page.locator('[data-panel-kind="workspace"]');await expect(panel).toBeVisible();
 const grids=await panel.evaluate(e=>[...e.querySelectorAll('.sod29-workspace-core-grid,.sod29-workspace-secondary-grid,.sod29-workspace-raziel-actions')].map(g=>({columns:getComputedStyle(g).gridTemplateColumns.split(' ').map(Number.parseFloat),items:[...g.children].map(x=>{const r=x.getBoundingClientRect();return {w:r.width,h:r.height,label:x.textContent.trim(),overflow:x.scrollWidth>x.clientWidth+1};})})));
 for(const grid of grids){expect(grid.items.length).toBeGreaterThan(0);for(const item of grid.items){expect(item.h).toBeGreaterThanOrEqual(44);expect(item.w).toBeGreaterThanOrEqual(44);expect(item.label).toBeTruthy();expect(item.overflow).toBe(false);}if(grid.columns.length===2)expect(Math.abs(grid.columns[0]-grid.columns[1])).toBeLessThan(1);}
 await expect(panel.locator('[data-workspace-card="life-journey"]')).toHaveAttribute('aria-disabled','true');await expect(panel.locator('[data-workspace-card="codes"]')).toHaveAttribute('aria-disabled','true');
 fs.writeFileSync(info.outputPath('personal-buttons.json'),JSON.stringify(grids,null,2));await page.screenshot({path:info.outputPath('personal-symmetric.png')});
 await panel.locator('.sod29-workspace-core-grid').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('personal-core-buttons.png')});
 await panel.locator('.sod29-workspace-secondary-grid').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('personal-module-buttons.png')});
});
for(const width of [390,1440])test('ordinary Home link preserves exact return without selecting the displayed Post '+width,async({page})=>{
 await page.setViewportSize({width,height:900});const origin='/?home=1#home-plane';await page.goto(base+origin);await expect(page.locator('.h29-card-open').first()).toBeVisible({timeout:30000});
 expect((await readContext(page))?.subject||null).toBe(null);await page.locator('.h29-card-open').first().click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:30000});await expect.poll(async()=>(await readContext(page))?.returnTo?.href).toBe(origin);
 if(width<=980){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
 await expect(page).toHaveURL(base+origin);await expect(page.locator('[data-flight-story="home"]')).toBeVisible({timeout:30000});expect((await readContext(page))?.subject||null).toBe(null);
});
for(const width of [390,1440])test('intentional Number to World uses explicit context and exact return '+width,async({page})=>{
 await page.setViewportSize({width,height:900});const address='/number/1820?from=explicit-world';await page.goto(base+address);await expect(page.locator('.sod29-number-page[data-number-root="1820"]')).toBeVisible({timeout:30000});
 await page.locator('.sod29-command-island').getByRole('button',{name:/^עוד/}).click();await page.getByRole('dialog',{name:'עוד',exact:true}).getByRole('button',{name:'כלים',exact:true}).click();await page.getByRole('dialog',{name:'כלים',exact:true}).getByRole('button',{name:/עולם/}).click();
 await expect(page).toHaveURL(/\/world\?focus=context/);await expect(page.locator('.sod29-root.surface-world')).toBeVisible();await expect.poll(async()=>(await readContext(page))?.subject?.id).toBe('1820');await expect(page.locator('.sod29-main-stage>.sod29-surface-context-rail')).toBeAttached();
 if(width<=980){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
 await expect(page).toHaveURL(base+address);await expect(page.locator('.sod29-number-page[data-number-root="1820"]')).toBeVisible({timeout:30000});
});
for(const width of [320,1440])test('native personal module navigation uses symmetric existing buttons; guest never loads private data '+width,async({page},info)=>{
 await page.setViewportSize({width,height:900});await page.goto(base+'/2029/me/profile');const layout=page.locator('.wp-layout');await expect(layout).toBeVisible({timeout:30000});
 const nav=layout.locator('.wp-nav');await expect(nav).toBeVisible();expect(await nav.getByRole('link').count()).toBeGreaterThanOrEqual(6);
 const sizes=await nav.getByRole('link').evaluateAll(items=>items.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));for(const size of sizes){expect(size.w).toBeGreaterThanOrEqual(44);expect(size.h).toBeGreaterThanOrEqual(44);}expect(Math.max(...sizes.map(s=>s.w))-Math.min(...sizes.map(s=>s.w))).toBeLessThan(1);
 await page.screenshot({path:info.outputPath('native-personal-buttons.png')});
});
for(const width of [390,1440])test('neutral World Number prompt accepts a deliberate number and expression without adopting old work '+width,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto(base+'/world');
 await page.locator('.sod29-command-island').getByRole('button',{name:/^מספר/}).click();const panel=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});
 await expect(panel.locator('.sod29-number-drawer-empty')).toBeVisible();await panel.getByRole('textbox').fill('1820');await panel.getByRole('textbox').press('Enter');
 const drawer=panel.locator('.sod29-number-drawer2029');await expect(drawer.locator('[data-number-core-root="1820"]')).toBeVisible({timeout:30000});
 await drawer.getByRole('textbox',{name:'שם ביטוי או מספר',exact:true}).fill('בראשית');await drawer.getByRole('textbox',{name:'שם ביטוי או מספר',exact:true}).press('Enter');await expect(drawer.locator('[data-number-core-root="913"]')).toBeVisible({timeout:30000});await expect(drawer).toContainText('בראשית');
 expect((await readContext(page))?.subject||null).toBe(null);
});
