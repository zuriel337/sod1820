// "The article first" for an imported Post (OLD_POST_ARTICLE_FIRST, ZURIEL 16.11.2026), in a real Chromium with the BUILT public-reading
// artifact and its real service worker; the document is produced by the REAL server function (withArticleFirst2029 + jsdom). Proves:
//  1. the title, credit, date and body are in the document, readable before the application runs;
//  2. the page ADOPTS the document's body nodes (the same nodes, not a second rendering): one article, one title, nothing left behind,
//     the same text, links and anchors;
//  3. the paragraph the reader is on stays where it is (within 2 px), and so does a named anchor opened by a direct link;
//  4. a document article that is not exactly the page's article is replaced in place, once (never two);
//  5. leaving the address before the page adopted it removes it; internal navigation and back show the article once.
// Run `node scripts/build-public-reading-production.mjs` first.   node --test --test-concurrency=1 test/article-first-browser-2029.browser.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { startFixture, dist } from "./helpers/authBrowserFixture.mjs";
import { withArticleFirst2029, loadArticleFirstRenderer } from "../public-reading-deploy/api/article-first.js";
import { postArticleProofKey2029 } from "../src/lib/research/postArticlePipeline2029.js";

const require = createRequire(import.meta.url);
let pw; for (const name of ["playwright", "@playwright/test"]) { try { pw = require(name); break; } catch { /* optional tooling */ } }
assert.ok(pw, "the article-first acceptance requires the pinned browser; never skip.");
const executablePath = process.env.CHROMIUM_PATH || process.env.CHROMIUM_EXECUTABLE_PATH;
const manifest = JSON.parse(readFileSync(join(dist, ".vite/manifest.json"), "utf8"));
const POST_CHUNK = "/" + manifest["src/pages/Post2029Page.jsx"].file;
const SLUG = "%d7%a1%d7%93%d7%a8-%d7%aa%d7%a4%d7%99%d7%9c%d7%94-%d7%9c%d7%a8%d7%a4%d7%95%d7%90%d7%94";
const PATH = "/" + SLUG;
const PARAGRAPH = n => `<p>פסקה ${n}: סדר לימוד קריאה ותפילה לפני ה' יתברך שתמשך רפואה שלמה עלינו ועל כל ישראל, בזכות הצדיקים ובזכות התורה, אמן נצח סלה ועד. ${"מילים נוספות לקריאה ארוכה. ".repeat(6)}</p>`;
const ROW = { id: 192, wp_id: 29289, slug: SLUG, source: "wordpress", link: `https://sod1820.co.il${PATH}/`, title: "סדר תפילה ל- רפואה שלמה: תפילה של הצה&quot;ק",
  excerpt: "סדר תפילה מלא לרפואה שלמה.", author: "מזכה הרבים", date: "2023-05-18T17:08:31+00:00", modified: "2023-05-18T17:22:00+00:00",
  tags: ["תפילה"], categories: ["התחזקות"], image_url: "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/fixture/poster.png",
  content: ['<p><img src="https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/fixture/poster.png" width="750" height="500" alt=""></p>',
    ...[1, 2, 3, 4, 5, 6].map(PARAGRAPH), '<h3 style="text-align: center"><a name="_Toc10337527"></a><span style="color: #e8c840"><strong>תפילה של רבי פנחס מקוריץ</strong></span></h3>',
    ...[7, 8, 9, 10, 11, 12].map(PARAGRAPH), '<p><a href="/2029/posts">לכל הפוסטים</a></p>'].join("\n") };
const PROVEN = { [String(ROW.id)]: postArticleProofKey2029(ROW) };
const PROFILES = { phone: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }, desktop: { viewport: { width: 1280, height: 900 } } };
const sleep = ms => new Promise(done => setTimeout(done, ms));
// The faces the article uses, loaded (document.fonts.ready waits for every pending stylesheet, so it cannot be used while they are held).
const FACES = () => Promise.all(["400 16px 'Noto Sans Hebrew'", "700 16px 'Noto Sans Hebrew'", "400 16px Rubik", "700 16px Rubik"].map(font => document.fonts.load(font, "שלום 1820 Ab")));

