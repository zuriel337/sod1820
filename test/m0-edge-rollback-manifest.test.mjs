// M0 Edge rollback package: every one of the nine functions has an exact (or explicitly equivalent) rollback source, every file's
// SHA-256 is re-checked, and nothing secret or personal is stored. Git-sourced entries need history back to 20.9.2026; when the
// clone is too shallow those checks are SKIPPED (reported as skipped, never as passed).
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { assemble, manifest } from "../scripts/m0-edge-rollback-assemble.mjs";

const DIR = new URL("../docs/reviews/m0-security-stabilization-20261112/edge-rollback/", import.meta.url);
const NINE = ["ai-analyze", "number-researcher", "lab-teacher", "journey-message", "field-router", "wa-raziel", "els-search-bridge", "research-run", "contact-notify"];
const haveHistory = (() => { try { execFileSync("git", ["cat-file", "-e", "065aa022b9ecf1152c14aaf1be3460c7c8136e6c^{commit}"], { stdio: "ignore" }); return true; } catch { return false; } })();

test("the manifest covers exactly the nine M0 Edge deploys with version, verify_jwt, entrypoint and per-file SHA-256", () => {
  assert.deepEqual(Object.keys(manifest.functions).sort(), [...NINE].sort());
  for (const [slug, fn] of Object.entries(manifest.functions)) {
    assert.ok(Number.isInteger(fn.version) && typeof fn.verify_jwt === "boolean" && fn.entrypoint && fn.files.length > 0, slug);
    assert.match(String(fn.deployed_ezbr_sha256), /^[0-9a-f]{64}$/, `${slug}: deployed bundle hash recorded for the pre-deploy drift gate`);
    for (const f of fn.files) assert.match(f.rollback_sha256, /^[0-9a-f]{64}$/, `${slug}/${f.deploy_path}`);
  }
});

test("artifact-sourced rollbacks rebuild and match their SHA-256 (no git history needed)", () => {
  for (const slug of ["ai-analyze", "research-run", "contact-notify"]) assert.equal(assemble(slug).files.length, 1, slug);
  assert.equal(assemble("research-run").files[0].exact_deployed_bytes, true);
});

test("git-sourced rollbacks rebuild the exact deployed bytes", { skip: haveHistory ? false : "clone too shallow for 2026-09 history (run git fetch --shallow-since=2026-09-20 origin main)" }, () => {
  for (const slug of ["lab-teacher", "journey-message", "field-router", "number-researcher", "wa-raziel", "els-search-bridge"]) {
    const r = assemble(slug);
    for (const f of r.files) {
      const entry = manifest.functions[slug].files.find((x) => x.deploy_path === f.path);
      if (entry.deployed_sha256) assert.equal(f.exact_deployed_bytes, true, `${slug}/${f.path}`);
    }
  }
});

test("no secret and no personal data in the manifest or the artifacts", () => {
  const texts = [readFileSync(new URL("manifest.json", DIR), "utf8"),
    ...readdirSync(DIR).filter((n) => n.endsWith(".gz")).map((n) => gunzipSync(readFileSync(new URL(n, DIR))).toString("utf8"))];
  for (const t of texts) {
    assert.doesNotMatch(t, /[A-Za-z0-9._%+-]+@(gmail|walla|yahoo|hotmail|outlook|icloud)\.[a-z]+/i);
    assert.doesNotMatch(t, /sk-ant-[A-Za-z0-9_-]{10,}|eyJhbGciOi[A-Za-z0-9._-]{60,}/);
    assert.doesNotMatch(t, /\b9725\d{8}\b|\b05\d-?\d{7}\b/);
  }
});
