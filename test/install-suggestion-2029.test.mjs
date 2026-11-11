import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rm } from "node:fs/promises";
import * as require_fs from "node:fs";
import { isAndroidBrowser, isIosBrowser, installOfferKind, installSuggestionSuppressed, suppressInstallSuggestion, hasInstallOffer, requestInstall, installMenuKind, listenForInstallOffer,
  installBrowser, installManualSteps, INSTALL_MANUAL_STEPS, INSTALL_DISMISS_DAYS, INSTALL_ACCEPTED_DAYS } from "../src/lib/installOffer2029.js";

// The component is JSX with a CSS import: bundle it once, keeping React and the router external.
const outfile = resolve(`.test-install-suggestion-${process.pid}.mjs`);
await build({ entryPoints: ["src/components/experience2029/InstallSuggestion2029.jsx"], bundle: true, platform: "node", format: "esm", outfile,
  external: ["react", "react/jsx-runtime", "react-router-dom"], loader: { ".css": "empty" } });
const { InstallSuggestionView, installSuggestionBlocked, INSTALL_SUGGESTION_DELAY_MS } = await import(pathToFileURL(outfile));
after(() => rm(outfile, { force: true }));

const memory = () => { const map = new Map(); return { getItem: key => map.has(key) ? map.get(key) : null, setItem: (key, value) => map.set(key, String(value)) }; };

test("the browser's own offer is captured on Android only; iOS is told apart; desktop is untouched", () => {
  assert.equal(isAndroidBrowser("Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/126.0 Mobile Safari/537.36"), true);
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1";
  for (const ua of [iphone, "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0", "", undefined])
    assert.equal(isAndroidBrowser(ua), false, String(ua));
  assert.equal(isIosBrowser(iphone), true);
  assert.equal(isIosBrowser("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1"), true);
  for (const ua of ["Mozilla/5.0 (Linux; Android 13) Chrome/126.0", "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0", "", undefined])
    assert.equal(isIosBrowser(ua), false, String(ua));
});

test("with no browser (server side) there is nothing to suggest", () => {
  assert.equal(installOfferKind(), null);
});

test("dismissal and acceptance hints are time-boxed and survive only as one local key", () => {
  const storage = memory(), now = 1_000_000;
  assert.equal(installSuggestionSuppressed(storage, now), false);
  suppressInstallSuggestion(INSTALL_DISMISS_DAYS, storage, now);
  assert.equal(installSuggestionSuppressed(storage, now + 13 * 86400000), true);
  assert.equal(installSuggestionSuppressed(storage, now + 15 * 86400000), false);
  suppressInstallSuggestion(INSTALL_ACCEPTED_DAYS, storage, now);
  assert.equal(installSuggestionSuppressed(storage, now + 300 * 86400000), true);
  assert.equal(INSTALL_DISMISS_DAYS, 14); assert.equal(INSTALL_ACCEPTED_DAYS, 365);
  assert.equal(installSuggestionSuppressed({ getItem() { throw new Error("storage blocked"); } }, now), false);
  assert.doesNotThrow(() => suppressInstallSuggestion(14, { setItem() { throw new Error("storage blocked"); } }, now));
});

test("without a captured browser offer nothing can be requested", async () => {
  assert.equal(hasInstallOffer(), false);
  assert.equal(await requestInstall(), null);
});

test("the Android strip is a labelled, non-modal region with an install button and the approved logo", () => {
  const html = renderToStaticMarkup(React.createElement(InstallSuggestionView, { kind: "native", onInstall() {}, onDismiss() {} }));
  assert.match(html, /role="region"/); assert.match(html, /aria-label="התקנת האפליקציה"/);
  assert.match(html, /data-install-suggestion="native"/);
  assert.ok(!/aria-modal|role="dialog"/.test(html));
  assert.match(html, /<button type="button" class="sod29-install-go">התקנה<\/button>/);
  assert.match(html, /<button type="button" class="sod29-install-close" aria-label="לא עכשיו">/);
  assert.match(html, /src="\/brand\/2029\/canonical-lockup-128\.webp"/);
  assert.ok(!html.includes("הוסיפו למסך הבית"));
});

test("the iOS strip shows how to install by hand, and the steps only when opened", () => {
  const closed = renderToStaticMarkup(React.createElement(InstallSuggestionView, { kind: "ios-manual", helpOpen: false, onToggleHelp() {}, onDismiss() {} }));
  assert.match(closed, /data-install-suggestion="ios-manual"/);
  assert.match(closed, /aria-expanded="false">איך מתקינים\?<\/button>/);
  assert.ok(!closed.includes("sod29-install-help")); assert.ok(!closed.includes(">התקנה</button>"));
  const open = renderToStaticMarkup(React.createElement(InstallSuggestionView, { kind: "ios-manual", helpOpen: true, onToggleHelp() {}, onDismiss() {} }));
  assert.match(open, /aria-expanded="true"/);
  assert.match(open, /class="sod29-install-help">[^<]*הוסף למסך הבית/);
});

