import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rm } from "node:fs/promises";
import { isAndroidBrowser, isIosBrowser, installOfferKind, installSuggestionSuppressed, suppressInstallSuggestion, hasInstallOffer, requestInstall,
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
