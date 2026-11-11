import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rm } from "node:fs/promises";
import { isAndroidBrowser, isIosBrowser, installOfferKind, installSuggestionSuppressed, suppressInstallSuggestion, hasInstallOffer, requestInstall, installMenuKind, listenForInstallOffer,
  INSTALL_DISMISS_DAYS, INSTALL_ACCEPTED_DAYS } from "../src/lib/installOffer2029.js";

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
  assert.equal(installMenuKind(win), null, "a used offer is never shown as a dead button");
  const fresh = memory(), win2 = fakeWindow(android);
  listenForInstallOffer(win2, () => fresh);
  win2.handlers.beforeinstallprompt(offer);
  assert.equal(prevented, 1, "without a dismissal the automatic suggestion owns the offer, as before");
  win2.handlers.appinstalled();
  assert.equal(installMenuKind(win2), null); assert.equal(installSuggestionSuppressed(fresh), true);
  const iphone = fakeWindow("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1");
  assert.equal(listenForInstallOffer(iphone), false);
  assert.equal(installMenuKind(iphone), "ios-manual", "iOS gets the manual steps even after a dismissal");
  assert.equal(installMenuKind(fakeWindow(android, { installed: true })), "installed");
  assert.equal(installMenuKind(fakeWindow("Mozilla/5.0 (Windows NT 10.0) Chrome/140.0")), null, "desktop: no install promise");
  assert.equal(installMenuKind(null), null);
});

// The "עוד" panel: squares built from the frame's existing panel card + IconTile2029 (Design V2 · canonical_ui_components_law).
// No second tile family, no local colours, no new icon; "כלים" is under construction (ZURIEL 11.11.2026).
const moreOut = resolve(`.test-more-panel-${process.pid}.mjs`);
await build({ entryPoints: ["src/components/experience2029/MorePanel2029.jsx"], bundle: true, platform: "node", format: "esm", outfile: moreOut,
  external: ["react", "react/jsx-runtime", "react-router-dom"], loader: { ".css": "empty", ".png": "empty", ".webp": "empty" }, define: { "import.meta.env": "{}" } });
const { default: MorePanel2029 } = await import(pathToFileURL(moreOut));
after(() => rm(moreOut, { force: true }));

test("More panel: squares are the frame's panel card with IconTile2029, fixed order, tools locked and marked בבנייה, existing share owner", async () => {
  const noop = () => {};
  const { MemoryRouter } = await import("react-router-dom");
  const inRouter = element => React.createElement(MemoryRouter, null, element);
  const props = { context: "פוסט · 1234", onAction: noop, onTools: noop, onSearch: noop, onPersonal: noop, personal: { signedIn: false },
    adminDestinations: [{ id: "lab", label: "מעבדה", href: "/lab" }], onDestination: noop, share: { href: "https://sod1820.co.il/post/x", type: "post", title: "x", surface: "post" } };
  const html = renderToStaticMarkup(inRouter(React.createElement(MorePanel2029, props)));
  const order = ['data-more-tile="actions"', 'data-more-tile="search"', 'data-more-tile="tools"', 'data-more-tile="personal"', 'data-more-section="admin"', 'data-more-section="share"']
    .map(needle => html.indexOf(needle));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `fixed order: here → search → tools → personal → admin → share ${order}`);
  const tiles = html.match(/<button[^>]*sod29-more-tile[^>]*>/g) || [];
  assert.equal(tiles.length, 4, "four squares, each a real button");
  for (const tile of tiles) { assert.match(tile, /type="button"/); assert.match(tile, /class="sod29-workspace-mini-card sod29-more-tile /, "the frame's existing panel card"); }
  assert.equal((html.match(/class="sod29-icon-tile"[^>]*data-purpose="ordinary"/g) || []).length, 4, "icons come from IconTile2029 (shared treatment resolver), ordinary purpose");
  const tools = tiles.find(tile => tile.includes('data-more-tile="tools"'));
  assert.match(tools, /disabled=""/); assert.match(tools, /is-building/); assert.match(tools, /title="כלים בבנייה · למנהל בלבד"/);
  assert.match(html, /data-more-tile="tools"[\s\S]*?data-state="unavailable"[\s\S]*?<b>בבנייה<\/b>/, "locked tools: the owned unavailable treatment and the words, not colour alone");
  const admin = renderToStaticMarkup(inRouter(React.createElement(MorePanel2029, { ...props, toolsLocked: false })));
  const adminTools = admin.match(/<button[^>]*data-more-tile="tools"[^>]*>/)[0];
  assert.doesNotMatch(adminTools, /disabled/); assert.match(adminTools, /title="כלים בבנייה · גישת מנהל"/);
  assert.match(admin, /data-more-tile="tools"[\s\S]*?<b>בבנייה<\/b>/, "the administrator also sees that tools are under construction");
  assert.match(html, /data-admin-open-destinations="true"[\s\S]*?<button class="sod29-action" type="button">מעבדה<\/button>/, "admin destinations stay the existing action buttons");
  assert.match(html, /data-share-owner="ShareActions"/); assert.match(html, /class="sod29-selection-summary"><span>ההקשר לפעולות<\/span>/);
  assert.doesNotMatch(html, /data-more-section="install"/, "server/desktop: no install card is promised");
  assert.match(html, /aria-describedby="sod29-more-hint-search"/, "the hint is part of the accessible description");
  const shareOnly = renderToStaticMarkup(inRouter(React.createElement(MorePanel2029, { shareOnly: true, share: { href: "https://sod1820.co.il/", type: "page", title: "x", surface: "home" } })));
  assert.doesNotMatch(shareOnly, /sod29-more-tile/); assert.match(shareOnly, /data-more-panel="share"/);
});

test("More panel CSS is layout only: no colour, mixture, glow, gradient, ornament or second tile family; the frame gates every way into Tools", async () => {
  const { readFileSync, existsSync } = await import("node:fs");
  const css = readFileSync("src/components/experience2029/morePanel2029.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.deepEqual(css.match(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|color-mix|gradient|box-shadow|backdrop-filter|--s29-brand|::?before|::?after|background\s*:/gi) || [], [],
    "colours, surfaces and tints belong to the panel card and the shared treatment resolver");
  assert.ok(!existsSync("src/components/experience2029/RoyalTile2029.jsx") && !existsSync("src/components/experience2029/royalTiles2029.css"), "no second tile family");
  const frame = readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
  const toolsPanel = frame.slice(frame.indexOf("if (transientKind === TRANSIENT.TOOLS)"), frame.indexOf("if (transientKind === TRANSIENT.RAZIEL_LOCKED)"));
  assert.match(toolsPanel, /^if \(transientKind === TRANSIENT\.TOOLS\) return contextLocked\s*\?/, "one lock for every entry point, before any tool renders");
  assert.ok(toolsPanel.indexOf("ToolsProjection") > toolsPanel.indexOf("הכלים בבנייה"), "the locked branch renders no tool");
  assert.match(frame, /<MorePanel2029[\s\S]*?toolsLocked=\{contextLocked\}/, "the More tile reads the same lock");
});
