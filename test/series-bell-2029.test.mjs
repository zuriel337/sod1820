import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

// The small follow bell beside each Home series (ZURIEL 6.11.2026). Truthful states only: it never fakes a follow.
const bellSource = await readFile(new URL("../src/components/experience2029/SeriesBell2029.jsx", import.meta.url), "utf8");
const home = await readFile(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const watch = await readFile(new URL("../src/components/WatchButton.jsx", import.meta.url), "utf8");
const pure = bellSource.slice(bellSource.indexOf("export function seriesBellView"), bellSource.indexOf("export default function SeriesBell2029"));
const outfile = resolve(`.test-series-bell-${process.pid}.mjs`);
await build({ stdin: { contents: pure, loader: "js", resolveDir: process.cwd() }, bundle: true, platform: "node", format: "esm", outfile });
const { seriesBellView } = await import(pathToFileURL(outfile));
after(async () => { await rm(outfile, { force: true }); });

test("states: closed actions and unsupported/unavailable series are inert with the reason; only a resolved series is live", () => {
  assert.deepEqual(seriesBellView({ locked: true, state: "ready" }), { kind: "off", reason: "מעקב ייפתח בהמשך" }, "a closed capability wins over any server state");
  assert.equal(seriesBellView({ locked: false, state: "ready" }).kind, "live");
  assert.deepEqual(seriesBellView({ locked: false, state: "unsupported" }), { kind: "off", reason: "עדכוני הסדרה עדיין אינם פעילים" });
  assert.equal(seriesBellView({ locked: false, state: "unavailable" }).kind, "off");
  assert.equal(seriesBellView({ locked: false, state: null }).kind, "pending");
});

test("wiring: the bell uses the one canonical WatchButton and the existing series resolver; no series falls back to a category, author or post", () => {
  assert.match(bellSource, /<WatchButton variant="bell" topic=\{`series:\$\{seriesKey\}`\}/);
  assert.match(bellSource, /fetchPostFollowTargets2029\(\{ scope: \{ kind: "series", key: seriesKey \} \}\)/);
  assert.doesNotMatch(bellSource, /cat:|author:|post:/);
  assert.match(bellSource, /if \(locked\) return undefined;/, "no resolver call while actions are closed (public reading)");
  assert.match(watch, /if \(variant === "bell"\)/);
  assert.equal((watch.match(/variant === "bell"/g) || []).length, 1, "one bell face in the canonical button (re-pinned 8.11.2026)");
});

test("Home: one bell beside the flagship title and one beside every other series name", () => {
  assert.equal((home.match(/<SeriesBell2029 /g) || []).length, 2, "the primary card and the shared other-series card");
  assert.match(home, /<SeriesBell2029 seriesKey=\{spec\.key\} label=\{spec\.label\} \/>/);
  assert.match(home, /<SeriesBell2029 seriesKey=\{series\.key\} label=\{series\.label\} \/>/);
});
