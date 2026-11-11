// Identical local/hosted acceptance actions; all data transport is supplied
// by the independent read-only harness. No authentication credential is stored.
const {expect}=require('@playwright/test');
const fs=require('node:fs');
const sourceId='bc0aa8ce-30fc-4a22-b42d-113a456f5e58';
async function worldWriter(page,width,info,origin){
 page.setDefaultTimeout(30000);await page.setViewportSize({width,height:900});const errors=[],reads=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(r.url().includes('writer_public_contributions_page_v1'))reads.push(r.method());});
 const address='/world?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3A'+sourceId+'#source-occurrence-'+sourceId;
 await page.goto(origin+address);
 const source=page.locator('.sod29-world-public-material-grid>article[data-source-ref="channel_updates:'+sourceId+'"]');
 await expect(source).toBeVisible({timeout:60000});expect((await source.locator(':scope>p').first().textContent()).trim().length).toBeGreaterThan(80);
 const sourceText=await source.locator(':scope>p').first().textContent();
 const grid=page.locator('.sod29-world-public-material-grid');const refs=await grid.locator(':scope>article').evaluateAll(nodes=>nodes.map(node=>node.dataset.sourceRef));expect(new Set(refs).size).toBe(refs.length);
 await source.getByRole('button',{name:'ממצאים במקור',exact:true}).click();
 const finding=source.locator('a.zvi-research__excerpt').first();await expect(finding).toBeVisible({timeout:60000});const findingHref=await finding.getAttribute('href');
 await source.getByRole('button',{name:'הצג במפת העולם',exact:true}).click();
 await expect(page.getByRole('region',{name:'חלון מקור במפת העולם',exact:true})).toBeVisible();
 await finding.click();await expect(page.locator('.sod29-world-public-finding')).toBeVisible({timeout:60000});expect(new URL(page.url()).searchParams.get('finding')).toBe(new URL(findingHref,origin).searchParams.get('finding'));
 await page.reload();await expect(page.locator('.sod29-world-public-finding')).toBeVisible({timeout:60000});
 await page.goBack();await expect(page).toHaveURL(origin+address);await expect(source).toBeVisible({timeout:60000});await expect(source.locator(':scope>p').first()).toHaveText(sourceText);
 await page.goForward();await expect(page.locator('.sod29-world-public-finding')).toBeVisible({timeout:60000});await page.goBack();await expect(source).toBeVisible({timeout:60000});
 expect(reads.length).toBeGreaterThan(0);expect(reads.every(method=>method==='GET')).toBe(true);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 await page.screenshot({path:info.outputPath('source-'+width+'.png')});
 fs.writeFileSync(info.outputPath('public-material.json'),JSON.stringify({width,data:'actual public source and eligible findings',sourceRef:'channel_updates:'+sourceId,findingHref,uniqueSourceRefs:refs,writerReaderMethods:reads,reloadBackForward:true,errors,productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');

}

async function worldCorpus(page,width,info,origin){
 page.setDefaultTimeout(30000);await page.setViewportSize({width,height:900});
 await page.goto(origin+'/world?view=sources&source=sod-hashmal&subjectSource=hashmal&q='+encodeURIComponent('ירושלים')+'#world-public-content-map');
 const index=page.locator('[data-world-public-source-subjects]');await index.scrollIntoViewIfNeeded();
 const corpus=page.locator('[data-experience-capability="corpus-full-source"]');await expect(corpus).toBeVisible({timeout:60000});expect((await corpus.textContent()).trim().length).toBeGreaterThan(100);
 const search=index.getByRole('searchbox',{name:'חיפוש לפי נושא, מקור או מספר',exact:true});await expect(search).toHaveValue('ירושלים');
 const corpusLink=index.locator('.sod29-world-source-subject-list>a').first();await expect(corpusLink).toBeVisible({timeout:60000});const publicPostHref=await corpusLink.getAttribute('href');
 expect(publicPostHref).not.toContain('/topic/');await corpusLink.click();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});await expect(page).toHaveURL(origin+publicPostHref);await page.reload();await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});await expect(page).toHaveURL(origin+publicPostHref);
 await page.goBack();await expect(search).toHaveValue('ירושלים',{timeout:60000});
 await index.getByRole('group',{name:'בחירה לפי מקור',exact:true}).getByRole('button',{name:'צבי',exact:true}).click();await search.fill('');
 const topic=index.locator('.sod29-world-source-subject-list>a[href^="/topic/"]').first();await expect(topic).toBeVisible({timeout:60000});const topicHref=await topic.getAttribute('href');await topic.click();
 await expect(page.locator('.sod29-topic2029')).toBeVisible({timeout:60000});const number=page.locator('.sod29-topic-hero-number').first();await expect(number).toBeVisible({timeout:60000});const numeric=Number((await number.textContent()).replace(/,/g,''));
 await number.click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(numeric),{timeout:60000});await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goBack();await expect(page).toHaveURL(origin+topicHref);await expect(page.locator('.sod29-topic2029')).toBeVisible({timeout:60000});
 await page.goBack();await expect(index).toBeVisible({timeout:60000});expect(new URL(page.url()).searchParams.get('subjectSource')).toBe('zvi');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 fs.writeFileSync(info.outputPath('corpus-topic-number.json'),JSON.stringify({width,data:'actual public corpus text, stored Topic and number',publicPostHref,topicHref,numeric,exactPostAddressOnReload:true,publicWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');

}

async function riverGallery(page,width,info,origin){
 page.setDefaultTimeout(30000);await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const address='/?source=river&part=2&part=7#reality-stream';await page.goto(origin+address);
 // The near-section admission replaces its loading component. Scroll the
 // current DOM synchronously, then wait on the real admitted picture.
 const river=page.locator('[data-reality-river]');await page.waitForFunction(()=>{const node=document.querySelector('[data-reality-river]');if(!node)return false;node.scrollIntoView({block:'start',behavior:'instant'});return true;});const first=river.locator('.r29-picture-frame').first();await expect(first).toBeVisible({timeout:60000});
 const imageId=await first.locator('..').getAttribute('data-river-image'),href=await first.getAttribute('href');expect(imageId).toBeTruthy();expect(new URL(href,origin).searchParams.get('image')).toBe(imageId);
 await first.click();const image=page.locator('[data-gallery-image-id="'+imageId+'"]');await expect(image).toBeVisible({timeout:60000});await expect(page).toHaveURL(origin+href);
 await page.reload();await expect(image).toBeVisible({timeout:60000});await expect(page).toHaveURL(origin+href);
 await page.goBack();await expect(page).toHaveURL(origin+address);await expect(river.locator('.r29-picture-frame').first()).toBeVisible({timeout:60000});await page.goForward();await expect(image).toBeVisible({timeout:60000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors).toEqual([]);
 await page.screenshot({path:info.outputPath('real-gallery-'+width+'.png')});fs.writeFileSync(info.outputPath('river-gallery.json'),JSON.stringify({width,data:'actual public Home river and gallery image',imageId,href,homeReturn:address,reloadBackForward:true,errors,productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');

}

async function postNumberReturn(page,width,info,origin){
 page.setDefaultTimeout(30000);await page.setViewportSize({width,height:900});
 const address='/post/flydubai-fz1073-363-14000-remzei-geula?source=reading&part=2&part=7#post-gematria';await page.goto(origin+address);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});
 const signal=page.locator('.sod29-reading-number-signal').first();await expect(signal).toBeVisible();const root=Number((await signal.locator('strong').textContent()).replace(/,/g,''));await signal.click();
 const drawer=page.getByRole('dialog',{name:'מספר / ביטוי',exact:true});await expect(drawer.locator('[data-number-core-root="'+root+'"]')).toBeVisible({timeout:60000});await drawer.getByRole('button',{name:'פתח דף מלא ↗',exact:true}).click();
 await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(root),{timeout:60000});
 const context=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sod_research_context_v2:guest')||'null')),target=context?.returnTo?.href;expect(target).toBeTruthy();const expected=new URL(target,origin);expect(expected.pathname).toBe(new URL(address,origin).pathname);expect(expected.search).toBe('?source=reading&part=2&part=7');expect(expected.hash).toMatch(/^#(?:source-region-|post-)/);
 if(width<981){await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();}else await page.locator('.sod29-sidebar').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
 await expect(page).toHaveURL(origin+target);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});await expect(page.locator('[id="'+decodeURIComponent(expected.hash.slice(1))+'"]')).toBeVisible({timeout:30000});
 await page.reload();await expect(page).toHaveURL(origin+target);await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 fs.writeFileSync(info.outputPath('post-number-return.json'),JSON.stringify({width,data:'actual public modern Post and canonical Number reader',address,root,exactReturn:target,existingPostNumberDrawer:'explicitly opened before full-page action',productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');

}

async function numberFullPage(page,width,info,origin){
 page.setDefaultTimeout(30000);await page.setViewportSize({width,height:900});
 const errors=[],profileReads=[];page.on('pageerror',e=>errors.push(e.name));page.on('request',r=>{if(r.url().includes('/rpc/fn_method_profile'))profileReads.push(r.postDataJSON()?.p_phrase);});
 // Default reading now follows the user's saved Legacy order. This scenario
 // deliberately selects the original canonical operand to retain its exact
 // 1820 -> 3928 assertion, independently of that editorial default.
 const address='/number/1820?focus='+encodeURIComponent('אחת ארבע שבע ושתיים')+'&method='+encodeURIComponent('רגיל')+'&source=post&part=2&part=7#number-essential';
 await page.goto(origin+address);await expect(page.locator('.sod29-number-page[data-number-root="1820"]')).toBeVisible({timeout:60000});
 const milui=()=>page.locator('.sod29-number-v10-method-card').filter({has:page.getByText('מילוי',{exact:true})}).first();
 await expect(milui()).toBeEnabled({timeout:30000});
 const result=Number((await milui().locator('strong').textContent()).replace(/,/g,''));
 const expression=await page.locator('.sod29-number-v10-expression-line>:is(h1,strong)').textContent();
 expect(result).toBe(3928); // Recorded from the canonical public profile in the dbbe baseline.
 const miluiStarted=Date.now();await milui().click();
 await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root',String(result),{timeout:60000});
 await expect(page.locator('.sod29-number-core2029.is-page')).toHaveAttribute('data-number-core-root',String(result));
 const miluiMs=Date.now()-miluiStarted;
 let url=new URL(page.url());expect(url.pathname).toBe('/number/'+result);expect(url.searchParams.get('focus')).toBe(expression);expect(url.searchParams.get('method')).toBe('מילוי');
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.sod29-number-drawer2029')).toHaveCount(0);
 await expect(page.locator('.sod29-number-v10-method-card.is-active').locator('span').first()).toHaveText('מילוי');
 const focusedResultUrl=page.url();await page.locator('.sod29-number-v10-stage-result-open').click();await expect(page).toHaveURL(focusedResultUrl);await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goBack();await expect(page).toHaveURL(origin+address);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 await expect(milui()).toBeEnabled({timeout:30000});await milui().click();await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','3928',{timeout:60000});
 await page.getByRole('region',{name:'מיקוד ביטוי פעיל',exact:true}).getByRole('button',{name:'↩ '+expression+' · 1820',exact:true}).click();
 await expect(page).toHaveURL(origin+address);await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 const rail=page.locator('.sod29-number-v11-regular-track button').first();await expect(rail).toBeVisible({timeout:30000});const phrase=await rail.locator('strong').textContent();
 await rail.click();await expect.poll(()=>new URL(page.url()).searchParams.get('focus')).toBe(phrase);expect(new URL(page.url()).searchParams.get('method')).toBe('רגיל');
 await expect(page.getByRole('dialog')).toHaveCount(0);await page.goBack();await expect(page).toHaveURL(origin+address);
 await expect(page.locator('.sod29-number-v10-expression-line>:is(h1,strong)')).toHaveText(expression);
 await page.locator('.sod29-number-root-open').click();expect(new URL(page.url()).pathname).toBe('/number/1820');expect(new URL(page.url()).searchParams.get('focus')).toBe(expression);expect(new URL(page.url()).searchParams.get('method')).toBe('רגיל');await expect(page.getByRole('dialog')).toHaveCount(0);await page.goBack();await expect(page).toHaveURL(origin+address);
 const sourceList=page.locator('.sod29-lw-source-list');await sourceList.scrollIntoViewIfNeeded();
 await expect(sourceList.getByRole('status')).toHaveCount(0,{timeout:60000});
 await expect(sourceList.getByRole('alert')).toHaveCount(0);
 const cards=await sourceList.locator(':scope>article').evaluateAll(nodes=>nodes.map(e=>({text:e.querySelector('strong')?.textContent,sourceRef:e.dataset.sourceRef,href:e.querySelector('a')?.getAttribute('href')||null,buttonCount:e.querySelectorAll('button').length})));
 expect(new Set(cards.map(card=>card.sourceRef)).size).toBe(cards.length);
 for(const card of cards){expect(card.text).toBeTruthy();expect(card.text).not.toBe('הודעות מקור');expect(card.buttonCount).toBe(0);if(card.href)expect(card.href).toMatch(/^(?:\/(?!\/)|https?:\/\/)/);}
 const grouped=sourceList.locator('.sod29-lw-source-findings').first();if(await grouped.count()){
  await grouped.locator('summary').click();expect(await grouped.locator('a.zvi-research__excerpt').count()).toBeGreaterThan(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);await grouped.locator('summary').click();
 }
 if(width===390&&cards.some(card=>card.href?.startsWith('/'))){
  const href=cards.find(card=>card.href?.startsWith('/')).href;
  await sourceList.locator('a').first().click();await expect(page).toHaveURL(origin+href);
  const anchor=new URL(page.url()).hash.slice(1);if(anchor)await expect(page.locator('[id="'+anchor+'"]')).toBeVisible({timeout:30000});
  await page.locator('.sod29-mobile-menu-trigger').click();await page.locator('#sod29-mobile-navigation').getByRole('button',{name:'חזרה מדויקת',exact:true}).click();
  await expect(page).toHaveURL(origin+address.replace('#number-essential','#number-content-live'));
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','1820',{timeout:60000});
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 await page.screenshot({path:info.outputPath('sources-'+width+'.png')});
 fs.writeFileSync(info.outputPath('accepted-number.json'),JSON.stringify({width,data:'real public read-only',canonicalExample:{expression,regular:1820,milui:3928},miluiMs,preciseReturn:address,fullPageNoDrawer:true,cards,profileReads,errors,productWritesForwarded:0,modelCallsForwarded:0},null,2)+'\n');
 expect(errors).toEqual([]);

}

async function galleryPrivacyFault(page,width,info,origin){
 page.setDefaultTimeout(30000);await page.setViewportSize({width,height:900});
 const {galleryReadingHref2029}=await import('../src/lib/research/topicSourceContext.js');
 const imageId='7287ad08-1c7b-4642-a5c4-cecbbaf35b81',ref='gallery_images:'+imageId;
 const id=n=>'70000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const row=n=>({id:id(n),created_at:'2026-10-31T09:00:00Z',kind:'observation',statement:'ממצא מבוקר מהתמונה '+n,
  source:'gallery',source_ref:ref+'#stored-ocr:0-10',status:'approved',privacy_scope:'public',promoted_node_id:null,engine_verified:false,meta:{ext:{presentation:{statement_role:'research_statement'}}}});
 let reads=0,fail=true,withdrawn=false;
 await page.route('https://linswmnnkjxvweumprav.supabase.co/rest/v1/world_contributor_research_v1*',async route=>{
  const url=new URL(route.request().url());reads++;expect(url.searchParams.getAll('or').some(filter=>filter.includes(ref))).toBe(true);
  if(fail)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'controlled reader failure'})});
  let rows=Array.from({length:9},(_,i)=>row(i+1)).reverse().map(r=>r.id===id(8)?{...r,privacy_scope:'private',statement:'PRIVATE_CONTROL_MUST_NEVER_RENDER'}:r.id===id(7)?{...r,source_ref:'gallery_images:00000000-0000-4000-8000-000000000001',statement:'OTHER_SOURCE_MUST_NEVER_RENDER'}:r);
  rows.unshift({...rows[0]});const cursor=url.searchParams.getAll('or').find(filter=>filter.includes('created_at.lt.'));
  if(cursor){const last=cursor.match(/id.lt.([0-9a-f-]+)/)?.[1];rows=rows.filter(r=>r.id<last);}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows.slice(0,Number(url.searchParams.get('limit'))||9))});
 });
 await page.route('https://linswmnnkjxvweumprav.supabase.co/rest/v1/gallery_images*',route=>{
  const url=new URL(route.request().url());if(withdrawn&&url.searchParams.get('id')===`in.(${imageId})`)return route.fulfill({status:200,contentType:'application/json',body:'[]'});return route.fallback();
 });
 const href=galleryReadingHref2029('?sort=original&layout=compact',{galleryId:105,imageId,take:12});
 await page.goto(origin+href);const photo=page.locator('[data-gallery-image-id="'+imageId+'"]');await expect(photo).toBeVisible({timeout:60000});expect(reads).toBe(0);
 await photo.locator('.g29-depth>summary').click();const panel=photo.locator('.zvi-research');await panel.getByRole('button',{name:'ממצאים במקור',exact:true}).click();
  // The installed SDK retries a transient 503 with bounded backoff. Preserve
  // that behavior and wait for its failure, without changing product retries.
  await expect(panel.getByText('לא הצלחנו לטעון את הממצאים. אפשר לנסות שוב.',{exact:true})).toBeVisible({timeout:30000});await expect(panel.getByText('לא נמצאו ממצאים ציבוריים במקור שנקרא.',{exact:true})).toHaveCount(0);
 fail=false;await panel.getByRole('button',{name:'נסה שוב',exact:true}).click();await expect(panel.locator('a.zvi-research__excerpt').first()).toBeVisible();
 while(await panel.getByRole('button',{name:'עוד ממצאים במקור',exact:true}).count())await panel.getByRole('button',{name:'עוד ממצאים במקור',exact:true}).click();
 await expect(panel.locator('a.zvi-research__excerpt')).toHaveCount(7);const hrefs=await panel.locator('a.zvi-research__excerpt').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));expect(new Set(hrefs).size).toBe(7);
 await expect(page.getByText(/PRIVATE_CONTROL_MUST_NEVER_RENDER|OTHER_SOURCE_MUST_NEVER_RENDER/)).toHaveCount(0);
 withdrawn=true;await panel.getByRole('button',{name:'בדיקה מחדש של הממצאים',exact:true}).click();await expect(panel.getByText('חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.',{exact:true})).toBeVisible();await expect(panel.locator('a.zvi-research__excerpt')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
 fs.writeFileSync(info.outputPath('controlled-privacy-failure-dedup.json'),JSON.stringify({width,data:'real public gallery image plus synthetic research rows and simulated source withdrawal; no live changes',imageId,readerFailureRetry:true,privateAndOtherSourceRejected:true,duplicateFindingRejected:true,withdrawalClearsStaleFindings:true,forwardedProductWrites:0,forwardedModels:0},null,2)+'\n');
}