await loadArticleFirstRenderer();
async function withPage(profile, { holdPostChunk = null, holdRead = null, initScript = null, row = ROW, holdCss = null } = {}, run) {
  const proven = { [String(row.id)]: postArticleProofKey2029(row) };
  const fixture = await startFixture({
    documentFor: ({ path, template }) => {
      if (decodeURIComponent(path).toLowerCase() !== decodeURIComponent(PATH).toLowerCase()) return null;
      const out = withArticleFirst2029(template, { path, search: "", status: 200, post: row, proven });
      assert.equal(out.state, "served", "the real server function serves the article");
      return out.html;
    },
    asset: ({ path }) => path === POST_CHUNK && holdPostChunk ? holdPostChunk.then(() => null) : null,
    supabase: async ({ url }) => {
      if (!(url.pathname === "/rest/v1/posts" && /slug|wp_id|id=/.test(url.search) && !/order=|limit=(?:[2-9]|\d\d)/.test(url.search))) return null;
      if (holdRead) await holdRead;
      return { body: [row] };
    },
  });
  const browser = await pw.chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: fixture.chromiumArgs, env: fixture.browserEnv });
  try {
    const context = await browser.newContext({ ...PROFILES[profile], ignoreHTTPSErrors: true, locale: "he-IL", serviceWorkers: "allow" });
    if (initScript) await context.addInitScript(initScript);
    if (process.env.AF_DEBUG) await context.addInitScript(() => {
      window.__scrollLog = [];
      const wrap = (obj, name) => { const orig = obj[name]; obj[name] = function (...args) { window.__scrollLog.push({ t: Math.round(performance.now()), name, args: JSON.stringify(args).slice(0, 80), y0: Math.round(scrollY), stack: (new Error().stack || "").split("\n").slice(2, 5).join(" | ").slice(0, 300) }); return orig.apply(this, args); }; };
      wrap(window, "scrollTo"); wrap(window, "scrollBy"); wrap(Element.prototype, "scrollIntoView"); wrap(Element.prototype, "scrollTo");
      addEventListener("scroll", () => window.__scrollLog.push({ t: Math.round(performance.now()), name: "scroll-event", y0: Math.round(scrollY) }), { passive: true });
    });
    const page = await context.newPage();
    // held in the browser before the request is sent (a request held by the server would occupy one of the browser's connections)
    if (holdCss) await page.route(/\/assets\/[^/?]+\.css(?:\?|$)/, async route => { await holdCss; await route.continue(); });
    const errors = []; page.on("pageerror", error => errors.push(String(error.message)));
    await run({ page, fixture, errors });
    await context.close();
  } finally { await browser.close(); await fixture.close(); }
}
const adopted = page => page.waitForFunction(() => window.__sodArticleFirst?.result, null, { timeout: 60000 }).then(() => page.evaluate(() => window.__sodArticleFirst));
const counts = page => page.evaluate(() => ({ articles: document.querySelectorAll("article.sod29-reading-post").length, h1: document.querySelectorAll("article h1").length,
  documentArticle: !!document.getElementById("sod29-ssr-article"), sources: document.querySelectorAll(".sod29-reading-source[data-public-post-id]").length }));
const bodyText = page => page.evaluate(() => (document.querySelector('#sod29-ssr-article [data-ssr-body="true"]') || document.querySelector(".sod29-reading-source[data-public-post-id]")).textContent.replace(/\s+/g, " ").trim());

