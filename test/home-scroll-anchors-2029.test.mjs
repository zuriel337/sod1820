// Which blocks remember the reading place (data-scroll-anchor): only Home's own blocks, with unique ids, attribute only (no visual effect).
// Every other 2029 route marks nothing, so the restorer treats it exactly as before (test/scroll-return-2029.test.mjs checks that in a browser).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ANCHOR_ATTR } from "../src/lib/scrollRestore2029.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the attribute name is the one the restorer reads", () => {
  assert.equal(ANCHOR_ATTR, "data-scroll-anchor");
});

test("only the Home composition, its gateways and its signup block mark anchors; no other source file does", () => {
  const users = [];
  const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.(jsx?|mjs|css)$/.test(name) && /data-scroll-anchor/.test(readFileSync(path, "utf8"))) users.push(path.split("/src/")[1]); } };
  walk(new URL("../src", import.meta.url).pathname);
  assert.deepEqual(users.sort(), ["components/experience2029/DiscoveryGateways2029.jsx", "components/experience2029/HomeBuildSignup2029.jsx", "components/experience2029/HomeComposition2029.jsx", "lib/scrollRestore2029.js"]);
});

test("Home marks its hero slot, notices, every Section, every Reveal, each gateway, the dimension strip and the signup block", () => {
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  assert.match(home, /data-h29-hold=\{heroBox\.hold\} data-scroll-anchor="home:hero"/);
  assert.match(home, /data-home-launch-notice="gradual-opening" data-scroll-anchor="home:launch-notice"/);
  assert.match(home, /aria-label="דופק ומצב בנייה" data-scroll-anchor="home:pulse"/);
  assert.match(home, /data-scroll-anchor=\{`home:\$\{label \|\| title\}`\}/, "Section: the label or the title");
  assert.match(home, /data-scroll-anchor=\{`home:reveal:\$\{id\}`\}/, "Reveal: its id");
  assert.match(read("src/components/experience2029/DiscoveryGateways2029.jsx"), /className="dg29-gateway" data-scroll-anchor=\{`dg:\$\{title\}`\}/);
  assert.match(read("src/components/experience2029/DiscoveryGateways2029.jsx"), /data-scroll-anchor="dg:dimension-five"/);
  assert.match(read("src/components/experience2029/HomeBuildSignup2029.jsx"), /data-scroll-anchor="home:build-signup"/);
});

test("the ids that Home renders are unique (a repeated id would make the restorer pick the first block)", () => {
  const home = read("src/components/experience2029/HomeComposition2029.jsx");
  const sections = [...home.matchAll(/<Section (?:title|label)="([^"]+)"/g)].map((m) => `home:${m[1]}`);
  const reveals = [...home.matchAll(/<Reveal id="([^"]+)"/g)].map((m) => `home:reveal:${m[1]}`);
  const gateways = [...read("src/components/experience2029/DiscoveryGateways2029.jsx").matchAll(/<Gateway title="([^"]+)"/g)].map((m) => `dg:${m[1]}`);
  const ids = [...sections, ...reveals, ...gateways, "home:hero", "home:launch-notice", "home:pulse", "dg:dimension-five", "home:build-signup"];
  assert.ok(sections.length >= 4 && reveals.length === 2 && gateways.length === 3, `found ${sections.length} sections, ${reveals.length} reveals, ${gateways.length} gateways`);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids in ${ids.join(", ")}`);
});