async function directPublicAddresses(page,width,info,origin){
 page.setDefaultTimeout(30000);await page.setViewportSize({width,height:900});
 const direct=origin+'/number/'+encodeURIComponent('אחת ארבע שבע ושתיים')+'?method='+encodeURIComponent('מילוי')+'&source=direct#number-essential';
 for(const reload of[false,true]){
  if(reload)await page.reload();else await page.goto(direct);
  await expect(page.locator('.sod29-number-page')).toHaveAttribute('data-number-root','3928',{timeout:60000});
  await expect(page.locator('.sod29-number-v10-expression-line>:is(h1,strong)')).toHaveText('אחת ארבע שבע ושתיים');
  await expect(page.locator('.sod29-number-v10-method-card.is-active span').first()).toHaveText('מילוי',{timeout:30000});await expect(page).toHaveURL(direct);await expect(page.getByRole('dialog')).toHaveCount(0);
 }
 const posts=require('../docs/reviews/public-foundation-20261101/evidence/live-posts.json'),checked=[];
 for(const post of posts){const href=new URL(post.link,'https://sod1820.co.il').pathname+'?source=number-regression&part=2&part=7#post-content';
  for(const reload of[false,true]){
   if(reload)await page.reload();else await page.goto(origin+href);
   await expect(page.locator('.sod29-reading-source')).toBeVisible({timeout:60000});await expect(page).toHaveURL(origin+href);
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',new URL(post.link,'https://sod1820.co.il').href);
  }
  checked.push({id:post.id,source:post.source,address:href,canonical:new URL(post.link,'https://sod1820.co.il').href,reload:true});
 }
 fs.writeFileSync(info.outputPath('direct-public-addresses.json'),JSON.stringify({width,data:'actual public legacy/native Posts and canonical method reader',directExpression:direct,expressionResult:3928,posts:checked,forwardedProductWrites:0,forwardedModels:0},null,2)+'\n');
}

module.exports={worldWriter,worldCorpus,riverGallery,postNumberReturn,numberFullPage,galleryPrivacyFault,directPublicAddresses};
