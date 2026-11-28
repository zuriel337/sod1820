import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// S1 (27.11.2026): what a person types in an issue report goes to the authorized support store, never into analytics.
const { persistExplicitIssueReport } = await import("../src/lib/issueReport2029.js");
const calls = [];
const client = { rpc: async (name, args) => { calls.push([name, args]); return { error: null }; } };

test("the report text goes to record_feedback and the context beside it carries no text", async () => {
  const payload = { surface: "number", path: "/number/10", viewport: "mobile", auth: "anonymous", interaction_id: "abc", message: "הטקסט שהמבקר הקליד" };
  const r = await persistExplicitIssueReport(payload, client);
  assert.deepEqual(r, { saved: true });
  assert.equal(calls.length, 1);
  const [name, args] = calls[0];
  assert.equal(name, "record_feedback");
  assert.equal(args.p_context, "issue_report");
  assert.equal(args.p_detail, "הטקסט שהמבקר הקליד");
  assert.equal(args.p_visitor, null, "no visitor identifier");
  assert.equal(args.p_target, "number");
  assert.equal("message" in args.p_meta, false, "the free text is not repeated in the meta");
  assert.equal(JSON.stringify(args.p_meta).includes("הטקסט"), false);
});

test("nothing is sent to ingest_event (analytics) and the text is bounded", async () => {
  calls.length = 0;
  await persistExplicitIssueReport({ surface: "post", message: "x".repeat(5000) }, client);
  assert.equal(calls.some(c => c[0] === "ingest_event"), false);
  assert.equal(calls[0][1].p_detail.length, 1000);
});

test("a report without text is still recorded (context only) and a failure is reported to the caller", async () => {
  calls.length = 0;
  await persistExplicitIssueReport({ surface: "post" }, client);
  assert.equal(calls[0][1].p_detail, null);
  await assert.rejects(persistExplicitIssueReport({ surface: "post" }, { rpc: async () => ({ error: new Error("denied") }) }));
});

test("the component sends through the support store only, in every build", () => {
  const src = readFileSync(new URL("../src/components/IssueReport.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\btrack\(/);
  assert.match(src, /return persistExplicitIssueReport\(payload\)/);
  const ev = readFileSync(new URL("../src/lib/events.js", import.meta.url), "utf8");
  assert.doesNotMatch(ev, /p_surface:\s*"issue_report"|persistExplicitIssueReport/, "the entry no longer carries any issue-report writer");
});
