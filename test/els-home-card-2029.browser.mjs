// ELS home entrance card - real-browser acceptance (local static builds + real anonymous public reads).
//   DIST=<open preview build>  LOCKED_DIST=<same source built WITHOUT VITE_UNLOCKED_2029_PREVIEW>
//   BASELINE_DIST=<optional build of the base commit; request set is compared>  EVIDENCE_DIR=<output>
// Local measurement only. A hosted protected Preview must be checked separately (not claimed here).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const DIST = resolve(process.env.DIST || "preview-deploy/dist");
const LOCKED = process.env.LOCKED_DIST ? resolve(process.env.LOCKED_DIST) : null;
const BASELINE = process.env.BASELINE_DIST ? resolve(process.env.BASELINE_DIST) : null;
const OUT = process.env.EVIDENCE_DIR || "/tmp/els-home-card-evidence";
await mkdir(OUT, { recursive: true });

const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webp": "image/webp", ".jpg": "image/jpeg" };
async function serve(dist) {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://l").pathname);
    let file = resolve(dist, "." + pathname);
    if (!file.startsWith(dist + sep) && file !== dist) { res.writeHead(403).end(); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = resolve(dist, "index.html");
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(res);
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

const failures = [];
const report = { widths: [], reducedMotion: [], motionGates: null, keyboard: null, availability: [], requests: null };
const check = (name, condition, detail = "") => { if (!condition) failures.push(`${name} ${detail}`.trim()); return condition; };

// ── colour helpers (computed styles come back as rgb()/rgba()/color(srgb …)) ──
function parseColor(text) {
  const rgb = text.match(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] == null ? 1 : Number(rgb[4])];
  const srgb = text.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/);
  if (srgb) return [srgb[1] * 255, srgb[2] * 255, srgb[3] * 255, srgb[4] == null ? 1 : Number(srgb[4])];
  return null;
}
const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));

async function openHome(browser, origin, { width, height, theme = "dark", reducedMotion = "no-preference", route, wait = ".els-hm" }) {
  const context = await browser.newContext({ viewport: { width, height }, locale: "he-IL", reducedMotion });
  await context.addInitScript((value) => { try { localStorage.setItem("sod-theme", value); sessionStorage.setItem("sod-home-reveal-played", "1"); } catch (_) { /* optional */ } }, theme);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  if (route) await route(page);
  await page.goto(`${origin}/2029`, { waitUntil: "load" });
  await page.waitForSelector(wait, { timeout: 25000 });
  return { context, page, errors };
}

// Content above the card (posts, images) arrives asynchronously from the public readers; let it land first.
const settle = async (page) => { await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(2500); };
const centerCard = (page) => page.evaluate(() => document.querySelector(".els-hm").scrollIntoView({ block: "center" }));

const read = (page) => page.evaluate(() => {
  const root = document.querySelector(".els-hm");
  const style = (selector) => { const el = root.querySelector(selector); if (!el) return null; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { family: s.fontFamily, size: parseFloat(s.fontSize), weight: Number(s.fontWeight), lineHeight: s.lineHeight, color: s.color, bg: s.backgroundColor, bgImage: s.backgroundImage, w: r.width, h: r.height, tag: el.tagName, outline: `${s.outlineStyle} ${s.outlineWidth}`, anim: s.animationName, play: s.animationPlayState, transform: s.transform, display: s.display }; };
  const rect = root.getBoundingClientRect();
  return {
    rect: { x: rect.x, w: rect.width, h: rect.height },
    docOverflow: document.documentElement.scrollWidth - window.innerWidth,
    bodyOverflow: document.body.scrollWidth - window.innerWidth,
    cardOverflow: root.scrollWidth - root.clientWidth,
    title: style(".els-hm__title"), sentence: style(".els-hm__sentence"), note: style(".els-hm__note"),
    cta: style(".els-hm__cta"), pause: style(".els-hm__pause"), panel: style(".els-hm__panel"), rig: style(".els-hm__rig"), path: style(".els-hm__layer.is-mid .is-path"), animations: root.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
    href: root.querySelector("a.els-hm__cta")?.getAttribute("href") || null,
    motion: root.dataset.elsMotion, availability: root.dataset.elsAvailability,
    fontsReady: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")),
    letters: root.querySelectorAll(".els-hm__layer span").length,
  };
});

