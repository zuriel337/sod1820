// DEF-007 / CLN-05 regression: a workflow step must never pass a test/script path that does not exist in the repository.
// 623b8d38a ("Remove the Legacy runtime") deleted scripts/test-beit-midrash-methods-registry.mjs while
// live-contracts-2029.yml still handed it to `node --test`, which would have failed the gate on its next run.
//
// Why the first version of this guard was not enough: `node --test existing.mjs missing.mjs` exits 0 (Node 22 and 24), so a
// workflow step that names a deleted file is silently skipped instead of failing. The guard only recognised the
// scripts/ test/ tests/ prefixes, so a step naming a deleted src/**/*.test.js, supabase/, api/, tools/ path or a root
// *.test.js (middleware.test.js) would have passed unnoticed. It now checks two things, both glob-aware (a glob must match
// at least one file):
//   1. every repository path written anywhere in a workflow (SCRIPT_ROOTS below, comments included for the original
//      scripts/ test/ tests/ prefixes);
//   2. every file or glob handed to `node` itself (`node --test a b c` -> a, b, c; `node script.mjs args` -> script.mjs),
//      whatever its location, so root-level files and unknown directories cannot slip past the prefix list.
// The self-test at the bottom feeds synthetic workflows that name a missing path in every prefix, so the guard cannot rot into
// a vacuous pass.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dir = path.join(root, ".github/workflows");

// Original prefixes: also checked inside comments and after a `cd`, exactly as the first version of this guard did.
const ORIGINAL_ROOTS = ["scripts", "test", "tests"];
// Added by CLN-05. Not checked inside comments (comments legitimately record removed files, e.g. "src/App.jsx was retired")
// and not checked once the step has `cd`-ed away from the checkout (the path then names a generated directory).
// public/ and dist/ are deliberately absent: workflows generate files there.
const EXTENDED_ROOTS = ["src", "supabase", "api", "tools", "server", "public-reading-deploy", "preview-deploy", "docs", ".github"];
const FILE_EXT = "mjs|cjs|jsx|js|mts|cts|ts|tsx|css|sh|py|sql|json|toml|ya?ml|md|html";
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATH_RE = new RegExp(
  `(?<![\\w./-])((?:${[...ORIGINAL_ROOTS, ...EXTENDED_ROOTS].map(escapeRe).join("|")})/[\\w./@*?-]+?\\.(?:${FILE_EXT}))(?![\\w])`,
  "g",
);

