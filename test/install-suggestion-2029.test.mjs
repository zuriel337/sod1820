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

// The "עוד" install section: functional only, in the frame's existing section/heading/action styles.
const moreInstallOut = resolve(`.test-more-install-${process.pid}.mjs`);
await build({ entryPoints: ["src/components/experience2029/MoreInstall2029.jsx"], bundle: true, platform: "node", format: "esm", outfile: moreInstallOut,
  external: ["react", "react/jsx-runtime"], loader: { ".css": "empty" } });
const { MoreInstallView, default: MoreInstall2029 } = await import(pathToFileURL(moreInstallOut));
after(() => rm(moreInstallOut, { force: true }));

test("the \"עוד\" install section: Android button, iPhone steps, installed note, and never a dead action", () => {
  const render = props => renderToStaticMarkup(React.createElement(MoreInstallView, props));
  assert.equal(render({ kind: null }), "", "desktop / no offer: nothing is promised");
  assert.equal(renderToStaticMarkup(React.createElement(MoreInstall2029)), "", "server side: nothing");
  const android = render({ kind: "native" });
  assert.match(android, /<button class="sod29-action primary" type="button">התקנת האפליקציה<\/button>/);
  assert.doesNotMatch(render({ kind: "native", outcome: "pending" }), /<button/, "while the browser's own window is open there is no second button");
  const ios = render({ kind: "ios-manual" });
  assert.match(ios, /aria-expanded="false"[^>]*>איך מתקינים באייפון<\/button>/); assert.doesNotMatch(ios, /<ol/);
  const iosOpen = render({ kind: "ios-manual", stepsOpen: true });
  assert.match(iosOpen, /aria-expanded="true"/); assert.match(iosOpen, /<ol id="sod29-more-install-steps">[\s\S]*הוסף למסך הבית/);
  const installed = render({ kind: "installed" });
  assert.match(installed, /האפליקציה מותקנת במכשיר הזה/); assert.doesNotMatch(installed, /<button/);
  assert.match(render({ kind: null, outcome: "accepted" }), /role="status">האפליקציה הותקנה/, "the outcome stays readable after the offer is used");
});

test("the frame shows the install section only in the full \"עוד\" panel and keeps actions, tools, admin and share as they were", async () => {
  const { readFileSync } = await import("node:fs");
  const frame = readFileSync("src/components/experience2029/SystemFrame2029.jsx", "utf8");
  const more = frame.slice(frame.indexOf("if (transientKind === TRANSIENT.MORE) return"), frame.indexOf("if (transientKind === TRANSIENT.TOOLS) return"));
  const full = more.slice(more.indexOf("{!transient?.payload?.shareOnly ? <>"), more.indexOf("</> : null}"));
  assert.match(full, /<React\.Suspense fallback=\{null\}><MoreInstall2029 \/><\/React\.Suspense>/);
  assert.match(full, /onClick=\{\(\) => openAction\(inspectTarget\)\}>פעולות<\/button>/); assert.match(full, /onClick=\{openTools\}>כלים<\/button>/);
  assert.match(full, /data-admin-open-destinations="true"/);
  assert.match(more, /data-share-owner="ShareActions"/);
  assert.match(frame, /const MoreInstall2029 = React\.lazy\(\(\) => import\("\.\/MoreInstall2029\.jsx"\)\)/, "loaded only when the panel opens");
});
