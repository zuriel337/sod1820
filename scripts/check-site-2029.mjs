#!/usr/bin/env node
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';

const production = 'https://sod1820.co.il';
const core = [
  ['/'],
  ['/world', /העולם/],
  ['/post', /פוסטים/],
  ['/post/bennett-melach-631-78', /בנט והמלח/],
  ['/community/chat', /צ.אט הקהילה|הצ.אט החי/],
  ['/gematria', /מחשבון גימטריה מקצועי/],
  ['/code', /^ELS$/],
  ['/number/631', /631/],
  ['/codes', /ספריית הצפנים/],
];
const otherPublic = [
  ['/archive', /ארכיון/],
  ['/gallery', /גלריות/],
  ['/timeline', /ציר הזמן/],
  ['/books', /ספרים ומקורות/],
  ['/beit-midrash', /לומדים לגלות/],
  ['/findings', /ממצאים שפורסמו/],
  ['/community/calculator', /מחשבון גימטריה לשמות/],
  ['/community/comments', /תגובות לפוסטים/],
  ['/community/researchers', /הכתבים והחוקרים/],
  ['/forum', /צ.אט הקהילה|הצ.אט החי/],
  ['/or-geula', /אור הגאולה/],
  ['/broadcasts', /מרכז השידורים/],
  ['/start', /ברוכים הבאים ל/],
  ['/map', /מפת האתר/],
  ['/privacy', /מדיניות פרטיות/],
  ['/reality', /זרם המציאות/],
];
const sitemapFamilies = [
  '/post/', '/topic/', '/category/', '/tag/', '/number/', '/video/', '/book/',
  '/or-geula/video/', '/forum/', '/codes/', '/community/researcher/',
];
const timeout = 18_000;
let step = 'configuration';

async function goto(page, origin, path, status = 200) {
  const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout });
  if ([401, 403, 429].includes(response?.status())) {
    // Evidence for whoever decides: which layer refused (Vercel firewall, the site's own edge policy, or something else). No bodies, no cookies.
    const headers = response.headers();
    const facts = ['server', 'x-vercel-mitigated', 'x-sod-edge-policy', 'x-sod-edge-risk', 'x-sod-country-policy', 'x-robots-tag', 'content-type']
      .filter((name) => headers[name]).map((name) => `${name}=${headers[name]}`).join(' ');
    const text = (await response.text().catch(() => '')).slice(0, 40).replace(/\s+/g, ' ');
    const agent = await page.evaluate(() => navigator.userAgent).catch(() => '');
    console.log(`EDGE ${response.status()} ${path} ${facts} body="${text}" ua="${agent.slice(0, 90)}"`);
  }
  assert.equal(response?.status(), status);
  assert.equal(new URL(page.url()).origin, origin);
  return response;
}

async function publicPage(page, path, heading) {
  await goto(page, production, path);
  await page.getByRole('button', { name: 'התחברות לאזור האישי', exact: true }).first().waitFor({ timeout });
  if (path === '/') await page.getByRole('region', { name: /מפת המציאות/ }).first().waitFor({ timeout });
  else if (heading) await page.getByRole('heading', { name: heading }).first().waitFor({ timeout });
  else await page.getByRole('main').getByRole('heading', { level: 1 })
    .filter({ hasNotText: /טוען|לא נמצא|לא זמין|צריך להתחבר/ }).first().waitFor({ timeout });
  assert.equal(await page.getByRole('heading', { name: /העמוד לא נמצא|צריך להתחבר|העמוד לא נפתח/ }).count(), 0);
}

