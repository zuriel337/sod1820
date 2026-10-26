import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLifeJourneyFixturePlugin } from "./fixtures/life-journey-fixture-plugin.mjs";
import { auditLifeJourneyTypography, summarizeViolations } from "./fixtures/life-journey-typography-audit.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
let playwright;
let vite;
let reactPlugin;
try {
  playwright = req("playwright");
  vite = await import(pathToFileURL(req.resolve("vite")).href);
  reactPlugin = (await import(pathToFileURL(req.resolve("@vitejs/plugin-react")).href)).default;
} catch { /* Optional outside browser-capable CI. */ }

const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium";
const available = Boolean(playwright && vite && reactPlugin && existsSync(executablePath));

const THEMES = ["light", "parchment", "dark"];
const WIDTHS = [320, 390, 1440];

test("Life Journey 2029 obeys Design V2 typography, fonts and 44px targets with the real System Frame tokens", { skip: !available, timeout: 240_000 }, async () => {
  const server = await vite.createServer({ root, configFile: false, plugins: [createLifeJourneyFixturePlugin(), reactPlugin()], server: { host: "127.0.0.1", port: 0 } });
  let browser;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    browser = await playwright.chromium.launch({ headless: true, executablePath, args: ["--no-sandbox"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    const browserErrors = [];
    const audits = [];
    page.on("pageerror", error => browserErrors.push(error.message));

    const openAllDisclosures = () => page.evaluate(() => document.querySelectorAll("details").forEach(node => { node.open = true; }));
    const audit = async label => {
      await openAllDisclosures();
      for (const theme of THEMES) {
        await page.evaluate(value => window.__setLifeJourneyTheme(value), theme);
        await page.waitForFunction(value => document.querySelector("[data-fixture-theme]")?.dataset.fixtureTheme === value, theme);
        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(() => document.fonts.ready);
          const result = await page.evaluate(auditLifeJourneyTypography, ".person-journey");
          audits.push({ label: `${label} · ${theme} · ${width}`, ...result });
        }
      }
      await page.setViewportSize({ width: 390, height: 900 });
    };

    // Real font proof: the frame fonts must actually load, not fall back.
    await page.goto(`${origin}/2029/journey`);
    await page.getByRole("heading", { name: "מי אני" }).waitFor();
    const fonts = await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('400 18px "Noto Sans Hebrew"', "אבג"),
        document.fonts.load('500 16px Rubik', "אבג"),
        document.fonts.load('500 16px Rubik', "1237"),
      ]);
      return { noto: document.fonts.check('400 18px "Noto Sans Hebrew"', "אבג"), rubikHebrew: document.fonts.check('500 16px Rubik', "אבג"), rubikLatin: document.fonts.check('500 16px Rubik', "1237") };
    });
    assert.deepEqual(fonts, { noto: true, rubikHebrew: true, rubikLatin: true }, "Noto Sans Hebrew and Rubik are the real loaded frame fonts");
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector(".sod29-root"));
      return ["--s29-type-micro", "--s29-type-ui", "--s29-type-body", "--s29-type-lead", "--s29-type-title", "--s29-type-display", "--s29-font-numeric"].map(name => style.getPropertyValue(name).trim());
    });
    assert.deepEqual(tokens.slice(0, 6), ["14px", "16px", "18px", "21px", "28px", "46px"], "Design V2 type tokens come from designTokens.js");
    assert.match(tokens[6], /^'IBM Plex Mono'/);

    await audit("person-empty");
    await page.getByLabel("שם פרטי").fill("הורה בדיקה");
    await page.getByLabel("שם משפחה").fill("משפחה");
    await page.getByLabel("תאריך לידה").first().fill("1990-02-15");
    await page.getByLabel("שעת לידה מדויקת").first().fill("05:30");
    await page.getByLabel("מקום לידה").first().fill("עיר בדיקה");
    await page.getByRole("button", { name: "פתח את מסע החיים" }).click();
    await page.getByRole("button", { name: "עדכן וחבר מחדש" }).waitFor();
    await audit("person-saved");

    const family = page.locator('[data-experience-capability="life-journey-family"]');
    await family.getByLabel("שם בן/בת משפחה").fill("ילד בדיקה");
    await family.getByLabel("תאריך לידה").fill("2020-03-04");
    await family.getByLabel("הקשר אליי").selectOption("child_of_me");
    await family.getByRole("button", { name: "הוסף למסע" }).click();
    await family.locator(".person-journey-family-member strong", { hasText: "ילד בדיקה" }).waitFor();
    await family.getByRole("checkbox", { name: /ילד בדיקה/ }).check();
    await audit("family");

    const lifeMaps = page.locator('[data-experience-capability="life-journey-maps"]');
    await lifeMaps.getByRole("heading", { name: "מפות החיים" }).waitFor();
    const atlas = lifeMaps.locator('[data-experience-capability="life-journey-capability-atlas"]');
    const tree = lifeMaps.locator('[data-experience-capability="life-journey-research-tree"]');
    const card = id => lifeMaps.locator(`[data-map-card="${id}"]`);
    const openCard = id => card(id).locator("[data-atlas-action]").click();
    const counters = () => page.evaluate(() => [window.__matrixCalls.length, window.__reflectionCalls.length, window.__nameCalls.length, window.__dateCalls.length, window.__elsCalls.length]);

    // The whole atlas is visible from the outside: no accordion, no tab row, nothing behind a general click.
    const GROUPS = {
      personal: ["name", "date", "time", "summary"],
      family: ["family-tree", "generations", "relationships", "convergences", "timeline"],
      deep: ["human", "sky", "creation", "sefer"],
      evidence: ["matrix", "evidence", "sources", "coverage", "guide"],
      soon: ["els", "hints", "raziel"],
    };
    await atlas.waitFor();
    for (const [group, ids] of Object.entries(GROUPS)) {
      assert.equal(await atlas.locator(`[data-group="${group}"]`).isVisible(), true, `${group} group is visible`);
      for (const id of ids) assert.equal(await card(id).isVisible(), true, `${id} card is visible without any click`);
    }
    assert.equal(await lifeMaps.getByRole("tablist").count(), 0, "the 13-tab row is gone from the face of the screen");
    assert.equal(await atlas.locator("details").count(), 0, "the atlas is not an accordion");
    assert.equal(await lifeMaps.locator(".person-journey-map-panel").count(), 0, "no map is open until a card is chosen");
    for (const id of ["els", "hints", "raziel"]) {
      assert.equal(await card(id).locator("[data-atlas-action]").count(), 0, `${id} has no action: it is future-only`);
      assert.equal(await card(id).getAttribute("data-kind"), "future");
    }
    assert.equal(await card("els").getAttribute("data-state"), "not_connected");
    assert.equal(await card("els").locator(".life-atlas__state").innerText(), "ממתין לחיבור");
    assert.equal(await card("hints").getAttribute("data-state"), "building");
    assert.equal(await card("raziel").getAttribute("data-state"), "building");
    assert.equal(await card("raziel").locator("button").count(), 0, "Raziel preview is display-only");
    for (const id of ["name", "date", "time", "generations", "matrix", "human"]) assert.equal(await card(id).locator("svg").count(), 1, `${id} has its own illustration`);
    await audit("atlas");

    // One research tree for person + family, with real states and an accessible nested-list disclosure.
    await tree.waitFor();
    const order = await page.evaluate(() => ["life-journey-profile", "life-journey-research-tree", "life-journey-capability-atlas", "life-journey-intake", "life-journey-family"].map(name => document.querySelector(`[data-experience-capability="${name}"]`)?.getBoundingClientRect().top + scrollY));
    assert.deepEqual([...order].sort((x, y) => x - y), order, "hero → tree → atlas come before the intake and family forms");
    assert.equal(await tree.locator(".life-tree__node").count(), 2, "person and family appear once in one tree");
    assert.equal(await tree.locator(".life-tree__item .life-tree__item .life-tree__node").count(), 1, "the child hangs under the parent");
    assert.equal(await tree.locator('[role="tree"],[role="treeitem"]').count(), 0, "no tree role is claimed without tree keyboard support");
    assert.equal(await tree.locator("ul[aria-label]").count(), 1, "nested list is labelled");
    const callsBeforeTree = await counters();
    const childNode = tree.getByRole("button", { name: /ילד בדיקה/ });
    await childNode.click();
    assert.equal(await childNode.getAttribute("aria-pressed"), "true", "selecting a person marks it in the tree");
    assert.match(await atlas.locator(".life-atlas__for").innerText(), /ילד בדיקה/, "the atlas acts on the selected person");
    assert.deepEqual(await counters(), callsBeforeTree, "selecting a person in the tree starts no research, Raziel or ELS call");
    await audit("tree");

    // "Name" and "Date" open the existing capabilities for the selected memberRef and return exactly.
    await openCard("name");
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await page.getByRole("heading", { name: "ילד בדיקה", exact: true }).waitFor();
    await page.getByRole("button", { name: "חזרה מדויקת למסע החיים" }).click();
    await childNode.waitFor();
    assert.equal(await childNode.getAttribute("aria-pressed"), "true", "exact return keeps the selected person and open node");
    await openCard("date");
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await page.getByRole("button", { name: "סיים וחזור למסע החיים" }).click();
    await childNode.waitFor();
    assert.equal(await childNode.getAttribute("aria-pressed"), "true", "date return also keeps the selected person");
    await openCard("family-tree");
    assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-experience-capability="life-journey-research-tree"]') !== null), true, "the family-tree card moves focus to the tree");

    // Every existing map is reachable from its card; none starts research.
    const callsBeforeMaps = await counters();
    const mapCards = await lifeMaps.locator('[data-map-card][data-kind="map"]').evaluateAll(nodes => nodes.map(node => node.dataset.mapCard));
    assert.equal(mapCards.length, 15, "every map view has a card");
    for (const id of mapCards) {
      await openCard(id);
      await lifeMaps.locator(".person-journey-map-panel").waitFor();
      assert.equal(await card(id).locator("[data-atlas-action]").getAttribute("aria-current"), "true", `${id} card marks the open view`);
      await audit(`map-card:${id}`);
    }
    assert.deepEqual(await counters(), callsBeforeMaps, "map cards open existing views and start no research, Raziel or ELS call");
    await lifeMaps.getByRole("button", { name: "חזרה לאטלס" }).click();
    assert.equal(await lifeMaps.locator(".person-journey-map-panel").count(), 0);

    // Button alignment: primary actions are centered inside their panel on mobile.
    await page.setViewportSize({ width: 390, height: 900 });
    const alignment = await page.evaluate(() => {
      const offsets = [...document.querySelectorAll(".person-journey-actions>button,.person-journey-family-research-actions>button,.person-journey-hero-status>.person-journey-primary")].filter(el => el.getBoundingClientRect().width > 0).map(el => {
        const box = el.getBoundingClientRect();
        const parent = el.parentElement.getBoundingClientRect();
        return Math.abs((box.left + box.right) / 2 - (parent.left + parent.right) / 2);
      });
      return { count: offsets.length, max: Math.max(0, ...offsets) };
    });
    assert.ok(alignment.count >= 2 && alignment.max <= 2, `primary action buttons are centered (${JSON.stringify(alignment)})`);

    // Nested lenses: time gates and the birth-map studio (3D stays inactive; no calculation is started).
    await openCard("time");
    const timeMap = page.locator('[data-experience-capability="life-journey-time-gates-map"]');
    await timeMap.getByRole("heading", { name: "מפת שערי הזמן" }).waitFor();
    for (const name of await timeMap.getByRole("tablist").first().getByRole("tab").allTextContents()) {
      await timeMap.getByRole("tablist").first().getByRole("tab", { name, exact: true }).click();
      await audit(`time-lens:${name}`);
    }
    await openCard("creation");
    const birthStudio = page.locator('[data-experience-capability="life-journey-birth-map-studio"]');
    await birthStudio.getByRole("heading", { name: "סטודיו מפת החיים" }).waitFor();
    for (const name of await birthStudio.getByRole("tablist").first().getByRole("tab").allTextContents()) {
      if (name === "תלת־ממד") continue;
      await birthStudio.getByRole("tablist").first().getByRole("tab", { name, exact: true }).click();
      await audit(`birth-lens:${name}`);
    }

    await page.getByRole("button", { name: "פתח את המחקר שלי" }).first().click();
    await page.getByRole("heading", { name: "מסע השם" }).waitFor();
    await audit("name");
    await page.getByRole("button", { name: "המשך למטריצת השם והתאריך" }).click();
    await page.getByRole("heading", { name: "השם והתאריך שלי" }).waitFor();
    await audit("date");

    // prefers-reduced-motion: no running animation or non-zero transition on Life Journey controls.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const motion = await page.evaluate(() => [...document.querySelectorAll(".person-journey button, .person-journey summary, .person-journey a")].filter(el => {
      const s = getComputedStyle(el);
      return s.animationName !== "none" && parseFloat(s.animationDuration) > 0.01 || s.transitionDuration.split(",").some(v => parseFloat(v) > 0.01);
    }).map(el => el.className || el.tagName));
    assert.deepEqual(motion, [], "reduced motion removes Life Journey animation/transition");
    await page.emulateMedia({ reducedMotion: "no-preference" });

    const violations = audits.flatMap(entry => entry.violations.map(v => ({ ...v, where: `[${entry.label}] ${v.where}` })));
    const scanned = audits.reduce((sum, entry) => sum + entry.scanned, 0);
    assert.ok(scanned > 3000, `the audit actually scanned text across states (${scanned})`);
    const report = summarizeViolations(audits.flatMap(entry => entry.violations));
    assert.deepEqual(report, [], `Design V2 violations:\n${report.slice(0, 80).join("\n")}`);
    assert.deepEqual(browserErrors, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
