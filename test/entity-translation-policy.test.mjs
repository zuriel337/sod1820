import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  parsePostId, planEntityTranslation, sourceHash, segmentHtml, reassemble, roundTrip, tagSkeleton, verifyTranslation,
  chunkSegments, batchPayload, parseBatchAnswer, isDraftPost, assertEligibleForPublishedTranslation, estimateTokens, KEEP_MARK,
} from "../supabase/functions/_shared/entityTranslationPolicy.js";

const POST = fs.readFileSync(new URL("../work/mah-kore-bore-PKqKLjO_0nc-20261111/post.html", import.meta.url), "utf8");

// ── entity id integrity / safe conversion (mirrors the SQL regex + FK tests) ─────────────────────────────────────────
test("parsePostId accepts only canonical positive ids that fit bigint", () => {
  for (const ok of ["1", "5131", "999999999999999999"]) assert.equal(parsePostId(ok), ok);
  assert.equal(parsePostId(5131), "5131");
  for (const bad of ["", "0", "007", " 5", "5 ", "5.0", "-5", "+5", "1e3", "٥", "abc", "1000000000000000000", "99999999999999999999", "5;drop", null, undefined, 0, -1, 1.5, 2 ** 60, {}, []])
    assert.equal(parsePostId(bad), null, String(bad));
});
test("planEntityTranslation: entity type, id and targets (Hebrew is the source; never a target)", () => {
  const ok = planEntityTranslation({ entityType: "post", entityId: "5150" });
  assert.deepEqual(ok.targets, ["en", "ar", "es", "fr", "ru", "pt", "de"]);
  assert.ok(!ok.targets.includes("he"));
  assert.equal(planEntityTranslation({ entityType: "video", entityId: "5" }).error, "entity_type_unsupported");
  assert.equal(planEntityTranslation({ entityType: "post", entityId: "5x" }).error, "entity_id_invalid");
  assert.equal(planEntityTranslation({ entityType: "post", entityId: "5", requestedLangs: ["he"] }).error, "no_target_languages");
  assert.deepEqual(planEntityTranslation({ entityType: "post", entityId: "5", requestedLangs: ["en", "he", "xx!"] }).targets, ["en"]);
});
test("draft posts (tag «טיוטה») are never eligible — DB RLS/guard is authoritative, this is defense in depth", () => {
  assert.equal(isDraftPost({ tags: ["a", "טיוטה"] }), true);
  assert.equal(isDraftPost({ tags: ["מה קורה הבורא"] }), false);
  assert.throws(() => assertEligibleForPublishedTranslation({ id: 2, tags: ["טיוטה"] }), /draft_post_not_publishable/);
  assert.throws(() => assertEligibleForPublishedTranslation({ id: "0x2", tags: [] }), /entity_id_invalid/);
  assert.doesNotThrow(() => assertEligibleForPublishedTranslation({ id: 5131, tags: [] }));
});

// ── source hash parity with SQL (same constants as tests/sql/content_translations_v1.sql T0) ─────────────────────────
test("sourceHash equals the SQL public.content_translation_source_hash vectors and detects staleness", async () => {
  assert.equal(await sourceHash({ title: "כותרת", excerpt: "תקציר", content: "<p>תוכן</p>" }), "ec0fcf8287e93f97b761766858b3cf1b49dac7ef6ae3bf91f6411cf4107c3309");
  assert.equal(await sourceHash({}), "75a11da44c802486bc6f65640aa48a730f0f684c5c07a42ba3cd1735eb3fb070");
  assert.equal(await sourceHash({ title: null, excerpt: null, content: null }), await sourceHash({}));
  assert.equal(await sourceHash({ title: "כותרת", excerpt: "תקציר", content: "<p>שונה</p>" }), "fe254a2e73ddb19935ae40d42848325ac3427a7e276c035e248a76a23240edd2");
});