async function sitemapExamples(context) {
  const getLocations = async (url) => {
    const response = await context.request.get(url, { timeout, maxRedirects: 0 });
    assert.equal(response.status(), 200);
    const xml = await response.text();
    assert(/<(sitemapindex|urlset)\b/.test(xml));
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((entry) => new URL(entry[1].replaceAll('&amp;', '&')));
  };
  const parts = await getLocations(production + '/sitemap.xml');
  assert(parts.length > 0 && parts.length <= 40);
  const pages = new Set();
  assert(parts.every((part) => part.origin === production));
  for (let start = 0; start < parts.length; start += 3) {
    const lists = await Promise.all(parts.slice(start, start + 3).map((part) => getLocations(part.href)));
    for (const page of lists.flat()) {
      assert.equal(page.origin, production);
      pages.add(page.pathname + page.search);
    }
  }
  console.log(`PASS sitemap: ${parts.length} parts, ${pages.size} URLs listed`);
  return sitemapFamilies.map((prefix) => {
    const path = [...pages].find((item) => item.startsWith(prefix));
    assert(path, `No sitemap example for ${prefix}`);
    return [path];
  });
}

async function guest(browser, devices) {
  let failed = false;
  const blocked = [];   // profiles the edge refused (401/403/429): reported as open coverage, never bypassed
  for (const [profile, options] of [
    ['desktop-1440', { viewport: { width: 1440, height: 900 } }],
    ['phone-390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ['Pixel 7', devices['Pixel 7']],
  ]) {
    const context = await browser.newContext({ ...options, locale: 'he-IL' });
    try {
      const page = await context.newPage();
      let routes = core;
      if (profile === 'desktop-1440') {
        try {
          routes = [...core, ...otherPublic, ...await sitemapExamples(context)];
        } catch {
          console.log('FAIL sitemap');
          failed = true;
          routes = [...core, ...otherPublic];
        }
      }
      let refused = false;
      for (const [path, heading] of routes) {
        try {
          await publicPage(page, path, heading);
          if (path === '/gematria') {
            await page.getByRole('textbox', { name: 'שם, מילה או ביטוי' }).fill('שלום', { timeout });
            await page.getByRole('button', { name: /רגיל 376/ }).waitFor({ timeout });
          }
          console.log(`PASS ${profile} ${path}`);
        } catch (error) {
          const networkError = error.message.match(/net::ERR_[A-Z_]+/)?.[0];
          console.log(`FAIL ${profile} ${path} (${error.actual ?? networkError ?? error.name})`);
          if ([401, 403, 429].includes(error.actual) || /^net::ERR_(CERT|PROXY|TUNNEL)/.test(networkError ?? '')) {
            blocked.push(`${profile} (${error.actual ?? networkError})`);
            refused = true;
            break;   // this profile is refused at the edge: stop it, keep testing the next profiles
          }
          failed = true;
        }
      }
      if (refused) continue;
      try {
        await goto(page, production, '/2029/me/messages');
        await page.getByRole('heading', { name: 'צריך להתחבר כדי לראות את האזור האישי' }).waitFor({ timeout });
        console.log(`PASS ${profile} guest cannot open the personal inbox`);
      } catch {
        console.log(`FAIL ${profile} guest inbox access gate`);
        failed = true;
      }
    } finally {
      await context.close();
    }
  }
  if (blocked.length) {
    console.log(`BLOCKED_AT_EDGE ${blocked.join(', ')}: coverage of these profiles is open; no protection was changed or bypassed`);
    return true;
  }
  return failed;
}

try {
  assert(process.argv.length === 2, 'The guest check takes no arguments; the login check is scripts/qa-site-2029.mjs');
  step = 'Chromium startup';
  const { chromium, devices } = createRequire(import.meta.url)('playwright');
  const installedPath = '/opt/pw-browsers/chromium';
  const executablePath = process.env.CHROMIUM_PATH || await access(installedPath).then(() => installedPath, () => undefined);
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: process.env.NO_PROXY } : undefined;
  // SITE_CHECK_HEADED=1: a regular (headed) browser under a virtual display, so the User-Agent is the browser's own. Nothing is spoofed:
  // the site refuses the HeadlessChrome agent by design (middleware-core.js) and that rule is neither changed nor circumvented here.
  const headless = process.env.SITE_CHECK_HEADED !== '1';
  const browser = await chromium.launch({ executablePath, proxy, timeout, headless });
  try {
    if (await guest(browser, devices)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
} catch (error) {
  console.error(`FAIL ${step} (${error.name})`);
  process.exitCode = 1;
}
