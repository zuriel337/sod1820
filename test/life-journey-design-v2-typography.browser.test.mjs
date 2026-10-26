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

    const lifeMaps = family.locator('[data-experience-capability="life-journey-maps"]');
    await lifeMaps.getByRole("heading", { name: "מפות החיים" }).waitFor();
    const mapTabs = await lifeMaps.getByRole("tablist").first().getByRole("tab").allTextContents();
    assert.ok(mapTabs.length >= 5, "map tabs are present");
    for (const name of mapTabs) {
      await lifeMaps.getByRole("tablist").first().getByRole("tab", { name, exact: true }).click();
      await audit(`map-tab:${name}`);
    }

    // Nested lenses: time gates and the birth-map studio (3D stays inactive; no calculation is started).
    await lifeMaps.getByRole("tab", { name: "שערי זמן", exact: true }).click();
    const timeMap = family.locator('[data-experience-capability="life-journey-time-gates-map"]');
    await timeMap.getByRole("heading", { name: "מפת שערי הזמן" }).waitFor();
    for (const name of await timeMap.getByRole("tablist").first().getByRole("tab").allTextContents()) {
      await timeMap.getByRole("tablist").first().getByRole("tab", { name, exact: true }).click();
      await audit(`time-lens:${name}`);
    }
    await lifeMaps.getByRole("tab", { name: "מפת יצירה", exact: true }).click();
    const birthStudio = family.locator('[data-experience-capability="life-journey-birth-map-studio"]');
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
