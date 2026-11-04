import test from "node:test";
import assert from "node:assert/strict";

import { makeUniversalFinding } from "./universalFinding.js";
import {
  NUMBER_PHRASE_PRESENTATION_AUTHORITY,
  mergeNumberPhrasePresentationOrder,
} from "./numberPhrasePresentationOrder.js";

function existingFinding(id, phrase, method = "רגיל", value = 776) {
  return makeUniversalFinding({
    id,
    kind: "gematria",
    subject: { type: "phrase", key: phrase, label: phrase, value, lang: "he" },
    source: { engine: "gematria", adapter: "number-lookup-v1", sourceRef: `bidim:${id}`, method, lang: "he" },
    identity: { sourceIdentity: { bidId: id } },
    verification: { engine_method_tested: method, engine_result: value, verification_state: "not_tested" },
    access: { tier: "public" },
  });
}

function row(id, phrase, rank, overrides = {}) {
  return {
    id,
    phrase,
    ragil: 776,
    lead_rank: rank,
    is_verified: true,
    is_published: true,
    is_encrypted: false,
    created_at: "2026-10-22T00:00:00.000Z",
    ...overrides,
  };
}

test("existing Regular Finding is ranked without duplication and precedes other methods", () => {
  const regular = existingFinding("bid-regular", "ביאת המשיח");
  const otherMethod = existingFinding("bid-other", "ביאת המשיח", "מסתתר");
  const original = [otherMethod, regular];
  const out = mergeNumberPhrasePresentationOrder({
    findings: original,
    rows: [row("gw-1", "ביאת המשיח", 1)],
    number: 776,
  });

  assert.deepEqual(out.findings, [regular, otherMethod]);
  assert.equal(out.added_count, 0);
  assert.deepEqual(out.ranking.map((entry) => [entry.finding_id, entry.rank]), [["bid-regular", 1]]);
  assert.equal(out.ranking[0].axes.authority, NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref);
  assert.equal(out.ranking[0].axes.presentation_scope, "equal_regular_phrase_prominence");
});

test("missing lead rows become public corpus Findings in manual order without recalculation", () => {
  const out = mergeNumberPhrasePresentationOrder({
    findings: [existingFinding("unranked", "אותיות אחרי", "אותיות אחרי")],
    rows: [
      row("gw-2", "מחשבת יהוה", 2),
      row("gw-1", "ביאת המשיח", 1),
    ],
    number: 776,
  });

  assert.equal(out.added_count, 2);
  assert.deepEqual(out.findings.map((finding) => finding.subject.label), ["ביאת המשיח", "מחשבת יהוה", "אותיות אחרי"]);
  assert.deepEqual(out.ranking.map((entry) => entry.rank), [1, 2]);
  const lead = out.findings.find((finding) => finding.subject.label === "ביאת המשיח");
  assert.equal(lead.source.sourceRef, "gematria_words:gw-1");
  assert.equal(lead.source.method, "רגיל");
  assert.equal(lead.verification.engine_result, null);
  assert.equal(lead.verification.verification_state, null);
  assert.equal(lead.evidence.facts[0].lead_rank, 1);
});

test("wrong number and non-public rows fail closed while unranked Regular rows remain visible", () => {
  const rows = [
    row("good", "ביאת המשיח", 1),
    row("dup", "ביאת המשיח", 2),
    row("wrong-number", "1820", 3, { ragil: 1820 }),
    row("draft", "טיוטה", 4, { is_published: false }),
    row("unverified", "לא מאומת", 5, { is_verified: false }),
    row("encrypted", "מוצפן", 6, { is_encrypted: true }),
    row("no-rank", "ללא סדר", null),
  ];
  const out = mergeNumberPhrasePresentationOrder({ findings: [], rows, number: 776 });

  assert.equal(out.row_count, 2);
  assert.equal(out.findings.length, 2);
  assert.equal(out.findings[0].subject.label, "ביאת המשיח");
  assert.equal(out.findings[1].subject.label, "ללא סדר");
  assert.equal(out.ranking.length, 1);
  assert.equal(out.findings[1].evidence.facts[0].authority, "public.gematria_words");
  assert.equal(out.findings[1].evidence.facts[0].lead_rank, null);
});

test("future hierarchy edits reuse the same authority and deterministically change only ranking", () => {
  const rows = [row("a", "א", 2), row("b", "ב", 1)];
  const first = mergeNumberPhrasePresentationOrder({ findings: [], rows, number: 776 });
  const edited = mergeNumberPhrasePresentationOrder({
    findings: [],
    rows: rows.map((item) => ({ ...item, lead_rank: item.lead_rank === 1 ? 2 : 1 })),
    number: 776,
  });

  assert.deepEqual(first.ranking.map((entry) => entry.rank), [1, 2]);
  assert.deepEqual(first.ranking.map((entry) => first.findings.find((finding) => finding.id === entry.finding_id).subject.label), ["ב", "א"]);
  assert.deepEqual(edited.ranking.map((entry) => edited.findings.find((finding) => finding.id === entry.finding_id).subject.label), ["א", "ב"]);
  assert.equal(first.findings.every((finding) => finding.evidence.facts[0].authority === NUMBER_PHRASE_PRESENTATION_AUTHORITY.ref), true);
});
