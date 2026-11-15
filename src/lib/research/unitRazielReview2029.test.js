import test from "node:test";
import { YAMIN_SMOL_TEXT_20261112 } from "./fixtures/yaminSmolText20261112.js";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { baseBodyBlocks } from "./postUnitBody2029.js";
import { segmentUnit, buildSegmentQuestion, parseRazielAnswer, mergeProposals, applyProposals, segmentReport, RAZIEL_REQUEST_LIMITS, REVIEW_TASKS, FREE_TASK_MAX } from "./unitRazielReview2029.js";
import { validateBlocks } from "./unitDocument2029.js";

const base = baseBodyBlocks(YAMIN_SMOL_TEXT_20261112);

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
  assert.ok(/\[מקור חיצוני — לא לשכתב: /.test(facts));
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

test("research data is sent as editable text; gematria items are labelled references, not editable text", () => {
  const withGx = [...base, { id: "n1", kind: "gematria", item: { phrase: "התחלה חדשה", methodKey: "מסתתר", display: "compact", stated: 1237 }, text: "התחלה חדשה", locked: false, added: true }];
  const facts = segmentUnit(withGx).segments.map((s) => s.facts).join(" ¦ ");
  assert.ok(/\[b34\] גדעון איזנקוט/.test(facts), "an equation is editable data");
  assert.ok(/\[n1\] ⟨גימטריה: התחלה חדשה · מסתתר · תצוגה מצומצמת⟩/.test(facts));
  assert.deepEqual(parseRazielAnswer("[n1] ניסיון לשכתב", withGx).proposals.map((p) => p.reason), ["not_editable"], "the item is changed only through gematria proposals");
});

test("every task question fits the 300-character subject, with the longest instruction", () => {
  for (const task of [...Object.keys(REVIEW_TASKS), "free"]) {
    const q = buildSegmentQuestion({ task, index: 12, total: 12, free: "ג".repeat(80) });
    assert.ok(q.length <= RAZIEL_REQUEST_LIMITS.question, `${task}: ${q.length}`);
  }
});

test("new operations: retype / align / move / gematria / variants — each with its own fail-closed checks", () => {
  const answer = [
    "מבנה א: הקדמת המסר",
    "[~b12] סוג=כותרת מקטע יישור=מרכז",
    "[>b21] אחרי b8",
    "מבנה ב: שער הגימטריה קודם",
    "[~b7] יישור=שמאל",               // aligning a SOURCE is a display preference: allowed
    "[>b0] אחרי b8",                   // the title is not moved
    "[~b34] סוג=כותרת מקטע",           // data keeps its kind
    "[+g b42] ביטוי: השמאל גנבו הבחירות מיד הימין | שיטה: רגיל | תצוגה: פירוק מלא | מקור: 1237 | של: yaniv-levi",
    "[+g b42] גדעון איזנקוט ראש הממשלה | רגיל | תצוגה מצומצמת",
    "[+g b42] ביטוי בלי שיטה",
    "[b34] גדעון איזנקוט ראש הממשלה = 1237 — מנוסח מחדש",
    "[b10] לא מספר",
  ].join("\n");
  const { proposals } = parseRazielAnswer(answer, base);
  const find = (op, ref, i = 0) => proposals.filter((p) => p.op === op && p.ref === ref)[i];
  assert.deepEqual([find("retype", "b12").kind, find("retype", "b12").align, find("retype", "b12").variant], ["heading", "center", "א"]);
  assert.deepEqual([find("move", "b21").afterRef, find("move", "b21").variant], ["b8", "א"]);
  assert.equal(find("retype", "b7").status, "proposed");
  assert.equal(find("retype", "b7").align, "end");
  assert.equal(find("retype", "b7").variant, "ב");
  assert.equal(find("move", "b0").reason, "title_required");
  assert.equal(find("retype", "b34").reason, "not_editable");
  assert.deepEqual(find("gematria", "b42").item, { phrase: "השמאל גנבו הבחירות מיד הימין", methodKey: "רגיל", display: "full", stated: 1237, by: "yaniv-levi" });
  assert.equal(find("gematria", "b42", 1).item.display, "compact");
  assert.equal(find("gematria", "b42", 2).reason, "bad_gematria");
  assert.equal(find("edit", "b34").status, "proposed", "an equation line is editable data");
  assert.equal(find("edit", "b10").reason, "bad_data", "a focal number must stay a number");
  assert.ok(proposals.filter((p) => p.op === "gematria" && p.status === "proposed").every((p) => !("value" in p.item) && !("result" in p.item)), "Raziel's proposal carries no computed value");
});

test("apply: moves, retypes/aligns, gematria items and edits — only the approved ones, a source is never rewritten", () => {
  const { proposals } = parseRazielAnswer("[~b12] סוג=כותרת מקטע יישור=מרכז\n[>b21] אחרי b8\n[~b7] יישור=שמאל\n[+g b42] השמאל גנבו הבחירות מיד הימין | רגיל | פירוק מלא | 1237\n[b34] גדעון איזנקוט ראש הממשלה = 1237 — מנוסח\n[b9] לא בחרתי", base);
  const approved = proposals.filter((p) => p.ref !== "b9").map((p) => p.id);
  const out = applyProposals(base, proposals, approved);
  assert.equal(out.find((b) => b.id === "b12").kind, "heading");
  assert.equal(out.find((b) => b.id === "b12").align, "center");
  assert.equal(out.findIndex((b) => b.id === "b21"), out.findIndex((b) => b.id === "b8") + 1);
  assert.equal(out.find((b) => b.id === "b7").align, "end");
  assert.equal(out.find((b) => b.id === "b7").text, base.find((b) => b.id === "b7").text, "a source's wording is untouched");
  assert.equal(out.find((b) => b.kind === "gematria").item.display, "full");
  assert.equal(out.findIndex((b) => b.kind === "gematria"), out.findIndex((b) => b.id === "b42") + 1);
  assert.equal(out.find((b) => b.id === "b34").text, "גדעון איזנקוט ראש הממשלה = 1237 — מנוסח");
  assert.equal(out.find((b) => b.id === "b9").text, base.find((b) => b.id === "b9").text, "not approved → unchanged");
  assert.equal(validateBlocks(out, base).ok, true);
  assert.equal(out.length, base.length + 1);
});

test("the report shows EVERY segment: answered, failed or never sent, with accepted and rejected counts — nothing is hidden", () => {
  const plan = segmentUnit(base);
  const answers = [{ ok: true, parsed: parseRazielAnswer("[b8] א!\n[b7] מקור", base) }, { ok: false, error: "unavailable" }];
  const report = segmentReport(plan, answers);
  assert.equal(report.length, plan.segments.length);
  assert.deepEqual(report.slice(0, 2).map((r) => r.status), ["answered", "failed"]);
  assert.ok(report.slice(2).every((r) => r.status === "not_sent"));
  assert.deepEqual([report[0].proposed, report[0].rejected], [1, 1]);
  assert.equal(report[1].error, "unavailable");
});
