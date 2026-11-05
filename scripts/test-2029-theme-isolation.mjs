// 2029 theme/palette independence from Legacy: store semantics (own key, one-time seed, own attribute),
// source boundaries, and (when dist exists) the emitted 2029 bundle.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const storeUrl = new URL("../src/lib/themePreset2029.js", import.meta.url).href;

class FakeStorage {
  constructor(init = {}) { this.map = new Map(Object.entries(init)); this.writes = []; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.writes.push(k); this.map.set(k, String(v)); }
}
function fakeDocument() {
  const attrs = new Map();
  return { attrs, documentElement: { setAttribute: (k, v) => attrs.set(k, v), getAttribute: (k) => attrs.get(k) ?? null } };
}
let n = 0;
async function loadStore(initialStorage) {
  const storage = new FakeStorage(initialStorage);
  const doc = fakeDocument();
  globalThis.localStorage = storage;
  globalThis.document = doc;
  const mod = await import(`${storeUrl}?case=${n++}`);
  return { storage, doc, mod };
}

// 1. One-time seed from an existing Legacy preference.
{
  const { storage, doc, mod } = await loadStore({ "sod-theme": "light" });
  assert.equal(storage.getItem(mod.THEME_STORAGE_KEY_2029), "light", "first run copies the existing preference once");
  assert.equal(storage.getItem(mod.THEME_SEEDED_KEY_2029), "1");
  assert.equal(doc.attrs.get("data-theme-2029"), "light");
  assert.equal(storage.getItem("sod-theme"), "light", "Legacy value is never modified");
  assert.equal(storage.writes.includes("sod-theme"), false, "Legacy key is never written");
  assert.equal(doc.attrs.has("data-theme") || doc.attrs.has("data-theme-preset"), false, "no global Legacy attribute is set");
  mod.setThemePreset("parchment");
  assert.equal(storage.getItem("sod-theme"), "light", "2029 changes never flow back to Legacy");
  assert.equal(storage.getItem(mod.THEME_STORAGE_KEY_2029), "parchment");
  assert.equal(doc.attrs.get("data-theme-2029"), "parchment");
  assert.equal(storage.writes.includes("sod-theme"), false);
}
// 2. An existing 2029 preference is never overwritten by the seed.
{
  const { storage, mod } = await loadStore({ "sod-theme": "dark", "sod2029:theme-preset": "parchment" });
  assert.equal(storage.getItem(mod.THEME_STORAGE_KEY_2029), "parchment");
  assert.equal(mod.THEME_STORAGE_KEY_2029, "sod2029:theme-preset");
}
// 3. No seed when nothing exists, and it cannot repeat after the marker is set (no continuous sync).
{
  const { storage, doc, mod } = await loadStore({});
  assert.equal(doc.attrs.get("data-theme-2029"), "dark");
  assert.equal(storage.getItem(mod.THEME_SEEDED_KEY_2029), "1");
  assert.equal(storage.getItem(mod.THEME_STORAGE_KEY_2029), null, "default is not persisted as a preference");
  const second = await loadStore({ "sod-theme": "light", "sod2029:theme-preset-seeded": "1" });
  assert.equal(second.storage.getItem(second.mod.THEME_STORAGE_KEY_2029), null, "a later Legacy change is not followed");
  assert.equal(second.doc.attrs.get("data-theme-2029"), "dark");
}
// 4. Invalid values are ignored; storage failures fall back to dark.
{
  const { storage, doc, mod } = await loadStore({ "sod-theme": "neon" });
  assert.equal(storage.getItem(mod.THEME_STORAGE_KEY_2029), null);
  assert.equal(doc.attrs.get("data-theme-2029"), "dark");
  assert.equal(mod.hasStoredThemePreference(), false, "answers from the 2029 key only");
  mod.setThemePreset("light");
  assert.equal(mod.hasStoredThemePreference(), true);
}
// 5. Forced mode is page-scoped and not persisted.
{
  const { storage, doc, mod } = await loadStore({ "sod2029:theme-preset": "dark" });
  const before = storage.writes.length;
  mod.setForcedMode("light");
  assert.equal(doc.attrs.get("data-theme-2029"), "light");
  mod.setForcedMode(null);
  assert.equal(doc.attrs.get("data-theme-2029"), "dark");
  assert.equal(storage.writes.length, before, "forced mode never writes storage");
}
delete globalThis.localStorage;
delete globalThis.document;

