#!/usr/bin/env node
// Hebrew glyph asset lineage validator (scene.v1 M3). Pure Node, no font/fontTools needed.
//   node scripts/spatial/validate-hebrew-glyph-assets.mjs [--dir src/lib/spatial/hebrewGlyph/v1]
// Checks: 27 unique identities, no duplicate codepoint, final->base linkage, path-only SVG (no text/font/script/image refs),
// sha256 content_hash match, manifest .json == .js, truth tier REPRESENTATION, no arithmetic/gematria fields.
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DIR = fileURLToPath(new URL("../../src/lib/spatial/hebrewGlyph/v1/", import.meta.url));
export const BASE_LETTERS = [..."אבגדהוזחטיכלמנסעפצקרשת"];
export const FINALS = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const ARITHMETIC_KEY = /gematria|value|sum|total|mispar|difference|result|score|rank|count/i;
const FORBIDDEN_SVG = /<\s*(text|tspan|font|font-face|style|script|image|use|foreignObject)\b|font-family|@font-face|xlink:href|base64/i;
const hex4 = (ch) => ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");

export function validateHebrewGlyphAssets(dir = DEFAULT_DIR) {
  const errors = [];
  const fail = (m) => errors.push(m);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.v1.json"), "utf8"));
  const g = manifest.glyphs;
  if (g.length !== 27) fail(`expected 27 glyphs, got ${g.length}`);
  if (new Set(g.map((x) => x.glyph_id)).size !== g.length) fail("duplicate glyph_id");
  if (new Set(g.map((x) => x.codepoint)).size !== g.length) fail("duplicate codepoint");
  const expected = new Set([...BASE_LETTERS, ...Object.keys(FINALS)]);
  g.forEach((x) => { if (!expected.has(x.codepoint)) fail(`unexpected codepoint ${x.codepoint}`); });
  const byCp = new Map(g.map((x) => [x.codepoint, x]));
  g.forEach((x) => {
    if (x.unicode !== `U+${hex4(x.codepoint)}`) fail(`${x.glyph_id}: unicode roundtrip`);
    if (x.glyph_id !== `heglyph:${hex4(x.codepoint)}`) fail(`${x.glyph_id}: glyph_id/codepoint roundtrip`);
    const base = FINALS[x.codepoint];
    if (Boolean(base) !== x.is_final) fail(`${x.glyph_id}: is_final`);
    if ((x.base_codepoint ?? null) !== (base ?? null)) fail(`${x.glyph_id}: base_codepoint`);
    if ((x.base_glyph_id ?? null) !== (base ? byCp.get(base)?.glyph_id : null)) fail(`${x.glyph_id}: base_glyph_id`);
    if (x.truth_tier !== "REPRESENTATION") fail(`${x.glyph_id}: truth_tier`);
    if (manifest.source_gate.status === "SOURCE_GAP" && x.visual_status !== "CANDIDATE_NOT_VISUAL_CANONICAL") fail(`${x.glyph_id}: SOURCE_GAP requires CANDIDATE_NOT_VISUAL_CANONICAL`);
    let svg;
    try { svg = readFileSync(join(dir, basename(x.vector_asset_ref))); } catch { fail(`${x.glyph_id}: missing asset`); return; }
    if (`sha256:${createHash("sha256").update(svg).digest("hex")}` !== x.content_hash) fail(`${x.glyph_id}: content_hash mismatch`);
    const text = svg.toString("utf8");
    if (FORBIDDEN_SVG.test(text)) fail(`${x.glyph_id}: svg not path-only`);
    if ((text.match(/<path\b/g) || []).length !== 1) fail(`${x.glyph_id}: expected exactly one <path>`);
    if (/[^\x00-\x7f]/.test(text)) fail(`${x.glyph_id}: svg contains non-ASCII (no embedded Hebrew text)`);
    if (!/^[MLQZ0-9. -]+$/.test(text.match(/ d="([^"]*)"/)?.[1] ?? "!")) fail(`${x.glyph_id}: path commands outside profile`);
  });
  const walk = (o, path = "") => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { if (ARITHMETIC_KEY.test(k)) fail(`arithmetic-like key ${path}${k}`); walk(v, `${path}${k}.`); } };
  walk(manifest);
  const js = readFileSync(join(dir, "manifest.v1.js"), "utf8");
  if (JSON.stringify(JSON.parse(js.slice(js.indexOf("export default ") + 15).replace(/;\s*$/, ""))) !== JSON.stringify(manifest)) fail("manifest.v1.js != manifest.v1.json");
  if (readdirSync(dir).some((f) => /\.(ttf|otf|woff2?)$/i.test(f))) fail("font file present in asset dir");
  return { ok: errors.length === 0, errors, glyphs: g.length, source_gate: manifest.source_gate.status };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const i = process.argv.indexOf("--dir");
  const res = validateHebrewGlyphAssets(i > 0 ? process.argv[i + 1] : DEFAULT_DIR);
  console.log(JSON.stringify(res, null, 2));
  process.exit(res.ok ? 0 : 1);
}