test("it waits, and never opens over a dialog, typing or a selection", () => {
  assert.deepEqual({ ...INSTALL_SUGGESTION_DELAY_MS }, { native: 3000, "ios-manual": 8000 });
  const doc = (dialog, active) => ({ querySelector: () => dialog, activeElement: { matches: () => active } });
  const win = (selection) => ({ getSelection: () => selection });
  assert.equal(installSuggestionBlocked(doc(null, false), win("")), false);
  assert.equal(installSuggestionBlocked(doc({}, false), win("")), true);
  assert.equal(installSuggestionBlocked(doc(null, true), win("")), true);
  assert.equal(installSuggestionBlocked(doc(null, false), win("טקסט מסומן")), true);
});

test("the explicit install action (\"עוד\" panel) still works after a 14-day dismissal, without taking over the browser's own UI", async () => {
  const fakeWindow = (ua, { installed = false } = {}) => { const handlers = {};
    return { handlers, navigator: { userAgent: ua, standalone: false }, matchMedia: () => ({ matches: installed }), addEventListener: (type, fn) => { handlers[type] = fn; } }; };
  const android = "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/140.0 Mobile Safari/537.36";
  const storage = memory();
  suppressInstallSuggestion(INSTALL_DISMISS_DAYS, storage);
  const win = fakeWindow(android);
  assert.equal(listenForInstallOffer(win, () => storage), true);
  let prevented = 0; const offer = { preventDefault: () => prevented++, prompt: async () => {}, userChoice: Promise.resolve({ outcome: "accepted" }) };
  win.handlers.beforeinstallprompt(offer);
  assert.equal(prevented, 0, "during a dismissal the browser's own install UI is left alone");
  assert.equal(installMenuKind(win), "native", "but the offer is kept for an explicit, person-initiated install");
  assert.equal(await requestInstall(), "accepted");
  assert.equal(installMenuKind(win), "manual", "a used offer is never a dead button: the browser's menu steps take its place");
  const fresh = memory(), win2 = fakeWindow(android);
  listenForInstallOffer(win2, () => fresh);
  win2.handlers.beforeinstallprompt(offer);
  assert.equal(prevented, 1, "without a dismissal the automatic suggestion owns the offer, as before");
  win2.handlers.appinstalled();
  assert.equal(installMenuKind(win2), "installed", "after installing, the panel says so and promises nothing more"); assert.equal(installSuggestionSuppressed(fresh), true);
  const iphone = fakeWindow("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1");
  assert.equal(listenForInstallOffer(iphone), false);
  assert.equal(installMenuKind(iphone), "ios-manual", "iOS gets the manual steps even after a dismissal");
  assert.equal(installMenuKind(fakeWindow(android, { installed: true })), "installed");
  assert.equal(installMenuKind(fakeWindow("Mozilla/5.0 (Windows NT 10.0) Chrome/140.0")), "manual", "Chrome on a computer: its real menu steps");
  assert.equal(installMenuKind(fakeWindow("Mozilla/5.0 (Windows NT 10.0; rv:140.0) Gecko/20100101 Firefox/140.0")), null, "a browser that cannot install: no promise");
  assert.equal(installMenuKind(null), null);
});

// Royal Tiles 2029 + the "עוד" panel: one shared tile, three variants, a real control each, and the panel's fixed order.
const royalOut = resolve(`.test-royal-tiles-${process.pid}.mjs`);
await build({ entryPoints: ["src/components/experience2029/MorePanel2029.jsx"], bundle: true, platform: "node", format: "esm", outfile: royalOut,
  external: ["react", "react/jsx-runtime", "react-router-dom"], loader: { ".css": "empty", ".png": "empty", ".webp": "empty" }, define: { "import.meta.env": "{}" } });
const { default: MorePanel2029 } = await import(pathToFileURL(royalOut));
after(() => rm(royalOut, { force: true }));

