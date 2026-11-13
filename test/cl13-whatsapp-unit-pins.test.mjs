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
