import test from "node:test";
import assert from "node:assert/strict";
import {
  projectLifeJourneyMemberSources,
  projectLifeJourneyNumberSources,
  runLifeJourneyFamilySourceResearch,
} from "./lifeJourneyFamilySourceResearch.js";

test("member source projection keeps canonical references and drops ELS completely", () => {
  const out = projectLifeJourneyMemberSources("person:owner:p:1", {
    name_verse: { verses: [
      { ref: "בראשית 1:1", text: "בראשית ברא" },
      { ref: "שמות 2:3", text: "ותקח לו תבת גמא" },
      { ref: "ויקרא 3:4", text: "לא יישמר בגלל הגבול" },
    ] },
    consensus: [{ type: "מילה", target: "אור", consensus: 3, families: ["גימטריה", "שורש", "מילולי"] }],
    tracks: [
      { id: "name_verse", label: "הפסוק שלך", status: "ok", count: 6, evidence: "direct", source_fn: "fn_name_verse" },
      { id: "combo_gem", label: "גימטריית הצירוף", status: "ok", count: 9, evidence: "value_match", source_fn: "fn_verses_by_gematria" },
      { id: "els", label: "דילוגים", status: "ok", count: 5, source_fn: "fn_els_search" },
    ],
  });
  assert.equal(out.verses.length, 2);
  assert.deepEqual(out.tracks.map(row => row.id), ["name_verse", "combo_gem"]);
  assert.equal(JSON.stringify(out).includes("fn_els_search"), false);
  assert.equal(out.consensus[0].independentFamilyCount, 3);
});

test("number source projection deduplicates phrases but preserves method and source provenance", () => {
  const out = projectLifeJourneyNumberSources(337, [
    { bid_id: "b1", phrase: "אור", method: "רגיל", value: 337, method_governed: true },
    { bid_id: "b2", phrase: "אור", method: "מילוי", value: 337, method_governed: true },
    { bid_id: "b3", phrase: "שלום", method: "רגיל", value: 337, method_governed: false },
    { bid_id: "wrong", phrase: "לא שייך", method: "רגיל", value: 12 },
  ]);
  assert.equal(out.phrases.length, 2);
  assert.deepEqual(out.phrases[0].methods, ["מילוי", "רגיל"]);
  assert.deepEqual(out.phrases[0].sourceRefs, ["bidim:b1", "bidim:b2"]);
  assert.equal(out.phrases[0].evidence, "value_match");
});

test("explicit family source pass is bounded, calls only existing non-ELS readers and reports coverage", async () => {
  const nameCalls = [];
  const numberCalls = [];
  const out = await runLifeJourneyFamilySourceResearch({
    members: [
      { memberRef: "p:1", fullName: "אדם ראשון" },
      { memberRef: "p:2", fullName: "אדם שני" },
    ],
    research: {
      state: "ready",
      sharedValues: [{ value: 337 }],
      rows: [
        { state: "ready", data: { fullValue: 337 } },
        { state: "ready", data: { fullValue: 73 } },
      ],
    },
    readers: {
      readName: async name => {
        nameCalls.push(name);
        return { name_verse: { verses: [{ ref: "תהלים 1:1", text: "אשרי האיש" }] }, tracks: [{ id: "els", count: 1, source_fn: "fn_els_search" }] };
      },
      readNumber: async value => {
        numberCalls.push(value);
        return [{ bid_id: `b:${value}`, phrase: `ביטוי ${value}`, method: "רגיל", value }];
      },
    },
  });
  assert.deepEqual(nameCalls, ["אדם ראשון", "אדם שני"]);
  assert.deepEqual(numberCalls, [337, 73]);
  assert.equal(out.coverage.verseCount, 2);
  assert.equal(out.coverage.equalPhraseCount, 2);
  assert.equal(out.boundaries.no_els, true);
  assert.equal(JSON.stringify(out).includes("fn_els_search"), false);
});
