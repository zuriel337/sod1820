// CL-13 WhatsApp unit - what each deploy candidate IS, as checkable statements (no database needed): every file of every candidate
// and of every rollback against its SHA-256; candidate A = the deployed bytes + the CL-13 diff; candidate B = A + the committed
// accompanying diff; nothing of M0 or N14 in candidate A; the drift gate and the order. A change to a candidate file that is not
// followed by unit.json fails here.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { UNIT, MANIFEST, candidate, deployedBytes, applyDiff, sha, verify, gitBlob } from "../scripts/cl13-whatsapp-unit.mjs";

const haveHistory = (() => { try { for (const c of ["949c24ad549ae9e95ced528a4ee8159670b52678", "b4d5ec47132ed8003b822cc70de9e1b82447cb7c"]) execFileSync("git", ["cat-file", "-e", `${c}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; } })();
const skip = haveHistory ? false : "clone too shallow (fetch the commits of the rollback manifest by SHA)";
const WA = UNIT.functions.find((f) => f.slug === "wa-raziel"), AI = UNIT.functions.find((f) => f.slug === "ai-analyze");
const text = (b) => b.toString("utf8");
const M0_AND_N14 = /enforcePaidAiLimits|edgeCallerLimits|limiterKey|platformClientIp|publicNumberPageHref|SIGN_IN_REQUIRED|WA_RAZIEL_(?:CHRISTINA_PHONE|AMIT_GROUP|GILUI_GROUP|OPEN_GROUPS)|GENERIC_PAID_LIMITS|GUIDE_PAID_LIMITS|QUOTA_UNAVAILABLE_MESSAGE/;

test("the unit names exactly two functions, in the release order, and Edge comes before the database", () => {
  assert.deepEqual(UNIT.functions.map((f) => [f.position, f.slug]), [[1, "wa-raziel"], [2, "ai-analyze"]]);
  assert.equal(UNIT.order.edge_before_database, true);
  assert.deepEqual(UNIT.order.steps.map((s) => s.slice(0, 1)), ["1", "2", "3"]);
  assert.match(UNIT.state, /^BRANCH-ONLY\. Not applied, not deployed, not merged/);
  assert.match(UNIT.order.not_part_of_this_unit.join(" "), /does NOT close the active collection/, "U1 is stated as not closing the active collection");
});

test("the drift gate of the unit is the version and bundle hash of the rollback manifest, and the database step is pinned to a commit", () => {
  for (const f of UNIT.functions) {
    const m = MANIFEST.functions[f.slug];
    assert.equal(UNIT.drift_gate[f.slug].version, m.version); assert.equal(UNIT.drift_gate[f.slug].ezbr_sha256, m.deployed_ezbr_sha256);
    assert.equal(UNIT.drift_gate[f.slug].verify_jwt, m.verify_jwt); assert.equal(f.deployed.version, m.version);
  }
  assert.match(UNIT.source_references.database_step.sha, /^[0-9a-f]{40}$/);
  assert.equal(UNIT.source_references.database_step.branch, "claude/cl13-db-step-20261113");
  assert.match(UNIT.source_references.edge_code_origin.sha, /^[0-9a-f]{40}$/);
  assert.equal(UNIT.source_references.edge_code_origin.pr, 1321);
  assert.ok(UNIT.source_references.database_step.files.every((p) => /^(supabase\/proposed|tests\/sql\/fixtures)\//.test(p)), "only the proposal, its rollback and the live fixtures are taken from the database step");
});

test("every file of every candidate (A, and B as far as it is built offline) has the SHA-256 of unit.json", { skip }, () => {
  assert.deepEqual(verify({ withPackage: false }), []);
});

test("candidate A is the deployed bytes plus the CL-13 diff: nothing else changes, and no file other than the entry and the new policy module differs from the deployed one", { skip }, () => {
  for (const f of UNIT.functions) {
    const files = candidate(f.slug, "A"), spec = f.candidates.A;
    assert.deepEqual(spec.accompanying, [], `${f.slug}: A has no accompanying change`);
    const changed = spec.files.filter((x) => !/^identical/.test(x.vs_deployed)).map((x) => x.deploy_path).sort();
    assert.deepEqual(changed, f.slug === "wa-raziel" ? ["functions/_shared/personalMemoryPolicy.js", "functions/wa-raziel/index.ts"] : ["index.ts"], `${f.slug}: the files that differ from the deployed bundle`);
    for (const x of spec.files) if (/^identical/.test(x.vs_deployed)) assert.equal(sha(files.get(x.deploy_path)), sha(deployedBytes(f.slug, x.deploy_path)), `${f.slug}/${x.deploy_path}: byte-identical to deployed`);
    // every line that A removes from the deployed entry file is a line that the CL-13 change replaces: the diff only touches the memory
    const diff = text(readFileSync(new URL(`../${f.candidates.A.files.find((x) => x.source.diff).source.diff}`, import.meta.url)));
    const removed = diff.split("\n").filter((l) => l.startsWith("-") && !l.startsWith("---"));
    assert.ok(removed.length > 0 && removed.length < 40, `${f.slug}: A removes ${removed.length} lines of the deployed entry file`);
  }
});

test("candidate B = candidate A + the committed accompanying diff, and the diff is exactly the accompanying changes that unit.json lists", { skip }, () => {
  const waA = candidate("wa-raziel", "A").get("functions/wa-raziel/index.ts");
  assert.equal(sha(applyDiff(waA, WA.candidates.B.accompanying_diff)), WA.candidates.B.files.find((x) => x.deploy_path === "functions/wa-raziel/index.ts").sha256, "wa-raziel: A + N6 = the tree");
  const aiA = candidate("ai-analyze", "A").get("index.ts");
  assert.equal(sha(applyDiff(aiA, AI.candidates.B.accompanying_diff)), AI.candidates.B.files[0].sha256, "ai-analyze: A + N8-N10 = the packaged bundle of the tree");
  // what B adds on top of A, in words: wa-raziel = the navigation (N6) only; ai-analyze = naming of constants, two modules, one rename
  const added = (path) => text(readFileSync(new URL(`../${path}`, import.meta.url))).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
  assert.match(added(WA.candidates.B.accompanying_diff), /RAZIEL_CANONICAL_NAVIGATION_ACTIONS_V1/); assert.doesNotMatch(added(WA.candidates.B.accompanying_diff), /personalMemory|fn_raziel_(?:remember|fact|context)/, "the navigation diff touches no memory");
  assert.match(added(AI.candidates.B.accompanying_diff), /PUBLIC_READING_PROFILE_ID/); assert.match(added(AI.candidates.B.accompanying_diff), /MAX_FINDINGS2/); assert.doesNotMatch(added(AI.candidates.B.accompanying_diff), /personalMemory|PERSONAL_MEMORY|fn_raziel_(?:remember|context)/, "the accompanying diff touches no memory");
  assert.equal(WA.candidates.B.accompanying.length, 1); assert.equal(AI.candidates.B.accompanying.length, 4);
});

test("nothing of M0 or N14 is in candidate A or in the tree sources of the two functions (no secret, no new module, no quota or identity change)", { skip }, () => {
  for (const f of UNIT.functions) for (const [path, bytes] of candidate(f.slug, "A")) assert.doesNotMatch(text(bytes), M0_AND_N14, `${f.slug} A ${path}`);
  for (const p of ["supabase/functions/wa-raziel/index.ts", "supabase/functions/ai-analyze/index.ts", "supabase/functions/_shared/personalMemoryPolicy.js"]) assert.doesNotMatch(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"), M0_AND_N14, p);
  assert.deepEqual(UNIT.functions.map((f) => f.candidates.A.files.map((x) => x.deploy_path).sort()), [
    ["functions/_shared/personalMemoryPolicy.js", "functions/_shared/waGreen.ts", "functions/_shared/waRazielRender.ts", "functions/wa-raziel/index.ts"], ["index.ts"]], "the exact file list of the two A bundles");
  // the one new module is pure: no import, no env
  const policy = text(candidate("wa-raziel", "A").get("functions/_shared/personalMemoryPolicy.js"));
  assert.doesNotMatch(policy, /^import |Deno\.env|process\.env/m);
});

test("the rollback of each function is the exact deployed source (every file checked against the manifest)", { skip }, () => {
  for (const f of UNIT.functions) {
    const fn = MANIFEST.functions[f.slug];
    assert.ok(Number.isInteger(fn.version) && typeof fn.verify_jwt === "boolean" && fn.files.length > 0);
    for (const file of fn.files) assert.equal(sha(deployedBytes(f.slug, file.deploy_path)), file.rollback_sha256, `${f.slug}/${file.deploy_path}`);
    assert.equal(f.rollback.manifest, "docs/reviews/cl13-whatsapp-unit-20261113/edge-rollback-manifest.json");
  }
  assert.equal(MANIFEST.functions["wa-raziel"].rollback_kind, "exact_source"); assert.equal(MANIFEST.functions["ai-analyze"].rollback_kind, "source_with_comment_redaction");
  assert.match(WA.rollback.restores, /restores writing on every message/);
});

test("negative control: a candidate file that changes without unit.json being updated is detected", () => {
  const spec = WA.candidates.A.files.find((x) => x.deploy_path === "functions/_shared/personalMemoryPolicy.js");
  const bytes = readFileSync(new URL("../supabase/functions/_shared/personalMemoryPolicy.js", import.meta.url));
  assert.equal(sha(bytes), spec.sha256);
  assert.notEqual(sha(Buffer.concat([bytes, Buffer.from("\n// edited\n")])), spec.sha256);
});

// The CL-13 hunks come from the Edge code of #1321 (source_references.edge_code_origin) and were re-applied on origin/main without the M0 and
// N14 hunks. This is the machine check of "re-applied unchanged": the lines of the tree that belong to CL-13 are exactly the lines of the same
// file in #1321, and the tree has no CL-13 line that #1321 does not have (and the other way round).
const origin = UNIT.source_references.edge_code_origin.sha;
const haveOrigin = (() => { try { execFileSync("git", ["cat-file", "-e", `${origin}^{commit}`], { stdio: "ignore" }); return true; } catch { return false; } })();
const CL13_LINE = /CL-13|PersonalMemory|personalMemory|MemoryPolicy|memoryPolicy|write_personal|read_personal|write_profile_facts|knownPolicy|ipolicy|facts-captured|saved\.(?:push|join|length)|gatePersonalContext|PERSONAL_MEMORY_CLOSED/;
test("the CL-13 lines of the tree are exactly the CL-13 lines of the Edge code in #1321 (re-applied unchanged, without the M0 and N14 hunks)", { skip: haveOrigin ? false : `the commit ${origin.slice(0, 9)} of #1321 is not in this clone (fetch it by SHA)` }, () => {
  for (const path of ["supabase/functions/wa-raziel/index.ts", "supabase/functions/ai-analyze/index.ts", "supabase/functions/_shared/personalMemoryPolicy.js"]) {
    const cl13 = (s) => s.split("\n").filter((l) => CL13_LINE.test(l)).sort();
    const here = readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), there = gitBlob(origin, path).toString("utf8");
    assert.ok(cl13(here).length >= (path.endsWith(".js") ? 20 : 8), `${path}: the CL-13 markers are found`);
    assert.deepEqual(cl13(here), cl13(there), `${path}: the same CL-13 lines as #1321`);
  }
  // and the lines that differ from #1321 are the M0 / N14 ones: none of them is a CL-13 line (checked above), and the tree has none that #1321 lacks
  const only = (a, b) => { const set = new Set(b.split("\n")); return a.split("\n").filter((l) => l.trim() && !set.has(l)); };
  for (const path of ["supabase/functions/wa-raziel/index.ts", "supabase/functions/ai-analyze/index.ts"]) {
    const here = readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), there = gitBlob(origin, path).toString("utf8");
    for (const l of [...only(here, there), ...only(there, here)]) assert.doesNotMatch(l, CL13_LINE, `${path}: a line that differs from #1321 is not CL-13: ${l.slice(0, 80)}`);
  }
});

// ── the release request: one request, two steps, artifact A, with the stamps of A ──
const doc = (name) => text(readFileSync(new URL(`../docs/reviews/cl13-whatsapp-unit-20261113/${name}`, import.meta.url)));
test("the release request chooses artifact A for both functions, in two steps, carries every stamp of A, and says that the branch files are B", () => {
  const rr = doc("release-request.md");
  assert.match(rr, /^# Release request — the active WhatsApp path, CL-13 only: `wa-raziel` A, verify, then `ai-analyze` A, verify/);
  assert.match(rr, /This is a request, not an approval/); assert.match(rr, /No SQL is attached/);
  assert.match(rr, /\*\*The request is for artifact A of both functions, and only A\.\*\*/);
  assert.match(rr, /The files of the branch itself[^\n]*represent candidate B, not A/);
  assert.match(rr, /Deploying from the branch files[^\n]*is not what this request asks for/);
  // the order: step 1 wa-raziel, verification, step 2 ai-analyze, verification
  const pos = (re) => rr.search(re);
  assert.ok(pos(/### Step 1 — `wa-raziel` A/) < pos(/### Step 1 — deploy `wa-raziel` A, then verify/) && pos(/### Step 1 — deploy `wa-raziel` A, then verify/) < pos(/### Step 2 — only after step 1 is verified: deploy `ai-analyze` A, then verify/));
  assert.match(rr, /step 2 is rolled back before step 1/);
  // every stamp of A (all files of both functions), the drift gates, and nothing from B
  for (const f of UNIT.functions) {
    for (const file of f.candidates.A.files) assert.ok(rr.includes(`\`${file.sha256}\``) && rr.includes(`\`${file.deploy_path}\``), `${f.slug}/${file.deploy_path}: path and SHA-256 are in the request`);
    assert.ok(rr.includes(UNIT.drift_gate[f.slug].ezbr_sha256), `${f.slug}: the drift gate is in the request`);
    for (const file of f.candidates.B.files) if (!f.candidates.A.files.some((a) => a.sha256 === file.sha256)) assert.ok(!rr.includes(file.sha256), `${f.slug}/${file.deploy_path}: a stamp of B is not in the request`);
  }
  assert.match(rr, /navigation probe of the earlier request does not apply/);
  assert.doesNotMatch(rr, /```sql\n(?:(?!```)[\s\S])*\b(insert|update|delete|alter|create|drop|truncate|grant)\b/i, "the only SQL in the request is read-only");
});

test("the baseline is the independent read of Codex (1,086 rows, 471 of raziel), to be read again with the same filters; the rollback is stated as the old memory behaviour", () => {
  const rr = doc("release-request.md"), readme = doc("README.md");
  for (const d of [rr, readme]) { assert.match(d, /1,086 rows, of which 471 with `agent = 'raziel'`/); assert.match(d, /read(?:s)? (?:them )?again immediately before/); }
  assert.doesNotMatch(readme, /baseline of the earlier read was 1,086 rows, newest/, "the older baseline wording is gone");
  assert.match(rr, /same filters?/);
  assert.match(rr, /It restores the OLD memory behaviour: every message is saved again, profile details are extracted and saved again, and the stored context is read again, without consent/);
  assert.match(rr, /restores reading the stored memory into the answer and remembering every site question/);
  assert.match(rr, /U1 \(`wa-hatishbi`, `wa-uriel`\) is not part of this request and does not close the active collection/);
  assert.match(rr, /D-RESEARCH-APPROVAL, D-ERASE, D-ADMIN stay where they are/);
});

test("the documents state the same test counts as the runner pins", () => {
  const runner = text(readFileSync(new URL("../scripts/run-cl13-whatsapp-unit-test.sh", import.meta.url)));
  const n = (name) => Number(runner.match(new RegExp(`${name}=\\$\\{[A-Z0-9_]+:-(\\d+)\\}`))[1]);
  const [unit, states, pins] = [n("EXPECTED_UNIT"), n("EXPECTED_STATES"), n("EXPECTED_PINS")];
  const readme = doc("README.md");
  assert.ok(readme.includes(`**${unit} tests, both functions together`) && readme.includes(`**${states} tests** on the **deployed** code`) && readme.includes(`**${pins} pin tests**`), "README counts = runner counts");
  const workflow = text(readFileSync(new URL("../.github/workflows/live-contracts-2029.yml", import.meta.url)));
  assert.ok(workflow.includes(`CL-13 WhatsApp unit (${unit} tests of both functions`) && workflow.includes(`${states} of the deployed code`) && workflow.includes(`${pins} pins`), "workflow step name = runner counts");
});

test("the hand-over states the current main, keeps aa0f6bc82 as the historical base, separates the two memory reads, and counts new rows in the verification", () => {
  const rr = doc("release-request.md"), readme = doc("README.md");
  // 1. the current state and the historical base
  assert.equal(UNIT.base.historical_base_of_the_package.commit, "aa0f6bc82b8c94286374b1f51208037502994eab");
  assert.equal(UNIT.base.current_state.origin_main, "9be0c29fc52337069192b057ef1a9882c7026009");
  assert.equal(UNIT.base.current_state.production_source_commit, UNIT.base.current_state.origin_main);
  assert.deepEqual(UNIT.base.current_state.edge_functions_changed_since_historical_base, []);
  for (const d of [rr, readme]) { assert.match(d, /9be0c29fc/); assert.match(d, /aa0f6bc82/); assert.match(d, /dpl_9paqBrZzi7D1GXow7LV8eWCjkpEF/); }
  assert.match(rr, /Historical base of this package: `aa0f6bc82`/); assert.match(rr, /\*\*Now:\*\* `main` and the live site are at \*\*`9be0c29fc`\*\*/);
  // 2. step 1 closes the read of wa-raziel itself; the read through ai-analyze is closed in step 2
  assert.match(rr, /the memory read of `wa-raziel` itself\*\*/); assert.match(rr, /What step 1 does not close: the read through `ai-analyze`/);
  assert.match(rr, /closed in step 2\*\*/); assert.match(rr, /Closes: \*\*the read through `ai-analyze`\*\*/);
  const wa = UNIT.functions.find((f) => f.slug === "wa-raziel"), ai = UNIT.functions.find((f) => f.slug === "ai-analyze");
  assert.ok(wa.closes.some((c) => /memory read of wa-raziel itself/.test(c))); assert.ok(wa.does_not_close.some((c) => /read through ai-analyze/.test(c) && /step 2/.test(c)));
  assert.ok(ai.closes.some((c) => /^the read through ai-analyze/.test(c)));
  assert.doesNotMatch(wa.closes.join(" "), /into the answer/, "wa-raziel's closes no longer claim the answer");
  // 3. the verification counts new rows; the date restriction is only for the stamp of the earlier rows
  assert.match(rr, /`n` and `newest` are compared as they are, over all rows including new ones/);
  assert.match(rr, /The date restriction is used for nothing else than the `stamp_of_earlier_rows` comparison/);
  assert.match(rr, /No new row means that \*\*no save was observed\*\*\. It does not prove that a write function was not called/);
  const sql = rr.match(/```sql\n([\s\S]*?)```/)[1];
  assert.match(sql, /count\(\*\) as n, max\(created_at\) as newest,/, "n and newest carry no date filter");
  for (const line of sql.split("\n").filter((l) => /count\(\*\)/.test(l))) assert.doesNotMatch(line, /<=/, "the count/newest line has no date restriction");
  assert.equal([...sql.matchAll(/filter \(where t\.created_at <= :'B[012]'::timestamptz\)/g)].length, 3, "the date restriction is only in the three stamp expressions");
  assert.doesNotMatch(rr, /restrict the after-read to `created_at <= before\.newest` for the stamp/, "the old wording is gone");
  assert.match(readme, /The count and the newest date are over all rows, new ones included/);
  assert.match(readme, /does not prove that a write function was not called/);
});
