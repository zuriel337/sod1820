import test from "node:test";
import assert from "node:assert/strict";
import { gematriaApiResultToFindings } from "./canonicalGematriaProjection.js";
import {
  projectLifeJourneyNameResearch,
  runLifeJourneyNameResearch,
} from "./lifeJourneyNameResearch.js";

const CREATED_AT = "2026-10-25T00:00:00.000Z";

function canonicalFindings(name = "שָׁאוּל") {
  return gematriaApiResultToFindings({
    input: name,
    methods: { ragil: 337, miluy: 567, misratar: 328 },
  }, { inputText: name, createdAt: CREATED_AT });
}

function nameDocument() {
  return {
    tracks_with_results: 2,
    tracks: [
      { id: "variants", status: "ok", data: [{ form: "שאול", note: "כתיב" }, { form: "שָׁאוּל", note: "מנוקד" }] },
      { id: "anagrams", status: "ok", data: [{ part: "שאול", anagrams: [{ word: "שאול", type: "exact" }] }] },
      { id: "els", status: "skipped", ran: false, count: 0 },
    ],
  };
}

test("name research preserves raw input, uses canonical Gematria Findings and dedupes only display rows", () => {
  const result = projectLifeJourneyNameResearch({
    name: "שָׁאוּל",
    gematriaFindings: canonicalFindings(),
    nameDocument: nameDocument(),
  });

  assert.equal(result.rawName, "שָׁאוּל");
  assert.equal(result.normalizedName, "שאול");
  assert.equal(result.regularValue, 337);
  assert.deepEqual(result.methodFindings.map(row => [row.methodKey, row.value]), [
    ["ragil", 337], ["miluy", 567], ["misratar", 328],
  ]);
  assert.equal(result.methodFindings.every(row => row.finding.source.adapter === "gematria-api-v1"), true);
  assert.equal(result.nameLabFindings.length, 3, "source-native NameLab Findings remain distinct");
  assert.equal(result.displayFindings.length, 1, "only the display projection dedupes normalized spellings");
  assert.equal(result.displayFindings[0].provenance.length, 3, "raw provenance is retained");
});

test("name research fails closed if the existing NameLab boundary reports that ELS ran", () => {
  assert.throws(() => projectLifeJourneyNameResearch({
    name: "שאול",
    gematriaFindings: canonicalFindings("שאול"),
    nameDocument: { tracks: [{ id: "els", status: "ok", ran: true, count: 1 }] },
  }), /life_journey_name_research_els_boundary/);
});

test("runtime calls each existing provider once and creates no parallel calculation", async () => {
  const calls = [];
  const result = await runLifeJourneyNameResearch(" שאול ", {
    fetchGematria: async name => { calls.push(["gematria", name]); return canonicalFindings(name); },
    fetchNameLab: async name => { calls.push(["name_lab", name]); return nameDocument(); },
  });

  assert.deepEqual(calls, [["gematria", "שאול"], ["name_lab", "שאול"]]);
  assert.equal(result.regularValue, 337);
});
