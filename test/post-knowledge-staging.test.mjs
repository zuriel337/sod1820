// post-knowledge-staging v2 is a READ-ONLY composition of the existing Shared Expression Extraction + the canonical
// engine. These tests pin what matters: it keeps only what the engine re-verifies, it never reports extraction noise
// as an author error, every review row carries the fields the Human Gate needs, candidates are classified by general
// structural rules (no phrase list), the manifest is deterministic, and the script cannot write anything.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CANDIDATE_GROUPS, STAGING_VERSION, artifactEntry, boundaryFlags, buildCorpusIndex, buildManifest, classifyCandidate,
  classifyMissingPhrases, postText, stagePosts, stemForms, timeFlags, unseenTokens, variantKey, withinOneEdit,
} from "../scripts/post-knowledge-staging.mjs";
import { METHODS } from "../src/lib/gematria.js";

const ragil = METHODS.find((m) => m.key === "רגיל").fn;
const VERSIONS = { extraction: "ex-1", engine: "en-1", registry: "rg-1" };

const POSTS = [
  { wp_id: 1, slug: "first", date: "2026-07-01T00:00:00Z", title: "ראשון", content: "<p>משיח = 358</p><p>ביאת המשיח = 776</p><p>צירוף מקרים = 776</p>" },
  { wp_id: 2, slug: "second", date: "2026-07-02T00:00:00Z", title: "שני", content: "<p>נחש = 358</p><p>הרמז: שלום = 40 לפי אחד הכותבים</p>" },
  { wp_id: 3, slug: "third", date: "2026-07-03T00:00:00Z", title: "שלישי", content: "<p>אין כאן שום טענת ערך</p>" },
];

test("facts about the fixture itself come from the engine, not from memory", () => {
  assert.equal(ragil("משיח"), 358);
  assert.equal(ragil("נחש"), 358);
  assert.equal(ragil("ביאת המשיח"), 776);
  assert.equal(ragil("צירוף מקרים"), 776);
  assert.notEqual(ragil("שלום"), 40);
});

test("only engine-verified claims are attested; each keeps its posts as provenance; the stage stays Claim", () => {
  const staged = stagePosts(POSTS, { versions: VERSIONS });
  assert.equal(staged.version, STAGING_VERSION);
  assert.equal(staged.stage, "claim");
  const phrases = staged.attested.map((r) => `${r.phrase}=${r.value}`);
  for (const wanted of ["משיח=358", "נחש=358", "ביאת המשיח=776", "צירוף מקרים=776"]) assert.ok(phrases.includes(wanted), wanted);
  assert.equal(phrases.includes("שלום=40"), false, "a claim the engine does not reproduce is never attested");
  assert.deepEqual(staged.attested.find((r) => r.phrase === "משיח").posts.map((p) => p.wp_id), [1]);
});

test("anchors group distinct phrases that different posts attest at the same value", () => {
  const staged = stagePosts(POSTS, { versions: VERSIONS });
  assert.deepEqual([...staged.anchors.find((a) => a.value === 358).phrases].sort(), ["משיח", "נחש"].sort());
  assert.equal(staged.anchors.find((a) => a.value === 776).phrases.length, 2);
});

test("an unreproduced claim is extraction_unresolved: neither wrong nor verified, never called an author error", () => {
  const staged = stagePosts(POSTS, { versions: VERSIONS });
  const unresolved = staged.review_rows.filter((r) => r.extraction_status === "extraction_unresolved");
  assert.ok(unresolved.length >= 1);
  for (const row of unresolved) {
    assert.equal(row.accepted, false);
    assert.match(row.reason, /not an author error, not verified/);
  }
  assert.ok(staged.stats.extraction_unresolved >= 1);
  const serialized = JSON.stringify(staged.attested) + JSON.stringify(staged.stats);
  for (const forbidden of ["contradiction", "author_error", "wrong_claim"]) assert.equal(serialized.includes(forbidden), false);
});