// ── segmentation on the real draft post ──────────────────────────────────────────────────────────────────────────────
const plan = segmentHtml(POST);
test("round trip: segmenting and reassembling the real post reproduces it byte-for-byte", () => {
  assert.ok(plan.segments.length > 50);
  assert.equal(roundTrip(POST), true);
  assert.equal(reassemble(plan, Object.fromEntries(plan.segments.map((s) => [s.id, s.text]))), POST);
});
test("the model never sees markup, URLs, timestamps links or iframe markup", () => {
  for (const seg of plan.segments) { assert.ok(!/[<>]/.test(seg.text), seg.id); assert.ok(!/https?:\/\//.test(seg.text), seg.id); }
  const hrefs = POST.match(/href="[^"]+"/g);
  for (const h of hrefs) assert.ok(plan.skeleton.includes(h), h);
  assert.ok(plan.skeleton.includes("https://www.youtube.com/embed/PKqKLjO_0nc"));
});
test("verbatim keeps: Hebrew quoted spans/verses travel as placeholders; blockquote verse and first-column expressions stay literal", () => {
  const keeps = plan.segments.flatMap((s) => s.keeps);
  assert.ok(keeps.length >= 10);
  assert.ok(keeps.includes("„מה קורה הבורא”"));
  assert.ok(keeps.some((k) => k.includes("לריח ניחוח")));
  assert.ok(plan.skeleton.includes("„אני ה' בעתה אחישנה”"), "blockquote text is literal in the skeleton");
  for (const expr of ["אחישנה", "זוג משיח", "אשה הוא ליהוה", "יריחו", "בכסף מלא", "חיי שרה"]) assert.ok(plan.skeleton.includes(`<td>${expr}</td>`), expr);
  for (const seg of plan.segments) for (const k of seg.keeps) assert.ok(!POST.includes("⟦"), "no reserved markers in source") || assert.ok(seg.text.includes(KEEP_MARK(seg.keeps.indexOf(k) + 1)));
});
test("numbers: every digit run of the post is either in the skeleton (verbatim) or in a segment that the verifier protects", () => {
  const all = (POST.replace(/<[^>]+>/g, " ").match(/[0-9]+/g) || []).length;
  assert.ok(all > 80);
  const inSegments = plan.segments.flatMap((s) => s.text.match(/[0-9]+/g) || []).length;
  assert.ok(inSegments > 20);
});
test("reserved markers in the source are rejected; entities alone are not segments; table state does not leak", () => {
  assert.throws(() => segmentHtml("<p>a ⟦S:s1⟧ b</p>"), /reserved_marker/);
  assert.equal(segmentHtml("<p>&nbsp;</p>").segments.length, 0);
  const t = segmentHtml("<table><tr><td>חדרה</td><td>217</td></tr></table><p>חדרה היא עיר</p>");
  assert.equal(t.segments.length, 1);                               // paragraph after the table is translatable
  assert.ok(t.skeleton.includes("<td>חדרה</td>"));
  const attr = segmentHtml('<iframe title="נגן וידאו" src="https://x/y"></iframe>');
  assert.equal(attr.segments[0].kind, "attr");
  assert.ok(attr.skeleton.includes('src="https://x/y"'));
});

// ── a faithful simulated translation passes; every kind of damage is caught ──────────────────────────────────────────
const faithful = Object.fromEntries(plan.segments.map((s) => [s.id, s.text.replace(/[֐-׿]+/g, (w) => `[${w.length}]`).replace(/\[(\d+)\]/g, "x")]));
// keep placeholders survive (they are ⟦K#⟧ tokens, not Hebrew letters); digits survive; markup absent
test("faithful translation: verify ok, keeps and hrefs restored verbatim, tag skeleton identical", () => {
  const v = verifyTranslation(plan, faithful, { sourceHtml: POST });
  assert.deepEqual(v.errors.slice(0, 3), []);
  assert.equal(v.ok, true);
  const out = reassemble(plan, faithful);
  assert.equal(tagSkeleton(out), tagSkeleton(POST));
  for (const k of plan.segments.flatMap((s) => s.keeps)) assert.ok(out.includes(k), k);
  for (const h of POST.match(/href="[^"]+"/g)) assert.ok(out.includes(h), h);
});
const firstWithKeep = plan.segments.find((s) => s.keeps.length);
const firstWithDigits = plan.segments.find((s) => /[0-9]/.test(s.text) && !s.keeps.length);
const codes = (t, extra) => verifyTranslation(plan, { ...faithful, ...t }, extra).errors.map((e) => e.code);
test("verifier catches dropped / duplicated / unknown keeps", () => {
  assert.ok(codes({ [firstWithKeep.id]: faithful[firstWithKeep.id].replace(/⟦K1⟧/, "x") }).includes("keep_missing"));
  assert.ok(codes({ [firstWithKeep.id]: faithful[firstWithKeep.id] + " ⟦K1⟧" }).includes("keep_duplicate"));
  assert.ok(codes({ [firstWithKeep.id]: faithful[firstWithKeep.id] + " ⟦K99⟧" }).includes("keep_unknown"));
});
test("verifier catches lost/altered numbers (incl. localized Arabic-Indic digits) and date reformatting", () => {
  assert.ok(firstWithDigits);
  assert.ok(codes({ [firstWithDigits.id]: faithful[firstWithDigits.id].replace(/[0-9]+/g, "") }).includes("digits_missing"));
  assert.ok(codes({ [firstWithDigits.id]: faithful[firstWithDigits.id].replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]) }).includes("digits_missing"));
  const d = plan.segments.find((s) => /\d+\.\d+\.\d{4}/.test(s.text));
  assert.ok(d);
  assert.ok(codes({ [d.id]: faithful[d.id].replace(/\d+\.11\.2026/, "November 2026") }).includes("digits_missing"));
});
test("verifier catches markup injection, empty/missing/unknown ids and reserved markers", () => {
  const id = plan.segments[0].id;
  assert.ok(codes({ [id]: "x <b>y</b>" }).includes("markup_in_translation"));
  assert.ok(codes({ [id]: "x <a href=\"http://evil\">y</a>" }).includes("markup_in_translation"));
  assert.ok(codes({ [id]: "   " }).includes("empty_translation"));
  assert.ok(codes({ [id]: "x ⟦S:s2⟧" }).includes("reserved_marker_in_translation"));
  const missing = { ...faithful }; delete missing[id];
  assert.ok(verifyTranslation(plan, missing).errors.some((e) => e.code === "missing_segment"));
  assert.ok(verifyTranslation(plan, { ...faithful, zz: "x" }).errors.some((e) => e.code === "unknown_segment"));
});
test("verifier catches a tampered tag skeleton (changed href)", () => {
  const tampered = POST.replace("https://www.sefaria.org/Isaiah.60.22?lang=he", "https://evil.example/");
  assert.ok(codes({}, { sourceHtml: tampered }).includes("skeleton_mismatch"));
});
test("reassembly escapes bare ampersands and attribute quotes only for changed text", () => {
  const p = segmentHtml('<p title="שלום">אבגד</p>');
  const out = reassemble(p, { s1: 'Peace "x" & y', s2: "A & B" });
  assert.ok(out.includes('title="Peace &quot;x&quot; &amp; y"'));
  assert.ok(out.includes(">A &amp; B<"));
});

// ── chunking + batch I/O ─────────────────────────────────────────────────────────────────────────────────────────────
test("chunks respect the token budget, preserve order, and flag oversize single segments", () => {
  const chunks = chunkSegments(plan.segments, { maxSourceTokens: 1200 });
  assert.deepEqual(chunks.flatMap((c) => c.segments.map((s) => s.id)), plan.segments.map((s) => s.id));
  for (const c of chunks) assert.ok(c.oversize || c.tokens <= 1200, `chunk ${c.index} ${c.tokens}`);
  assert.ok(chunks.length >= 2 && chunks.length <= 12);
  const big = chunkSegments([{ id: "s1", text: "א".repeat(5000), keeps: [] }], { maxSourceTokens: 1200 });
  assert.equal(big[0].oversize, true);
  assert.ok(estimateTokens("א".repeat(22)) === 10);
});
test("batch answers are strict: exact ids, JSON array, no duplicates", () => {
  const chunk = chunkSegments(plan.segments.slice(0, 3))[0];
  const good = JSON.stringify(chunk.segments.map((s) => ({ id: s.id, text: "t" })));
  assert.equal(parseBatchAnswer(good, chunk).ok, true);
  assert.equal(parseBatchAnswer("```json\n" + good + "\n```", chunk).ok, true);
  assert.equal(parseBatchAnswer("not json", chunk).error, "bad_json");
  assert.equal(parseBatchAnswer("{}", chunk).error, "not_array");
  assert.equal(parseBatchAnswer(JSON.stringify([{ id: chunk.segments[0].id, text: "t" }]), chunk).error, "id_mismatch");
  assert.equal(parseBatchAnswer(JSON.stringify([{ id: "s1", text: "a" }, { id: "s1", text: "b" }, { id: "s2", text: "c" }]), chunk).error, "bad_item");
  assert.equal(JSON.parse(batchPayload(chunk)).length, 3);
});