// ---- glob support ---------------------------------------------------------------------------------------------------
const SKIP_DIRS = new Set(["node_modules", ".git"]);
const listDir = (d) => { try { return fs.readdirSync(d, { withFileTypes: true }); } catch { return []; } };
const segmentRe = (seg) => new RegExp(`^${[...seg].map((c) => (c === "*" ? "[^/]*" : c === "?" ? "[^/]" : escapeRe(c))).join("")}$`);
function globMatches(pattern) {
  const parts = pattern.split("/").filter((p) => p && p !== ".");
  const walk = (base, i) => {
    if (i === parts.length) return true;
    const part = parts[i];
    if (part === "**") {
      if (walk(base, i + 1)) return true;
      return listDir(base).some((e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && walk(path.join(base, e.name), i));
    }
    if (!/[*?]/.test(part)) {
      const next = path.join(base, part);
      return fs.existsSync(next) && walk(next, i + 1);
    }
    const re = segmentRe(part);
    return listDir(base).some((e) => !SKIP_DIRS.has(e.name) && re.test(e.name) && (i === parts.length - 1 || (e.isDirectory() && walk(path.join(base, e.name), i + 1))));
  };
  return walk(root, 0);
}
const refExists = (ref) => (/[*?]/.test(ref) ? globMatches(ref) : fs.existsSync(path.join(root, ref)));

// ---- reading a workflow ---------------------------------------------------------------------------------------------
const ANCHOR = "\u0001"; // marks a path written as $GITHUB_WORKSPACE/... (always relative to the checkout)
const WORKSPACE_PREFIX = /\$\{GITHUB_WORKSPACE\}\/|\$GITHUB_WORKSPACE\/|\$\{\{\s*github\.workspace\s*\}\}\//g;
const isWorkspaceTarget = (t) => /^(?:\.|\.\/|\$GITHUB_WORKSPACE|\$\{GITHUB_WORKSPACE\}|\$\{\{\s*github\.workspace\s*\}\})\/?$/.test(t);
const YAML_KEY_LINE = /^\s*(?:-\s+)?(?:name|if|env|with|uses):/;

// Per physical line: is it a comment, is it a heredoc body, and has the step left the checkout directory (cd / working-directory)?
function annotate(lines) {
  const stepStart = /^\s*-\s+[A-Za-z_-]+:(?:\s|$)/;
  const blockHeader = /^ {0,4}[A-Za-z_-]+:\s*$/;
  const stepOf = [];
  let step = 0;
  lines.forEach((l, i) => { if (stepStart.test(l) || blockHeader.test(l)) step += 1; stepOf[i] = step; });
  const wdSteps = new Set();
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(?:-\s+)?working-directory:\s*["']?([^"'\s#]+)/);
    if (m && !isWorkspaceTarget(m[1])) wdSteps.add(stepOf[i]);
  });
  const info = [];
  let heredoc = null;
  let cwdChanged = false;
  let lastStep = -1;
  lines.forEach((line, i) => {
    if (stepOf[i] !== lastStep) { lastStep = stepOf[i]; cwdChanged = wdSteps.has(lastStep); heredoc = null; }
    const entry = { comment: /^\s*#/.test(line), heredocBody: heredoc !== null, cwdChanged };
    info.push(entry);
    if (heredoc !== null) { if (line.trim() === heredoc) heredoc = null; return; }
    if (entry.comment || YAML_KEY_LINE.test(line)) return;
    for (const m of line.matchAll(/(?:^|[\s;&|(])cd\s+("[^"]*"|'[^']*'|[^\s;&|)]+)/g)) cwdChanged = !isWorkspaceTarget(m[1].replace(/^["']|["']$/g, ""));
    const h = line.match(/(?<!<)<<-?\s*(['"]?)([A-Za-z_]\w*)\1/);
    if (h) heredoc = h[2];
  });
  return info;
}

// Minimal POSIX-ish word splitter: quotes, backslash escapes, command separators (&& || ; | & ( ) `), comments and redirections.
function commandsOf(line) {
  const commands = [[]];
  let word = null;
  let discardNext = false;
  const flush = () => {
    if (word !== null) { if (discardNext) discardNext = false; else commands.at(-1).push(word); }
    word = null;
  };
  const endCommand = () => { flush(); if (commands.at(-1).length) commands.push([]); };
  for (let i = 0; i < line.length;) {
    const c = line[i];
    if (c === "'") { const j = line.indexOf("'", i + 1); const end = j < 0 ? line.length : j; word = (word ?? "") + line.slice(i + 1, end); i = end + 1; continue; }
    if (c === '"') {
      let j = i + 1; let buf = "";
      while (j < line.length && line[j] !== '"') { if (line[j] === "\\" && j + 1 < line.length) { buf += line[j + 1]; j += 2; } else { buf += line[j]; j += 1; } }
      word = (word ?? "") + buf; i = j + 1; continue;
    }
    if (c === "\\") { word = (word ?? "") + (line[i + 1] ?? ""); i += 2; continue; }
    if (/\s/.test(c)) { flush(); i += 1; continue; }
    if (c === "#" && word === null) break;
    if (c === ">" || c === "<" || (c === "&" && line[i + 1] === ">")) {
      if (word !== null && /^\d+$/.test(word)) word = null;
      flush();
      while (i < line.length && /[<>&-]/.test(line[i])) i += 1;
      discardNext = true;
      continue;
    }
    if ("&|;()`".includes(c)) { endCommand(); i += (c === "&" || c === "|") && line[i + 1] === c ? 2 : 1; continue; }
    word = (word ?? "") + c; i += 1;
  }
  endCommand();
  return commands.filter((c) => c.length);
}

const LEADING_KEYWORDS = new Set(["if", "then", "else", "elif", "do", "while", "until", "!", "{", "time", "exec", "sudo", "command"]);
const stripLeading = (words) => {
  let k = 0;
  while (k < words.length && (LEADING_KEYWORDS.has(words[k]) || /^[A-Za-z_]\w*=/.test(words[k]))) k += 1;
  return words.slice(k);
};

// Options that take their value as the next word (`--flag=value` needs no help).
const NODE_VALUE_FLAGS = new Set(["--import", "--require", "-r", "--loader", "--experimental-loader", "--env-file", "--conditions", "-C",
  "--input-type", "--test-name-pattern", "--test-skip-pattern", "--test-reporter", "--test-reporter-destination", "--test-concurrency",
  "--test-timeout", "--test-shard", "--watch-path"]);
// `node --test a b c` -> a, b, c (files, directories or globs). `node script.mjs args...` -> script.mjs only.
function nodeTargets(args) {
  let isTest = false;
  const targets = [];
  for (let k = 0; k < args.length; k += 1) {
    const a = args[k];
    if (["-e", "--eval", "-p", "--print", "-pe"].includes(a) || a === "-") break;
    if (a.startsWith("-")) {
      if (a === "--test") isTest = true;
      else if (NODE_VALUE_FLAGS.has(a)) k += 1;
      continue;
    }
    targets.push(a);
    if (!isTest) break;
  }
  return targets;
}

const DYNAMIC = /[$`~{}[\]]/; // shell variables, command substitution, brace/bracket expansion: not resolvable statically
// Produced by the workflow itself (build output, scratch directories) or outside the checkout: nothing to verify in the repository.
const GENERATED = /^(?:dist|build|out|coverage|\.tmp|\.release-gate)\/|^\/|^\.\.\//;

// Every checkable reference in one workflow (or shell snippet): { line, ref, source: "path" | "node", ... }.
function collectRefs(text) {
  const lines = text.split(/\r?\n/);
  const info = annotate(lines);
  const refs = [];
  lines.forEach((raw, i) => {
    const line = raw.replace(WORKSPACE_PREFIX, ANCHOR);
    for (const m of line.matchAll(PATH_RE)) {
      refs.push({ line: i + 1, ref: m[1], source: "path", anchored: line[m.index - 1] === ANCHOR, comment: info[i].comment, cwdChanged: info[i].cwdChanged });
    }
  });
  for (let i = 0; i < lines.length; i += 1) {
    if (info[i].heredocBody || info[i].comment) continue;
    const first = i;
    let logical = lines[i];
    // `run: >` (folded) and a plain multi-line `run: node --test a` are one command: every deeper-indented line is part of it.
    const runKey = logical.match(/^(\s*(?:-\s+)?)run:[ \t]*(.*)$/);
    if (runKey && !/^\|[+-]?\d*\s*$/.test(runKey[2])) {
      const keyIndent = runKey[1].length;
      const parts = [runKey[2].replace(/^>[+-]?\d*\s*$/, "")];
      while (i + 1 < lines.length && (!lines[i + 1].trim() || lines[i + 1].search(/\S/) > keyIndent)) {
        i += 1;
        if (!/^\s*#/.test(lines[i])) parts.push(lines[i].trim());
      }
      logical = parts.map((p) => p.replace(/\s*\\$/, "")).join(" ");
    } else {
      while (/\\\s*$/.test(logical) && i + 1 < lines.length) { i += 1; logical = `${logical.replace(/\\\s*$/, " ")} ${lines[i].trim()}`; }
    }
    const command = logical.replace(/^\s*(?:-\s+)?run:\s*(?:[|>][+-]?\s*)?/, "").replace(WORKSPACE_PREFIX, ANCHOR);
    let cwdChanged = info[first].cwdChanged;
    for (const raw of commandsOf(command)) {
      const words = stripLeading(raw);
      if (words[0] === "cd") { cwdChanged = !isWorkspaceTarget(words[1] ?? ""); continue; }
      if (words[0] !== "node") continue;
      for (const t of nodeTargets(words.slice(1))) {
        refs.push({ line: first + 1, ref: t.replace(ANCHOR, "").replace(/^\.\//, ""), source: "node", anchored: t.startsWith(ANCHOR), comment: false, cwdChanged });
      }
    }
  }
  return refs;
}

// A reference must resolve unless it cannot be judged: comments may record removed files (extended prefixes only), and after a
// `cd` out of the checkout a relative extended path names a generated directory. Original prefixes are always checked.
function mustResolve(r) {
  if (DYNAMIC.test(r.ref) || GENERATED.test(r.ref)) return false;
  const original = ORIGINAL_ROOTS.includes(r.ref.split("/")[0]);
  if (original) return true;
  if (r.comment) return false;
  if (r.cwdChanged && !r.anchored) return false;
  return true;
}

function findMissing(text, label, source) {
  const missing = collectRefs(text)
    .filter((r) => (source ? r.source === source : true) && mustResolve(r) && !refExists(r.ref))
    .map((r) => `${label}:${r.line}: ${r.ref}${r.source === "node" ? " (argument of node)" : ""}`);
  return [...new Set(missing)];
}

const workflowFiles = () => fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort();
const readWorkflow = (f) => fs.readFileSync(path.join(dir, f), "utf8");

test("every scripts/ test/ tests/ src/ supabase/ api/ tools/ server/ docs/ .github/ path named by a workflow exists (globs must match a file)", () => {
  const missing = workflowFiles().flatMap((f) => findMissing(readWorkflow(f), f, "path"));
  assert.deepEqual(missing, []);
});

test("every file or glob handed to node by a workflow resolves, wherever it lives (node --test silently skips a missing file)", () => {
  const missing = workflowFiles().flatMap((f) => findMissing(readWorkflow(f), f, "node"));
  assert.deepEqual(missing, []);
});

test("package.json scripts hand node only files that exist", () => {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts || {};
  const missing = Object.entries(scripts).flatMap(([name, cmd]) => findMissing(cmd, `package.json scripts.${name}`));
  assert.deepEqual(missing, []);
});

test("the reader sees the real invocations (a parser regression cannot turn the guards above into a vacuous pass)", () => {
  const nodeRefs = new Set();
  const pathRefs = new Set();
  for (const f of workflowFiles()) {
    for (const r of collectRefs(readWorkflow(f))) (r.source === "node" ? nodeRefs : pathRefs).add(r.ref);
  }
  // Stable anchors only; the syntactic forms (inline, backslash-continued, folded `run: >`, root file, glob) are pinned by the
  // synthetic mutants below, which do not depend on what the workflows happen to run today.
  for (const known of ["scripts/test-2029-isolation.mjs", "test/ci-workflow-references-exist.test.mjs"]) {
    assert.ok(nodeRefs.has(known), `${known} is handed to node by a workflow and must be seen as a node argument`);
  }
  assert.ok(nodeRefs.size >= 150, `expected >= 150 distinct node arguments across the workflows, saw ${nodeRefs.size}`);
  for (const known of [".github/workflows/g4-public-core-gate.yml", "tools/els/build.py"]) {
    assert.ok(pathRefs.has(known), `${known} is named by a workflow and must be seen as a path`);
  }
});

// ---- self-test: the guard must fail when a workflow names a missing path ------------------------------------------------
const MISSING = "zz-missing-mutant";
const wf = (...runLines) => ["jobs:", "  gate:", "    steps:", "      - name: step", "        run: |", ...runLines.map((l) => `          ${l}`)].join("\n");
const REAL_TEST = "test/ci-workflow-references-exist.test.mjs";

test("mutation proof: a missing path is reported in every guarded prefix and for node arguments of any shape", () => {
  const mutants = {
    "scripts/": wf(`node scripts/${MISSING}.mjs`),
    "test/ (node --test)": wf(`node --test test/${MISSING}.test.mjs`),
    "tests/ (bash)": wf(`bash tests/${MISSING}.sh`),
    "src/ test file": wf(`node --test src/lib/${MISSING}.test.js`),
    "src/ test file next to a real one": wf(`node --test src/lib/avatar.test.js src/lib/${MISSING}.test.js`),
    "src/ glob without a match": wf(`node --test src/**/${MISSING}*.test.js`),
    "src/ quoted glob without a match": wf(`node --test "src/lib/${MISSING}-*.test.js"`),
    "supabase/ migration": wf(`psql -f supabase/migrations/99990101000000_${MISSING}.sql`),
    "supabase/ function": wf(`deno check supabase/functions/${MISSING}/index.ts`),
    "api/": wf(`node api/${MISSING}.js`),
    "tools/": wf(`python3 tools/els/${MISSING}.py`),
    "server/": wf(`node server/${MISSING}.mjs`),
    "docs/ trigger path": ["on:", "  push:", "    paths:", `      - "docs/reviews/${MISSING}.md"`].join("\n"),
    ".github/ trigger path": ["on:", "  push:", "    paths:", `      - ".github/workflows/${MISSING}.yml"`].join("\n"),
    "root *.test.js": wf(`node --test ${MISSING}.test.js`),
    "root script": wf(`node ${MISSING}.mjs`),
    "./-prefixed missing file": wf(`node --test ./test/${MISSING}.test.mjs`),
    "unknown directory": wf(`node --test elsewhere/${MISSING}.test.mjs`),
    "multi-line node --test": wf("node --test \\", `  ${REAL_TEST} \\`, `  test/${MISSING}.test.mjs`),
    "folded run: >": ["jobs:", "  gate:", "    steps:", "      - name: folded", "        run: >", "          node --test", `          ${REAL_TEST}`, `          src/lib/${MISSING}.test.js`].join("\n"),
    "plain multi-line run": ["jobs:", "  gate:", "    steps:", "      - name: plain", `        run: node --test ${REAL_TEST}`, `          test/${MISSING}.test.mjs`, "        env:", "          A: b"].join("\n"),
    "one-line step": ["jobs:", "  gate:", "    steps:", `      - run: node --test test/${MISSING}.test.mjs`].join("\n"),
    "after && and an env prefix": wf(`CI=1 npm ci && NODE_ENV=test node --test ${REAL_TEST} test/${MISSING}.test.mjs`),
    "workspace-anchored": wf(`cp "$GITHUB_WORKSPACE/tests/${MISSING}.sql" /tmp/x.sql`),
    "original prefix after a cd": wf("cd .tmp/generated", `node scripts/${MISSING}.mjs`),
    "original prefix inside a comment": wf(`# scripts/${MISSING}.mjs`),
    "after cd back to the workspace": wf("cd .tmp/generated", 'cd "$GITHUB_WORKSPACE"', `node --test src/lib/${MISSING}.test.js`),
  };
  for (const [name, text] of Object.entries(mutants)) {
    const found = findMissing(text, "mutant.yml");
    assert.ok(found.length > 0, `mutant "${name}" must be reported, nothing was`);
    assert.ok(found.every((f) => f.includes(MISSING)), `mutant "${name}" reported the wrong thing: ${found.join(", ")}`);
  }
});

test("mutation proof, controls: real paths, matching globs, dynamic values, generated directories and removed-file comments stay quiet", () => {
  const controls = {
    "real test file": wf(`node --test ${REAL_TEST}`),
    "real file in a multi-line node --test": wf("node --test \\", `  ${REAL_TEST} \\`, "  middleware.test.js"),
    "real files in a folded run: >": ["jobs:", "  gate:", "    steps:", "      - name: folded", "        run: >", "          node --test", `          ${REAL_TEST}`, "          middleware.test.js", "      - name: next", "        run: echo node zz-not-a-command.mjs"].join("\n"),
    "matching ** glob": wf("node --test src/lib/**/*.test.js"),
    "matching quoted glob": wf('node --test "test/*.test.mjs"'),
    "node option values are not files": wf("node --test --test-concurrency=1 --test-reporter spec --import ./test/ci-workflow-references-exist.test.mjs scripts/test-legacy-retired.mjs"),
    "script arguments are not files": wf('node scripts/test-legacy-retired.mjs --receipt "$RUNNER_TEMP/x.json" --url https://example.test/zz-missing.mjs'),
    "shell variable and array": wf('node --test "${follow_tests[@]}" "$TEST_FILE"'),
    "stdin script and heredoc body": wf("node --input-type=module - <<'NODE'", `node ${MISSING}.mjs`, "NODE"),
    "eval": wf(`node -e "require('./${MISSING}')"`),
    "redirect target": wf(`node --test ${REAL_TEST} > ${MISSING}.log 2>&1`),
    "word node in a step title": ["jobs:", "  gate:", "    steps:", `      - name: node ${MISSING}.mjs is only a title`, "        run: echo ok"].join("\n"),
    "extended path inside a comment": wf(`# src/${MISSING}.jsx was removed`),
    "extended path in a generated directory after cd": wf("cd .tmp/generated", `cp supabase/migrations/${MISSING}.sql out.sql`, `node ${MISSING}.mjs`),
    "workspace-anchored real file": wf(`cp "$GITHUB_WORKSPACE/${REAL_TEST}" /tmp/x.mjs`),
    "build output and scratch files handed to node": wf(`node dist/${MISSING}.js .release-gate/${MISSING}.cjs /tmp/${MISSING}.mjs`),
    "./-prefixed real file": wf(`node --test ./${REAL_TEST}`),
  };
  for (const [name, text] of Object.entries(controls)) {
    assert.deepEqual(findMissing(text, "control.yml"), [], `control "${name}" must not be reported`);
  }
  // dist/ and public/ are generated by the workflows themselves, so naming them as a plain path is not a reference to check.
  assert.deepEqual(findMissing(wf(`cp dist/${MISSING}.js public/${MISSING}.xml /tmp/`), "control.yml", "path"), []);
});

test("the Beit Midrash step keeps its 2029 coverage after the dead path was removed", () => {
  const text = fs.readFileSync(path.join(dir, "live-contracts-2029.yml"), "utf8");
  for (const kept of ["test/beit-midrash-world-sections-2029.test.mjs", "test/beit-midrash-methods-study-2029.test.mjs",
    "test/beit-midrash-learning-projection-2029.test.mjs", "scripts/test-beit-midrash-all-method-definitions.mjs"]) {
    assert.ok(text.includes(kept), `${kept} must stay in the gate`);
  }
});

test("no scheduled workflow with write access regenerates a static sitemap that would shadow the dynamic one", () => {
  const text = fs.readFileSync(path.join(dir, "update-sitemap.yml"), "utf8");
  const triggers = text.split("jobs:")[0].replace(/^\s*#.*$/gm, "");
  assert.doesNotMatch(triggers, /schedule\s*:/, "update-sitemap.yml must not run on a schedule (DEF-019)");
  assert.match(triggers, /workflow_dispatch/);
});
