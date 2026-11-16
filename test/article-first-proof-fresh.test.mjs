// The proof of the first-document article is valid only for the pipeline code and the server DOM it was made with (Codex review 16.11.2026).
// This fails when the committed proof (public-reading-deploy/article-first-proven.json) is older than the pipeline: rebuild it with
// `node scripts/build-article-first-proofs.mjs` (public read + the pinned Chromium) and commit it. The production build already serves no
// article with a stale proof (the template is left out); this makes the staleness visible in the pull request instead of silent in production.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { articleFirstFingerprint } from "../scripts/lib/article-first-fingerprint.mjs";

const proof = JSON.parse(readFileSync(new URL("../public-reading-deploy/article-first-proven.json", import.meta.url), "utf8"));

test("the committed proof was made for this article pipeline and this server DOM", async () => {
  const identity = await articleFirstFingerprint();
  assert.equal(proof.jsdom, identity.jsdom, "the proof was made with another server DOM version");
  assert.deepEqual(proof.pipeline, identity.inputs, "the pipeline's files changed");
  assert.equal(proof.fingerprint, identity.fingerprint, "the pipeline's code changed since the proof: run node scripts/build-article-first-proofs.mjs");
});

test("the proof accounts for every candidate and keys each proven Post by source and voice", () => {
  assert.equal(proof.counts.proven + proof.counts.differ, proof.counts.candidates);
  assert.equal(Object.keys(proof.posts).length, proof.counts.proven);
  for (const [id, key] of Object.entries(proof.posts)) assert.match(key, /^[0-9a-f]{8}:\d+:[a-z-]+$/, `post ${id}`);
  for (const entry of proof.differ) assert.ok(entry.id && entry.kind, "every excluded Post says why");
});
