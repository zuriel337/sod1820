// Runs the series-consumer tests on three exported trees: origin/main, branch HEAD and the clean merge of the two
// (what a pull_request run checks out). Local only. Usage: node run_tree_tests.mjs <out.json> <file...>
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, existsSync, symlinkSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// REPO: the checkout to test (default: this repository, five levels up); OUT: where the three trees are exported (default: a temp folder).
const REPO = process.env.REPO || new URL("../../../../../", import.meta.url).pathname;
const OUT = process.env.OUT || join(tmpdir(), "sod1820-three-trees") + "/";
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();
const [outFile, ...files] = process.argv.slice(2);
const trees = {
  main: git("rev-parse", "origin/main^{tree}"),
  head: git("rev-parse", "HEAD^{tree}"),
  merge: git("merge-tree", "--write-tree", "HEAD", "origin/main").split("\n")[0],
};
const result = { trees, commits: { main: git("rev-parse", "origin/main"), head: git("rev-parse", "HEAD") }, runs: {} };
for (const [name, tree] of Object.entries(trees)) {
  const dir = join(OUT, name);
  if (!existsSync(join(dir, ".tree-" + tree))) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    execFileSync("bash", ["-c", `git -C ${REPO} archive ${tree} | tar -x -C ${dir}`]);
    symlinkSync(join(REPO, "node_modules"), join(dir, "node_modules"));
    writeFileSync(join(dir, ".tree-" + tree), "");
  }
  result.runs[name] = {};
  for (const f of files) {
    if (!existsSync(join(dir, f))) { result.runs[name][f] = { missing: true }; continue; }
    const r = spawnSync(process.execPath, ["--test", f], { cwd: dir, encoding: "utf8", timeout: 180000,
      env: { ...process.env, GIT_DIR: process.env.G1_GIT_DIR || join(REPO, ".git") } });
    const out = (r.stdout || "") + (r.stderr || "");
    const num = (k) => { const m = out.match(new RegExp("^ℹ " + k + " (\\d+)", "m")); return m ? Number(m[1]) : null; };
    const firstFail = (out.match(/^not ok \d+ - (.*)$/m) || [])[1] || (out.match(/Error[^\n]*/) || [])[0] || "";
    result.runs[name][f] = { code: r.status, tests: num("tests"), pass: num("pass"), fail: num("fail"), firstFail: r.status ? firstFail.slice(0, 160) : "" };
  }
}
writeFileSync(outFile, JSON.stringify(result, null, 2) + "\n");
const rows = files.map((f) => [f, ...["main", "head", "merge"].map((t) => {
  const x = result.runs[t][f]; if (x.missing) return "missing"; return `${x.code === 0 ? "ok" : "FAIL"} ${x.pass}/${x.tests}`;
})]);
for (const r of rows) console.log(r.map((c, i) => (i ? c.padEnd(12) : c.padEnd(56))).join(" "));
