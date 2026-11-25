// Finds button looks that live OUTSIDE the one Royal button family (Design V2 §14.4, canonical_ui_components_law v13 §3).
// The family is src/components/experience2029/royal2029.css (.r29-btn, .r29-check, .r29-btn-group). A "deviation" is
//   (css)  a rule whose selector names a button (button / *btn* / *button* classes) and that draws its own look: radius + (background or border) + (padding or height);
//   (jsx)  a <button ... style={{ ...borderRadius... }}> written inline in a component.
// Used by test/button-family-guard-2029.test.mjs (a ratchet against scripts/button-family-baseline-2029.json) and by the mapping report.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const FAMILY_FILE = "src/components/experience2029/royal2029.css";
const SKIP_DIR = new Set(["node_modules", ".git", "dist"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

const BUTTONISH = /(^|[\s>+~,(])(?:button|[.#][\w-]*(?:btn|button)[\w-]*)(?![\w-]*__)/i;
export function cssDeviations(text) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  for (const match of stripped.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim(), body = match[2];
    if (!BUTTONISH.test(" " + selector)) continue;
    if (!/(^|;|\s)border-radius\s*:/.test(body)) continue;
    if (!/(^|;|\s)(background(-color)?|border(-color)?)\s*:/.test(body)) continue;
    if (!/(^|;|\s)(padding(-inline|-block)?|min-(height|block-size)|(block-)?size|height)\s*:/.test(body)) continue;
    found.push(selector.replace(/\s+/g, " ").slice(0, 90));
  }
  return found;
}
export function jsxDeviations(text) {
  const found = [];
  for (const match of text.matchAll(/<button\b[^>]*?style=\{\{[\s\S]*?\}\}/g)) {
    if (/borderRadius/.test(match[0])) found.push(match[0].replace(/\s+/g, " ").slice(0, 80));
  }
  return found;
}
export function scanButtonFamily(root = process.cwd()) {
  const result = {};
  for (const file of walk(join(root, "src"))) {
    const rel = relative(root, file).replaceAll("\\", "/");
    if (rel === FAMILY_FILE || /\.test\.|\/__tests__\//.test(rel)) continue;
    let items = [];
    if (rel.endsWith(".css")) items = cssDeviations(readFileSync(file, "utf8"));
    else if (/\.(jsx|js)$/.test(rel)) items = jsxDeviations(readFileSync(file, "utf8"));
    if (items.length) result[rel] = items;
  }
  return result;
}