// 6. Source boundaries.
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const src = walk("src");
const own2029 = src.filter((f) => /2029/i.test(f) && /\.jsx?$/.test(f) && !/paletteBridge2029|palette2029|themePreset2029|paletteTokens2029|themeHostAdapter2029|paletteHostAdapter2029/.test(f));
for (const f of own2029) {
  const body = read(f);
  assert.equal(/from\s*["'](?:\.\.?\/)+(?:lib\/)?(?:palette|themeMode|lightRoutes|chromeTheme)\.js["']/.test(body), false, `${f} must not import the Legacy palette/theme/route modules`);
}
for (const f of ["src/lib/palette2029.js", "src/lib/paletteTokens2029.js", "src/lib/themePreset2029.js", "src/lib/paletteBridge2029.js"]) {
  const body = read(f).replace(/\/\/.*$/gm, "");
  assert.equal(/from\s*["']\.\/(?:palette|themeMode|lightRoutes|chromeTheme)\.js["']/.test(body), false, `${f} must not import Legacy theme modules`);
}
// The Legacy-host adapters are the only place 2029 theme names meet Legacy modules; nothing else may import them.
for (const f of src.filter((p) => /\.jsx?$/.test(p))) {
  assert.equal(/(?:themeHostAdapter2029|paletteHostAdapter2029)\.js["']/.test(read(f)), false, `${f} must not import a Legacy-host adapter (build-time only)`);
}
for (const f of src.filter((p) => p.endsWith(".css") && /2029/i.test(p))) {
  const body = read(f);
  assert.equal(/\[data-theme(?:-preset)?=/.test(body), false, `${f} must use the namespaced data-theme-2029 attribute only`);
}
assert.match(read("vite.config.js"), /legacyBridge2029[\s\S]*themePreset2029\.js[\s\S]*paletteBridge2029\.js/, "2029 build must bridge the shared Legacy theme/palette imports");
assert.match(read("vite.config.js"), /legacyHostThemeAdapter[\s\S]*themeHostAdapter2029\.js[\s\S]*paletteHostAdapter2029\.js/, "Legacy build must adapt hosted 2029 theme imports to the host theme");
assert.match(read("vite.config.js"), /plugins: is2029 \? \[legacyBridge2029\(\), react\(\)\] : \[legacyHostThemeAdapter\(\), react\(\)\]/, "bridge must be 2029-build only");

// 7. Emitted 2029 bundle (needs a build).
const manifestPath = path.join(root, "dist/.vite/manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const seen = new Set();
  const visit = (key) => { if (seen.has(key)) return; seen.add(key); const r = manifest[key]; for (const d of [...(r.imports || []), ...(r.dynamicImports || [])]) visit(d); };
  visit("2029.html");
  const files = [...seen].map((k) => manifest[k].file).filter((f) => f.endsWith(".js"));
  const body = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(root, "dist", f), "utf8")]));
  for (const [f, text] of Object.entries(body)) {
    assert.equal(text.includes("data-theme-preset"), false, `Legacy theme attribute emitted in 2029 chunk ${f}`);
    assert.equal(text.includes("linear-gradient(135deg, #ffffff, #f7f2e6)"), false, `Legacy palette emitted in 2029 chunk ${f}`);
    if (text.includes('"sod-theme"') || text.includes("'sod-theme'")) {
      assert.match(f, /palette2029-/, `Legacy theme key referenced outside the one-time seed: ${f}`);
    }
  }
  assert.ok(files.some((f) => /paletteBridge2029-/.test(f)), "bridge chunk must carry the shared Legacy palette imports");

  // Legacy build: chunks not reachable from the 2029 entry must carry no 2029 theme store or palette hook.
  const in2029 = new Set(files);
  const legacyChunks = fs.readdirSync(path.join(root, "dist/assets")).filter((f) => f.endsWith(".js")).map((f) => `assets/${f}`).filter((f) => !in2029.has(f));
  assert.ok(legacyChunks.length > 50, "expected the Legacy build output next to the 2029 build");
  for (const f of legacyChunks) {
    const text = fs.readFileSync(path.join(root, "dist", f), "utf8");
    assert.equal(text.includes("sod2029:theme-preset"), false, `2029 theme store (storage keys) emitted in Legacy chunk ${f}`);
    assert.equal(/\bpalette2029-|themePreset2029-/.test(f), false, `2029 theme/palette module emitted as a Legacy chunk: ${f}`);
  }
}
console.log("2029 theme/palette isolation: PASS");
