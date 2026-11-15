// Pins the documented scope of the measurement package (docs/reviews/measurement-20261113): the files the README names exist, the tests
// it names are exactly the measurement tests that exist and are all in the CI wiring note, the budgets and the settle delay it states are
// the ones in the code, and the bounded action family is used only by the files it is documented to be used by.
// A change to any of these has to change the documentation in the same commit. Repository files only: no network, no browser, no git.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(join(root, path), "utf8");
const readme = read("docs/reviews/measurement-20261113/README.md");
const block = /<!-- measurement-package-scope\n([\s\S]*?)\n-->/.exec(readme);
assert.ok(block, "the README carries the machine-readable scope block");
const scope = JSON.parse(block[1]);

test("every file the README names as part of the package exists, and the documentation set is complete", () => {
  assert.ok(scope.files.length >= 20);
  for (const file of scope.files) assert.ok(existsSync(join(root, file)), file);
  for (const doc of ["README.md", "extraction-map.md", "ci-wiring.md", "readers-and-comparability.md", "identity-gap.md", "transport-review.md"])
    assert.ok(scope.files.includes("docs/reviews/measurement-20261113/" + doc), doc);
  // The package changes no workflow and no database object.
  for (const file of scope.files) assert.ok(!/^\.github\//.test(file) && !/^supabase\//.test(file) && !/^tests\/sql\//.test(file), file);
});

test("the tests the README names are exactly the measurement tests that exist, and the CI wiring note names every one of them", () => {
  const present = readdirSync(join(root, "test")).filter(name =>
    /^measurement-.*\.(test|browser)\.mjs$/.test(name) || /^public-reading-(action-measurement|analytics-worker|observability)\.test\.mjs$/.test(name)).map(name => "test/" + name).sort();
  assert.deepEqual([...scope.tests].sort(), present, "a measurement test was added or removed without updating the README");
  const wiring = read("docs/reviews/measurement-20261113/ci-wiring.md");
  for (const file of scope.tests) assert.ok(wiring.includes(file), `${file} is in ci-wiring.md`);
});

test("the budgets and the settle delay the README states are the ones in the code", () => {
  const worker = read("public-reading-deploy/transport.js");
  const budget = name => Number(new RegExp(`withinWindowBudget\\(${name}, event\\.clientId, (\\d+)\\)`).exec(worker)?.[1]);
  assert.deepEqual({ visit: budget("visitWindows"), engagement: budget("engagementWindows"), action: budget("actionWindows") }, scope.budgetsPer10Minutes);
  assert.match(worker, new RegExp(`windows\\.size >= ${scope.liveWindowsPerFamily}\\)`));
  assert.match(worker, /now - value\.at > 600000\) windows\.delete/, "records age out after 10 minutes");
  assert.equal(Number(/const PAGE_VIEW_SETTLE_MS = (\d+);/.exec(read("src/App2029.jsx"))?.[1]), scope.settleMs);
  for (const [family, limit] of Object.entries(scope.budgetsPer10Minutes)) assert.ok(readme.includes(`${limit}`), `${family} ${limit} appears in the README text`);
});

test("the bounded action family is used only by the files the package documents", () => {
  const users = [];
  const walk = dir => { for (const name of readdirSync(join(root, dir))) {
    const path = join(dir, name);
    if (["node_modules", "dist", ".generated"].includes(name)) continue;
    if (statSync(join(root, path)).isDirectory()) walk(path);
    else if (/\.(js|jsx|mjs)$/.test(name) && /import[^;]*readingAction(Body|Props|Spec)|export function readingAction(Body|Props|Spec)/.test(read(path))) users.push(path); } };
  walk("src"); walk("public-reading-deploy");
  assert.deepEqual(users.sort(), scope.actionFamilyUsers);
});
