// 2029 ↔ Legacy module-level boundary. Unlike test-2029-built-graph.mjs (chunk identity),
// this walks every static AND dynamic import from the 2029 entry at source level, so a Legacy UI
// module folded into a shared chunk cannot hide. Backend/engine/auth modules are NOT forbidden.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exts = ["", ".js", ".jsx", ".mjs", "/index.js", "/index.jsx"];
const resolveImport = (from, spec) => {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const e of exts) { const p = base + e; if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; }
  return null;
};
const re = /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

export function crawl(entry) {
  const parent = new Map([[path.resolve(root, entry), null]]);
  const queue = [...parent.keys()];
  while (queue.length) {
    const file = queue.shift();
    if (!/\.(jsx?|mjs)$/.test(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) {
      const target = resolveImport(file, m[1] || m[2]);
      if (target && !parent.has(target)) { parent.set(target, file); queue.push(target); }
    }
  }
  return parent;
}

// Legacy shell / navigation / presentation surfaces. Each is Legacy-only; 2029 owns its own.
const forbidden = [
  "src/App.jsx", "src/main.jsx", "src/lib/appHeal.js", "src/adminTheme.css",
  ...fs.readdirSync(path.join(root, "src/components/layout")).filter((f) => /\.jsx?$/.test(f)).map((f) => `src/components/layout/${f}`),
  "src/components/userCenter/UserCenter.jsx", "src/components/userCenter/HintsPanel.jsx",
  "src/lib/userCenter/UserCenterContext.jsx", "src/lib/userCenter/useWaLink.jsx",
  "src/components/MyTreeCard.jsx",
  "src/components/AskRaziel.jsx", "src/components/AiQuotaToast.jsx", "src/components/ProfileNudge.jsx",
  "src/components/InstallPrompt.jsx", "src/components/UpdateBanner.jsx", "src/components/SitePromoPopup.jsx",
  "src/components/RoyalShareWidget.jsx", "src/components/GematriaCalculatorLegacy.jsx",
  "src/components/CanonicalGematriaCalculator.jsx", "src/components/MethodAnalyze.jsx",
  "src/components/BrandTicker.jsx", "src/components/UpdatesBar.jsx", "src/components/YearTicker.jsx",
];

const graph = crawl("src/main2029.jsx");
const chain = (file) => { const c = []; for (let f = file; f; f = graph.get(f)) c.push(path.relative(root, f)); return c.reverse().join("\n  -> "); };
for (const item of forbidden) {
  const abs = path.resolve(root, item);
  assert.equal(graph.has(abs), false, `Legacy module reachable from 2029 entry: ${item}\n  ${graph.has(abs) ? chain(abs) : ""}`);
}

// Shared panels that both runtimes use must live in the neutral feature module, never inside a Legacy shell.
for (const f of ["src/features/personalPanels/PageEditor.jsx", "src/features/personalPanels/MessagesHub.jsx"]) {
  assert.ok(graph.has(path.resolve(root, f)), `2029 personal workspace must use the neutral shared panel ${f}`);
}
console.log(`2029 module boundary: PASS (${graph.size} modules, ${forbidden.length} Legacy modules/surfaces excluded)`);
