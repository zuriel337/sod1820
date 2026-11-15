import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { baseBodyBlocks } from "./postUnitBody2029.js";
import { segmentUnit, buildSegmentQuestion, parseRazielAnswer, mergeProposals, applyProposals, RAZIEL_REQUEST_LIMITS, REVIEW_TASKS, FREE_TASK_MAX } from "./unitRazielReview2029.js";
import { validateBlocks } from "./unitDocument2029.js";

const base = baseBodyBlocks();

test("COMPAT GATE: the limits this module plans against are the live ones in the Raziel session request builder", () => {
  const src = readFileSync(new URL("./razielSessionRequest2029.js", import.meta.url), "utf8");
  const limits = src.match(/const LIMITS = Object\.freeze\(\{([^}]*)\}\)/)[1];
  assert.equal(Number(limits.match(/question:\s*(\d+)/)[1]), RAZIEL_REQUEST_LIMITS.question);
  assert.equal(Number(limits.match(/factPack:\s*(\d+)/)[1]), RAZIEL_REQUEST_LIMITS.facts);
  const ai = readFileSync(new URL("../../../supabase/functions/ai-analyze/index.ts", import.meta.url), "utf8");
  assert.ok(ai.includes('String(body?.subject || "").slice(0, 300)'), "the server clips the subject at 300");
});

test("the whole unit does not fit one request — it is split into bounded segments that cover every editable block", () => {
  const whole = base.filter((b) => !b.locked).reduce((n, b) => n + b.text.length, 0);
  assert.ok(whole > RAZIEL_REQUEST_LIMITS.facts * 1.5, "a single request could not carry it");
  const plan = segmentUnit(base);
  assert.ok(plan.segments.length >= 3 && plan.segments.length <= 6, `${plan.segments.length} segments`);
  for (const s of plan.segments) {
    assert.ok(s.facts.length <= RAZIEL_REQUEST_LIMITS.facts, `segment ${s.index} is ${s.facts.length}`);
    assert.ok(buildSegmentQuestion({ task: "structure", index: s.index, total: s.total }).length <= RAZIEL_REQUEST_LIMITS.question);
  }
  const covered = new Set(plan.segments.flatMap((s) => s.ids));
  const editable = base.filter((b) => !b.locked && b.kind !== "rule").map((b) => b.id);
  assert.deepEqual(editable.filter((id) => !covered.has(id) && !plan.skipped.some((x) => x.id === id)), [], "nothing is dropped silently");
  assert.equal(plan.skipped.length, 0);
});

test("protected text is never sent as editable text; only its label travels", () => {
  const facts = segmentUnit(base).segments.map((s) => s.facts).join(" ");
  assert.ok(!facts.includes("יניב לוי הביא רמז יפה"));
  assert.ok(!facts.includes("כִּי יָמִין וּשְׂמֹאול"));
  assert.ok(/\[מקור נעול: /.test(facts));
});

test("a block too long for one request is reported, not truncated", () => {
  const long = [{ id: "b1", kind: "p", text: "ש".repeat(1100), locked: false }, { id: "b2", kind: "p", text: "קצר", locked: false }];
  const plan = segmentUnit(long);
  assert.deepEqual(plan.skipped.map((s) => s.id), ["b1"]);
  assert.ok(plan.segments.every((s) => !s.facts.includes("ששששש")));
});

test("the free instruction is bounded and a task question fits", () => {
  for (const task of [...Object.keys(REVIEW_TASKS), "free"]) assert.ok(buildSegmentQuestion({ task, index: 4, total: 6, free: "ג".repeat(500) }).length <= RAZIEL_REQUEST_LIMITS.question, task);
  assert.ok(buildSegmentQuestion({ task: "free", index: 1, total: 1, free: "ג".repeat(500) }).includes("ג".repeat(FREE_TASK_MAX)));
  assert.ok(!buildSegmentQuestion({ task: "free", index: 1, total: 1, free: "ג".repeat(500) }).includes("ג".repeat(FREE_TASK_MAX + 1)));
});

test("the parser: a closed grammar, tolerant of markdown, fail-closed on everything else", () => {
  const answer = [
    "הנה ההצעות שלי:",
    "- [b8] והנה חיבור מופלא ביותר!",
    "**[b9]** כאשר בודקים את הביטוי, מתקבל במילוי:",
    "[b11]=",
    "[+b12] ## כותרת חדשה",
    "[-b21] כפילות",
    "[b7] ניסיון לשנות ציטוט",         // protected
    "[b999] לא קיים",
    "[b0] שורה אחרת",
    "[-b0]",                               // the title cannot be removed
    "[b8] הצעה כפולה",
    "[b14] הנוסח כולל 1430 ו־2026",
    "שורת הסבר חופשית",
  ].join("\n");
  const { proposals, commentary, unchanged } = parseRazielAnswer(answer, base);
  const by = (id, op) => proposals.find((p) => p.ref === id && (!op || p.op === op));
  assert.equal(by("b8").status, "proposed");
  assert.equal(by("b9").status, "proposed");
  assert.equal(by("b12", "add").kind, "heading");
  assert.equal(by("b21", "remove").status, "proposed");
  assert.equal(by("b7").reason, "locked_source");
  assert.equal(by("b999").reason, "unknown_ref");
  assert.equal(by("b0", "remove").reason, "title_required");
  assert.equal(proposals.filter((p) => p.ref === "b8")[1].reason, "duplicate");
  assert.deepEqual(by("b14").flags, [{ code: "unverified_numbers", numbers: ["1430"] }], "a number that is not already in the unit is flagged, a known one is not");
  assert.equal(unchanged, 1);
  assert.deepEqual(commentary, ["הנה ההצעות שלי:", "שורת הסבר חופשית"]);
});

test("an answer outside the grammar yields commentary only — nothing to apply", () => {
  const { proposals, commentary } = parseRazielAnswer("הייתי משפר את הפתיחה ומקצר את הסוף.", base);
  assert.equal(proposals.length, 0);
  assert.equal(commentary.length, 1);
});

test("apply: only the approved proposals, once, with protected blocks untouched; the result stays valid", () => {
  const parsed = parseRazielAnswer("[b8] חיבור חדש!\n[+b12] ## כותרת חדשה\n[-b21]\n[b9] טקסט אחר", base);
  const merged = mergeProposals([parsed]);
  const approve = merged.proposals.filter((p) => p.ref !== "b9").map((p) => p.id);
  const out = applyProposals(base, merged.proposals, approve);
  assert.equal(out.find((b) => b.id === "b8").text, "חיבור חדש!");
  assert.equal(out.find((b) => b.id === "b9").text, base.find((b) => b.id === "b9").text, "not approved → unchanged");
  assert.equal(out.some((b) => b.id === "b21"), false);
  const at = out.findIndex((b) => b.id === "b12");
  assert.equal(out[at + 1].kind, "heading");
  assert.equal(out[at + 1].text, "כותרת חדשה");
  assert.equal(validateBlocks(out, base).ok, true);
  assert.deepEqual(applyProposals(base, merged.proposals, []).map((b) => b.id), base.map((b) => b.id), "nothing approved → nothing changes");
});

test("merging segments keeps every proposal and rejects a second proposal for the same block", () => {
  const a = parseRazielAnswer("[b8] א!", base), b = parseRazielAnswer("[b8] ב!\n[b9] ג!", base);
  const merged = mergeProposals([a, b]);
  assert.equal(merged.proposals.length, 3);
  assert.equal(merged.proposals.filter((p) => p.status === "proposed").length, 2);
  assert.equal(merged.proposals[1].reason, "duplicate");
});
