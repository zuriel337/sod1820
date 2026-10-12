#!/usr/bin/env node
// scene.v1 export CLI (M2). Compiles the Mistater scene.v1 from a canonical trace JSON via the existing compiler and
// writes the renderer-neutral export. No arithmetic here; `--compare` checks a Blender parity JSON vs the JS resolver.
//   node scripts/spatial/export-scene-v1.mjs --trace <trace.json> --expression <text> --out <export.json> [--camera]
//   node scripts/spatial/export-scene-v1.mjs --compare <export.json> <blender-parity.json>
import { readFileSync, writeFileSync } from "node:fs";
import { compileMistaterSceneV1, computeSceneProjectionSignatureV1 } from "../../src/lib/spatial/semanticSceneCompiler.js";
import { exportSceneV1, compareBlenderParity } from "../../src/lib/spatial/sceneExport.js";

// Optional projection-only camera: frames the scene extent, identity rotation (looks down -Z).
export const DEFAULT_CAMERA = { lens_mm: 35, transform: { position: { x: -310, y: 40, z: 900 } } };

const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };

if (argv.includes("--compare")) {
  const i = argv.indexOf("--compare");
  const exp = JSON.parse(readFileSync(argv[i + 1], "utf8"));
  const act = JSON.parse(readFileSync(argv[i + 2], "utf8"));
  const res = compareBlenderParity(exp.parity_reference, act);
  console.log(JSON.stringify({ pass: res.pass, checks: res.checks, maxError: res.maxError, failures: res.failures }, null, 2));
  process.exit(res.pass ? 0 : 1);
}

const tracePath = arg("--trace");
if (!tracePath) { console.error("usage: --trace <trace.json> [--expression <text>] [--out <file>] [--camera]"); process.exit(2); }
const trace = JSON.parse(readFileSync(tracePath, "utf8"));
const scene = compileMistaterSceneV1({ expression: arg("--expression") || trace.input, methodTrace: trace });
// --stress-transform: non-trivial parent/child TRS (same shape as the M1 resolver test) to exercise the convention.
if (argv.includes("--stress-transform")) {
  const word = scene.nodes.find((n) => n.kind === "word_group");
  word.transform = { position: { x: 30, y: -12, z: 7 }, rotation: { x: 0.3, y: -0.7, z: 1.1 }, scale: { x: 1.5, y: 0.8, z: 2 } };
  scene.nodes.filter((n) => n.kind === "letter_anchor").forEach((n, i) => {
    n.transform = { ...n.transform, rotation: { x: 0.1 * i, y: 0.2, z: -0.15 * i }, scale: { x: 1, y: 1.2, z: 0.9 } };
  });
  scene.projection_signature = computeSceneProjectionSignatureV1(scene);
}
const doc = exportSceneV1({ scene, camera: argv.includes("--camera") ? DEFAULT_CAMERA : null });
const text = `${JSON.stringify(doc, null, 2)}\n`;
const out = arg("--out");
if (out) writeFileSync(out, text); else process.stdout.write(text);