for (const profile of Object.keys(PROFILES)) {
  test(`[${profile}] the article is in the first document; the page adopts the same nodes and the reader's paragraph does not move`, { timeout: 180000 }, async () => {
    await withPage(profile, {}, async ({ page, errors }) => {
      await page.goto("https://sod1820.co.il" + PATH, { waitUntil: "commit" });
      await page.waitForSelector('#sod29-ssr-article h1', { timeout: 20000 });
      const early = await page.evaluate(() => ({ title: document.querySelector("#sod29-ssr-article h1").textContent, byline: document.querySelector("#sod29-ssr-article .sod29-reading-byline")?.textContent || "",
        appReady: !!document.querySelector(".sod29-reading-source[data-public-post-id]") }));
      assert.match(early.title, /סדר תפילה ל- רפואה שלמה/); assert.match(early.byline, /ייחוס במקור: מזכה הרבים/); assert.equal(early.appReady, false, "readable before the page exists");
      const textBefore = await bodyText(page);
      // the reader moves to paragraph 5 and reads it at the reading line, before the page has taken over
      const before = await page.evaluate(() => {
        window.__bodyNodes = [...document.querySelector('#sod29-ssr-article [data-ssr-body="true"]').children];
        const target = window.__bodyNodes.find(node => /^פסקה 5:/.test(node.textContent.trim()));
        window.__reading = target; window.scrollBy({ top: target.getBoundingClientRect().top - 160, left: 0, behavior: "instant" });
        return Math.round(target.getBoundingClientRect().top);
      });
      const result = await adopted(page);
      assert.equal(result.result, "adopted", JSON.stringify(result));
      const after = await page.evaluate(() => ({ top: Math.round(window.__reading.getBoundingClientRect().top),
        sameNodes: window.__bodyNodes.every(node => node.isConnected && node.closest(".sod29-reading-source[data-public-post-id]")) }));
      assert.equal(after.sameNodes, true, "the page shows the document's own nodes (adopted, not rendered again)");
      if (process.env.AF_DEBUG) { await sleep(2500); console.log(JSON.stringify({ result, before, after, log: await page.evaluate(() => window.__scrollLog.filter(e => e.t > (window.__sodArticleFirst?.at || 0) - 50)), top2: await page.evaluate(() => Math.round(window.__reading.getBoundingClientRect().top)) }, null, 1)); }
      assert.ok(Math.abs(after.top - before) <= 2, `the paragraph being read stayed (${before} -> ${after.top})`);
      assert.deepEqual(await counts(page), { articles: 1, h1: 1, documentArticle: false, sources: 1 });
      assert.equal(await bodyText(page), textBefore, "the same text");
      assert.equal(await page.locator('.sod29-reading-source a[name="_Toc10337527"]').count(), 1, "anchors kept");
      assert.equal(await page.locator('.sod29-reading-source a[href="/2029/posts"]').count(), 1, "links kept");
      await sleep(1500);
      assert.deepEqual(await counts(page), { articles: 1, h1: 1, documentArticle: false, sources: 1 }, "still one article later");
      assert.deepEqual(errors, []);
    });
  });
}

test("[phone] a direct link to a named anchor: the browser opens at it and adoption keeps it there", { timeout: 180000 }, async () => {
  // The page's code is held until the document has loaded, so the browser's own jump to the fragment (which it repeats until load) is over
  // before the page takes over; then adoption must keep the anchor where it is.
  let release; const hold = new Promise(done => { release = done; });
  await withPage("phone", { holdPostChunk: hold }, async ({ page }) => {
    await page.goto("https://sod1820.co.il" + PATH + "#_Toc10337527", { waitUntil: "load" });
    await page.waitForSelector('#sod29-ssr-article a[name="_Toc10337527"]', { state: "attached", timeout: 20000 });
    await page.evaluate(FACES);
    // the browser's jump to a fragment is smooth here (html { scroll-behavior: smooth }): wait until it has come to rest
    await page.waitForFunction(() => { const y = scrollY; window.__still = window.__still?.y === y ? { y, n: window.__still.n + 1 } : { y, n: 0 }; return window.__still.n >= 6 && y > 0; }, null, { polling: 50, timeout: 10000 });
    const before = await page.evaluate(() => { window.__anchor = document.getElementsByName("_Toc10337527")[0]; return Math.round(window.__anchor.getBoundingClientRect().top); });
    assert.ok(before >= -2 && before < 300, `the browser opened at the anchor (${before})`);
    release();
    const result = await adopted(page);
    assert.equal(result.result, "adopted"); assert.equal(result.place, "target");
    await sleep(250);
    const first = await page.evaluate(() => Math.round(window.__anchor.getBoundingClientRect().top));
    await sleep(1500);
    const after = await page.evaluate(() => ({ top: Math.round(window.__anchor.getBoundingClientRect().top), count: document.getElementsByName("_Toc10337527").length }));
    assert.equal(after.count, 1);
    if (process.env.AF_DEBUG) console.log("ANCHOR", JSON.stringify({ before, first, af: await page.evaluate(() => window.__sodArticleFirst), log: await page.evaluate(() => window.__scrollLog.filter(e => e.t > (window.__sodArticleFirst?.at || 0) - 400)) }));
    assert.ok(Math.abs(first - before) <= 2, `adoption kept the anchor (${before} -> ${first})`);
    assert.ok(Math.abs(after.top - first) <= 2, `the anchor stayed after adoption (${first} -> ${after.top})`);
  });
});

