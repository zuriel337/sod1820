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

test("every rollback source states its kind; exact sources carry the deployed hash of every file, including the shared materialGate copies", () => {
  const kinds = { exact_source: [], source_with_comment_redaction: [], behavioral_equivalent: [] };
  for (const [slug, fn] of Object.entries(manifest.functions)) {
    assert.ok(fn.rollback_kind in kinds, `${slug}: rollback_kind`);
    kinds[fn.rollback_kind].push(slug);
    for (const f of fn.files) {
      if (fn.rollback_kind === "exact_source") assert.equal(f.deployed_sha256, f.rollback_sha256, `${slug}/${f.deploy_path}: rollback == deployed bytes`);
      if (fn.rollback_kind === "source_with_comment_redaction") assert.notEqual(f.deployed_sha256, f.rollback_sha256, `${slug}: redacted copy differs from the deployed bytes`);
      if (fn.rollback_kind === "behavioral_equivalent") assert.equal(f.deployed_sha256 ?? null, null, `${slug}: no deployed hash is claimed`);
    }
  }
  assert.deepEqual(kinds.source_with_comment_redaction, ["ai-analyze"]);
  assert.deepEqual(kinds.behavioral_equivalent, ["contact-notify"]);
  assert.equal(kinds.exact_source.length, 7);
  for (const slug of ["lab-teacher", "journey-message", "field-router", "number-researcher"]) {
    const mg = manifest.functions[slug].files.find((f) => f.deploy_path.endsWith("materialGate.js"));
    assert.equal(mg.deployed_sha256, "1f60200076d3d653d4bf09dd1772de94b3c9bb2545949c0283cc7690ff2fa8fb", `${slug} materialGate`);
  }
});

test("the comment redaction in the ai-analyze rollback touches comment lines only", () => {
  const text = gunzipSync(readFileSync(new URL("ai-analyze.v91.index.ts.gz", DIR))).toString("utf8");
  const marked = text.split("\n").filter((l) => l.includes("<redacted personal address>"));
  assert.equal(marked.length, 2);
  for (const l of marked) assert.match(l.trim(), /^\/\/ <redacted personal address>$/);
});

// Behavioural check of the contact-notify rollback equivalent with dummy values only (no real recipient or key is used or stored).
async function runContactNotifyRollback(env) {
  const { stripTypeScriptTypes } = await import("node:module");
  const { runInNewContext } = await import("node:vm");
  const source = gunzipSync(readFileSync(new URL("contact-notify.v1-equivalent.index.ts.gz", DIR))).toString("utf8");
  const calls = [];
  let handler;
  const fetchStub = async (url, init) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return new Response(JSON.stringify({ id: "x" }), { status: 200 }); };
  runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm, "")), {
    Deno: { env: { get: (k) => env[k] }, serve: (fn) => { handler = fn; } }, fetch: fetchStub, Request, Response, JSON, String,
  });
  const post = () => handler(new Request("https://edge.invalid/contact-notify", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "t", email: "sender@example.org", subject: "s", message: "hello" }) }));
  return { res: await post(), calls };
}

test("contact-notify rollback depends on CONTACT_NOTIFY_TO: without it no e-mail is sent (503); with it, exactly one send to that recipient", async () => {
  const missing = await runContactNotifyRollback({ RESEND_API_KEY: "dummy-key" });
  assert.equal(missing.res.status, 503);
  assert.equal(missing.calls.length, 0, "no provider call without the recipient secret");
  const set = await runContactNotifyRollback({ RESEND_API_KEY: "dummy-key", CONTACT_NOTIFY_TO: "recipient@example.org" });
  assert.equal(set.res.status, 200);
  assert.equal(set.calls.length, 1);
  assert.match(set.calls[0].url, /^https:\/\/api\.resend\.com\/emails$/);
  assert.deepEqual([].concat(set.calls[0].body.to), ["recipient@example.org"]);
  const fn = manifest.functions["contact-notify"];
  assert.ok(fn.env_names_read.includes("CONTACT_NOTIFY_TO"), "the manifest names the dependency (name only)");
});
