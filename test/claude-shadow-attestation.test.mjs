// CLAUDE_SHADOW_RESEARCH_V1 — Audit Closure: engine_recomputed ≠ source_attested, structural rules R1–R4, human-gate holds,
// blind re-sample hygiene, and the proof that the original statistical result was not touched.
import test from "node:test";
import assert from "node:assert/strict";

import { attestRow, classifyRow, classifyRelation, normLoc, ATTESTATION_VERSION } from "../scripts/claude-shadow-attestation.mjs";
import { attachAttestation, blindSample, blindFrame, contextLines, frozenStatistics, FROZEN_STATISTICS_COMMIT } from "../scripts/claude-shadow-research-v1.mjs";
import { engineValue } from "../scripts/claude-shadow-research-core.mjs";

const row = (phrase, value, extra = {}) => ({ row_id: `${extra.post_id ?? 1}:0`, post_id: 1, extracted_phrase: phrase, computed_value: value, declared_value: value, extraction_status: "engine_verified", boundary_flags: [], ...extra });

test("R1 — spelling punctuation inside a word does not hide the claim line (א-להים, יודי\"ן, spaced dash)", () => {
  assert.equal(normLoc("זה סוד ה-86 = הטבע = 86 = א-להים"), "זה סוד ה-86 = הטבע = 86 = אלהים".replace("ה-86", "ה-86"));
  assert.equal(normLoc("ארבעה יודי\"ן = 358"), "ארבעה יודין = 358");
  assert.equal(normLoc("אש בהרי ירושלים - אליהו הנביא = 1234"), "אש בהרי ירושלים אליהו הנביא = 1234");
  const text = "זה סוד ה-86 = הטבע = 86 = א-להים";
  assert.equal(attestRow(text, row("אלהים", 86)).attested, true);
  assert.equal(attestRow("אור גדר = 500", row("אור גדר", 500)).attested, true);
});

test("R3 — every line is scanned: the first line containing both the span and the number does not win", () => {
  const text = "מנהיגה העליון של אירן הוא חמינאי. וזהו מה שאמר ב-119 אנשים…\nחמינאי=119";
  const result = attestRow(text, row("חמינאי", 119));
  assert.equal(result.attested, true);
  assert.equal(result.line, 2);
  const only = attestRow("מנהיגה העליון של אירן הוא חמינאי. וזהו מה שאמר ב-119 אנשים…", row("חמינאי", 119));
  assert.equal(only.attested, false);
  assert.equal(only.reason, "no_equation_link_between_span_and_value");
});

test("R2 — equation chains link span and value; a sentence terminator breaks the chain", () => {
  const chain = "ברק חוסיין אובאמה = 501 = דצך עדש באחב (ראשי תיבות)";
  assert.equal(attestRow(chain, row("ברק חוסיין אובאמה", 501)).attested, true);
  const reversed = "סוד רפח = 358 = משיח";
  assert.equal(attestRow(reversed, row("משיח", 358)).attested, true, "non-adjacent members of one chain");
  const text = "שלושה ימים לפני הגאולה. בנימין נתניהו = 1333. 333 = גרעין = קוד הבריאה = שכחה.";
  assert.equal(attestRow(text, row("קוד הבריאה", 333)).attested, true);
  assert.equal(attestRow(text, row("בנימין נתניהו", 333)).attested, false, "the terminator ends the first equation");
  assert.equal(attestRow("השער הוא גדול. עוד משפט", row("השער הוא גדול", 5)).reason, "span_and_value_never_on_one_line");
  assert.equal(attestRow("שום דבר פה", row("אור גדר", 500)).reason, "span_not_located_in_post");
  const word = attestRow("אור גדר שווה 500", row("אור גדר", 500));
  assert.equal(word.attested, true, "'שווה' is an equation operator");
});

