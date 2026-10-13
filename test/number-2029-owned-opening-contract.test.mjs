import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { numberExpressionFocusHref, parseNumberExpressionFocus } from "../src/lib/research/numberExpressionFocus.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const page = source("src/pages/Number2029Page.jsx");
const core = source("src/components/number2029/NumberCore2029.jsx");
const fullCss = source("src/pages/number2029.css");
const drawerCss = source("src/components/number2029/numberDrawer2029.css");
const app = source("src/App2029.jsx");
const frame = source("src/components/experience2029/SystemFrame2029.jsx");
const legacy = source("src/App.jsx");
const vercel = JSON.parse(source("vercel.json"));
const palette = source("src/lib/palette.js");

test("zero is a literal addressable root, missing/unsafe roots are not zero", () => {
  assert.equal(numberExpressionFocusHref(0), "/2029/number/0");
  assert.equal(numberExpressionFocusHref("0"), "/2029/number/0");
  for (const invalid of [null, undefined, "", " ", "1.2", -1, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(numberExpressionFocusHref(invalid), null, `invalid root ${String(invalid)}`);
  }
  assert.ok(page.includes('const root = /^\\d+$/.test(String(value || ""))'));
  assert.match(page, /Number\.isSafeInteger\(root\) \|\| root < 0/);
  assert.match(source("src/lib/research/numberExpressionFocus.js"), /selected\?\.computedValue == null/);
});

test("crossing focus persists in the existing URL and exact-return model", () => {
  const href = numberExpressionFocusHref(376, { expression: "שלום", method: "רגיל", crossingPartner: "מבחן" });
  assert.match(href, /^\/2029\/number\/376\?/);
  const state = parseNumberExpressionFocus(href.split("?")[1]);
  assert.deepEqual(state, { expression: "שלום", method: "רגיל", crossingPartner: "מבחן", explicit: true });
  assert.match(core, /activeCrossingPartner = null/);
  assert.match(core, /if \(!compact\) onOpenCrossing\?\.\(crossing\)/);
  assert.match(core, /if \(!compact\) onClearCrossing\?\.\(\)/);
  assert.match(core, /onClick=\{\(\) => chooseCrossing\(stageCrossing\)\}/);
  assert.match(core, /onClick=\{\(\) => chooseCrossing\(item\)\}/);
  assert.ok(page.includes("activeCrossingPartner={focusExplicit ? verifiedCrossingPartner : null}"));
  assert.match(page, /onClearCrossing=\{clearCrossingFocus\}/);
  assert.doesNotMatch(page.slice(page.indexOf("onOpenCrossing={(crossing) => {"), page.indexOf("onOpenZero={(next)")), /askRaziel\(/,
    "choosing a crossing must not auto-run gated/paid Raziel");
});

test("G4 menu full-page route remains preview only; public cutover stays blocked", () => {
  assert.match(frame, /\{ to: "\/2029\/number\/1820", label: "דף המספר"/);
  assert.match(app, /<Route path="\/2029\/number\/:value" element=\{<Number2029Page \/>\}/);
  assert.match(page, /noindex: true/);
  assert.match(page, /DESIGN PREVIEW/);
  assert.match(legacy, /<Route path="\/number\/:phrase" element=\{<LegacyNumberTransitionRoute \/>\}/);
  assert.ok(vercel.rewrites.some((r) => r.source === "/2029/number/(.*)" && r.destination === "/2029.html"));
  assert.ok(!vercel.redirects.some((r) => r.source?.startsWith("/number") && r.destination?.includes("2029")),
    "old inbound /number links must not be auto-redirected before Number release");
});

test("full-page responsive Number text respects V2 minimum; crossing never truncates meaning", () => {
  const marker = "/* Number full-page V2 reading contract.";
  const scoped = fullCss.slice(fullCss.indexOf(marker));
  assert.ok(scoped.length > 4000, "must preserve actual full-page typography layout rules");
  const explicit = [...scoped.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
  assert.ok(explicit.every((n) => n >= 14), "full-page V2 metadata cannot be 8–12px");
  assert.match(scoped, /\.sod29-number-v10-crossing-methods span\{/);
  assert.match(scoped, /overflow-wrap:anywhere/);
  assert.match(scoped, /@media\(max-width:560px\)/);
  assert.match(scoped, /min-height:44px/);
  assert.doesNotMatch(drawerCss, /font-size:\s*(?:[0-9]|1[0-3])(?:\.\d+)?px/);
  assert.doesNotMatch(drawerCss, /#[0-9a-f]{3,8}\b/i);
});

test("Night tokens use the one shared black/gold/brown V2 owner", () => {
  const night = palette.slice(palette.indexOf('  dark: Object.freeze({', palette.indexOf("export const DESIGN_V2_PALETTES")));
  for (const token of ['pageBg: "#0D0A09"', 'card: "#1B1512"', 'cardSoft: "#251D18"', 'brandGold: "#F9BA3F"']) {
    assert.ok(night.includes(token), `missing ${token}`);
  }
  assert.ok(night.includes('accent: "#315DD5"'), "blue stays action role, not Night canvas");
});
