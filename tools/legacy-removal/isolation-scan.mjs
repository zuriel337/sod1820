// Isolation scan of a checkout (read-only, no network). Reproduces the numbers in docs/reviews/2029-legacy-removal-20261105/REMOVAL.md.
//   node tools/legacy-removal/isolation-scan.mjs            # scans the current directory
//   node tools/legacy-removal/isolation-scan.mjs <root>     # scans another checkout (for example a clean worktree of origin/main)
// A. relative imports / requires / dynamic imports / new URL(..., import.meta.url) in tracked code that do not resolve to a tracked file
//    (compare the list with the same run on main: only entries that are new are caused by a deletion; strings resolved by a bundler
//    against the working directory, such as esbuild's resolveDir, show up here as false positives)
// B. dependencies declared in package.json that no tracked file imports
// C. occurrences of the word "legacy" outside the history directories, by meaning. Counting the word proves nothing about coupling to the
//    retired product: the structural checks (A, the single build target, the module-boundary gate) are the proof; C only shows what the word means.
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = path.resolve(process.argv[2] || ".");
process.chdir(root);
const tracked = execSync("git ls-files", { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean);
const HISTORY = /^(docs|audits|planning|research|research-notes|research-library|drafts|exports|work|work_log|supabase\/migrations|public-reading-deploy\/dist)\//;
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };

// A -------------------------------------------------------------------------------------------------------------------------------
const trackedSet = new Set(tracked);
const code = tracked.filter((f) => /\.(m?js|cjs|jsx|ts|tsx)$/.test(f) && !HISTORY.test(f) && !/^(node_modules|dist)\//.test(f));
const exts = ["", ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".css", "/index.js", "/index.jsx", "/index.mjs"];
const resolves = (from, spec) => { const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec)); return exts.some((e) => trackedSet.has(base + e)); };
const importRe = /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)|new URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g;
const unresolved = [];
for (const f of code) {
  const s = read(f);
  let m; importRe.lastIndex = 0;
  while ((m = importRe.exec(s))) {
    const spec = m[1] || m[2] || m[3] || m[4];
    if (!spec || !spec.startsWith(".") || /[`$]\{|\*/.test(spec)) continue;
    if (!resolves(f, spec)) unresolved.push(`${f} -> ${spec}`);
  }
}

// B -------------------------------------------------------------------------------------------------------------------------------
const pkg = JSON.parse(read("package.json"));
const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
const corpus = tracked.filter((f) => /\.(m?js|cjs|jsx|ts|tsx|json|ya?ml|sh|html)$/.test(f) && !HISTORY.test(f) && f !== "package-lock.json" && f !== "package.json").map(read).join("\n");
const unusedDeps = deps.filter((d) => { const e = d.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"); return !new RegExp(`["'\`](?:node:)?${e}(?:["'\`/])|(?:npx|bunx)\\s+${e}\\b|\\b${e}\\s+(?:install|--)`).test(corpus); });

// C -------------------------------------------------------------------------------------------------------------------------------
const clusters = [
  ["World legacy-replay data pipeline (2029 research projection)", /legacy[_-]?replay|legacyReplay|LEGACY_REPLAY|legacy_envelope|legacy_signal|zvi_legacy|attachWorldLegacy|buildWorldLegacy/i],
  ["archive / identity / provenance data (legacy_id, old chat, old accounts, claims)", /legacy[_-]?(id|ids|chat|archive|identity|account|profile|author|source|url|path|slug|post|posts|comment|message|row|user|contributor|link|links|image|images|media|reply|thread|openweb|import|claim)\b|(wp|openweb)[_-]?legacy|\blegacy(Id|Ids|Author|Post|Url|Slug|Placement|Identity|Account|Profile|Chat|Row)\b/i],
  ["stored-value / session / payload compatibility readers", /LEGACY_[A-Z_]*KEY|readLegacy|legacyContext|legacyValue|legacyBounded|legacyTotal|legacy (untraced|structured|mode|envelope|value|shape)|fromLegacyStructure|LEGACY_(CONTAINER|TEXT_KEY|TAB_MAP)/i],
  ["post / source compatibility readers", /Legacy(Occurrences|Equality|Sinks|Marking|SourcePath)|legacySourcePath|legacy sinks|legacy plugin|authored legacy/i],
  ["gate / workflow / test names", /legacy-production-lock|legacy-retired|test-legacy|Legacy Production lock|legacy_production_lock|Legacy Compatibility/i],
  ["asset file names", /legacy[-_a-z0-9]*\.(webp|png|jpg|jpeg|svg|gif|css|js)\b/i],
  ["redirect / route compatibility tables", /legacy[-_ ]?(redirect|route|alias)s?\b|legacyRedirects/i],
  ["wording about the retired product (comments, strings)", /(retired|retire|removed|historical|history|former|old|previous|no longer|replaced)[^\n]{0,60}legacy|legacy[^\n]{0,60}(retired|removed|historical|history|former|replaced|no longer)/i],
];
const counts = new Map(); let total = 0; const files = new Set(); const other = new Map();
for (const f of tracked) {
  if (HISTORY.test(f) || !/\.(m?js|cjs|jsx|ts|tsx|json|ya?ml|html|css|sh|py|md|sql|txt)$/.test(f) || f.endsWith("deleted-files.txt") || f.endsWith("package-lock.json")) continue;
  for (const line of read(f).split("\n")) {
    if (!/legacy/i.test(line)) continue;
    total++; files.add(f);
    const hit = clusters.find(([, re]) => re.test(line));
    const name = hit ? hit[0] : "not matched by any cluster above (read the files; the structural checks are what prove isolation)";
    counts.set(name, (counts.get(name) || 0) + 1);
    if (!hit) other.set(f, (other.get(f) || 0) + 1);
  }
}

const out = {
  root, head: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(),
  A_unresolvedRelativeImports: { filesScanned: code.length, count: unresolved.length, entries: unresolved },
  B_dependenciesWithNoImporter: unusedDeps,
  C_legacyWord: { lines: total, files: files.size, byMeaning: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])), topUnmatchedFiles: [...other].sort((a, b) => b[1] - a[1]).slice(0, 12) },
};
console.log(JSON.stringify(out, null, 1));