test("R4 — function_word_at_edge is waived only for a WHOLE equation member; every other boundary flag still blocks", () => {
  const whole = classifyRow("אין שום יאוש = 724 = אחרית הימים", row("אין שום יאוש", 724, { boundary_flags: ["function_word_at_edge"] }));
  assert.equal(whole.source_attested, true);
  assert.deepEqual(whole.waived_flags, ["function_word_at_edge"]);
  const tail = classifyRow("והוא אמר אין שום יאוש = 724", row("אין שום יאוש", 724, { boundary_flags: ["function_word_at_edge"] }));
  assert.equal(tail.source_attested, false, "the span is the tail of a longer clause: something may be cut off");
  assert.ok(tail.reasons.includes("boundary:function_word_at_edge"));
  const labelled = classifyRow("והיה האיש אשר אתבש=1237", row("והיה האיש אשר", 1237, { boundary_flags: ["function_word_at_edge"] }));
  assert.equal(labelled.source_attested, true, "a trailing method label is not part of the span");
  for (const flag of ["overlong_capture", "detached_single_letter_token", "spaced_letters", "method_label_captured_as_phrase"]) {
    const blocked = classifyRow("אור גדר = 500", row("אור גדר", 500, { boundary_flags: [flag] }));
    assert.equal(blocked.source_attested, false, flag);
    assert.ok(blocked.reasons.includes(`boundary:${flag}`));
  }
});

test("the two axes are independent: engine_recomputed without source_attested, and never the reverse", () => {
  const unlinked = classifyRow("הוא חמינאי וכן 119 אנשים", row("חמינאי", 119));
  assert.equal(unlinked.engine_recomputed, true);
  assert.equal(unlinked.source_attested, false);
  const unresolved = classifyRow("אור גדר = 500", row("אור גדר", 500, { extraction_status: "extraction_unresolved" }));
  assert.equal(unresolved.engine_recomputed, false);
  assert.equal(unresolved.source_attested, false);
  assert.equal(unresolved.attestation_status, "review_required");
  assert.match(ATTESTATION_VERSION, /attestation-v1$/);
});

test("human-gate holds: a held row is not source_attested although the rules alone would attest it; other rows still count", () => {
  const holds = new Map([["1:0", { decision: "excluded_from_source_attested" }]]);
  const held = classifyRow("אין שום יאוש = 724", row("אין שום יאוש", 724, { boundary_flags: ["function_word_at_edge"] }), { holds });
  assert.equal(held.rule_only_source_attested, true);
  assert.equal(held.source_attested, false);
  assert.equal(held.attestation_status, "held_by_human_gate");
  const other = classifyRow("בראשית ברא אלהים=1202", row("בראשית ברא אלהים", 1202, { row_id: "2:0", post_id: 2 }));
  const relation = classifyRelation([held, other]);
  assert.equal(relation.source_attested, true);
  assert.deepEqual(relation.attested_in_posts, [2]);
  assert.equal(classifyRelation([held]).attestation_status, "held_by_human_gate");
});

test("attachAttestation: holds are verified against the staged row (phrase, value, post); a mismatch aborts", () => {
  const staged = { review_rows: [row("אור גדר", 500, { row_id: "9:1", post_id: 9, computed_method: "רגיל" })], post_texts: new Map([[9, "אור גדר = 500"]]) };
  const records = () => [{ phrase: "אור גדר", value: 500, method: "רגיל" }];
  const [r] = attachAttestation({ records: records(), staged, holds: [{ row_id: "9:1", post_id: 9, phrase: "אור גדר", value: 500, decision: "stays_review_required" }] });
  assert.equal(r.attestation.attestation_status, "held_by_human_gate");
  assert.equal(r.attestation.rule_only_source_attested, true);
  assert.throws(() => attachAttestation({ records: records(), staged, holds: [{ row_id: "9:1", post_id: 9, phrase: "אור גדר", value: 501, decision: "x" }] }), /does not match the staged row/);
  const [free] = attachAttestation({ records: records(), staged, holds: [] });
  assert.equal(free.attestation.source_attested, true);
});