test("[phone] a document article that is not exactly the page's article is replaced in place, once", { timeout: 180000 }, async () => {
  // something in the browser (an extension, a translation tool) changes the document article before the page takes over
  const initScript = () => document.addEventListener("DOMContentLoaded", () => document.querySelector('#sod29-ssr-article [data-ssr-body="true"] p:nth-of-type(2)')?.setAttribute("data-extension", "1"));
  await withPage("phone", { initScript }, async ({ page }) => {
    await page.goto("https://sod1820.co.il" + PATH, { waitUntil: "domcontentloaded" });
    const result = await adopted(page);
    assert.equal(result.result, "replaced"); assert.equal(result.reason, "output-differs");
    assert.deepEqual(await counts(page), { articles: 1, h1: 1, documentArticle: false, sources: 1 });
    assert.equal(await page.locator("[data-extension]").count(), 0, "the page's own article, not the changed one");
  });
});

test("[phone] leaving before the page adopted it removes the document article; internal navigation and back show the article once", { timeout: 180000 }, async () => {
  // the frame is on screen and the page is still reading its source (the read is held): the reader leaves through a frame link
  let release; const held = new Promise(done => { release = done; });
  await withPage("phone", { holdRead: held }, async ({ page }) => {
    await page.goto("https://sod1820.co.il" + PATH, { waitUntil: "domcontentloaded" });
    const link = await page.waitForFunction(() => {
      const current = location.pathname;
      return [...document.querySelectorAll("#root a[href^='/']")].find(a => a.offsetParent && a.getAttribute("href") !== current && !a.closest("#sod29-ssr-article") && !a.closest(".sod29-opening"))?.getAttribute("href") || null;
    }, null, { timeout: 60000 }).then(handle => handle.jsonValue());
    assert.equal(await page.evaluate(() => !!document.getElementById("sod29-ssr-article")), true, "still the document article while the page reads");
    await page.evaluate(href => [...document.querySelectorAll("#root a[href^='/']")].find(a => a.getAttribute("href") === href && a.offsetParent).click(), link);
    await page.waitForFunction(href => location.pathname + location.search === href || location.pathname === new URL(href, location.origin).pathname, link, { timeout: 20000 });
    await page.waitForFunction(() => !document.getElementById("sod29-ssr-article"), null, { timeout: 10000 });
    await sleep(800);
    const root = await page.evaluate(() => Math.round(document.getElementById("root").getBoundingClientRect().height));
    assert.ok(root > 300, `the next page is not held under the opening bar (${root})`);
    release();
    await page.goBack({ waitUntil: "domcontentloaded" });
    if (process.env.AF_DEBUG) { await sleep(8000); console.log("DEBUG " + JSON.stringify(await page.evaluate(() => ({ url: location.pathname, text: document.getElementById("root")?.innerText.replace(/\s+/g, " ").slice(0, 300), srcs: document.querySelectorAll(".sod29-reading-source").length, ps: document.querySelectorAll(".sod29-reading-source p").length, ssr: !!document.getElementById("sod29-ssr-article") })))); }
    await page.waitForSelector(".sod29-reading-source[data-public-post-id] p:not([data-duplicate-cover])", { timeout: 60000 });
    await sleep(1500);
    assert.deepEqual(await counts(page), { articles: 1, h1: 1, documentArticle: false, sources: 1 });
  });
});

