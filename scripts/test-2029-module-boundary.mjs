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

// ── Indirect / contract coupling ratchet ─────────────────────────────────────────────────────
// 2029 must be independent of Legacy contracts, not only of Legacy shell files. Three sets are computed from
// the real import graphs and compared with scripts/2029-legacy-coupling-baseline.json. A NEW coupling fails;
// an entry that no longer exists also fails (remove it) so the baseline can only shrink. No auto-update.
const rel = (p) => path.relative(root, p);
function edges(entry) {
  const e = new Map();
  const queue = [path.resolve(root, entry)]; e.set(queue[0], new Set());
  while (queue.length) {
    const file = queue.shift();
    if (!/\.(jsx?|mjs)$/.test(file)) continue;
    for (const m of fs.readFileSync(file, "utf8").matchAll(re)) {
      const t = resolveImport(file, m[1] || m[2]);
      if (!t) continue;
      e.get(file).add(t);
      if (!e.has(t)) { e.set(t, new Set()); queue.push(t); }
    }
  }
  return e;
}
const e29 = edges("src/main2029.jsx");
const eLegacy = edges("src/main.jsx");
const invert = (e) => { const m = new Map(); for (const [f, ds] of e) for (const d of ds) (m.get(d) ?? m.set(d, new Set()).get(d)).add(f); return m; };
const in29 = invert(e29);
const inLegacy = invert(eLegacy);

// Legacy-owned contracts/state. theme.js mixes Legacy tokens with engine data; the others are Legacy state or route tables.
const contractSeeds = ["src/theme.js", "src/lib/themeMode.js", "src/lib/lightRoutes.js", "src/lib/chromeTheme.js", "src/lib/stream.js", "src/lib/userCenter/UserCenterContext.jsx"];
const direct = new Set();
for (const seed of contractSeeds) for (const importer of in29.get(path.resolve(root, seed)) || []) direct.add(rel(importer));
for (const f of e29.keys()) if (/\.jsx?$/.test(f) && /\busePalette\(/.test(fs.readFileSync(f, "utf8"))) direct.add(rel(f));

const is2029Named = (f) => /2029/i.test(f);
const sharedWithLegacy = [...e29.keys()].filter((f) => eLegacy.has(f) && !is2029Named(rel(f)) && [...(inLegacy.get(f) || [])].some((x) => !e29.has(x)));
const isUi = (f) => /^src\/(components|pages|features)\//.test(rel(f));
const isState = (f) => /^src\/lib\//.test(rel(f)) && /createContext|useSyncExternalStore|setAttribute\(["']data-|localStorage|sessionStorage/.test(fs.readFileSync(f, "utf8"));
const sharedUiState = sharedWithLegacy.filter((f) => isUi(f) || isState(f)).map(rel);

const tainted = new Set([...direct].map((p) => path.resolve(root, p)));
for (let grew = true; grew;) { grew = false; for (const f of [...tainted]) for (const p of in29.get(f) || []) if (!tainted.has(p)) { tainted.add(p); grew = true; } }
const taintedNative = [...tainted].map(rel).filter(is2029Named);

const baseline = JSON.parse(fs.readFileSync(path.join(root, "scripts/2029-legacy-coupling-baseline.json"), "utf8"));
const compare = (label, current, allowed, hint) => {
  const cur = new Set(current), base = new Set(allowed);
  const added = [...cur].filter((x) => !base.has(x)).sort();
  const stale = [...base].filter((x) => !cur.has(x)).sort();
  assert.deepEqual(added, [], `${label}: NEW Legacy coupling in the 2029 graph (${hint}):\n  ${added.join("\n  ")}`);
  assert.deepEqual(stale, [], `${label}: baseline lists coupling that no longer exists; remove it from the baseline (ratchet):\n  ${stale.join("\n  ")}`);
};
compare("direct Legacy contract use", direct, Object.keys(baseline.directLegacyContract), "imports a Legacy-owned contract or calls Legacy usePalette");
compare("shared UI/state with Legacy", sharedUiState, Object.keys(baseline.sharedUiState), "UI or state module that Legacy-only code also imports");
compare("2029 modules transitively reaching a Legacy contract", taintedNative, baseline.taintedNative2029, "2029-named module depends on a Legacy contract");
for (const section of ["directLegacyContract", "sharedUiState"]) {
  for (const [file, meta] of Object.entries(baseline[section])) {
    assert.ok(["L", "N", "I", "F"].includes(meta.class) && meta.action, `${file} must carry a class (L/N/I/F) and an action in ${section}`);
  }
}
console.log(`2029 contract coupling ratchet: PASS (direct ${direct.size}, shared UI/state ${sharedUiState.length}, native transitive ${taintedNative.length})`);

// Shared panels that both runtimes use must live in the neutral feature module, never inside a Legacy shell.
for (const f of ["src/features/personalPanels/PageEditor.jsx", "src/features/personalPanels/MessagesHub.jsx"]) {
  assert.ok(graph.has(path.resolve(root, f)), `2029 personal workspace must use the neutral shared panel ${f}`);
}
console.log(`2029 module boundary: PASS (${graph.size} modules, ${forbidden.length} Legacy modules/surfaces excluded)`);