test("the attestation layer contains no phrase list and no per-row exception", () => {
  const src = (path) => import("node:fs").then((fs) => fs.readFileSync(new URL(path, import.meta.url), "utf8"));
  return src("../scripts/claude-shadow-attestation.mjs").then((code) => {
    const body = code.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    for (const word of ["חמינאי", "אלהים", "שום יאוש", "אשר", "9346", "36007", "24812"]) assert.ok(!body.includes(word), `${word} must not appear in the rules`);
  });
});

test("blind re-sample: new seed, earlier audited relations excluded, balanced cells, and the frame shows no status, rank or statistic", () => {
  const records = [];
  const periods = ["2013-2016", "2017-2019", "2020-2022"]; const types = ["general", "cipher"];
  for (const p of periods) for (const t of types) for (let i = 0; i < 8; i += 1) records.push({ relation_id: `${p}${t}${i}`, phrase: `אור${i}`, value: 100 + i, method: "רגיל", source_posts: [{ period: p, post_type: t, wp_id: 1, date: "2020-01-01" }], attestation: { source_attested: i % 4 !== 0, attestation_status: i % 4 !== 0 ? "source_attested" : "review_required" } });
  const exclude = new Set([records[0].relation_id, records[1].relation_id]);
  const sample = blindSample(records, { size: 12, seed: 5, exclude });
  assert.equal(sample.length, 12);
  assert.ok(sample.every((x) => !exclude.has(x.record.relation_id)));
  assert.equal(new Set(sample.map((x) => x.cell)).size, 6, "every cell before any repeat");
  assert.deepEqual(sample.map((x) => x.record.relation_id), blindSample(records, { size: 12, seed: 5, exclude }).map((x) => x.record.relation_id));
  assert.equal(sample.filter((x) => !x.record.attestation.source_attested).length >= 6, true, "rule-rejected relations are listed first inside each cell");
  const frame = blindFrame(sample, { staged: { post_texts: new Map([[1, "אור1 = 101\nשורה אחרת"]]) }, seed: 5 });
  const json = JSON.stringify(frame);
  for (const forbidden of ["attestation", "source_attested", "review_required", "p_value", "q_bh", "strong", "rank", "status"]) assert.ok(!json.includes(forbidden), `frame must not contain ${forbidden}`);
  assert.equal(frame.items.length, 12);
});

test("contextLines: windows are centred on the span, so a long line shows the equation and not just its beginning", () => {
  const long = `${"מילה ".repeat(80)}ודבר כלחזון.= 333 ${"סוף ".repeat(80)}`;
  const [hit] = contextLines(long, "ודבר כלחזון", 333);
  assert.match(hit.text, /ודבר כלחזון/);
  assert.match(hit.text, /333/);
});

test("the original statistical result is frozen: the pairs core of the first committed run equals this run's", async () => {
  const fs = await import("node:fs");
  const path = new URL("../audits/claude_shadow_research_v1/results.json", import.meta.url);
  if (!fs.existsSync(path)) return;
  const results = JSON.parse(fs.readFileSync(path, "utf8"));
  const proof = frozenStatistics(results.pairs);
  assert.equal(proof.commit, FROZEN_STATISTICS_COMMIT);
  if (proof.identical === null) return; // the first commit is not in this (shallow) checkout
  assert.equal(proof.identical, true, "no threshold, matching rule, null model or pair was changed after the fact");
  assert.equal(results.counts.pairs.fdr_survivors, 0);
  assert.equal(results.counts.pairs.holm_survivors, 0);
});

test("engine numbers are still the engine's: the attested relations recompute through gematria.js", () => {
  assert.equal(engineValue("רגיל", "אין שום יאוש"), 724);
  assert.equal(engineValue("רגיל", "חמינאי"), 119);
  assert.equal(engineValue("רגיל", "בראשית ברא אלהים"), 1202);
});