test("every review row carries the fields the Human Gate needs", () => {
  const staged = stagePosts(POSTS, { versions: VERSIONS });
  const row = staged.review_rows.find((r) => r.extracted_phrase === "משיח");
  for (const field of ["post_id", "slug", "claim_text", "extracted_phrase", "declared_method", "computed_method", "declared_value", "computed_value", "extraction_status", "extraction_confidence", "extraction_version", "engine_version", "registry_version", "accepted", "reason"]) {
    assert.ok(field in row, field);
  }
  assert.equal(row.post_id, 1);
  assert.equal(row.slug, "first");
  assert.equal(row.declared_value, 358);
  assert.equal(row.computed_value, 358);
  assert.equal(row.extraction_status, "engine_verified");
  assert.equal(row.extraction_confidence, "high");
  assert.equal(row.accepted, true);
  assert.match(row.claim_text, /משיח/);
  assert.deepEqual([row.extraction_version, row.engine_version, row.registry_version], ["ex-1", "en-1", "rg-1"]);
});

test("a גדול row that repeats a רגיל row is collapsed, and tiny fragments are not attested", () => {
  const staged = stagePosts([{ wp_id: 9, slug: "x", date: "2026-07-09", title: "x", content: "<p>משיח = 358 וגם משיח בשיטת גדול = 358</p><p>עו = 76</p>" }], { versions: VERSIONS });
  assert.equal(staged.attested.filter((r) => r.phrase === "משיח" && r.value === 358).length, 1);
  assert.equal(staged.attested.some((r) => r.phrase === "עו"), false, "fewer than three letters verifies by coincidence");
});

test("postText keeps line structure (vertical arithmetic needs it) and decodes entities", () => {
  assert.equal(postText("<p>א&nbsp;ב</p><p>ג &amp; ד</p><script>alert(1)</script>"), "א ב\nג & ד");
});

// ── general rules for the human-review groups (no phrase list) ─────────────────────────────────────────────────
test("variantKey ignores spacing, quotes, the article, final forms and matres lectionis — and nothing else", () => {
  assert.equal(variantKey("דונלד טראמפ"), variantKey("דונלד טראמף"));
  assert.equal(variantKey("ראש השנה"), variantKey("ראשהשנה"));
  assert.equal(variantKey("הסימן"), variantKey("סימן"));
  assert.equal(variantKey("משיח בן דוד"), variantKey("משיח בן דויד"));
  assert.notEqual(variantKey("משיח"), variantKey("נחש"));
});

test("withinOneEdit: substitution, adjacent swap, insertion/deletion; never identical, never two edits", () => {
  assert.equal(withinOneEdit("שבעים", "בשבעים"), true);
  assert.equal(withinOneEdit("קורונה", "קורנוה"), true);
  assert.equal(withinOneEdit("ביבי", "ביבס"), true);
  assert.equal(withinOneEdit("שלום", "שלום"), false);
  assert.equal(withinOneEdit("שלום", "שלומית"), false);
});

test("boundary rules are structural: detached letters, function words at the edge, captured method label, overlong capture", () => {
  assert.deepEqual(boundaryFlags("משיח בן דוד"), []);
  assert.ok(boundaryFlags("משלי ל כז").includes("detached_single_letter_token"));
  assert.ok(boundaryFlags("י ה ו ה").includes("spaced_letters"));
  assert.ok(boundaryFlags("אין מספר").includes("function_word_at_edge"));
  assert.ok(boundaryFlags("מסתתר תשפו").includes("method_label_captured_as_phrase"));
  assert.ok(boundaryFlags("אחד שניים שלושה ארבעה חמישה שישה").includes("overlong_capture"));
});

test("time rules are calendar-structural", () => {
  assert.deepEqual(timeFlags("פרים תשפא"), ["hebrew_year_form"]);
  assert.ok(timeFlags("א תשרי התשעו").includes("hebrew_month"));
  assert.deepEqual(timeFlags("משיח בן דוד"), []);
  assert.ok(stemForms("הילדים").has("ילד"));
});

const CORPUS = ["דונלד טראמפ", "משיח", "נחש", "ראש השנה", "סימן", "שבעים", "ילד", "בית", "ספר", "אור"];
const ENTITIES = ["דונלד טראמפ"];

