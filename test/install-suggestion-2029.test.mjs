import test, { after } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rm } from "node:fs/promises";
import { isAndroidBrowser, installSuggestionSuppressed, suppressInstallSuggestion, hasInstallOffer, requestInstall,
  INSTALL_DISMISS_DAYS, INSTALL_ACCEPTED_DAYS } from "../src/lib/installOffer2029.js";

// The component is JSX with a CSS import: bundle it once, keeping React and the router external.
const outfile = resolve(`.test-install-suggestion-${process.pid}.mjs`);
await build({ entryPoints: ["src/components/experience2029/InstallSuggestion2029.jsx"], bundle: true, platform: "node", format: "esm", outfile,
  external: ["react", "react/jsx-runtime", "react-router-dom"], loader: { ".css": "empty" } });
const { InstallSuggestionView, installSuggestionBlocked, INSTALL_SUGGESTION_DELAY_MS } = await import(pathToFileURL(outfile));
after(() => rm(outfile, { force: true }));

const memory = () => { const map = new Map(); return { getItem: key => map.has(key) ? map.get(key) : null, setItem: (key, value) => map.set(key, String(value)) }; };

test("only Android browsers are eligible; iOS and desktop keep the browser default", () => {
  assert.equal(isAndroidBrowser("Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/126.0 Mobile Safari/537.36"), true);
  for (const ua of ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1", "Mozilla/5.0 (Windows NT 10.0) Chrome/126.0", "", undefined])
    assert.equal(isAndroidBrowser(ua), false, String(ua));
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

test("the strip is a labelled, non-modal region with two real buttons and the approved logo", () => {
  const html = renderToStaticMarkup(React.createElement(InstallSuggestionView, { onInstall() {}, onDismiss() {} }));
  assert.match(html, /role="region"/); assert.match(html, /aria-label="התקנת האפליקציה"/);
  assert.ok(!/aria-modal|role="dialog"/.test(html));
  assert.match(html, /<button type="button" class="sod29-install-go">התקנה<\/button>/);
  assert.match(html, /<button type="button" class="sod29-install-close" aria-label="לא עכשיו">/);
  assert.match(html, /src="\/brand\/2029\/canonical-lockup-128\.webp"/);
});

test("it waits, and never opens over a dialog, typing or a selection", () => {
  assert.equal(INSTALL_SUGGESTION_DELAY_MS, 45000);
  const doc = (dialog, active) => ({ querySelector: () => dialog, activeElement: { matches: () => active } });
  const win = (selection) => ({ getSelection: () => selection });
  assert.equal(installSuggestionBlocked(doc(null, false), win("")), false);
  assert.equal(installSuggestionBlocked(doc({}, false), win("")), true);
  assert.equal(installSuggestionBlocked(doc(null, true), win("")), true);
  assert.equal(installSuggestionBlocked(doc(null, false), win("טקסט מסומן")), true);
});
