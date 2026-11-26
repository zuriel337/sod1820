// WARNING-ONLY scan of the 12 design families (ZURIEL 25.11.2026: "candidates for review, not proof that every deviation is a defect").
// It never fails a build. The button family is enforced separately and unchanged by test/button-family-guard-2029.test.mjs.
// Counts are per file so an owner can see where a surface draws its own look instead of using royal2029.css / the canonical components.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIR = new Set(["node_modules", ".git", "dist"]);
const ALLOW_COLOR_FILES = /(paletteTokens2029|palette2029|paletteRoles2029|designTokens|royal2029)\.(js|css)$/;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name), stat = statSync(full);
    if (stat.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}
const count = (text, re) => (text.match(re) || []).length;
// family → { files: regex, measure(text, rel) → number }
export const FAMILIES = Object.freeze({
  "2 typography · font-size in px": { files: /\.css$/, measure: t => count(t, /font-size\s*:\s*[0-9.]+px/g) },
  "3 colours · hex / rgb(a) literal": { files: /\.css$/, measure: (t, rel) => ALLOW_COLOR_FILES.test(rel) ? 0 : count(t, /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(/g) },
  "4 icons · inline <svg> outside the icon owners": { files: /\.jsx$/, measure: (t, rel) => /(NavigationIcon2029|ProviderMark2029)\.jsx$/.test(rel) ? 0 : count(t, /<svg\b/g) },
  "5 dialogs · own role=dialog / position:fixed": { files: /\.(jsx|css)$/, measure: (t, rel) => rel.endsWith(".css") ? count(t, /position\s*:\s*fixed/g) : count(t, /role="dialog"|aria-modal|<dialog\b/g) },
  "6 medallions · own round (border-radius:50%)": { files: /\.css$/, measure: (t, rel) => /royal2029\.css$/.test(rel) ? 0 : count(t, /border-radius\s*:\s*50%/g) },
  "7 cards · own *-card rule": { files: /\.css$/, measure: (t, rel) => /royal2029\.css$/.test(rel) ? 0 : count(t, /\.[a-z0-9_-]*card[a-z0-9_-]*\s*\{/gi) },
  "8 spacing · margin/padding in px": { files: /\.css$/, measure: t => count(t, /(?:margin|padding)[a-z-]*\s*:\s*[0-9]+px/g) },
  "9 forms · input/textarea/select control": { files: /\.jsx$/, measure: t => count(t, /<(?:input|textarea|select)\b/g) },
  "11 media · raw <img outside the canonical figure": { files: /\.jsx$/, measure: (t, rel) => /CanonicalMediaFigure2029\.jsx$/.test(rel) ? 0 : count(t, /<img\b/g) },
});
export function scanDesignFamilies(root = process.cwd()) {
  const totals = {}, perFile = {};
  for (const name of Object.keys(FAMILIES)) { totals[name] = 0; perFile[name] = {}; }
  for (const file of walk(join(root, "src"))) {
    const rel = relative(root, file).replaceAll("\\", "/");
    if (/\.test\./.test(rel)) continue;
    let text = null;
    for (const [name, family] of Object.entries(FAMILIES)) {
      if (!family.files.test(rel)) continue;
      text ??= readFileSync(file, "utf8");
      const n = family.measure(text, rel);
      if (n) { totals[name] += n; perFile[name][rel] = n; }
    }
  }
  return { totals, perFile };
}