test("classification precedence: variant > edit-distance > boundary > person/event/time > clean", () => {
  const index = buildCorpusIndex(CORPUS, ENTITIES);
  const rowFor = (phrase) => ({ phrase, posts: [{ wp_id: 1, date: "2026" }] });
  const texts = new Map([[1, "דונלד טראמף בשבעים הסימן ילדים אין מספר פרים תשפא ספר אור בית"]]);
  assert.equal(classifyCandidate(rowFor("דונלד טראמף"), index, texts).group, "spelling_variant_of_existing");
  assert.equal(classifyCandidate(rowFor("בשבעים"), index, texts).group, "suspected_spelling_error");
  assert.equal(classifyCandidate(rowFor("אין מספר"), index, texts).group, "suspected_boundary_cut");
  assert.equal(classifyCandidate(rowFor("פרים תשפא"), index, texts).group, "person_event_or_time_dependent");
  assert.equal(classifyCandidate(rowFor("ספר אור בית"), index, texts).group, "clean_explicit_recomputed");
  assert.ok(unseenTokens("חיזבאללה", index).length >= 1);
});

test("classifyMissingPhrases never promotes anything: present phrases are skipped, the rest are grouped for review", () => {
  const staged = stagePosts([
    { wp_id: 1, slug: "a", date: "2026-07-01", title: "a", content: "<p>משיח = 358</p><p>נחש = 358</p><p>צירוף מקרים = 776</p>" },
  ], { versions: VERSIONS });
  const result = classifyMissingPhrases(staged, buildCorpusIndex(["משיח", "נחש", "צירוף", "מקרים"], []));
  assert.equal(result.total, 1);
  assert.deepEqual(Object.keys(result.groups).sort(), [...CANDIDATE_GROUPS].sort());
  assert.equal(result.groups.clean_explicit_recomputed[0].phrase, "צירוף מקרים");
  assert.equal(JSON.stringify(result).includes("gematria_words\":"), false);
});

test("the manifest is deterministic and identifies every post without storing a body", () => {
  const staged = stagePosts(POSTS, { versions: VERSIONS });
  const make = () => buildManifest({
    category: "x", posts: POSTS, staged, candidates: null, versions: { triage_js: "a" }, registrySnapshot: { sha256: "r", method_count: 1 },
    artifacts: { "a.json": artifactEntry("a.json", "{}") }, reproCommand: "cmd",
  });
  const first = make();
  assert.deepEqual(first, make());
  assert.deepEqual(first.posts.map((p) => p.wp_id), [1, 2, 3]);
  for (const post of first.posts) assert.match(post.text_sha256, /^[0-9a-f]{64}$/);
  assert.match(first.post_set_sha256, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(first).includes("משיח = 358"), false, "no post body in the manifest");
  assert.equal(first.artifacts["a.json"].sha256, artifactEntry("a.json", "{}").sha256);
});

test("the script is read-only: no write verb, no RPC, no secret, no service role, no Raziel/post_qa/gematria_words writer", () => {
  const source = readFileSync(new URL("../scripts/post-knowledge-staging.mjs", import.meta.url), "utf8");
  const code = source.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(code, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/i);
  assert.doesNotMatch(code, /\/rpc\/|\.insert\(|\.upsert\(|\.delete\(|supabase\s*\.\s*(?:from|rpc)|createClient/);
  assert.doesNotMatch(code, /SERVICE_ROLE|service_role|process\.env/);
  assert.doesNotMatch(code, /functions\/v1|ai-analyze|research-run|askRaziel/);
  assert.match(code, /SUPABASE_ANON/);
  assert.match(code, /import \{ triageSource, extractCompoundClaims \} from "\.\.\/src\/lib\/triage\.js"/, "composes the existing Shared Expression Extraction");
});

test("the extraction rules contain no content-specific phrase list (only closed grammatical classes and the calendar)", () => {
  const source = readFileSync(new URL("../scripts/post-knowledge-staging.mjs", import.meta.url), "utf8");
  const code = source.split("\n").filter((line) => !line.trim().startsWith("//")).join("\n");
  for (const word of ["חכמה", "בינה", "משיח", "נתניהו", "טראמפ", "עמלק", "גאולה"]) assert.equal(code.includes(word), false, word);
});
