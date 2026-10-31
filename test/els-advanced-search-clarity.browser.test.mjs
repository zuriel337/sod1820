// Actual Advanced component and page; IO/auth/corpus fixtures, never a live search or model.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { libraryFixturePlugin } from './fixtures/els-library-browser-fixture.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const react = (await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))).default;
const options = { timeout: 60000 };

async function withPage(run) {
  const server = await createServer({root,configFile:false,plugins:[libraryFixturePlugin(),react()],server:{host:'127.0.0.1',port:0}});
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
    const page = await browser.newPage({viewport:{width:390,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/fixture?testAdvanced`);
    await page.getByRole('button',{name:'חיפוש מתקדם',exact:true}).click();
    await run(page);
    assert.deepEqual(errors,[]);
    assert.equal(await page.evaluate(()=>window.__razielPlannerCalls.length),0,'Advanced never calls AI');
  } finally {await browser?.close();await server.close();}
}
const calls = page => page.evaluate(()=>window.__advancedCalls);
const extras = page => page.getByText('אפשרויות נוספות · היפוכים ובדיקה ברקע',{exact:true}).click();

test('one explicit action, bounded default, and no silent full-range search when an upper bound is erased',options,()=>withPage(async page=>{
  const region=page.getByLabel('חיפוש דילוגים מתקדם');
  assert.equal(await region.locator('button[type=submit]:visible').count(),1);
  assert.equal(await region.locator('details').evaluate(el=>el.open),false);
  assert.match(await page.getByLabel('מה ייבדק בלחיצה').innerText(),/2–80 בלבד/);
  await page.getByLabel('מונח לחיפוש מתקדם').fill('בדיקה');
  await page.getByLabel('דילוג מקסימלי').fill('');
  await page.getByRole('button',{name:'חפש בטווח',exact:true}).click();
  assert.match(await region.innerText(),/הזינו גבול עליון/);
  assert.equal((await calls(page)).length,0);
  await page.getByRole('checkbox',{name:/ללא גבול עליון שקבעתי/}).check();
  assert.equal(await page.getByLabel('דילוג מקסימלי').isDisabled(),true);
  assert.match(await page.getByLabel('מה ייבדק בלחיצה').innerText(),/כל הדילוגים האפשריים/);
  assert.equal((await calls(page)).length,0,'checking full range is not consent to execute');
  await page.getByRole('button',{name:'חפש בטווח',exact:true}).click();
  await page.getByLabel('מופעי החיפוש המתקדם').waitFor();
  assert.equal((await calls(page))[0].body.skip_max,2147483647);
  await page.getByRole('checkbox',{name:/ללא גבול עליון שקבעתי/}).uncheck();
  assert.equal(await page.getByLabel('דילוג מקסימלי').inputValue(),'');
  assert.equal((await calls(page)).length,1);
}));

test('edits retain results and their original corpus; last submitted settings restore without I/O',options,()=>withPage(async page=>{
  await page.getByLabel('מונח לחיפוש מתקדם').fill('תורה');
  await page.getByLabel('דילוג מקסימלי').fill('200');
  await page.getByRole('button',{name:'חפש בטווח',exact:true}).click();
  const results=page.getByLabel('מופעי החיפוש המתקדם');await results.waitFor();
  await page.getByLabel('מונח לחיפוש מתקדם').fill('שלום');
  await page.getByLabel('טקסט לחיפוש מתקדם').selectOption('tanakh');
  assert.equal(await results.getByRole('listitem').count(),1);
  assert.match(await page.getByLabel('החיפוש האחרון שהופעל').innerText(),/ההגדרות השתנו/);
  assert.equal((await calls(page)).length,1);
  await results.getByRole('button').click();
  await page.waitForFunction(()=>window.__advancedLoad?.term==='תורה');
  assert.equal(await page.evaluate(()=>window.__advancedLoad.scope),'torah');
  await page.getByRole('button',{name:'חזור להגדרות החיפוש האחרון'}).click();
  assert.equal(await page.getByLabel('מונח לחיפוש מתקדם').inputValue(),'תורה');
  assert.equal(await page.getByLabel('טקסט לחיפוש מתקדם').inputValue(),'torah');
  assert.equal(await page.getByLabel('דילוג מקסימלי').inputValue(),'200');
  assert.equal((await calls(page)).length,2,'only search plus verify, no implicit rerun');
  assert.equal(await results.getByRole('listitem').count(),1);
}));

test('form preflight is search-free, excludes exactly the unchecked candidates, and never ignores changed settings',options,()=>withPage(async page=>{
  await page.getByLabel('מונח לחיפוש מתקדם').fill('סוד החשמל');
  await page.getByLabel('דילוג מקסימלי').fill('200');
  await extras(page);
  await page.getByRole('radio',{name:'בדוק גם היפוכים וסדר מילים',exact:true}).check();
  assert.equal(await page.getByRole('button',{name:'חפש את הביטויים שנבחרו'}).isDisabled(),true);
  await page.getByRole('button',{name:'הצג את הביטויים לפני החיפוש'}).click();
  const choices=page.locator('.els29-advanced-candidates input[type=checkbox]');
  assert.ok(await choices.count()>1);
  assert.equal((await calls(page)).length,0);
  const omit=(await choices.first().getAttribute('aria-label')).replace(/^בדוק /,'');
  await choices.first().uncheck();
  const selected=await choices.evaluateAll(es=>es.filter(e=>e.checked).map(e=>e.getAttribute('aria-label').replace(/^בדוק /,'')));
  await page.getByRole('button',{name:'חפש את הביטויים שנבחרו'}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="התקדמות מחקר הדילוגים"]')===null);
  const searched=(await calls(page)).filter(c=>c.body.op==='page').map(c=>c.body.term);
  assert.deepEqual(searched,selected);assert.ok(!searched.includes(omit));
  await page.getByLabel('דילוג מקסימלי').fill('300');
  assert.equal(await page.getByRole('button',{name:'חפש את הביטויים שנבחרו'}).isDisabled(),true);
  assert.ok(await page.getByLabel('תוכנית צורות אוטומטית').isVisible(),'previous admitted results remain');
  await page.getByRole('button',{name:'חזור להגדרות החיפוש האחרון'}).click();
  assert.equal(await choices.first().isChecked(),false);
  assert.equal(await page.getByLabel('דילוג מקסימלי').inputValue(),'200');
  assert.equal((await calls(page)).length,searched.length);
}));

test('known skip ignores range settings and source spelling is previewed before one engine probe',options,()=>withPage(async page=>{
  await page.getByLabel('מונח לחיפוש מתקדם').fill('סוד החשמל');
  await page.getByLabel('דילוג מקסימלי').fill('');
  await page.getByRole('button',{name:'דילוג ידוע',exact:true}).click();
  await extras(page);
  await page.getByLabel('צורת כתיבה לחיפוש').selectOption('reverse_all');
  assert.match(await page.getByLabel('מה ייבדק בלחיצה').innerText(),/למשחה דוס/);
  await page.getByLabel('דילוג מדויק ללא תקרת 500').fill('10065');
  assert.equal((await calls(page)).length,0);
  await page.getByRole('button',{name:'מצא ופתח בדילוג הידוע'}).click();
  await page.waitForFunction(()=>window.__advancedLoad?.skip===10065);
  assert.equal(await page.evaluate(()=>window.__advancedLoad.term),'למשחה דוס');
  assert.equal((await calls(page)).length,0,'known skip never silently runs a page scan');
}));

test('empty completed range and failed request remain different, with no automatic retry',options,()=>withPage(async page=>{
  await page.getByLabel('מונח לחיפוש מתקדם').fill('בדיקה');
  await page.evaluate(()=>{window.__advancedEmptyTerm='בדיקה';});
  await page.getByRole('button',{name:'חפש בטווח',exact:true}).click();
  await page.getByText('לא נמצאו מופעים בטווח המבוקש. אפשר להרחיב את טווח הדילוגים ולחפש שוב.',{exact:true}).waitFor();
  assert.match(await page.getByLabel('מופעי החיפוש המתקדם').innerText(),/0 מופעים/);
  await page.evaluate(()=>{window.__advancedEmptyTerm=null;window.__advancedFailTerm='בדיקה';});
  await page.getByRole('button',{name:'חפש בטווח',exact:true}).click();
  await page.getByText(/השרת עצר את הבדיקה לפני שהושלמה/).waitFor();
  assert.equal(await page.getByLabel('מופעי החיפוש המתקדם').count(),0);
  assert.equal((await calls(page)).length,2);
}));
