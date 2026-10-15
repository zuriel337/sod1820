# Control-panel browser verification

**PASS — 8 scenarios in Chromium 138.0.7204.0.** The run is recorded in `results.json`.

The test imports and renders the actual `ControlPlane2029Page.jsx` and `runtimeSwitches2029.js`. It replaces only the external boundaries: authentication result, surrounding shell/icon, operational-health reads, and Supabase transport. All switch state and simulated writes stay in browser memory. Every non-local HTTP request is blocked; this run attempted **zero external requests** and produced **zero uncaught browser errors**.

Covered behavior:

1. Both new optimizations default OFF; each can be enabled and disabled independently. The existing 13 controls remain ON by default.
2. The number optimization checks for the new RPC before saving. A missing RPC shows an explanation and performs no write.
3. A denied save keeps the old state and shows the error.
4. A successful save followed by failed verification displays `מצב לא מאומת` and `aria-pressed="mixed"`. Other switches are disabled. Explicit restoration to the old implementation succeeds after reads recover.
5. An in-flight save disables every switch until completion.
6. Unavailable initial settings retain both original execution paths.
7. A non-admin is routed away before switches or administrative data are read.
8. Loading authentication does not expose or read the controls.

`controls-off.png` shows the actual two switch rows after toggling both ON and back OFF. Styling and the surrounding shell are fixtures; it is not production visual acceptance.

Run from the repository root with Playwright and an installed Chromium:

```sh
node docs/perf-evidence-20261015/two-switches/browser/control-switches.browser.mjs
```

This environment had no installed browser; the normal Playwright CDN returned HTML instead of the requested ZIP. The successful run used an isolated `/tmp` installation of `@sparticuz/chromium@138.0.2`, with its bundled browser and SwiftShader files extracted without ownership changes. No repository dependency or package lock changed:

```sh
CHROMIUM_MODULE=/tmp/sod-browser-verify/node_modules/@sparticuz/chromium \
CHROMIUM_EXECUTABLE=/tmp/sod-browser-verify/chromium \
node docs/perf-evidence-20261015/two-switches/browser/control-switches.browser.mjs
```

Limits: this proves the rendered control behavior with fixture transport. It does not prove live authentication/RLS, hosted-preview operation, database migration availability, navigation/scroll performance, or production styling. No production setting or product database row was changed.