// Codex review / ZURIEL 16.11.2026: the same design before and after adoption, no paragraph jump. The document article sits in the page's own
// frame (postArticleFrame2029.js) with the page's own header, so every block has the page's geometry, fonts and colours BEFORE the application
// runs, in every theme; and the frame's token style is the System Frame's own.
const SNAPSHOT = () => {
  const article = document.querySelector("#sod29-ssr-article article") || document.querySelector("article.sod29-reading-post");
  const blocks = [...article.children].filter(node => !node.matches(".sod29-post-research,[data-tool-on-approach],.sod29-post-next"));
  const pick = { h1: article.querySelector("h1"), byline: article.querySelector(".sod29-reading-byline"), chips: article.querySelector(".sod29-reading-hero-copy > .k29-cats"),
    details: article.querySelector(".sod29-post-details"), source: article.querySelector(".sod29-reading-source"),
    p5: [...article.querySelectorAll(".sod29-reading-source p")].find(node => /^פסקה 5:/.test(node.textContent.trim())), h3span: article.querySelector(".sod29-reading-source h3 span"),
    link: article.querySelector('.sod29-reading-source a[href="/2029/posts"]') };
  const box = node => { const r = node.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)].join(","); };
  const style = node => { const cs = getComputedStyle(node); return [cs.fontFamily, cs.fontSize, cs.lineHeight, cs.fontWeight, cs.color, cs.backgroundColor, cs.borderTopColor, cs.padding].join("|"); };
  return { blocks: blocks.map(node => `${node.tagName}.${node.className}@${box(node)}`), elements: Object.fromEntries(Object.entries(pick).map(([key, node]) => [key, node ? `${box(node)} ${style(node)}` : null])) };
};
const CHROME = () => {
  const article = document.querySelector("#sod29-ssr-article article") || document.querySelector("article.sod29-reading-post");
  const clone = article.cloneNode(true);
  clone.querySelectorAll(".sod29-reading-layout,.sod29-post-research,[data-tool-on-approach],.sod29-post-next").forEach(node => node.remove());
  clone.querySelectorAll("[aria-disabled],[aria-controls],[data-ssr-cover]").forEach(node => { node.removeAttribute("aria-disabled"); node.removeAttribute("aria-controls"); node.removeAttribute("data-ssr-cover"); });
  clone.querySelectorAll(".sod29-post-details-body").forEach(node => node.replaceChildren());   // closed: its tools load when opened
  return clone.innerHTML;
};
for (const [profile, theme] of [["phone", "dark"], ["desktop", "dark"], ["phone", "light"], ["desktop", "parchment"]]) {
  test(`[${profile} · ${theme}] before the application runs, the article has the page's geometry, fonts, colours and header`, { timeout: 180000 }, async () => {
    let release; const hold = new Promise(done => { release = done; });
    const initScript = `try{localStorage.setItem("sod2029:theme-preset","${theme}");localStorage.setItem("sod2029:theme-preset-seeded","1")}catch(e){}`;
    // the full stylesheets are held too: "before" is the article on the first-paint stylesheet alone, as a slow connection first shows it
    await withPage(profile, { holdPostChunk: hold, holdCss: hold, initScript }, async ({ page, errors }) => {
      await page.goto("https://sod1820.co.il" + PATH, { waitUntil: "commit" });
      await page.waitForFunction(() => document.readyState !== "loading" || document.querySelector("#sod29-ssr-article .sod29-reading-source p:last-of-type"), null, { timeout: 20000 });
      assert.equal(await page.evaluate(() => [...document.styleSheets].some(sheet => /\/assets\/Sod2029Shell-/.test(sheet.href || ""))), false, "the full stylesheets are still on their way");
      await page.waitForSelector("#sod29-ssr-article h1");
      await page.evaluate(FACES);
      await sleep(400);
      const frame = await page.evaluate(() => { const node = document.getElementById("sod29-ssr-article"); return { theme: document.documentElement.getAttribute("data-theme-2029"), preset: node.getAttribute("data-frame-theme-preset"), style: node.getAttribute("style") }; });
      assert.equal(frame.theme, theme, "the reader's theme before the first paint"); assert.equal(frame.preset, theme);
      const before = await page.evaluate(SNAPSHOT), chromeBefore = await page.evaluate(CHROME);
      const appBefore = await page.evaluate(() => Boolean(document.querySelector(".sod29-root:not(#sod29-ssr-article)")));
      assert.equal(appBefore, false, "the application waits for its stylesheets");
      release();
      const result = await adopted(page);
      assert.equal(result.result, "adopted", JSON.stringify(result));
      await sleep(600);
      const after = await page.evaluate(SNAPSHOT), chromeAfter = await page.evaluate(CHROME);
      const root = await page.evaluate(() => document.querySelector(".sod29-root").getAttribute("style"));
      const tokens = style => Object.fromEntries(String(style).split(";").map(part => part.trim()).filter(Boolean).map(part => [part.slice(0, part.indexOf(":")).trim(), part.slice(part.indexOf(":") + 1).trim().replace(/\s+/g, " ").replace(/["']/g, "").replace(/,\s*/g, ",")]));   // a family list is serialized with either quote
      assert.deepEqual(tokens(frame.style), tokens(root), "the frame's token style is the System Frame's own");
      assert.deepEqual(after.blocks, before.blocks, "every block of the article keeps its place and size");
      assert.deepEqual(after.elements, before.elements, "title, credit, chips, details, body, paragraph, emphasis and link keep their geometry, fonts and colours");
      assert.equal(chromeAfter, chromeBefore, "the page's header is the document's header (its controls become active)");
      assert.deepEqual(errors, []);
    });
  });
}

// Historical colours (ZURIEL 16.11.2026): yellow and white from the old site, black panels, a yellow highlight, black text, a gold long heading,
// an old <font> colour, Hebrew with vowel marks and digits. In dark, light and parchment, before the application runs and after adoption: every
// authored colour reads on what is really behind it (4.5:1; 3:1 for large text), the colours are the same before and after, and yellow keeps a
// visible highlighter where its colour had to change.
const COLOR_ROW = { ...ROW, content: [
  '<p><span style="color: #ffff00;"><strong>הדגשה צהובה עם ניקוד: בְּרֵאשִׁית בָּרָא 1820</strong></span></p>',
  '<p><span style="color: #ffffff;">טקסט לבן מהאתר הישן</span> ו<a href="/2029/posts" style="color:#ffff00">קישור צהוב</a></p>',
  '<div style="background-color:#000000;padding:12px"><p>פסקה על רקע שחור משלה <span style="color:#ffff00">צהוב בפאנל</span> <a href="/world">קישור בפאנל</a></p></div>',
  '<p><span style="background-color:#ffff00">מרקר צהוב בלי צבע משלו</span></p>',
  '<p style="color:#000000">טקסט שחור מהאתר הישן</p>',
  '<h2 style="color:#e8c840">כותרת ארוכה מאוד בצבע זהב שעוברת שתי שורות לפחות בטלפון, עם המספר 5786</h2>',
  '<p><font color="#0000ff">כחול ישן</font> <span style="color:#ff0000">אדום</span></p>',
].join("\n") };
const COLOR_READOUT = () => {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1; const g = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = value => { g.clearRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillStyle = value; g.fillRect(0, 0, 1, 1); const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data; return { r, g: gg, b, a: a / 255 }; };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const lum = ({ r, g, b }) => [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const behind = node => { const layers = []; for (let el = node; el; el = el.parentElement) layers.push(rgba(getComputedStyle(el).backgroundColor)); return layers.reverse().reduce((acc, layer) => over(layer, acc), { r: 255, g: 255, b: 255, a: 1 }); };
  const body = document.querySelector('#sod29-ssr-article [data-ssr-body="true"]') || document.querySelector(".sod29-reading-source[data-public-post-id]");
  const items = [...body.querySelectorAll("span,strong,a,p,h2,font")].filter(node => [...node.childNodes].some(child => child.nodeType === 3 && child.nodeValue.trim()));
  return items.map(node => { const cs = getComputedStyle(node), size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    return { text: [...node.childNodes].filter(child => child.nodeType === 3).map(child => child.nodeValue).join("").trim().slice(0, 24), color: cs.color, ratio: Math.round(ratio(rgba(cs.color), behind(node)) * 100) / 100,
      need: large ? 3 : 4.5, marker: /gradient/.test(cs.backgroundImage), tone: node.getAttribute("data-legacy-tone") }; });
};
for (const theme of ["dark", "light", "parchment"]) {
  test(`[phone · ${theme}] historical colours read before and after adoption, and keep their meaning`, { timeout: 180000 }, async () => {
    let release; const hold = new Promise(done => { release = done; });
    const initScript = `try{localStorage.setItem("sod2029:theme-preset","${theme}");localStorage.setItem("sod2029:theme-preset-seeded","1")}catch(e){}`;
    await withPage("phone", { holdPostChunk: hold, holdCss: hold, initScript, row: COLOR_ROW }, async ({ page }) => {
      await page.goto("https://sod1820.co.il" + PATH, { waitUntil: "commit" });
      await page.waitForSelector("#sod29-ssr-article .sod29-reading-source p:last-of-type", { state: "attached" });
      await page.evaluate(FACES);
      const before = await page.evaluate(COLOR_READOUT);
      release();
      assert.equal((await adopted(page)).result, "adopted");
      await sleep(400);
      const after = await page.evaluate(COLOR_READOUT);
      assert.deepEqual(after.map(item => [item.text, item.color]), before.map(item => [item.text, item.color]), "the same colours before and after adoption");
      if (process.env.AF_DEBUG) console.log(theme, JSON.stringify(after));
      for (const item of after) assert.ok(item.ratio >= item.need, `${theme}: "${item.text}" ${item.color} reads ${item.ratio}:1 (needs ${item.need})`);
      const yellow = after.find(item => item.text.startsWith("הדגשה צהובה")) || after.find(item => item.tone === "yellow");
      if (theme !== "dark") assert.ok(after.some(item => item.tone === "yellow" && item.marker), "yellow keeps a visible highlighter where its colour changed");
      else assert.ok(yellow, "the yellow emphasis is there");
    });
  });
}
