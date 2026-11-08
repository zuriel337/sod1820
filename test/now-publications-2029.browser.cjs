// Actual compiled 2029 client (dist/2029.html) with SYNTHETIC public responses only: no live call is forwarded.
// Covers the Now publications window: guest/user, 320/390/1440, day/parchment/night, reduced motion, keyboard,
// loading / error / empty, media on demand, filtering, exact opening, refresh and back.
const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), http = require("http"), assert = require("assert/strict");
const root = path.resolve(process.env.SOD_NOW_DIST || "dist"), out = process.env.SOD_NOW_OUT || "/tmp/now-publications-2029";
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(root + "/2029.html", "utf8"), entryMatch = html.match(/await import\('([^']+)'\)/);
const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".woff2": "font/woff2", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://test"); const f = path.resolve(root, "." + u.pathname);
  if (f !== root && !f.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.setHeader("Content-Type", "text/html"); return res.end(entryMatch ? html.replace(/<script type="module">if\(!\('serviceWorker'[\s\S]*?<\/script>/, `<script type="module" src="${entryMatch[1]}"></script>`) : html); }
  res.setHeader("Content-Type", MIME[path.extname(f)] || "application/octet-stream"); res.end(fs.readFileSync(f));
});

const STORAGE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const APPROVED = "9d4e6b80-f52b-4461-9231-ca30f37f0db9", ASSET = "25e378462b55298219e5f7562698bfa7";
const post = (id, o = {}) => ({ id, slug: "p" + id, title: "פוסט " + id, excerpt: "תקציר " + id, author: "כותב", source: "wordpress", link: null, wp_id: id, categories: [], tags: [], home_hidden: false, date: `2026-11-0${(id % 3) + 1}T0${id % 9}:00:00Z`, modified: `2026-11-0${(id % 3) + 1}T0${id % 9}:30:00Z`, created_at: "2026-10-01T00:00:00Z", ...o });
const POSTS = [
  post(1, { title: "מימד חמש: פרק חדש על התודעה והזמן שלא נגמר כשמדברים ארוכות על הנושא החשוב הזה ועל המשמעות שלו", author: "בדרך לנצח", categories: ["מימד חמש", "וידאו"], excerpt: "צפו https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/d5.mp4 עכשיו" }),
  post(2, { title: "מה קורה הבורא השבוע", author: "אלון לוי", tags: ["מה קורה הבורא"] }),
  post(3, { title: "סוד החשמל — הסבר", categories: ["סוד החשמל"] }),
  post(4, { title: "מסר מהקטגוריה מסרים", categories: ["מסרים"] }),
  post(5, { title: "רמז חזק", categories: ["רמזים חזקים"] }),
  post(6, { title: "פוסט רגיל ללא סדרה" }),
];
const GROUP = [{ id: "20000000-0000-4000-8000-000000000001", body: "פתיחה של צבי ב-03.11.2026 ראו https://sod1820.co.il/post/p6 וגם https://example.com/private?x=1 טל 050-123-4567 והמשך ארוך מאוד של ההודעה שלא אמור להיכנס לשורה הקצרה כולה אלא רק מילות הפתיחה שלה", created_at: "2026-11-03T08:00:00Z", contributor_slug: "tzvi-opoc", contributor_name: "צבי", group_proof: true, proof_basis: "verified_phone_unique" }];
const chan = (id, channel, o = {}) => ({ id, channel, status: "live", page_only: false, expires_at: null, created_at: "2026-11-03T09:00:00Z", text: "", image_url: null, link_url: null, ...o });
const CHANNELS = {
  "or-geula": [chan(APPROVED, "or-geula", { text: "מילות המסר עצמן: הגאולה קרובה ויש להתחזק בכל יום ובכל שעה, ולהפיץ את האור הלאה אל כל מקום", image_url: STORAGE + "or.mp4", seo_title: "מסר מאור הגאולה", thumb_url: STORAGE + "or.png", created_at: "2026-11-03T09:49:00Z" }),
    chan("30000000-0000-4000-8000-000000000002", "or-geula", { text: "עדכון נוסף שלא אושר לסדרה", created_at: "2026-11-02T09:00:00Z" })],
  "reality-code": [chan("30000000-0000-4000-8000-000000000003", "reality-code", { text: "קוד המציאות היום " + STORAGE + "x.mp4 סיום", created_at: "2026-11-02T10:00:00Z" })],
  "site-news": [chan("30000000-0000-4000-8000-000000000004", "site-news", { text: "עדכון אתר", created_at: "2026-11-01T10:00:00Z", link_url: "/post/p3" })],
};
const GALLERY = [{ id: "40000000-0000-4000-8000-000000000001", image_url: STORAGE + "g.png", name: "תמונה מהזרם", description: "", source: "update", published: 1, min_tier: 0, curator_hidden: false, stream_at: "2026-11-02T12:00:00Z", created_at: "2026-11-02T12:00:00Z", occurred_at: null, wp_gallery_id: 29 }];