test("Royal Tiles: the More panel is a tile grid (square), a wide app tile only when installable, and the existing share owner", async () => {
  const noop = () => {};
  const { MemoryRouter } = await import("react-router-dom");
  const inRouter = element => React.createElement(MemoryRouter, null, element);
  const html = renderToStaticMarkup(inRouter(React.createElement(MorePanel2029, { context: "פוסט · 1234", onAction: noop, onTools: noop, onSearch: noop, onPersonal: noop,
    personal: { signedIn: false }, adminDestinations: [{ id: "lab", label: "מעבדה", href: "/lab" }], onDestination: noop,
    share: { href: "https://sod1820.co.il/post/x", type: "post", title: "x", surface: "post" } })));
  const order = ["data-royal-tile=\"actions\"", "data-royal-tile=\"search\"", "data-royal-tile=\"tools\"", "data-royal-tile=\"personal\"", "data-more-section=\"admin\"", "data-more-section=\"share\""]
    .map(needle => html.indexOf(needle));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `fixed order: here → tools/search → personal → admin → share ${order}`);
  assert.equal((html.match(/<button[^>]*class="sod29-royal-tile is-square"/g) || []).length, 4, "four square tiles are real buttons");
  assert.match(html, /class="sod29-royal-tile is-compact"[^>]*data-royal-variant="compact"/, "secondary destinations use the compact variant");
  assert.match(html, /data-share-owner="ShareActions"/); assert.match(html, /ההקשר לפעולות/);
  assert.doesNotMatch(html, /data-more-section="install"/, "server/desktop: no install tile is promised");
  assert.match(html, /data-royal-candidate="palace"/, "the recommended candidate is the default");
  for (const tile of html.match(/<button[^>]*sod29-royal-tile[^>]*>/g)) assert.match(tile, /type="button"/);
  assert.match(html, /aria-describedby="sod29-royal-hint-search"/, "the hint is part of the accessible description");
  const shareOnly = renderToStaticMarkup(inRouter(React.createElement(MorePanel2029, { shareOnly: true, share: { href: "https://sod1820.co.il/", type: "page", title: "x", surface: "home" } })));
  assert.doesNotMatch(shareOnly, /sod29-royal-tile/); assert.match(shareOnly, /data-more-panel="share"/);
});

test("Royal Tiles CSS: existing tokens only, three variants, 44px floor, reduced motion, no thick gold or heavy glow", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync("src/components/experience2029/royalTiles2029.css", "utf8");
  for (const variant of ["is-square", "is-wide", "is-compact"]) assert.ok(css.includes(`.sod29-royal-tile.${variant}`), variant);
  assert.match(css, /min-block-size:44px/); assert.match(css, /prefers-reduced-motion:reduce/); assert.match(css, /forced-colors:active/);
  const colors = css.replace(/\/\*[\s\S]*?\*\//g, "").match(/#[0-9a-f]{3,8}\b|rgba?\(/gi) || [];
  assert.deepEqual(colors, [], "no literal colours: every colour comes from the palette tokens");
  for (const width of css.match(/border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?:\s*(\d+)px/g) || []) assert.ok(Number(/(\d+)px/.exec(width)[1]) <= 1, `thin frames only: ${width}`);
  const glows = [...css.matchAll(/0 0 (\d+)px/g)].map(m => Number(m[1]));
  assert.ok(glows.every(px => px <= 18), `no heavy glow: ${glows}`);
});

test("every browser that can install gets its own real steps; one that cannot gets none", () => {
  const w = (ua, touch = 0) => ({ navigator: { userAgent: ua, maxTouchPoints: touch }, matchMedia: () => ({ matches: false }) });
  const cases = {
    "ios-safari": w("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"),
    "ios-other": w("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1"),
    "android-chrome": w("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36"),
    "android-inapp": w("Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 Version/4.0 Chrome/140.0 Mobile Safari/537.36"),
    "android-samsung": w("Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36"),
    "android-firefox": w("Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0"),
    "desktop-chrome": w("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36"),
    "desktop-edge": w("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0"),
    "desktop-safari": w("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15"),
  };
  for (const [family, win] of Object.entries(cases)) {
    assert.equal(installBrowser(win), family, family);
    assert.ok(installManualSteps(win).length >= 2, `${family}: real steps`);
    assert.equal(installMenuKind(win), family.startsWith("ios-") ? "ios-manual" : "manual", family);
  }
  assert.equal(installBrowser(w("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", 5)), "ios-safari", "iPadOS reports a Mac");
  for (const ua of ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.6 Safari/605.1.15", ""]) {
    assert.equal(installMenuKind(w(ua)), null, ua || "no user agent"); assert.deepEqual(installManualSteps(w(ua)), []);
  }
  assert.equal(installMenuKind({ ...cases["android-chrome"], matchMedia: () => ({ matches: true }) }), "installed", "inside the installed app: a state, not a promise");
  assert.ok(Object.values(INSTALL_MANUAL_STEPS).flat().every(step => !/[\u2190-\u21FF\u2B00-\u2BFF\uFE0F]/.test(step.replace(/←/g, ""))), "words, not stand-in symbols");
});

test("the automatic suggestion stays phone-only: a computer's offer feeds only the explicit menu entry", () => {
  const { readFileSync } = require_fs;
  const source = readFileSync("src/lib/installOffer2029.js", "utf8");
  assert.match(source, /installSuggestionSuppressed\(\) \|\| !isAndroidBrowser\(window\.navigator\?\.userAgent\) \? null : "native"/);
  assert.match(source, /if \(android && !installSuggestionSuppressed\(storage\(\)\)\) event\.preventDefault\(\)/, "the browser's own UI is replaced only on Android");
});
