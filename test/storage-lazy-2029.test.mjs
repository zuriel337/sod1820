import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { StorageClient as RealStorageClient } from "@supabase/storage-js";
import { StorageClient as LazyStorageClient, LAZY_STORAGE_2029_CONTRACT } from "../src/lib/storageLazy2029.js";

// The Storage boundary of the 2029 build (vite alias, shell budget 16.11.2026): the real @supabase/storage-js loads on the first upload.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const URL_BASE = "https://linswmnnkjxvweumprav.supabase.co/storage/v1";

test("getPublicUrl gives exactly the address the real client gives, for every path shape the app produces", () => {
  const real = new RealStorageClient(URL_BASE, { apikey: "k" });
  const lazy = new LazyStorageClient(URL_BASE, { apikey: "k" });
  for (const path of ["community/u1/a.png", "/lead/slash.jpg", "//two/slashes.webp", "עברית/קובץ.webp", "space name.png", "q?x#y.png", "avatars/1700000000000_a%20b.jpg"])
    assert.deepEqual(lazy.from("gallery").getPublicUrl(path), real.from("gallery").getPublicUrl(path), path);
});

test("upload builds the real client once from the same URL, headers and authenticated fetch, and delegates the exact call", async () => {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url: String(url), method: init?.method, headers: init?.headers }); return new Response(JSON.stringify({ Key: "gallery/x.png", Id: "1" }), { status: 200, headers: { "content-type": "application/json" } }); };
  const lazy = new LazyStorageClient(URL_BASE, { apikey: "k" }, fetch);
  assert.equal(lazy.real, null, "nothing is loaded before an upload");
  const out = await lazy.from("gallery").upload("x.png", new Blob(["png"]), { contentType: "image/png", upsert: true });
  assert.equal(out.error, null);
  assert.equal(out.data.path, "x.png");
  assert.ok(lazy.real instanceof RealStorageClient, "the real client is materialized");
  const first = lazy.real;
  await lazy.from("gallery").upload("y.png", new Blob(["png"]));
  assert.equal(lazy.real, first, "materialized once");
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `${URL_BASE}/object/gallery/x.png`);
  assert.equal(calls[0].method, "POST");
});

test("anything outside the contract fails loudly instead of building a different address or doing nothing", () => {
  const lazy = new LazyStorageClient(URL_BASE, {});
  assert.throws(() => lazy.from("gallery").getPublicUrl("a.png", { download: true }), (e) => e.code === "SOD_2029_STORAGE_UNSUPPORTED");
  assert.throws(() => lazy.from("gallery").remove(["a.png"]), (e) => e.code === "SOD_2029_STORAGE_UNSUPPORTED");
  assert.deepEqual(LAZY_STORAGE_2029_CONTRACT.bucketMethods, ["upload", "getPublicUrl"]);
});

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => { const p = join(dir, name); return statSync(p).isDirectory() ? sourceFiles(p) : /\.(jsx?|mjs)$/.test(name) && !/\.test\.js$/.test(name) ? [p] : []; });
}

test("the application uses Storage only through the contract: from(bucket).upload(...) and from(bucket).getPublicUrl(path)", () => {
  const offenders = [];
  for (const file of sourceFiles(join(root, "src"))) {
    if (file.endsWith("storageLazy2029.js")) continue;
    const text = readFileSync(file, "utf8");
    // a property access on an identifier (supabase.storage.x), not a host name inside a string such as ".storage.supabase.co"
    for (const m of text.matchAll(/[A-Za-z_$\])][\w$]*\.storage\s*\.\s*([A-Za-z_$][\w$]*)/g)) if (m[1] !== "from") offenders.push(`${file}: storage.${m[1]}`);
    for (const m of text.matchAll(/\.storage\s*\.\s*from\([^)]*\)\s*\.\s*([A-Za-z_$][\w$]*)\(([^)]*)\)/g)) {
      if (!LAZY_STORAGE_2029_CONTRACT.bucketMethods.includes(m[1])) offenders.push(`${file}: from().${m[1]}`);
      if (m[1] === "getPublicUrl" && m[2].includes(",")) offenders.push(`${file}: getPublicUrl with options`);
    }
    if (/from\s+["']@supabase\/storage-js["']/.test(text)) offenders.push(`${file}: imports @supabase/storage-js directly`);
  }
  assert.deepEqual(offenders, []);
});

test("vite aliases Storage for the 2029 build and the adapter keeps the real module behind a dynamic import", () => {
  const vite = readFileSync(join(root, "vite.config.js"), "utf8");
  const adapter = readFileSync(join(root, "src/lib/storageLazy2029.js"), "utf8");
  assert.match(vite, /find:\s*\/\^@supabase\\\/storage-js\$\/,\s*replacement:\s*resolve\(rootDir, 'src\/lib\/storageLazy2029\.js'\)/);
  assert.match(adapter, /import\("@supabase\/storage-js\/dist\/index\.mjs"\)/);
  assert.doesNotMatch(adapter, /^import[^\n]*@supabase\/storage-js/m);
});

test("built 2029 entry excludes the real Storage client; it remains available on demand", { skip: !existsSync(join(root, "dist/.vite/manifest.json")) }, () => {
  const manifest = JSON.parse(readFileSync(join(root, "dist/.vite/manifest.json"), "utf8"));
  const entryKey = Object.keys(manifest).find((key) => key === "2029.html" || manifest[key].isEntry);
  const seen = new Set(); const queue = [entryKey];
  while (queue.length) { const key = queue.shift(); if (!key || seen.has(key)) continue; seen.add(key); queue.push(...(manifest[key].imports || [])); }
  const files = [...seen].map((key) => manifest[key].file).filter((f) => f?.endsWith(".js"));
  const eager = files.map((f) => readFileSync(join(root, "dist", f), "utf8")).join("\n");
  assert.doesNotMatch(eager, /object\/upload\/sign/, "the real Storage client is not in the eager entry");
  const lazy = Object.values(manifest).filter((r) => r.file?.endsWith(".js") && !files.includes(r.file)).some((r) => /object\/upload\/sign/.test(readFileSync(join(root, "dist", r.file), "utf8")));
  assert.ok(lazy, "the real Storage client is still emitted as a lazy chunk");
});
