// post-knowledge-staging is a READ-ONLY composition of the existing Shared Expression Extraction + the canonical
// engine. These tests pin the three things that matter: it keeps only what the engine re-verifies, it never reports
// extraction noise as an author error, and it cannot write anything.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { postText, stagePosts, STAGING_VERSION } from "../scripts/post-knowledge-staging.mjs";
import { METHODS } from "../src/lib/gematria.js";

const ragil = METHODS.find((m) => m.key === "רגיל").fn;

const POSTS = [
  { wp_id: 1, date: "2026-07-01T00:00:00Z", title: "ראשון", content: "<p>משיח = 358</p><p>ביאת המשיח = 776</p><p>צירוף מקרים = 776</p>" },
  { wp_id: 2, date: "2026-07-02T00:00:00Z", title: "שני", content: "<p>נחש = 358</p><p>הרמז: שלום = 40 לפי אחד הכותבים</p>" },
  { wp_id: 3, date: "2026-07-03T00:00:00Z", title: "שלישי", content: "<p>אין כאן שום טענת ערך</p>" },
];

test("facts about the fixture itself come from the engine, not from memory", () => {
  assert.equal(ragil("משיח"), 358);
  assert.equal(ragil("נחש"), 358);
  assert.equal(ragil("ביאת המשיח"), 776);
  assert.equal(ragil("צירוף מקרים"), 776);
  assert.notEqual(ragil("שלום"), 40);
});

test("only engine-verified claims are attested; each keeps its posts as provenance; the stage stays Claim", () => {
  const staged = stagePosts(POSTS);
  assert.equal(staged.version, STAGING_VERSION);
  assert.equal(staged.stage, "claim");
  const phrases = staged.attested.map((r) => `${r.phrase}=${r.value}`);
  for (const wanted of ["משיח=358", "נחש=358", "ביאת המשיח=776", "צירוף מקרים=776"]) assert.ok(phrases.includes(wanted), wanted);
  assert.equal(phrases.includes("שלום=40"), false, "a claim the engine does not reproduce is never attested");
  const messiah = staged.attested.find((r) => r.phrase === "משיח");
  assert.deepEqual(messiah.posts.map((p) => p.wp_id), [1]);
  assert.equal(messiah.method, "רגיל");
});

test("anchors group distinct phrases that different posts attest at the same value", () => {
  const staged = stagePosts(POSTS);
  const anchor358 = staged.anchors.find((a) => a.value === 358);
  assert.deepEqual([...anchor358.phrases].sort(), ["משיח", "נחש"].sort());
  assert.ok(staged.anchors.find((a) => a.value === 776).phrases.length === 2);
});

test("unverified rows are counted but never labelled as author errors", () => {
  const staged = stagePosts(POSTS);
  assert.ok(staged.stats.engine_unverified_not_reported_as_errors >= 1);
  assert.equal(JSON.stringify(staged).includes("contradiction"), false);
  assert.equal(JSON.stringify(staged).includes("author_error"), false);
  assert.equal(staged.stats.posts, 3);
  assert.equal(staged.stats.posts_with_attested, 2);
});

test("a גדול row that repeats a רגיל row is collapsed (conditional equivalence), and tiny fragments are not attested", () => {
  const staged = stagePosts([{ wp_id: 9, date: "2026-07-09", title: "x", content: "<p>משיח = 358 וגם משיח בשיטת גדול = 358</p><p>עו = 76</p>" }]);
  assert.equal(staged.attested.filter((r) => r.phrase === "משיח" && r.value === 358).length, 1);
  assert.equal(staged.attested.some((r) => r.phrase === "עו"), false, "fewer than three letters verifies by coincidence");
});

test("postText keeps line structure (vertical arithmetic needs it) and decodes entities", () => {
  const text = postText("<p>א&nbsp;ב</p><p>ג &amp; ד</p><script>alert(1)</script>");
  assert.equal(text, "א ב\nג & ד");
});

test("the script is read-only: no write verb, no RPC, no secret, no service role", () => {
  const source = readFileSync(new URL("../scripts/post-knowledge-staging.mjs", import.meta.url), "utf8");
  const code = source.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(code, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.doesNotMatch(code, /\/rpc\/|\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.doesNotMatch(code, /SERVICE_ROLE|service_role|process\.env/);
  assert.match(code, /SUPABASE_ANON/);
  assert.match(code, /import \{ triageSource, extractCompoundClaims \} from "\.\.\/src\/lib\/triage\.js"/, "composes the existing Shared Expression Extraction");
});
