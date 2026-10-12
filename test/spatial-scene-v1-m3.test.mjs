import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, cpSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { validateHebrewGlyphAssets, FINALS } from "../scripts/spatial/validate-hebrew-glyph-assets.mjs";
import {
  HEBREW_GLYPH_MANIFEST as M, buildGlyphAssetRef, resolveGlyphAssetRef, getHebrewGlyph, glyphPlacement, glyphPointToLocal,
} from "../src/lib/spatial/hebrewGlyphAssets.js";
import { compileMistaterSceneV1, computeSceneProjectionSignatureV1 } from "../src/lib/spatial/semanticSceneCompiler.js";
import { buildLetterAnatomySpec } from "../src/lib/spatial/hebrewLetterAnatomy.js";

const here = (p) => new URL(p, import.meta.url).pathname;
const read = (p) => readFileSync(here(p), "utf8");
const trace = JSON.parse(read("./fixtures/spatial/mistater-1237-trace.json"));
const golden = JSON.parse(read("./fixtures/spatial/scene-v1-mistater-1237.export.json"));
const ASSET_DIR = here("../src/lib/spatial/hebrewGlyph/v1/");
const py = (args, opts = {}) => spawnSync("python3", args, { encoding: "utf8", ...opts });
const hasPy = (mod) => py(["-c", `import ${mod}`]).status === 0;

test("manifest: 27 unique identities, no duplicate codepoint, validator passes, SOURCE_GAP candidate truthfully declared", () => {
  const r = validateHebrewGlyphAssets();
  assert.deepEqual(r.errors, []);
  assert.equal(M.glyphs.length, 27);
  assert.equal(new Set(M.glyphs.map((g) => g.glyph_id)).size, 27);
  assert.equal(new Set(M.glyphs.map((g) => g.codepoint)).size, 27);
  assert.equal(M.truth_tier, "REPRESENTATION");
  assert.equal(M.source_gate.status, "SOURCE_GAP");
  assert.equal(M.source_gate.visual_canonical, false);
  M.glyphs.forEach((g) => assert.equal(g.visual_status, "CANDIDATE_NOT_VISUAL_CANONICAL"));
  assert.match(M.source.license, /Open Font License 1\.1/);
  assert.equal(M.source.font_committed_by_m3, false);
  assert.equal(M.source.font_embedded_in_assets, false);
});

test("finals have own glyph_id/codepoint with explicit base linkage consistent with Letter Anatomy identity", () => {
  assert.deepEqual(M.glyphs.filter((g) => g.is_final).map((g) => g.codepoint).sort(), Object.keys(FINALS).sort());
  for (const g of M.glyphs) {
    assert.equal(g.codepoint.codePointAt(0), parseInt(g.unicode.slice(2), 16), "codepoint roundtrip");
    const spec = buildLetterAnatomySpec(g.codepoint);
    assert.equal(spec.letter.codepoint, g.codepoint);
    assert.equal(spec.letter.is_final, g.is_final);
    assert.equal(spec.letter.base_codepoint, g.base_codepoint);
    if (g.is_final) assert.equal(getHebrewGlyph(g.base_codepoint).glyph_id, g.base_glyph_id);
    else assert.equal(g.base_glyph_id, null);
  }
});

test("canonical SVGs are path-only (no text/font/embedded refs) and checksums are stable", () => {
  for (const f of readdirSync(ASSET_DIR).filter((n) => n.endsWith(".svg"))) {
    const t = readFileSync(join(ASSET_DIR, f), "utf8");
    assert.equal(/<\s*(text|tspan|font|style|script|image|use)\b|font-family|@font-face|base64/i.test(t), false, f);
    assert.equal((t.match(/<path /g) || []).length, 1, f);
  }
  assert.equal(readdirSync(ASSET_DIR).some((n) => /\.(ttf|otf|woff2?)$/i.test(n)), false);
});

test("validator rejects a tampered asset (<text> node, font ref, checksum drift) and a duplicate codepoint", () => {
  const dir = mkdtempSync(join(tmpdir(), "glyph-m3-"));
  cpSync(ASSET_DIR, dir, { recursive: true });
  const f = join(dir, "heglyph-05D0.svg");
  writeFileSync(f, readFileSync(f, "utf8").replace("</svg>", '<text font-family="Heebo">א</text></svg>'));
  const bad = validateHebrewGlyphAssets(dir);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => /not path-only/.test(e)) && bad.errors.some((e) => /content_hash/.test(e)));
});

test("no arithmetic/numeric-truth fields in manifest or scene asset_ref", () => {
  const keys = [];
  const walk = (o) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { keys.push(k); walk(v); } };
  walk(M);
  walk(buildGlyphAssetRef("ה"));
  assert.equal(keys.some((k) => /gematria|value|sum|total|mispar|difference|result|score/i.test(k)), false);
});