async function open(browser, { width, height = 900, theme = "dark", mode = "success", reduced = false }) {
  const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: "block", reducedMotion: reduced ? "reduce" : "no-preference", locale: "he-IL", timezoneId: "Asia/Jerusalem" });
  await ctx.addInitScript(t => { try { localStorage.setItem("sod-theme", t); } catch {} }, theme);
  const errors = [], forbidden = [], reads = [];
  const page = await ctx.newPage(); page.on("pageerror", e => errors.push(e.message));
  if (process.env.SOD_NOW_DEBUG) { page.on("console", m => console.log("C:", m.type(), m.text().slice(0, 240))); page.on("framenavigated", f => console.log("NAV", f.url())); page.on("requestfailed", r => console.log("RF", r.url().slice(0, 120))); }
  await ctx.route("**/*", async route => {
    const u = new URL(route.request().url());
    if (u.origin === "http://127.0.0.1:" + server.address().port) return route.continue();
    if (u.hostname !== "linswmnnkjxvweumprav.supabase.co") return route.abort();
    if (u.pathname.startsWith("/storage/")) return route.fulfill({ status: 200, contentType: u.pathname.endsWith(".mp4") ? "video/mp4" : "image/png", body: u.pathname.endsWith(".mp4") ? Buffer.alloc(16) : PNG });
    if (!u.pathname.startsWith("/rest/v1/")) { forbidden.push(u.pathname); return route.abort(); }
    const name = u.pathname.split("/").pop(); reads.push(name); let body = [];
    const fail = () => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "controlled", code: "42501" }) });
    if (name === "posts") { if (mode === "error") return fail(); body = mode === "empty" ? [] : POSTS; }
    else if (name === "world_group_source_arrivals_v2") body = mode === "empty" || mode === "error" ? [] : GROUP;
    else if (name === "channel_updates") {
      if (mode === "error") return fail();
      const channel = (u.searchParams.get("channel") || "").replace(/^eq\./, ""), id = (u.searchParams.get("id") || "").replace(/^eq\./, "");
      body = mode === "empty" ? [] : id ? Object.values(CHANNELS).flat().filter(r => r.id === id) : (CHANNELS[channel] || []);
    } else if (name === "gallery_images") body = mode === "empty" || mode === "error" ? [] : GALLERY;
    else if (name === "video_media_assets_v1") body = mode === "empty" || mode === "error" ? [] : [{ public_id: ASSET, asset_key: "k1", media_url: STORAGE + "or.mp4", thumb_url: STORAGE + "or.png", poster_url: STORAGE + "or.png", primary_source_type: "channel_update", primary_source_id: APPROVED }];
    return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "0-0/0" }, body: JSON.stringify(body) }).catch(() => {});
  });
  return { ctx, page, errors, forbidden, reads };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.SOD_CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port, results = [];
  let current = null;
  try {
    // 1) Full matrix: widths x themes, success data, opening geometry + overflow + bar still reachable.
    for (const [width, height] of [[320, 640], [390, 844], [1440, 900]]) for (const theme of ["light", "parchment", "dark"]) {
      const s = await open(browser, { width, height, theme }); current = s.page; const { page } = s;
      await page.goto(origin + "/?controlled=home-now", { waitUntil: "domcontentloaded" });
      const island = page.locator(".sod29-command-island");
      await island.waitFor({ state: "visible", timeout: 20000 });
      await island.getByRole("button", { name: /^עכשיו/ }).click();
      const panel = page.getByRole("dialog", { name: "עכשיו", exact: true });
      await panel.waitFor({ state: "visible" });
      await panel.locator(".sod29-nowpub-row").first().waitFor({ state: "visible", timeout: 15000 });
      await page.waitForFunction(() => !document.querySelector(".sod29-nowpub")?.getAttribute("aria-busy") || document.querySelector(".sod29-nowpub")?.getAttribute("aria-busy") === "false", null, { timeout: 15000 });
      const geo = await page.evaluate(() => {
        const q = s => document.querySelector(s), r = el => el && el.getBoundingClientRect();
        const panel = q(".sod29-frame-panel"), dock = q(".sod29-command-island"), list = q(".sod29-nowpub-list");
        const dp = r(panel), dd = r(dock), hit = document.elementFromPoint(dd.x + dd.width / 2, dd.y + dd.height / 2);
        return { panelBottom: Math.round(dp.bottom), dockTop: Math.round(dd.top), dockHit: !!hit?.closest(".sod29-command-island"), hOverflow: document.documentElement.scrollWidth > innerWidth + 1, panelOverflow: panel.scrollWidth > panel.clientWidth + 1,
          rows: document.querySelectorAll(".sod29-nowpub-row").length, firstRowH: Math.round(r(q(".sod29-nowpub-row")).height), panelH: Math.round(dp.height), listTop: Math.round(r(list).top), vh: innerHeight };
      });
      assert.equal(geo.dockHit, true, `dock reachable above the sheet ${width}/${theme}`);
      assert.equal(geo.hOverflow, false, `no horizontal page overflow ${width}/${theme}`);
      assert.equal(geo.panelOverflow, false, `no panel overflow ${width}/${theme}`);
      assert.ok(geo.panelBottom <= geo.dockTop + 2 || width >= 1000, `sheet ends at the bar ${width}: ${JSON.stringify(geo)}`);
      assert.ok(geo.firstRowH <= 360, `row with words + preview stays bounded ${geo.firstRowH}`);
      await page.screenshot({ path: `${out}/now-${width}-${theme}.png` });
      assert.deepEqual(s.forbidden, []); assert.deepEqual(s.errors, []);
      results.push({ width, theme, ...geo }); await s.ctx.close();
    }

    // 2) Behavior at 390 night: contents, filters, privacy, exact opening, media on demand.
    {
      const s = await open(browser, { width: 390, height: 844, theme: "dark" }); current = s.page; const { page } = s;
      await page.goto(origin + "/?controlled=home-now", { waitUntil: "domcontentloaded" });
      await page.locator(".sod29-command-island").getByRole("button", { name: /^עכשיו/ }).click();
      const panel = page.getByRole("dialog", { name: "עכשיו", exact: true });
      await panel.locator(".sod29-nowpub-row").nth(5).waitFor({ state: "visible", timeout: 15000 });
      const text = await panel.innerText();
      assert.ok(!/\.mp4|supabase\.co\/storage/i.test(text), "no raw MP4/storage address in visible text");
      assert.ok(!/050-123|example\.com/.test(text), "phone / foreign link redacted");
      const chips = await panel.locator(".sod29-nowpub-chip").allInnerTexts();
      const chipLabels = chips.map(text => text.replace(/\d+$/, "")), chipCounts = chips.map(text => Number(text.match(/\d+$/)?.[0]));
      assert.deepEqual(chipLabels, ["הכול", "מקורות ציבוריים", "מסרים ואור הגאולה", "זרם המציאות", "סדרות", "רמזי גאולה וקוד המציאות"]);
      // ZURIEL 6.11.2026: opens on "הכול" and every chip carries the number of entries loaded in the window (never a site-wide total).
      assert.ok(chipCounts.every(n => Number.isInteger(n) && n > 0), "every chip carries its loaded count: " + chips.join(" | "));
      assert.equal((await panel.locator(".sod29-nowpub-chip[aria-pressed='true']").innerText()).replace(/\d+$/, ""), "הכול", "the window opens on all");
      assert.equal(chipCounts[chipLabels.indexOf("הכול")], Math.max(...chipCounts), "the all chip is the largest count");
      assert.match(await panel.locator(".sod29-nowpub-chip").first().getAttribute("aria-label"), /פרסומים שנטענו בחלונית/, "the count is labelled as loaded entries");
      // the words of the message and a visible preview are in the row itself (not just a headline)
      const msgRow = panel.locator(".sod29-nowpub-row", { hasText: "מילות המסר עצמן" }).first();
      assert.equal(await msgRow.locator(".sod29-nowpub-preview").count(), 1, "visible media preview in the row");
      assert.match(await msgRow.locator(".sod29-nowpub-excerpt").innerText(), /הגאולה קרובה/);
      // unverified source rows stay two lines: no excerpt, no big preview
      const zviRow = panel.locator(".sod29-nowpub-row.is-source").first();
      assert.equal(await zviRow.locator(".sod29-nowpub-excerpt, .sod29-nowpub-preview").count(), 0);
      assert.ok((await zviRow.evaluate(e => e.getBoundingClientRect().height)) <= 100, "unverified source row is compact");
      assert.ok((await zviRow.locator(".sod29-nowpub-title").evaluate(e => e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight))) <= 2.2, "Zvi title is at most two lines");
      assert.ok(!/מסרים מצדיקים/.test(text), "public series name is מסרים");
      // order: newest first in "all"
      const times = await panel.locator(".sod29-nowpub-row time").evaluateAll(els => els.map(e => e.getAttribute("datetime")));
      assert.deepEqual([...times].sort().reverse(), times, "all rows are chronological");
      // group source row: label + exact raw source
      const zvi = panel.locator("details.sod29-nowpub-row.is-source").first();
      await zvi.locator("summary").click();
      assert.match(await zvi.innerText(), /מקור · טרם נבדק/);
      assert.match(await zvi.innerText(), /03\.11\.2026/, "date is not replaced by [מספר]");
      assert.match(await zvi.innerText(), /sod1820\.co\.il\/post\/p6/, "public link kept");
      await zvi.getByRole("button", { name: "למקור" }).click();
      await page.waitForURL(/\/world#group-source-20000000-0000-4000-8000-000000000001/);
      await page.goBack(); await page.waitForTimeout(300);
      // video row: nothing plays until chosen; both actions exist
      await page.locator(".sod29-command-island").getByRole("button", { name: /^עכשיו/ }).click();
      const panel2 = page.getByRole("dialog", { name: "עכשיו", exact: true });
      await panel2.locator(".sod29-nowpub-row").first().waitFor({ state: "visible", timeout: 15000 });
      const msg = panel2.locator("details.sod29-nowpub-row", { hasText: "מילות המסר עצמן" }).first();
      await msg.locator("summary").click();
      assert.equal(await msg.locator("video").count(), 0, "no video element before a choice");
      assert.equal(await page.evaluate(() => [...document.querySelectorAll("video")].some(v => !v.paused)), false, "nothing autoplays");
      assert.match(await msg.innerText(), /מסרים/); assert.match(await msg.innerText(), /אור הגאולה/);
      await msg.getByRole("button", { name: /^הצג את הנגן/ }).click();
      assert.equal(await msg.locator("video[controls]").count(), 1);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll("video")].some(v => !v.paused)), false, "still not playing after opening the player");
      assert.equal(await msg.getByRole("button", { name: "לפרסום המלא" }).count(), 1);
      assert.equal(await msg.getByRole("button", { name: /^לסדרה/ }).count(), 1);
      await page.screenshot({ path: `${out}/now-390-video-open.png` });
      await msg.getByRole("button", { name: /^לסדרה/ }).click();
      await page.waitForURL(/\/2029\/posts\?series=messages-from-righteous/);
      await page.goBack(); await page.waitForTimeout(300);
      // filters
      await page.locator(".sod29-command-island").getByRole("button", { name: /^עכשיו/ }).click();
      const panel3 = page.getByRole("dialog", { name: "עכשיו", exact: true });
      await panel3.locator(".sod29-nowpub-row").first().waitFor({ state: "visible", timeout: 15000 });
      const count = () => panel3.locator(".sod29-nowpub-row").count();
      const all = await count();
      await panel3.getByRole("button", { name: "מסרים", exact: true }).click();
      const msgs = await count(); assert.ok(msgs >= 2 && msgs < all, `messages lens ${msgs}/${all}`);
      assert.ok(!/פוסט רגיל ללא סדרה/.test(await panel3.innerText()));
      await panel3.getByRole("button", { name: "רמזי גאולה וקוד המציאות" }).click();
      const hints = await panel3.locator(".sod29-nowpub-title").allInnerTexts(); assert.ok(hints.some(t => /רמז חזק/.test(t)) && hints.some(t => /קוד המציאות/.test(t)), hints.join("|"));
      await panel3.getByRole("button", { name: "סדרות", exact: true }).click();
      const seriesTitles = await panel3.locator(".sod29-nowpub-title").allInnerTexts(); assert.ok(seriesTitles.length >= 4, seriesTitles.join("|"));
      await panel3.getByRole("button", { name: "הכול", exact: true }).click();
      await panel3.locator(".sod29-nowpub-more > summary").click();
      await panel3.getByLabel("מדיה").selectOption("video");
      assert.ok((await count()) >= 1 && (await count()) < all);
      await page.screenshot({ path: `${out}/now-390-filters.png` });
      // keyboard: chips and rows are reachable and operable
      await panel3.getByLabel("מדיה").selectOption("");
      await panel3.getByRole("button", { name: "הכול", exact: true }).focus();
      await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
      assert.equal(await panel3.getByRole("button", { name: "סדרות", exact: true }).getAttribute("aria-pressed"), "true", "keyboard operates a chip");
      // exact opening of a post + refresh + back
      await panel3.getByRole("button", { name: "הכול", exact: true }).click();
      await panel3.getByRole("button", { name: /פוסט רגיל ללא סדרה/ }).click();
      await page.waitForURL(/\/p6(?:$|[?#])/);
      const postUrl = page.url(); await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(page.url(), postUrl, "refresh keeps the exact destination");
      assert.deepEqual(s.forbidden, []); assert.deepEqual(s.errors, []);
      results.push({ behavior: "ok", reads: [...new Set(s.reads)] }); await s.ctx.close();
    }

    // 3) Reduced motion + states: error / empty
    for (const mode of ["error", "empty"]) {
      const s = await open(browser, { width: 390, height: 844, theme: "parchment", mode, reduced: true }); current = s.page; const { page } = s;
      await page.goto(origin + "/?controlled=home-now", { waitUntil: "domcontentloaded" });
      await page.locator(".sod29-command-island").getByRole("button", { name: /^עכשיו/ }).click();
      const panel = page.getByRole("dialog", { name: "עכשיו", exact: true });
      await panel.locator(".sod29-nowpub").waitFor({ state: "visible" });
      await page.waitForFunction(() => !document.querySelector(".sod29-nowpub [role=status]")?.textContent?.includes("טוען"), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(800);
      const t = await panel.innerText();
      if (mode === "error") assert.match(t, /אינם זמינים|לא נקראו/); else assert.match(t, /אין כרגע פרסומים/);
      const anim = await page.evaluate(() => [...document.querySelectorAll(".sod29-nowpub *")].some(e => getComputedStyle(e).animationName !== "none"));
      assert.equal(anim, false, "no animation under reduced motion");
      await page.screenshot({ path: `${out}/now-390-${mode}.png` });
      assert.deepEqual(s.errors, []); results.push({ state: mode }); await s.ctx.close();
    }
    fs.writeFileSync(out + "/results.json", JSON.stringify({ ok: true, syntheticOnly: true, results }, null, 2) + "\n");
    console.log(JSON.stringify({ ok: true, cases: results.length, out }));
  } catch (e) {
    console.error(e); if (current) await current.screenshot({ path: out + "/failure.png" }).catch(() => {}); process.exitCode = 1;
  } finally { await browser.close(); server.close(); }
})();
