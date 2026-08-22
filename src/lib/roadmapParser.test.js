// Tests for roadmapParser.js — run with: node --test src/lib/roadmapParser.test.js
// Zero external dependencies (uses Node's built-in test runner, Node >=18).
// Canonical location (single-engine): this parser is used both by the
// standalone tools/roadmap-map/ dev harness and by the live admin Command
// Center Roadmap tab (src/components/admin/RoadmapMap3D.jsx). Do not fork it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseRoadmap, summarizeCoverage, _internal } from "./roadmapParser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROADMAP_PATH = path.join(__dirname, "..", "..", "SOD1820_MASTER_ROADMAP.md");

function loadRoadmap() {
  return readFileSync(ROADMAP_PATH, "utf8");
}

test("parser does not modify the source file on disk", () => {
  const before = statSync(ROADMAP_PATH);
  const text = loadRoadmap();
  parseRoadmap(text);
  const after = statSync(ROADMAP_PATH);
  assert.equal(before.mtimeMs, after.mtimeMs, "roadmap file mtime changed — parser must be read-only");
  assert.equal(readFileSync(ROADMAP_PATH, "utf8"), text, "roadmap file content changed on disk");
});

test("meta: recognizes the canonical v5.1 header and merge SHA", () => {
  const vm = parseRoadmap(loadRoadmap());
  assert.equal(vm.meta.canonical_status, "CANONICAL");
  assert.equal(vm.meta.version_label, "v5.1");
  assert.match(vm.meta.main_head_sha, /^[0-9a-f]{6,40}$/);
  assert.match(vm.meta.last_reconciled_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(vm.meta.sync_status, "SYNCED");
});

test("active_now: WS-GEMATRIA-CORPUS-PACKAGES is identified with explicit confidence", () => {
  const vm = parseRoadmap(loadRoadmap());
  assert.equal(vm.active_now.workstream_id, "WS-GEMATRIA-CORPUS-PACKAGES");
  assert.equal(vm.active_now.confidence, "explicit");
});

test("workstreams: all 24 canonical WS-* cards are found, each with core fields", () => {
  const vm = parseRoadmap(loadRoadmap());
  assert.equal(vm.workstreams.length, 24);
  const ids = vm.workstreams.map((w) => w.id);
  const expectedSample = [
    "WS-CC",
    "WS-CROSS-ENGINE",
    "WS-ELS-CORPUS",
    "WS-ELS-REGRESSION",
    "WS-ELS-IDENTITY",
    "WS-ELS-FSS",
    "WS-ELS-WORKAREA",
    "WS-ELS-CAPABILITY-AUDIT",
    "WS-GEMATRIA-CORPUS-PACKAGES",
    "WS-GAMMA",
    "WS-URC",
    "WS-SEC",
    "WS-LEDGER-REVIEW",
    "WS-JUDGE-UNIFICATION",
    "WS-RAZIEL",
    "WS-MASTERSTATE",
    "WS-PERSON",
    "WS-KU3D",
    "WS-FEATURE-CONTROL",
    "WS-NUMBER-LANGUAGE",
    "WS-NAMELAB",
    "WS-TIME-DISAMBIGUATION",
    "WS-READ-COMPOSER",
    "WS-RESEARCH-OBJECT-FRAMEWORK",
  ];
  for (const id of expectedSample) {
    assert.ok(ids.includes(id), `expected workstream ${id} to be parsed`);
  }
  for (const ws of vm.workstreams) {
    for (const field of _internal.CORE_FIELDS) {
      assert.ok(ws.fields[field] !== null, `${ws.id} missing core field ${field}`);
    }
  }
});

test("group_hint is a naive id-derived hint, not a canonical world", () => {
  const vm = parseRoadmap(loadRoadmap());
  const els = vm.workstreams.filter((w) => w.id.startsWith("WS-ELS-"));
  assert.ok(els.length >= 5);
  for (const w of els) assert.equal(w.group_hint, "ELS");
  const cc = vm.workstreams.find((w) => w.id === "WS-CC");
  assert.equal(cc.group_hint, "CC");
});

test("Gate #4 and Gate #18 are both OPEN_INTAKE_CRITICAL", () => {
  const vm = parseRoadmap(loadRoadmap());
  const gate4 = vm.open_human_gates.find((g) => g.number === 4);
  const gate18 = vm.open_human_gates.find((g) => g.number === 18);
  assert.ok(gate4, "gate #4 not found");
  assert.ok(gate18, "gate #18 not found");
  assert.equal(gate4.status, "OPEN_INTAKE_CRITICAL");
  assert.equal(gate4.status_confidence, "high");
  assert.equal(gate18.status, "OPEN_INTAKE_CRITICAL");
  assert.equal(gate18.status_confidence, "high");
  // both carry the explicit resume-point chain
  assert.deepEqual(gate4.return_point_chain, [
    "Gematria packages organized",
    "Gate #4",
    "Gate #18",
    "Intake build",
  ]);
  assert.deepEqual(gate18.return_point_chain, gate4.return_point_chain);
});

test("closed gates (#1, #2, #3) are never misidentified as open", () => {
  const vm = parseRoadmap(loadRoadmap());
  for (const n of [1, 2, 3]) {
    const gate = vm.open_human_gates.find((g) => g.number === n);
    assert.ok(gate, `gate #${n} not found`);
    assert.equal(gate.status, "CLOSED", `gate #${n} should be CLOSED`);
    assert.equal(gate.status_confidence, "high");
  }
});

test("gates without an explicit tag default to OPEN via structural_inference, not a content guess", () => {
  const vm = parseRoadmap(loadRoadmap());
  const gate5 = vm.open_human_gates.find((g) => g.number === 5); // "corpus_id תנ״ך" — plain bullet, no tag
  assert.ok(gate5);
  assert.equal(gate5.status, "OPEN");
  assert.equal(gate5.status_confidence, "structural_inference");
});

test("open_human_gates: all 20 numbered items are captured", () => {
  const vm = parseRoadmap(loadRoadmap());
  const numbers = vm.open_human_gates.map((g) => g.number).sort((a, b) => a - b);
  assert.deepEqual(numbers, Array.from({ length: 20 }, (_, i) => i + 1));
});

test("decision_register: rows are parsed with correct column count and closed-row detection", () => {
  const vm = parseRoadmap(loadRoadmap());
  assert.ok(vm.decision_register.length >= 9);
  const g4Row = vm.decision_register.find((r) => r.gate_ref === "#4");
  assert.ok(g4Row, "Decision Register row for #4 not found");
  assert.equal(g4Row.closed, false);
  const g2Row = vm.decision_register.find((r) => r.gate_ref_raw.includes("#2"));
  assert.ok(g2Row);
  assert.equal(g2Row.closed, true);
});

test("dependency_edges: only explicit backtick WS-id refs become edges, and all resolve to known ids", () => {
  const vm = parseRoadmap(loadRoadmap());
  assert.ok(vm.dependency_edges.length > 0);
  const knownIds = new Set(vm.workstreams.map((w) => w.id));
  for (const edge of vm.dependency_edges) {
    assert.ok(knownIds.has(edge.from), `edge.from ${edge.from} is not a known workstream id`);
    assert.ok(knownIds.has(edge.to), `edge.to ${edge.to} is not a known workstream id`);
    assert.equal(edge.source, "DEPENDENCIES_field");
  }
  // spot-check one real, known dependency from the file
  const elsIdentityCorpus = vm.dependency_edges.find(
    (e) => e.from === "WS-ELS-IDENTITY" && e.to === "WS-ELS-CORPUS"
  );
  assert.ok(elsIdentityCorpus, "expected WS-ELS-IDENTITY -> WS-ELS-CORPUS dependency edge");
});

test("the one real warning (WS-ELS-IDENTITY -> WS-TANAKH) appears BOTH globally and on the card's own parse_warnings", () => {
  const vm = parseRoadmap(loadRoadmap());
  assert.ok(
    vm.warnings.some((w) => w.scope === "workstream" && w.id === "WS-ELS-IDENTITY" && w.code === "dependency_ref_unknown_id")
  );
  const ws = vm.workstreams.find((w) => w.id === "WS-ELS-IDENTITY");
  assert.ok(
    ws.parse_warnings.some((w) => w.code === "dependency_ref_unknown_id" && w.detail === "WS-TANAKH"),
    "expected the cross-referenced dependency warning to be backfilled onto the card's own parse_warnings (for a per-card UI badge)"
  );
});

test("gate_mentions: extracted from HUMAN_GATE/WHAT_IS_OPEN only, as a mention signal (not a governance claim)", () => {
  const vm = parseRoadmap(loadRoadmap());
  const byId = Object.fromEntries(vm.workstreams.map((w) => [w.id, w]));
  assert.deepEqual(byId["WS-ELS-IDENTITY"].gate_mentions, [4]);
  assert.deepEqual(byId["WS-JUDGE-UNIFICATION"].gate_mentions, [18]);
  assert.deepEqual(byId["WS-CC"].gate_mentions, [9]);
  assert.deepEqual(byId["WS-ELS-CAPABILITY-AUDIT"].gate_mentions, [15]);
  assert.deepEqual(byId["WS-NAMELAB"].gate_mentions, [17]);
  assert.deepEqual(byId["WS-RESEARCH-OBJECT-FRAMEWORK"].gate_mentions, [20]);
  // WS-SEC mentions "Gate #18" only as a dateline for when 2 unrelated security
  // findings were found (Gate #18 crosswalk) — NOT because Gate #18 governs
  // WS-SEC. gate_mentions surfaces it honestly as a mention; a UI must label
  // it as such, not as "this workstream's gate".
  assert.deepEqual(byId["WS-SEC"].gate_mentions, [18]);
  // a card with no gate mention anywhere in those two fields -> empty array, not null/guessed.
  assert.deepEqual(byId["WS-ELS-REGRESSION"].gate_mentions, []);
});

test("STATE tags: WS-JUDGE-UNIFICATION carries both a known tag and the newer unclassified INTAKE-CRITICAL-style tag correctly bucketed", () => {
  const vm = parseRoadmap(loadRoadmap());
  const ws = vm.workstreams.find((w) => w.id === "WS-JUDGE-UNIFICATION");
  assert.ok(ws.fields.STATE);
  assert.ok(ws.fields.STATE.known_tags.includes("DB-LIVE"));
  assert.ok(ws.fields.STATE.known_tags.includes("OPEN-HUMAN-GATE"));
  assert.ok(ws.fields.STATE.known_tags.includes("INTAKE-CRITICAL"));
});

test("ambiguity: a synthetic malformed card produces a warning, not a guessed value", () => {
  const synthetic = [
    "# 🧭 SOD1820 — מפת־העל התפעולית (MASTER ROADMAP) · v5 DRAFT",
    "> test blockquote, no sha, no clear canonical marker",
    "",
    "## 🕒 טריות המפה (FRESHNESS)",
    "- **LAST_RECONCILED:** not-a-date",
    "",
    "## 🔵 ACTIVE_NOW",
    "> **📍 איפה אני:** two ids mentioned: `WS-FOO` and `WS-BAR`",
    "",
    "## 🗂️ מרשם ה־Workstreams",
    "### WS-FOO — a test workstream",
    "- **WHERE_WE_ARE:** testing",
    "- **STATE:** completely unrecognized free text with no tags at all",
    "",
    "## 🚪 שערי־צוריאל פתוחים (OPEN HUMAN-GATES)",
    "1. ~~Some old gate~~ (no closed confirmation text)",
    "",
  ].join("\n");

  const vm = parseRoadmap(synthetic);

  // canonical_status: neither "(קנוני)" nor "DRAFT-with-space-before" matched cleanly by our
  // strict title regex in this synthetic string containing "v5 DRAFT" -> should resolve DRAFT.
  assert.equal(vm.meta.canonical_status, "DRAFT");

  // LAST_RECONCILED present but not a parseable date -> null + warning, never a guessed date.
  assert.equal(vm.meta.last_reconciled_date, null);
  assert.ok(
    vm.warnings.some((w) => w.code === "last_reconciled_date_not_found"),
    "expected a warning for the unparseable date"
  );

  // ACTIVE_NOW anchor line mentions two WS-ids -> ambiguous, no guess.
  assert.equal(vm.active_now.workstream_id, null);
  assert.equal(vm.active_now.confidence, "ambiguous");
  assert.ok(vm.warnings.some((w) => w.code === "active_now_multiple_ws_ids"));

  // STATE with no recognizable tag at all -> warning, empty tag arrays, no invented status.
  const ws = vm.workstreams.find((w) => w.id === "WS-FOO");
  assert.deepEqual(ws.fields.STATE.known_tags, []);
  assert.deepEqual(ws.fields.STATE.unclassified_tags, []);
  assert.ok(ws.parse_warnings.some((w) => w.code === "no_recognized_status_tag"));

  // Gate with strikethrough but no "✅ נסגר" confirmation -> UNKNOWN, not silently CLOSED or OPEN.
  const gate = vm.open_human_gates[0];
  assert.equal(gate.status, "UNKNOWN");
  assert.equal(gate.status_confidence, "ambiguous");
  assert.ok(vm.warnings.some((w) => w.code === "strikethrough_without_closed_confirmation"));
});

test("summarizeCoverage returns sane counters for the real file", () => {
  const vm = parseRoadmap(loadRoadmap());
  const cov = summarizeCoverage(vm);
  assert.equal(cov.workstreams, 24);
  assert.equal(cov.workstreams_with_warnings, 1);
  assert.equal(cov.gates, 20);
  assert.equal(cov.gates_closed, 3);
  assert.equal(cov.gates_open, 17);
  assert.ok(cov.dependency_edges > 0);
  assert.ok(cov.decision_register_rows >= 9);
});
