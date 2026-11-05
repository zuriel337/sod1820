import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import vm from "node:vm";
import { createRequire } from "node:module";

async function load(entry, exportsExpr) {
  const { outputFiles } = await build({
    stdin: {
      contents: `import React from 'react';import { renderToStaticMarkup } from 'react-dom/server';import { MemoryRouter } from 'react-router-dom';
import Notice from './src/components/experience2029/FeatureClosedNotice2029.jsx';import NotFound from './src/pages/NotFound2029Page.jsx';
export const render = (el) => renderToStaticMarkup(React.createElement(MemoryRouter, null, el));export { Notice, NotFound, React };`,
      resolveDir: process.cwd(), loader: "jsx",
    },
    bundle: true, write: false, platform: "node", format: "cjs", external: ["react", "react-dom/server", "react-router-dom"], loader: { ".js": "jsx" },
    define: { "import.meta.env": "{}", __SOD_2029_BUILD__: "true" },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports, require: createRequire(new URL("../package.json", import.meta.url)), console, window: undefined, document: undefined, localStorage: undefined }, { timeout: 2000 });
  return module.exports;
}

test("FeatureClosedNotice2029 renders only for a blocked canonical state and never decides access", async () => {
  const { render, Notice, React } = await load();
  assert.equal(render(React.createElement(Notice, { state: { blocked: false }, title: "ELS" })), "");
  assert.equal(render(React.createElement(Notice, { state: null })), "");
  const html = render(React.createElement(Notice, { state: { blocked: true, message: "בבנייה" }, title: "ELS", to: "/world" }));
  assert.match(html, /role="status"/);
  assert.match(html, /ELS/);
  assert.match(html, /סגור · בבנייה/);
  assert.match(html, /בבנייה/);
  assert.match(html, /href="\/world"/);
  const compact = render(React.createElement(Notice, { state: { blocked: true, message: "לא מוצג" }, compact: true }));
  assert.equal(compact.includes("לא מוצג"), false, "compact mode omits the message, as before");
});

test("NotFound2029Page keeps the same copy and a home link", async () => {
  const { render, NotFound, React } = await load();
  const html = render(React.createElement(NotFound));
  assert.match(html, /404 · SOD1820/);
  assert.match(html, /העמוד לא נמצא/);
  assert.match(html, /הכתובת שביקשתם אינה קיימת או הוחלפה/);
  assert.match(html, /href="\/"/);
});

test("the 2029-owned small components import no Legacy theme, palette or token modules", async () => {
  const fs = await import("node:fs");
  for (const f of ["src/components/experience2029/FeatureClosedNotice2029.jsx", "src/pages/NotFound2029Page.jsx"]) {
    const src = fs.readFileSync(f, "utf8");
    assert.equal(/from\s*["'](?:\.\.?\/)+(?:lib\/)?(?:palette|themeMode|lightRoutes|chromeTheme)\.js["']/.test(src), false, f);
    assert.equal(/from\s*["'](?:\.\.?\/)+theme\.js["']/.test(src), false, `${f} must not use Legacy tokens`);
  }
});
