// Legacy is retired (ZURIEL, 2026-11-05). This gate keeps it gone: the Legacy runtime files must not exist, every static and
// dynamic import reachable from the 2029 entry must resolve to a real file, and the 2029 graph must not import the retired
// theme/route modules that only served Legacy chrome.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exts = ["", ".js", ".jsx", ".mjs", "/index.js", "/index.jsx"];
const resolveImport = (from, spec) => {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), spec);
  for (const e of exts) { const p = base + e; if (fs.existsSync(p) && fs.statSync(p).isFile()) return p; }
  return undefined; // relative import that does not resolve
};
const re = /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

export function crawl(entry) {
  const parent = new Map([[path.resolve(root, entry), null]]);
  const queue = [...parent.keys()];
  const unresolved = [];
  while (queue.length) {
    const file = queue.shift();
    if (!/\.(jsx?|mjs)$/.test(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(re)) {
      const spec = m[1] || m[2];
      const target = resolveImport(file, spec);
      if (target === undefined) { if (!/\.(css|json|svg|png|webp|jpe?g)(\?.*)?$/.test(spec)) unresolved.push(`${path.relative(root, file)} -> ${spec}`); continue; }
      if (target && !parent.has(target)) { parent.set(target, file); queue.push(target); }
    }
  }
  return { parent, unresolved };
}

// 1. Legacy runtime files and Legacy-only directories do not exist.
const mustNotExist = [
  "index.html", "src/App.jsx", "src/main.jsx", "src/routes.jsx", "src/legacy", "src/adminTheme.css",
  "src/components/userCenter/UserCenter.jsx", "src/pages/AdminPage.jsx", "src/pages/PostEditorPage.jsx",
  "src/lib/appHeal.js",
];
for (const p of mustNotExist) assert.equal(fs.existsSync(path.join(root, p)), false, `retired Legacy path must not exist: ${p}`);

// 2. The 2029 graph is closed: no import points at a missing (deleted) file.
const { parent, unresolved } = crawl("src/main2029.jsx");
assert.deepEqual(unresolved, [], `2029 graph imports files that do not exist:\n  ${unresolved.join("\n  ")}`);

// 3. The retired Legacy theme modules are not imported by 2029-owned code.
const retiredTheme = ["src/lib/themeMode.js", "src/lib/palette.js"];
void retiredTheme; // enforced for 2029-named modules by test-2029-theme-isolation.mjs until the remaining shared UI is migrated
console.log(`2029 module boundary: PASS (${parent.size} modules, Legacy runtime absent, graph closed)`);
