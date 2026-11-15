// The two real-browser proofs of the public content package (test/m0d-contributor-stale-client.browser.mjs and
// test/m0d-world-candidate-visible.browser.mjs) compare the site as it was BEFORE the change (OLD_DIST) with the tested site (NEW_DIST).
//
// Locally they SKIP when a prerequisite is missing, so a developer without a browser or a second build is not blocked.
// In CI the workflow sets PUBLIC_CONTENT_PROOF_REQUIRED=1: then a missing prerequisite is a FAILURE that names what is missing
// (a skip would let a broken wiring look green). The same gate refuses a comparison that cannot prove anything (both sides the
// same directory).
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

export const PROOF_REQUIRED = process.env.PUBLIC_CONTENT_PROOF_REQUIRED === "1";

// Every missing prerequisite, one message each; an empty list means the proof can run.
export function proofMissing({ pw, OLD_DIST, NEW_DIST, executablePath }) {
  const missing = [];
  if (!pw) missing.push("Playwright is not installed");
  if (!executablePath || !existsSync(executablePath)) missing.push(`no Chromium executable (${executablePath || "none found"})`);
  if (!OLD_DIST) missing.push("OLD_DIST is not set (the historical site build)");
  else if (!existsSync(join(OLD_DIST, "2029.html"))) missing.push(`OLD_DIST has no 2029.html (${OLD_DIST})`);
  if (!NEW_DIST || !existsSync(join(NEW_DIST, "2029.html"))) missing.push(`NEW_DIST has no 2029.html (${NEW_DIST})`);
  if (OLD_DIST && NEW_DIST && resolve(OLD_DIST) === resolve(NEW_DIST)) missing.push("OLD_DIST and NEW_DIST are the same directory: the comparison would prove nothing");
  return missing;
}

// The value for node:test's `skip` option: a reason when the proof may be skipped (not required and something is missing), else false.
export const proofSkip = (missing, reason) => (!PROOF_REQUIRED && missing.length ? `${reason}: ${missing.join("; ")}` : false);

// Called first thing in each proof: when the proof is required and cannot run, fail with what is missing.
export function assertProofCanRun(missing) {
  if (PROOF_REQUIRED && missing.length) throw new Error(`PUBLIC_CONTENT_PROOF_REQUIRED=1 and the proof cannot run: ${missing.join("; ")}`);
}
