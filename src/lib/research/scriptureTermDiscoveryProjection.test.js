import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchScriptureTermDiscoveryForFindings,
  scriptureTermGroupsFromFindings,
  SCRIPTURE_TERM_MAX_GROUPS,
  SCRIPTURE_TERM_MAX_TERMS,
} from "./scriptureTermDiscoveryProjection.js";

function finding(id, terms, label = "label") {
  return {
    id,
    subject: { key: id, label },
    source: { sourceRef: `posts:${id}` },
    evidence: {
      facts: terms.map((value) => ({ type: "term", value })),
    },
  };
}

test("term groups come only from structured evidence facts, never subject text", () => {
  const groups = scriptureTermGroupsFromFindings([
    {
      ...finding("a", ["חכמה", "בינה"], "משיח דוד should never be parsed"),
      evidence: {
        facts: [
          { type: "term", value: " חָכְמָה " },
          { type: "term", value: "בינה" },
          { type: "other", value: "משיח" },
          { type: "term", value: "יום 358" },
          { type: "term", value: "18:20" },
        ],
      },
    },
    { id: "b", subject: { label: "משיח דוד" }, evidence: { facts: [] } },
  ], { maxTerms: 3 });

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].terms.map((row) => row.sourceTerm), ["חָכְמָה", "בינה"]);
  assert.deepEqual(groups[0].terms.map((row) => row.queryTerm), ["חכמה", "בינה"]);
  assert.equal(groups[0].terms.some((row) => /\d/.test(row.queryTerm)), false, "numeric/clock contamination is not a lexical seed");
  assert.equal(groups[0].sourceFindingRef, "a");
});

test("group and term counts are hard-bounded", () => {
  const rows = Array.from({ length: SCRIPTURE_TERM_MAX_GROUPS + 3 }, (_, i) =>
    finding(`f-${i}`, ["אחד", "שנים", "שלשה", "ארבעה"]),
  );
  const groups = scriptureTermGroupsFromFindings(rows, { maxGroups: 999, maxTerms: 999 });
  assert.equal(groups.length, SCRIPTURE_TERM_MAX_GROUPS);
  assert.equal(groups.every((group) => group.terms.length <= SCRIPTURE_TERM_MAX_TERMS), true);
});

test("lexical discovery keeps terms within the same Finding and never asserts entity identity", async () => {
  const togetherCalls = [];
  const proximityCalls = [];
  const notarikonCalls = [];
  const out = await fetchScriptureTermDiscoveryForFindings([
    finding("a", ["משיח", "דוד"]),
    finding("b", ["נחש"]),
  ], {
    maxGroups: 2,
    fetchToken: async (term) => ({
      term,
      count: 1,
      items: [{ ref: `Token ${term}:1`, text: term, lexicalMatchKind: "exact_token" }],
    }),
    fetchPhrase: async () => ({ count: 0, items: [] }),
    fetchTogether: async (terms) => {
      togetherCalls.push(terms);
      return {
        terms,
        sameVerseCount: 1,
        sameChapterCount: 1,
        sameVerse: [{ ref: "שמואל ב 23:1", text: "דוד ... משיח" }],
        sameChapter: [],
      };
    },
    fetchProximity: async (a, b, { gap }) => {
      proximityCalls.push([a, b, gap]);
      return { terms: [a, b], gap, count: 0, items: [] };
    },
    fetchNotarikon: async (term) => {
      notarikonCalls.push(term);
      return {
        term,
        status: "ready",
        count: term === "משיח" ? 1 : 0,
        rasheiTevot: term === "משיח"
          ? [{ ref: "ישעיהו 1:1", text: "fixture", words: ["מ", "ש", "י", "ח"], kind: "ראשי" }]
          : [],
        sofeiTevot: [],
      };
    },
  });

  assert.deepEqual(togetherCalls, [["משיח", "דוד"]]);
  assert.deepEqual(proximityCalls, [["משיח", "דוד", 6]]);
  assert.deepEqual(notarikonCalls, ["משיח", "דוד", "נחש"]);
  assert.equal(out.results[1].together, null, "single-term Finding must not be mixed with another Finding");
  assert.equal(out.candidates.some((item) => item.discoveryBasis === "notarikon_rashei_tevot"), true);
  assert.equal(out.candidates.every((item) => item.entityIdentityClaim === false), true);
  assert.equal(out.candidates.every((item) => item.truthPromotion === false), true);
  assert.equal(out.governance.crossFindingMixing, false);
  assert.equal(out.governance.semanticProof, false);
});

test("multi-word structured terms use phrase-sequence reader, not token reader", async () => {
  const tokenCalls = [];
  const phraseCalls = [];
  const out = await fetchScriptureTermDiscoveryForFindings([
    finding("a", ["סוד יהוה"]),
  ], {
    fetchToken: async (term) => {
      tokenCalls.push(term);
      return { count: 0, items: [] };
    },
    fetchPhrase: async (term) => {
      phraseCalls.push(term);
      return { count: 1, items: [{ ref: "תהלים 25:14", text: "סוד יהוה ליראיו" }] };
    },
  });

  assert.deepEqual(tokenCalls, []);
  assert.deepEqual(phraseCalls, ["סוד יהוה"]);
  assert.equal(out.candidates[0].discoveryBasis, "lexical_phrase_sequence");
  assert.equal(out.candidates[0].sourceTerm, "סוד יהוה");
});

test("reader failures remain explicit and manufacture no candidate", async () => {
  const out = await fetchScriptureTermDiscoveryForFindings(
    [finding("a", ["חכמה"])],
    {
      fetchToken: async () => { throw new Error("offline"); },
      fetchNotarikon: async () => ({
        status: "ready",
        count: 0,
        rasheiTevot: [],
        sofeiTevot: [],
      }),
    },
  );
  assert.equal(out.results[0].occurrenceResults[0].status, "unavailable");
  assert.deepEqual(out.candidates, []);
});


test("notarikon failure stays isolated from lexical occurrence evidence", async () => {
  const out = await fetchScriptureTermDiscoveryForFindings(
    [finding("a", ["משיח"])],
    {
      fetchToken: async (term) => ({
        term,
        count: 1,
        items: [{ ref: "תהלים 2:2", text: "על יהוה ועל משיחו", lexicalMatchKind: "exact_token" }],
      }),
      fetchNotarikon: async () => { throw new Error("notarikon unavailable"); },
    },
  );

  assert.equal(out.results[0].occurrenceResults[0].status, "ready");
  assert.equal(out.results[0].occurrenceResults[0].notarikon.status, "unavailable");
  assert.equal(out.candidates.some((item) => item.discoveryBasis === "lexical_exact_token"), true);
  assert.equal(out.candidates.some((item) => String(item.discoveryBasis).startsWith("notarikon_")), false);
  assert.equal(out.governance.notarikonInterpretation, false);
});
