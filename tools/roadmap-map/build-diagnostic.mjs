// Stage 2 — 2D Diagnostic Lens builder.
//
// Reads the canonical SOD1820_MASTER_ROADMAP.md, runs Stage 1's parseRoadmap()
// ONCE, and injects the resulting view model (as JSON, verbatim) into
// diagnostic.template.html to produce diagnostic.html. All rendering logic
// lives in the plain, standalone diagnostic-render.js — this script does
// nothing but parse + substitute one placeholder (same pattern as
// tools/els/build.py: template.html + build script, never edit the output
// directly).
//
// Usage: node tools/roadmap-map/build-diagnostic.mjs
// Output: tools/roadmap-map/diagnostic.html (open directly in a browser, or
// screenshot with the local `playwright screenshot` CLI — no server, no deploy).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseRoadmap, summarizeCoverage } from "../../src/lib/roadmapParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROADMAP_PATH = path.join(__dirname, "..", "..", "SOD1820_MASTER_ROADMAP.md");
const TEMPLATE_PATH = path.join(__dirname, "diagnostic.template.html");
const OUT_PATH = path.join(__dirname, "diagnostic.html");
const PLACEHOLDER = "<!--ROADMAP_DIAGNOSTIC_PAYLOAD-->";

const roadmapText = readFileSync(ROADMAP_PATH, "utf8");
const viewModel = parseRoadmap(roadmapText);
const coverage = summarizeCoverage(viewModel);

const template = readFileSync(TEMPLATE_PATH, "utf8");
if (!template.includes(PLACEHOLDER)) {
  throw new Error(`Template is missing the ${PLACEHOLDER} placeholder — refusing to write a broken output.`);
}

const payloadJson = JSON.stringify({ viewModel, coverage });
const html = template.replace(PLACEHOLDER, payloadJson);

writeFileSync(OUT_PATH, html, "utf8");
console.log("Wrote", OUT_PATH);
console.log("Coverage:", JSON.stringify(coverage));
