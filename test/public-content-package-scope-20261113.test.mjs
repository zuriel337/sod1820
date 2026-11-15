// Pins the documented scope of the "public content" package (docs/reviews/public-content-20261113/): the file list in scope.json is what
// the README and the extraction map say and what is in the tree; the two database files are the reviewed bytes; the view name v2 is read
// by exactly the documented code; the contract carries section 8.3. Repository files only: no git history, no network, no database.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dir = "docs/reviews/public-content-20261113";
const read = (path) => readFileSync(join(root, path), "utf8");
const scope = JSON.parse(read(`${dir}/scope.json`));

test("every file of the package exists and is named in the README and in the extraction map", () => {
  const readme = read(`${dir}/README.md`);
  const map = read(`${dir}/extraction-map.md`);
  assert.ok(scope.files.length > 30);
  for (const file of [...scope.files, ...scope.docs]) {
    assert.ok(existsSync(join(root, file)), `${file} exists`);
  }
  for (const file of scope.files) {
    assert.ok(readme.includes(file), `README names ${file}`);
    assert.ok(map.includes(file), `extraction map names ${file}`);
  }
  for (const file of Object.keys(scope.notTakenOnPurpose).filter((f) => !f.startsWith(".github"))) {
    assert.ok(readme.includes(file), `README explains why ${file} is not taken`);
    assert.ok(map.includes(file), `extraction map explains why ${file} is not taken`);
  }
});

test("the database step and its rollback are the reviewed bytes", () => {
  for (const [file, sha] of Object.entries(scope.pinnedSha256)) {
    assert.equal(createHash("sha256").update(readFileSync(join(root, file))).digest("hex"), sha, file);
  }
  const sql = read("supabase/proposed/20261112134000_m0d_world_contributor_research_candidates.sql");
  assert.equal((sql.match(/create view /gi) || []).length, 1, "one create view");
  assert.match(sql, /create view public\.world_contributor_research_v2 /);
  assert.doesNotMatch(sql, /(create or replace|alter|drop)\s+view\s+(if exists\s+)?public\.world_contributor_research_v1\b/i);
});

function sources(dirPath, out = []) {
  for (const name of readdirSync(join(root, dirPath))) {
    const rel = `${dirPath}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) sources(rel, out);
    else if (/\.(js|jsx|mjs)$/.test(name) && !/\.test\.(js|mjs)$/.test(name) && !/\.browser\./.test(name)) out.push(rel);
  }
  return out;
}

test("the v2 view is named by exactly one module and read through its helper by exactly the documented readers", () => {
  const code = [...sources("src"), ...sources("api")];
  const named = code.filter((file) => /world_contributor_research_v2/.test(read(file))).sort();
  assert.deepEqual(named, [...scope.v2ViewNameInCode].sort());
  const users = code.filter((file) => /contributorResearchView\.js/.test(read(file)) && !scope.v2ViewNameInCode.includes(file)).sort();
  assert.deepEqual(users, [...scope.v2ReaderUsers].sort());
});

test("Design Contract V2 carries section 8.3 and its Human Gate line", () => {
  const contract = read("SOD1820_DESIGN_CONTRACT_V2.md");
  assert.match(contract, /### 8\.3 תוכן גלוי לפני כניסה · Human Gate ZURIEL · 12\.11\.2026/);
  assert.match(contract, /content visible before entry and public research findings labelled «טרם אומת» approved 12\.11\.2026/);
  assert.match(contract, /scripts\/test-content-visible-before-entry-e2e\.mjs/);
});