const { server, origin } = await serve(DIST);
const browser = await chromium.launch();
try {
  // ── A. every width x theme ──
  for (const [width, height] of [[320, 760], [390, 844], [768, 1024], [1440, 900]]) {
    for (const theme of ["light", "parchment", "dark"]) {
      const { context, page, errors } = await openHome(browser, origin, { width, height, theme });
      await page.evaluate(() => document.fonts.ready);
      await settle(page);
      const card = page.locator(".els-hm");
      await centerCard(page);
      await page.waitForTimeout(900);
      const a = await read(page);
      await page.waitForTimeout(1200);
      const b = await read(page);
      const tag = `${width}px ${theme}`;
      const desktop = width >= 1024;
      check(`${tag}: no horizontal page overflow`, a.docOverflow <= 0 && a.bodyOverflow <= 0, JSON.stringify([a.docOverflow, a.bodyOverflow]));
      check(`${tag}: no horizontal card overflow`, a.cardOverflow <= 0, String(a.cardOverflow));
      check(`${tag}: card inside viewport`, a.rect.x >= -0.5 && a.rect.x + a.rect.w <= width + 0.5, JSON.stringify(a.rect));
      check(`${tag}: stable height (+/-1px between samples)`, Math.abs(a.rect.h - b.rect.h) <= 1, `${a.rect.h} vs ${b.rect.h}`);
      check(`${tag}: title is Rubik 650-780, line-height >= 1.04`, /Rubik/.test(a.title.family) && a.title.weight >= 650 && a.title.weight <= 780 && parseFloat(a.title.lineHeight) / a.title.size >= 1.04, JSON.stringify(a.title));
      check(`${tag}: title size >= 26`, a.title.size >= 26, String(a.title.size));
      check(`${tag}: sentence is Noto Sans Hebrew >= ${desktop ? 18 : 16}px`, /Noto Sans Hebrew/.test(a.sentence.family) && a.sentence.size >= (desktop ? 18 : 16), JSON.stringify(a.sentence));
      check(`${tag}: note >= 14px`, a.note.size >= 14, String(a.note.size));
      check(`${tag}: CTA is a live link to /code, >= 44px target, >= 16px`, a.cta.tag === "A" && a.href === "/code" && a.cta.h >= 44 && a.cta.w >= 44 && a.cta.size >= 16, JSON.stringify({ href: a.href, ...a.cta }));
      check(`${tag}: pause control >= 44x44`, a.pause && a.pause.w >= 44 && a.pause.h >= 44, JSON.stringify(a.pause));
      // worst-case contrast: the panel is translucent over the matrix; assume the brightest possible backdrop (white).
      const panelBg = over(parseColor(a.panel.bg), [255, 255, 255]);
      for (const key of ["title", "sentence", "note"]) {
        const ratio = contrast(parseColor(a[key].color), panelBg);
        check(`${tag}: ${key} contrast >= 4.5 (worst case)`, ratio >= 4.5, ratio.toFixed(2));
      }
      const gradient = [...a.cta.bgImage.matchAll(/rgb\([^)]+\)/g)].map((m) => parseColor(m[0]));
      const onAccent = parseColor(a.cta.color);
      for (const stop of gradient) check(`${tag}: CTA label contrast >= 4.5 on every gradient stop`, contrast(onAccent, stop) >= 4.5, contrast(onAccent, stop).toFixed(2));
      check(`${tag}: real fonts loaded`, a.fontsReady.some((f) => /Rubik/.test(f)) && a.fontsReady.some((f) => /Noto Sans Hebrew/.test(f)), JSON.stringify(a.fontsReady));
      check(`${tag}: no page errors`, errors.length === 0, errors.join("|"));
      check(`${tag}: matrix drawn`, a.letters > 100, String(a.letters));
      check(`${tag}: motion running while visible - exactly one running animation (the rig)`, a.motion === "running" && a.rig.anim !== "none" && a.rig.play === "running" && a.animations === 1, JSON.stringify([a.motion, a.rig.anim, a.rig.play, a.animations]));
      const file = `card-${width}-${theme}.png`;
      await card.screenshot({ path: resolve(OUT, file) });
      report.widths.push({ tag, rect: a.rect, title: [a.title.family, a.title.size, a.title.weight], sentence: [a.sentence.family, a.sentence.size], cta: [a.cta.w, a.cta.h], overflow: [a.docOverflow, a.cardOverflow], file });
      await context.close();
    }
  }

  // ── B. reduced motion (OS) ──
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    const { context, page } = await openHome(browser, origin, { width, height, reducedMotion: "reduce" });
    await settle(page);
    await centerCard(page);
    await page.waitForTimeout(700);
    const r = await read(page);
    check(`reduced ${width}: nothing in the card animates`, r.rig.anim === "none" && r.animations === 0, JSON.stringify([r.rig.anim, r.animations]));
    check(`reduced ${width}: static designed pose (transform kept)`, r.rig.transform !== "none", r.rig.transform);
    check(`reduced ${width}: pause control not offered (nothing moves)`, r.pause === null || r.pause.display === "none", JSON.stringify(r.pause));
    check(`reduced ${width}: CTA still live`, r.cta.tag === "A" && r.href === "/code");
    await page.locator(".els-hm").screenshot({ path: resolve(OUT, `card-${width}-reduced-motion.png`) });
    report.reducedMotion.push({ width, rig: r.rig.anim, running: r.animations, pause: r.pause?.display ?? "absent" });
    await context.close();
  }

  // ── C. motion gates: pause control, off-screen, hidden tab ──
  {
    const { context, page } = await openHome(browser, origin, { width: 390, height: 844 });
    const card = page.locator(".els-hm");
    await settle(page);
    await centerCard(page);
    await page.waitForTimeout(600);
    const gates = {};
    gates.visible = (await read(page)).motion;
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    gates.offscreen = await page.evaluate(() => ({ motion: document.querySelector(".els-hm").dataset.elsMotion, play: getComputedStyle(document.querySelector(".els-hm__rig")).animationPlayState }));
    await centerCard(page);
    await page.waitForTimeout(600);
    gates.back = (await read(page)).motion;
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(300);
    gates.hiddenTab = await page.evaluate(() => ({ motion: document.querySelector(".els-hm").dataset.elsMotion, play: getComputedStyle(document.querySelector(".els-hm__rig")).animationPlayState }));
    await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(300);
    gates.shown = (await read(page)).motion;
    check("gate: running when visible", gates.visible === "running");
    check("gate: paused when scrolled off-screen", gates.offscreen.motion === "paused" && gates.offscreen.play === "paused", JSON.stringify(gates.offscreen));
    check("gate: resumes on return", gates.back === "running");
    check("gate: paused in a hidden tab", gates.hiddenTab.motion === "paused" && gates.hiddenTab.play === "paused", JSON.stringify(gates.hiddenTab));
    check("gate: resumes when tab is shown", gates.shown === "running");
    report.motionGates = gates;

    // keyboard: reach the pause control and the CTA with Tab only, operate with the keyboard
    const seen = { pause: false, cta: false, ctaFocusRing: null, pauseToggled: null, enterOpens: null };
    await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    const stateOf = () => page.evaluate(() => { const a = document.activeElement; return { cls: a?.className || "", pressed: a?.getAttribute?.("aria-pressed"), outline: a ? `${getComputedStyle(a).outlineStyle} ${getComputedStyle(a).outlineWidth}` : "" }; });
    for (let i = 0; i < 160 && !(seen.pause && seen.cta); i += 1) {
      await page.keyboard.press("Tab");
      const s = await stateOf();
      if (/els-hm__pause/.test(s.cls) && !seen.pause) {
        seen.pause = true;
        await page.waitForTimeout(1500); // the frame scrolls smoothly to the focused control
        await page.keyboard.press("Space");
        await page.waitForTimeout(400);
        const paused = await page.evaluate(() => ({ pressed: document.querySelector(".els-hm__pause").getAttribute("aria-pressed"), motion: document.querySelector(".els-hm").dataset.elsMotion, play: getComputedStyle(document.querySelector(".els-hm__rig")).animationPlayState }));
        await page.keyboard.press("Enter");
        await centerCard(page); // keyboard focus scrolls smoothly and asynchronously in headless; the toggle itself is what is asserted
        await page.waitForTimeout(900);
        const resumed = await page.evaluate(() => { const r = document.querySelector(".els-hm").getBoundingClientRect(); return { pressed: document.querySelector(".els-hm__pause").getAttribute("aria-pressed"), motion: document.querySelector(".els-hm").dataset.elsMotion, top: Math.round(r.top), bottom: Math.round(r.bottom), innerH: innerHeight, vis: document.visibilityState }; });
        seen.pauseToggled = { paused, resumed };
      }
      if (/els-hm__cta/.test(s.cls) && !seen.cta) { seen.cta = true; seen.ctaFocusRing = s.outline; }
    }
    check("keyboard: pause control reachable", seen.pause);
    check("keyboard: pause toggles aria-pressed and motion", seen.pauseToggled?.paused.pressed === "true" && seen.pauseToggled.paused.motion === "paused" && seen.pauseToggled.paused.play === "paused" && seen.pauseToggled.resumed.pressed === "false" && seen.pauseToggled.resumed.motion === "running", JSON.stringify(seen.pauseToggled));
    check("keyboard: CTA reachable with a visible focus ring", seen.cta && /solid\s+[1-9]/.test(seen.ctaFocusRing || ""), String(seen.ctaFocusRing));
    if (seen.cta) {
      await Promise.all([page.waitForURL("**/code", { timeout: 15000 }).then(() => { seen.enterOpens = true; }).catch(() => { seen.enterOpens = false; }), page.keyboard.press("Enter")]);
    }
    check("keyboard: Enter on the CTA opens /code", seen.enterOpens === true);
    report.keyboard = seen;
    await context.close();
  }

  // ── D. requests: the card must add no engine/scan/AI/result loading ──
  {
    const collect = async (base) => {
      const srv = await serve(base);
      const { context, page } = await openHome(browser, srv.origin, { width: 1440, height: 900, wait: ".h29" });
      const urls = [];
      page.on("request", (request) => urls.push(request.method() + " " + new URL(request.url()).pathname.replace(/\/\d+(?=\/|$)/g, "/#").replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, ".$1")));
      await page.reload({ waitUntil: "load" });
      await page.waitForSelector(".els-hm, .h29", { timeout: 25000 });
      await page.waitForTimeout(3500);
      await context.close(); srv.server.close();
      return urls;
    };
    const after = await collect(DIST);
    if (BASELINE) {
      const before = await collect(BASELINE);
      const count = (list) => list.reduce((m, u) => (m.set(u, (m.get(u) || 0) + 1), m), new Map());
      const [b, a] = [count(before), count(after)];
      const added = [...a].filter(([u, n]) => n > (b.get(u) || 0)).map(([u, n]) => `${u} +${n - (b.get(u) || 0)}`);
      report.requests = { before: before.length, after: after.length, added };
      check("requests: only site_flags (existing availability reader) is added", added.length === 1 && /rest\/v1\/site_flags/.test(added[0]), added.join("|"));
      check("requests: nothing ELS/AI/scan/engine/result-shaped is added", !added.some((u) => /functions\/v1|raziel|anthropic|openai|\/rpc\/|scan/i.test(u)), added.join("|"));
    } else report.requests = { after: after.length };
    check("requests: Home never calls an AI/Edge function", !after.some((u) => /functions\/v1|anthropic|openai/i.test(u)), after.filter((u) => /functions\/v1|anthropic|openai/i.test(u)).join("|"));
  }

  // ── E. availability through the REAL feature-state mechanism (non-bypass build) ──
  if (LOCKED) {
    const srv = await serve(LOCKED);
    const flags = (rows, delay = 0) => async (page) => page.route("**/rest/v1/site_flags*", async (route) => {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(rows) });
    });
    const cases = [
      ["open (lock_els disabled)", flags([{ key: "lock_els", enabled: false, mode: "all", message: null }]), { availability: "open", link: true }],
      ["closed (lock_els enabled, mode all)", flags([{ key: "lock_els", enabled: true, mode: "all", message: "x" }]), { availability: "blocked", link: false, text: "הצופן ייפתח בקרוב" }],
      ["registered only (mode anon, signed out)", flags([{ key: "lock_els", enabled: true, mode: "anon", message: "x" }]), { availability: "blocked", link: false, text: "פתוח למשתמשים רשומים" }],
      ["no flag row (default open)", flags([]), { availability: "open", link: true }],
    ];
    let openHeight = null;
    for (const [name, route, expected] of cases) {
      const { context, page } = await openHome(browser, srv.origin, { width: 390, height: 844, route });
      await settle(page);
      await centerCard(page);
      await page.waitForFunction(() => document.querySelector(".els-hm")?.dataset.elsAvailability !== "loading", null, { timeout: 15000 });
      const r = await read(page);
      const label = await page.locator(".els-hm__cta").innerText();
      const isLink = r.cta.tag === "A";
      check(`availability ${name}: state`, r.availability === expected.availability, r.availability);
      check(`availability ${name}: link ${expected.link ? "live" : "absent"}`, isLink === expected.link && (!expected.link || r.href === "/code"), JSON.stringify([r.cta.tag, r.href]));
      if (expected.text) check(`availability ${name}: honest label`, label.includes(expected.text), label);
      if (expected.link) openHeight = openHeight ?? r.rect.h;
      check(`availability ${name}: card height stable vs open (+/-2px)`, openHeight == null || Math.abs(r.rect.h - openHeight) <= 2, `${r.rect.h} vs ${openHeight}`);
      report.availability.push({ name, availability: r.availability, tag: r.cta.tag, label, h: r.rect.h });
      if (name.startsWith("closed")) await page.locator(".els-hm").screenshot({ path: resolve(OUT, "card-390-closed.png") });
      await context.close();
    }
    // loading: delay the flag read and prove the honest, non-link state occupies the same box
    const { context, page } = await openHome(browser, srv.origin, { width: 390, height: 844, route: flags([{ key: "lock_els", enabled: false, mode: "all" }], 2500) });
    await centerCard(page);
    const loading = await read(page);
    const loadingLabel = await page.locator(".els-hm__cta").innerText();
    check("availability loading: state + non-link status", loading.availability === "loading" && loading.cta.tag === "SPAN" && /בודק/.test(loadingLabel), JSON.stringify([loading.availability, loading.cta.tag, loadingLabel]));
    await page.locator(".els-hm").screenshot({ path: resolve(OUT, "card-390-loading.png") });
    await page.waitForFunction(() => document.querySelector(".els-hm")?.dataset.elsAvailability === "open", null, { timeout: 15000 });
    const opened = await read(page);
    check("availability loading->open: card height unchanged", Math.abs(opened.rect.h - loading.rect.h) <= 1, `${loading.rect.h} -> ${opened.rect.h}`);
    report.availability.push({ name: "loading->open", loadingH: loading.rect.h, openH: opened.rect.h });
    await context.close(); srv.server.close();
  }
} finally {
  await browser.close();
  server.close();
}

report.failures = failures;
await writeFile(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ checked: report.widths.length, failures }, null, 2));
if (failures.length) process.exit(1);
console.log("els-home-card-2029 browser acceptance OK");
