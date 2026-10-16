import { createRequire } from "node:module";
const WT = process.argv[2];
const require = createRequire(WT + "/package.json");
const { chromium } = require("playwright");
const { primaryContentState } = await import(WT + "/scripts/perf-execution-2029/browser-metrics.mjs");
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(async () => chromium.launch({ args: ["--no-sandbox"] }));
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const wrap = (i) => `<main><div data-experience-capability="home-composition" class="h29">${i}</div></main>`;
const link = '<a href="/post/x" style="display:block;height:30px">קראו</a>';
const card = (inner, style="") => `<article class="h29-card" style="${style}"><span class="h29-card-t" style="display:block;height:40px">כותרת אמיתית</span>${inner}</article>`;
const cases = {
 noticeWithPostLinkInCard: wrap(`<div class="h29-updates">${card('<div class="h29-notice"><p>לא זמין</p><a href="/post/other" style="display:block;height:30px">פוסט</a></div>').replace(/<a class="x"/,'')}</div>`),
 transparentCard: wrap(`<div class="h29-updates">${card(link,"opacity:0")}</div>`),
 offscreenCard: wrap(`<div style="height:3000px"></div><div class="h29-updates">${card(link)}</div>`),
 unavailableHeroWithLink: wrap(`<section class="h29-hero is-unavailable"><h1>SOD1820</h1>${link}</section>`),
 realCardVisible: wrap(`<div class="h29-updates">${card(link)}</div>`),
};
for (const [k,v] of Object.entries(cases)) { await p.setContent(v); console.log(k, await p.evaluate(`(${primaryContentState.toString()})("/").primary`)); }
await b.close();
