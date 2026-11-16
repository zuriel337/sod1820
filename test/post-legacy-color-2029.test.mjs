// Historical colours of imported Posts (ZURIEL 16.11.2026): yellow and white keep their meaning and read in light, parchment and dark, including
// passages with their own black background. Measured: every tone the stylesheet can give (pages/post2029-reading.css) has at least 4.5:1 on the
// reading surface of its theme (the frame's own palette), the yellow tone also on its marker; panel inks read on their panels; the annotation
// adds attributes only (no word, style, link or source changes) and is the same in every DOM (no CSSOM).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { resolve2029Palette } from "../src/lib/paletteTokens2029.js";
import { LEGACY_THEMES, parseCssColor, contrastRatio, mixColors, legacyReadingSurface, legacyToneOf, legacyLowThemes, annotateLegacyColors2029, legacyColorRules2029 } from "../src/lib/research/postLegacyColor2029.js";

const css = readFileSync(new URL("../src/pages/post2029-reading.css", import.meta.url), "utf8");
const block = selector => { const start = css.indexOf(`${selector}{\n  --sod-legacy-red`); assert.ok(start >= 0, selector); return css.slice(start, css.indexOf("}", start)); };
const tokens = text => Object.fromEntries([...text.matchAll(/--sod-legacy-([a-z-]+):([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
const light = tokens(block(".sod29-reading-post")), dark = { ...light, ...tokens(block('html:not([data-theme-2029="light"]):not([data-theme-2029="parchment"]) .sod29-reading-post')) };
const FAMILIES = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "magenta", "white", "grey", "black"];
const resolve = (value, theme) => value === "var(--s29-ink)" ? parseCssColor(resolve2029Palette(theme, "dark_observatory").ink) : parseCssColor(value);

test("every family tone reads (≥ 4.5:1) on the reading surface of every theme; yellow also on its marker", () => {
  for (const theme of LEGACY_THEMES) {
    const surface = legacyReadingSurface(theme), set = theme === "dark" ? dark : light;
    for (const family of FAMILIES) {
      const color = resolve(set[family], theme);
      assert.ok(color, `${theme} ${family}: ${set[family]}`);
      const ratio = contrastRatio(color, surface);
      assert.ok(ratio >= 4.5, `${theme} ${family} ${set[family]}: ${ratio.toFixed(2)}`);
    }
    if (theme !== "dark") {
      const mark = parseCssColor(light["yellow-mark"].replace(/rgb\(([\d\s]+)\/\s*([\d.]+)\)/, (all, rgb, alpha) => `rgba(${rgb.trim().split(/\s+/).join(",")},${alpha})`));
      const ratio = contrastRatio(resolve(light.yellow, theme), mixColors(mark, surface, mark.a));
      assert.ok(ratio >= 4.5, `${theme} yellow on its marker: ${ratio.toFixed(2)}`);
    }
  }
});

test("panel inks and panel links read on the panels they serve", () => {
  for (const panel of ["#000000", "#141111", "#252627", "#333333", "#030303"]) {
    assert.ok(contrastRatio(parseCssColor("#F5F5F0"), parseCssColor(panel)) >= 4.5, panel);
    assert.ok(contrastRatio(parseCssColor("#FFD27A"), parseCssColor(panel)) >= 4.5, `link on ${panel}`);
  }
  for (const panel of ["#ffffff", "#ffff00", "#f4f4f4", "#fff9e5"]) {
    assert.ok(contrastRatio(parseCssColor("#172B46"), parseCssColor(panel)) >= 4.5, panel);
    assert.ok(contrastRatio(parseCssColor("#1F4FBF"), parseCssColor(panel)) >= 4.5, `link on ${panel}`);
  }
});

test("families and the themes where an authored colour does not read", () => {
  assert.equal(legacyToneOf(parseCssColor("#ffff00")), "yellow"); assert.equal(legacyToneOf(parseCssColor("#ffcc00")), "yellow");
  assert.equal(legacyToneOf(parseCssColor("#ff6600")), "orange"); assert.equal(legacyToneOf(parseCssColor("#ffffff")), "white");
  assert.equal(legacyToneOf(parseCssColor("#ccffff")), "cyan", "a pale tint keeps its hue"); assert.equal(legacyToneOf(parseCssColor("#000000")), "black");
  assert.equal(legacyToneOf(parseCssColor("#0000ff")), "blue"); assert.equal(legacyToneOf(parseCssColor("rgb(255, 0, 0)")), "red");
  assert.deepEqual(legacyLowThemes(parseCssColor("#ffff00")), ["light", "parchment"], "yellow reads on dark only");
  assert.deepEqual(legacyLowThemes(parseCssColor("#ffffff")), ["light", "parchment"]);
  assert.deepEqual(legacyLowThemes(parseCssColor("#000000")), ["dark"]);
  assert.deepEqual(legacyLowThemes(parseCssColor("#0000ff")), ["dark"]);
  assert.equal(parseCssColor("linear-gradient(red, blue)"), null); assert.equal(parseCssColor("inherit"), null);
});

test("the annotation adds attributes only, keeps authored panels as authored, and is the same text in every DOM", () => {
  const source = '<p><span style="color: #ffff00;">צהוב <a href="/x">קישור</a></span> <span style="color:#ffffff">לבן</span> <font color="#0000ff">כחול</font> <span style="color:#e8c840">זהב</span></p>'
    + '<div style="background-color:#000000"><p>פאנל שחור <span style="color:#ffff00">צהוב בפאנל</span></p><div style="background:#ffff00">פאנל צהוב בתוך שחור</div></div>'
    + '<p><span style="background-color: #ffff00; color: #000000;">מרקר</span> <span style="color:#000">שחור</span> <span style="color:#ff0000">אדום</span></p>';
  const { window } = new JSDOM("<!doctype html><body></body>");
  const template = window.document.createElement("template"); template.innerHTML = source;
  const before = template.content.textContent, styles = [...template.content.querySelectorAll("[style]")].map(node => node.getAttribute("style"));
  annotateLegacyColors2029(template.content);
  assert.equal(template.content.textContent, before, "no word changes");
  assert.deepEqual([...template.content.querySelectorAll("[style]")].map(node => node.getAttribute("style")), styles, "authored styles untouched");
  const at = text => [...template.content.querySelectorAll("*")].find(node => node.firstChild?.nodeValue?.trim() === text);
  const marks = node => ({ tone: node.getAttribute("data-legacy-tone"), low: node.getAttribute("data-legacy-low"), panel: node.getAttribute("data-legacy-panel"), color: node.getAttribute("data-legacy-color") });
  assert.deepEqual(marks(at("צהוב")), { tone: "yellow", low: "light parchment", panel: null, color: "authored" });
  assert.deepEqual(marks(at("לבן")), { tone: "white", low: "light parchment", panel: null, color: "authored" });
  assert.deepEqual(marks(at("כחול")), { tone: "blue", low: "dark", panel: null, color: "authored" });
  assert.deepEqual(marks(at("זהב")), { tone: "yellow", low: "light parchment", panel: null, color: "authored" });
  assert.deepEqual(marks(at("פאנל שחור").parentElement), { tone: null, low: null, panel: "dark", color: null });
  assert.deepEqual(marks(at("צהוב בפאנל")), { tone: null, low: null, panel: null, color: "authored" }, "authored inside its own panel: kept");
  assert.deepEqual(marks(at("פאנל צהוב בתוך שחור")), { tone: null, low: null, panel: "light", color: null });
  assert.deepEqual(marks(at("מרקר")), { tone: null, low: null, panel: "light", color: "authored" }, "an authored highlight keeps its own pair");
  assert.deepEqual(marks(at("שחור")), { tone: "black", low: "dark", panel: null, color: "authored" });
  assert.deepEqual(marks(at("אדום")), { tone: "red", low: "light parchment", panel: null, color: "authored" });
  assert.equal(at("קישור").hasAttribute("data-legacy-tone"), false, "a link keeps its own colour rules");
});

test("an authored stylesheet colour gets the family's tone only in the themes where it does not read; its own panel keeps it", () => {
  assert.deepEqual(legacyColorRules2029([".sod29-reading-source .paginate"], "font-size:22px !important; color:#1046B3 !important"),
    ['html:not([data-theme-2029="light"]):not([data-theme-2029="parchment"]) .sod29-reading-source .paginate {color: var(--sod-legacy-blue) !important}']);
  assert.deepEqual(legacyColorRules2029([".sod29-reading-source .t"], "color:#FFFFFF !important; background-color:#030303 !important"), []);
  assert.deepEqual(legacyColorRules2029([".sod29-reading-source .ok"], "color:#555"), ['html:not([data-theme-2029="light"]):not([data-theme-2029="parchment"]) .sod29-reading-source .ok {color: var(--sod-legacy-grey) !important}']);
});
