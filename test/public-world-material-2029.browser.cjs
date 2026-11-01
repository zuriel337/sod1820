// Real public data only. The fixture forwards GET/HEAD, never account writes,
// models, follows, publication or messages. Fault fixtures are tested separately.
const {test,expect}=require('./public-world-readonly-fixture.cjs');
const fs=require('node:fs');
const origin=process.env.SOD_ACCEPTANCE_ORIGIN||'http://127.0.0.1:4251';
const sourceId='bc0aa8ce-30fc-4a22-b42d-113a456f5e58'; // Public source actually returned for Number1820.
for(const width of[390,1440])test('real World writer source, findings, map and exact replay '+width,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});const errors=[],reads=[];
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
});
for(const width of[390,1440])test('real corpus text, unified word search, Topic and Number return '+width,async({page},info)=>{
 test.setTimeout(180000);await page.setViewportSize({width,height:900});
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
});
