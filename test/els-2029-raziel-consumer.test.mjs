import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildElsRazielSurfaceContext } from "../src/lib/research/elsRazielContext.js";

const page = readFileSync(new URL("../src/pages/Els2029Page.jsx", import.meta.url), "utf8");
const frame = readFileSync(new URL("../src/components/experience2029/SystemFrame2029.jsx", import.meta.url), "utf8");

test("ELS opens the existing 2029 Raziel panel only from canonical MATCH-derived layers", () => {
  assert.match(page, /use2029Shell/);
  assert.match(page, /buildElsRazielSurfaceContext/);
  assert.match(page, /ready=\{replayMatched && layeredReady\}/);
  assert.match(page, /razielMicroIntent: "explain_els_occurrence"/);
  assert.match(page, /elsSurfaceContext: surfaceContext/);
  assert.match(page, /surfaceContext\?\.occurrence\?\.occurrenceRef/);
  assert.doesNotMatch(page, /surfaceContext\?\.occurrence\?\.occurrenceId/);
  assert.match(page, /disabled=\{!available\}/);
  assert.doesNotMatch(page, /includeText:\s*true/);
  assert.doesNotMatch(page, /askRazielAdvanced|askRaziel\s*\(/);
});

test("canonical System Frame Raziel consumer accepts bounded ELS context without creating a second Raziel component", () => {
  assert.match(frame, /function RazielProjection\(/);
  assert.match(frame, /elsSurfaceContext = null/);
  assert.match(frame, /payload\?\.elsSurfaceContext/);
  assert.match(frame, /elsSurfaceContext=\{transient\?\.payload\?\.elsSurfaceContext \|\| null\}/);
  assert.match(frame, /data-raziel-els-context="true"/);
  assert.match(frame, /result\?\.contract === "els_2029_projection_v1"/);
  assert.match(frame, /result\?\.status === "OK"/);
  assert.match(frame, /result\?\.presentationPolicy === "exact_replay_v1"/);
  assert.match(frame, /Context בלבד · הצגה\/קרבה חזותית אינה חוזק ראיה/);
  assert.equal((frame.match(/function RazielProjection\(/g) || []).length, 1);
  assert.doesNotMatch(frame, /askRazielAdvanced|askRaziel\s*\(|functions\.invoke\(['"]ai-analyze/);
});

test("ELS Raziel panel is context-only; full conversation remains explicitly inactive", () => {
  assert.match(frame, /השיחה המלאה עם רזיאל תחובר בהמשך/);
  assert.match(frame, /<button className="sod29-action primary" type="button" disabled/);
  assert.doesNotMatch(frame, /onClick=\{[^}]*askRaziel/);
  assert.doesNotMatch(page, /synthesisPreview|razielRouteAction|local_message/);
});

test("ELS Raziel surface context remains text-private by default and carries no truth/evidence score", () => {
  const out = buildElsRazielSurfaceContext({
    researchContext: {
      lens: "els",
      subject: { id: "subject:private", type: "phrase", label: "טקסט פרטי", href: "/els" },
    },
    projection: {
      contract: "els_2029_projection_v1",
      status: "OK",
      corpusId: "torah-v1",
      term: "משיח",
      completion: { totalHits: 1, returnedHits: 1, truncated: false },
      presentation: { policy: "exact_replay_v1", representative: true },
      selectedOccurrence: {
        occurrenceId: "els:torah-v1:משיח:17:1:100",
        corpusId: "torah-v1",
        skip: 17,
        dir: 1,
        start: 100,
        end: 151,
        positions: [100,117,134,151],
        dependencyGroup: "g1",
        coordinateConvention: "zero_based_character_index",
      },
    },
  });
  assert.equal(out.surface, "els");
  assert.equal(out.privacy.includeText, false);
  assert.equal("text" in out, false);
  assert.match(out.subject.ref, /^anon:/);
  assert.equal("id" in out.subject, false);
  assert.equal("href" in out.subject, false);
  assert.equal("label" in out.subject, false);
  assert.equal("term" in out.result, false);
  assert.equal("truth" in out, false);
  assert.equal("evidenceWeight" in out, false);
});

console.log("ELS 2029 Raziel consumer V1 contract: PASS");