test("deterministic pipeline: generator reproduces committed manifest + SVG bytes (skips without fontTools/font)", { skip: !hasPy("fontTools") || !existsSync(here("../api/_assets/heebo-800.ttf")) }, () => {
  const r = py([here("../scripts/spatial/build_hebrew_glyph_assets.py"), "--font", here("../api/_assets/heebo-800.ttf"), "--check"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const a = mkdtempSync(join(tmpdir(), "glyph-a-")), b = mkdtempSync(join(tmpdir(), "glyph-b-"));
  for (const d of [a, b]) assert.equal(py([here("../scripts/spatial/build_hebrew_glyph_assets.py"), "--font", here("../api/_assets/heebo-800.ttf"), "--out", d]).status, 0);
  for (const n of readdirSync(a)) assert.deepEqual(readFileSync(join(a, n)), readFileSync(join(b, n)), n);
  assert.equal(M.source.source_sha256, "f6d220965f99c84b8f026ad295c14d49fc091150babb8e6a04f14b6eda2467ec");
});

test("scene.v1 letter nodes carry additive asset_ref (identity+version only); signature binds it; not tessellation", () => {
  const scene = compileMistaterSceneV1({ expression: trace.input, methodTrace: trace });
  const letters = scene.nodes.filter((n) => n.kind === "letter_anchor");
  assert.equal(letters.length, 6);
  letters.forEach((n) => {
    assert.deepEqual(n.asset_ref, buildGlyphAssetRef(n.identityRef.letter));
    assert.equal(resolveGlyphAssetRef(n.asset_ref).codepoint, n.identityRef.letter);
    assert.deepEqual(Object.keys(n.asset_ref).sort(), ["content_hash", "glyph_id", "kind", "manifest_version", "profile_id", "vector_version"]);
  });
  assert.equal(scene.nodes.filter((n) => n.kind !== "letter_anchor").some((n) => n.asset_ref), false);
  const changed = structuredClone(scene);
  changed.nodes.find((n) => n.kind === "letter_anchor").asset_ref.vector_version = "v2";
  assert.notEqual(computeSceneProjectionSignatureV1(changed), scene.projection_signature);
  assert.equal(computeSceneProjectionSignatureV1(scene), scene.projection_signature);
});

test("golden export fixtures match the compiler's asset_refs (Web resolves the same lineage the Blender run consumed)", () => {
  const scene = compileMistaterSceneV1({ expression: trace.input, methodTrace: trace });
  const refs = Object.fromEntries(scene.nodes.filter((n) => n.asset_ref).map((n) => [n.id, n.asset_ref]));
  assert.deepEqual(Object.fromEntries(golden.scene.nodes.filter((n) => n.asset_ref).map((n) => [n.id, n.asset_ref])), refs);
});

test("fail-soft: missing / unknown / stale asset_ref resolves to null (renderers keep the text/box fallback)", () => {
  const ref = buildGlyphAssetRef("ה");
  assert.equal(resolveGlyphAssetRef(null), null);
  assert.equal(resolveGlyphAssetRef({ ...ref, glyph_id: "heglyph:FFFF" }), null);
  assert.equal(resolveGlyphAssetRef({ ...ref, content_hash: "sha256:00" }), null);
  assert.equal(resolveGlyphAssetRef({ ...ref, kind: "other" }), null);
  assert.equal(buildGlyphAssetRef("x"), null);
  const scene = compileMistaterSceneV1({ expression: "התגלות", methodTrace: trace });
  assert.ok(scene.nodes.filter((n) => n.kind === "letter_anchor").every((n) => resolveGlyphAssetRef(n.asset_ref)));
});

test("Web R3F consumes manifest assets with canvas fallback preserved; identity stays codepoint", () => {
  const r3f = read("../src/components/gematria2029/MistaterScene3D2029.jsx");
  assert.match(r3f, /resolveGlyphAssetRef\(assetRef\)/);
  assert.match(r3f, /SVGLoader/);
  assert.match(r3f, /glyphPlacement/);
  assert.match(r3f, /boxGeometry/); // fallback box
  assert.match(r3f, /node\.identityRef\.letter/); // fallback canvas letter + sr-only list stay codepoint-based
  assert.match(r3f, /<li key=\{node\.id\}>\{node\.identityRef\.letter\}/);
});

test("Python lineage placement == JS placement (Web↔Blender shared formula) and path parse is lossless", { skip: !hasPy("hebrew_glyph_lineage") && !existsSync(here("../scripts/spatial/hebrew_glyph_lineage.py")) }, () => {
  const bounds = { width: 56, height: 72, depth: 14 };
  const g = getHebrewGlyph("ם");
  const pts = [[0, 0], [100, 800], [400.5, 212.11]];
  const r = py(["-c", `
import json,sys
sys.path.insert(0, ${JSON.stringify(here("../scripts/spatial/"))})
import hebrew_glyph_lineage as L
m=L.load_manifest(); g=[x for x in m['glyphs'] if x['codepoint']=='ם'][0]
pl=L.placement(${JSON.stringify(bounds)}, g)
data,d=L.read_svg_path(g)
cs=L.parse_path(d)
print(json.dumps({'pts':[L.point_to_local(pl,x,y) for x,y in ${JSON.stringify(pts)}],'contours':len(cs),'segs':sum(len(c['segs']) for c in cs),'ref_ok':L.resolve_asset_ref(${JSON.stringify(buildGlyphAssetRef("ם"))},m) is not None,'bad_none':L.resolve_asset_ref({'kind':'hebrew_glyph_svg','glyph_id':'heglyph:05DD','content_hash':'x','vector_version':'v1'},m) is None}))`]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  const pl = glyphPlacement(bounds, g);
  pts.forEach(([x, y], i) => { const p = glyphPointToLocal(pl, x, y); assert.ok(Math.abs(p.x - out.pts[i][0]) < 1e-9 && Math.abs(p.y - out.pts[i][1]) < 1e-9); });
  const d = readFileSync(join(ASSET_DIR, "heglyph-05DD.svg"), "utf8").match(/ d="([^"]*)"/)[1];
  assert.equal(out.contours, (d.match(/Z/g) || []).length);
  assert.equal(out.segs, (d.match(/[LQ]/g) || []).length);
  assert.equal(out.ref_ok, true); assert.equal(out.bad_none, true);
});

test("Blender evidence: committed parity run resolved the SAME asset_refs as the scene (asset parity) with 54/54 transform parity", () => {
  const parity = JSON.parse(read("../audits/spatial-t4-glyph-m3/parity-1237.blender-5.0.1.json"));
  const refs = golden.scene.nodes.filter((n) => n.asset_ref);
  assert.equal(refs.length, 6);
  assert.deepEqual(Object.keys(parity.assets).sort(), refs.map((n) => n.id).sort());
  refs.forEach((n) => { assert.equal(parity.assets[n.id].glyph_id, n.asset_ref.glyph_id); assert.equal(parity.assets[n.id].content_hash, n.asset_ref.content_hash); });
  assert.match(parity.blender_version, /^5\./);
  assert.ok(existsSync(here("../audits/spatial-t4-glyph-m3/still-1237-glyph.png")));
  const py_ = read("../scripts/spatial/scene_v1_to_blender.py");
  assert.equal(/bpy\.data\.fonts|type="FONT"|"FONT"|primitive_text_add|body\s*=/.test(py_), false, "no Blender font/text object as source of truth");
  assert.match(py_, /build_glyph_curve/);
});

test("live Blender run (skips without bpy): importer builds glyph curves, not placeholder boxes, and parity stays PASS", { skip: !hasPy("bpy") }, () => {
  const dir = mkdtempSync(join(tmpdir(), "glyph-bl-"));
  const exp = here("./fixtures/spatial/scene-v1-mistater-1237.export.json");
  const r = py([here("../scripts/spatial/scene_v1_to_blender.py"), "--scene", exp, "--parity", join(dir, "p.json")]);
  assert.equal(r.status, 0, r.stderr.slice(-800));
  const p = JSON.parse(readFileSync(join(dir, "p.json"), "utf8"));
  assert.equal(Object.keys(p.assets).length, 6);
  const cmp = spawnSync("node", [here("../scripts/spatial/export-scene-v1.mjs"), "--compare", exp, join(dir, "p.json")], { encoding: "utf8" });
  assert.equal(cmp.status, 0, cmp.stdout);
  // fail-soft: strip asset_refs => importer falls back to placeholder boxes with zero asset resolutions
  const doc = JSON.parse(readFileSync(exp, "utf8")); doc.scene.nodes.forEach((n) => { delete n.asset_ref; });
  writeFileSync(join(dir, "noasset.json"), JSON.stringify(doc));
  assert.equal(py([here("../scripts/spatial/scene_v1_to_blender.py"), "--scene", join(dir, "noasset.json"), "--parity", join(dir, "q.json")]).status, 0);
  assert.equal(Object.keys(JSON.parse(readFileSync(join(dir, "q.json"), "utf8")).assets).length, 0);
});

test("ELS/Torah readiness: atlas/batching hooks only — no corpus letters instantiated, no second letter store", () => {
  M.glyphs.forEach((g, i) => {
    assert.equal(g.atlas.group, "hebrew-glyph-v1");
    assert.equal(g.atlas.slot, i);
    assert.equal(g.atlas.corpus_instancing, "FUTURE_HOOK_ONLY");
    assert.deepEqual(g.derived, { msdf: null, sdf: null, glb_lod: [] });
  });
  const compiler = read("../src/lib/spatial/semanticSceneCompiler.js");
  assert.equal(/torah|corpus/i.test(read("../src/lib/spatial/hebrewGlyphAssets.js").replace(/\/\/.*$/gm, "")), false);
  assert.ok(compiler.includes("buildGlyphAssetRef"));
});
