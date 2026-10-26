import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLifeJourneySynthesisPack,
  LIFE_JOURNEY_SYNTHESIS_PACK_VERSION,
} from "./lifeJourneySynthesisPack.js";

const PRIVATE_REF = "person:private-owner:p:child-secret";

const research = {
  state: "ready",
  rows: [{ memberRef: PRIVATE_REF, name: "שם פרטי סודי", state: "ready" }],
  methodFindings: [{ id: "method:1", value: 337 }],
  relationRows: [{ id: "relation:1" }],
  connections: [{ id: "connection:1", independentGroupCount: 2 }],
  sharedValues: [{ value: 337, count: 2 }],
  sourceResearch: { coverage: { verseCount: 3, equalPhraseCount: 4 } },
  coverage: { expressionCount: 8, methodValueCount: 16, relationCount: 1, connectionCount: 1 },
};

const birthResult = {
  humanDesign: {
    type: "Generator",
    authority: "Sacral Authority",
    profile: "3/5",
    definition: "Single Definition",
    definedCenters: [{ key: "sacral" }],
    definedChannels: [{ key: "1-8" }],
    activatedGates: [1, 8, 14],
  },
  sky: {
    angles: {
      ascendant: { sign: "Aries", degree: 2.4 },
      midheaven: { sign: "Capricorn", degree: 5.1 },
    },
    bodies: [{ key: "sun" }, { key: "moon" }],
    aspects: [{ kind: "trine" }],
  },
  trace: { engine: "natalengine", engineVersion: "1.6.0", inputEchoed: false },
};

test("one synthesis pack separates verified evidence from zero-weight birth and Tarot auxiliaries", () => {
  const out = buildLifeJourneySynthesisPack({
    research,
    analysis: { state: "ready", data: { message: "מסר קפוא", claims: [{ id: "claim:1" }] } },
    birthReflections: new Map([[PRIVATE_REF, birthResult]]),
    selectedRefs: [PRIVATE_REF],
    interpreterFacts: "עובדות מנוע אנונימיות בלבד",
  });

  assert.equal(out.version, LIFE_JOURNEY_SYNTHESIS_PACK_VERSION);
  assert.equal(out.state, "synthesized");
  assert.equal(out.evidence.methodValueCount, 16);
  assert.equal(out.evidence.normalizedIndependentGroupCount, 2);
  assert.equal(out.evidence.verseCount, 3);
  assert.equal(out.auxiliary.humanDesignCount, 1);
  assert.equal(out.auxiliary.skyCount, 1);
  assert.equal(out.auxiliary.tarot.state, "internal_post_freeze");
  assert.equal(out.auxiliary.tarot.evidenceWeight, 0);
  assert.equal(out.auxiliary.birthLenses[0].participant, "participant-1");
  assert.equal(out.auxiliary.birthLenses[0].humanDesign.evidenceWeight, 0);
  assert.equal(out.auxiliary.birthLenses[0].sky.evidenceWeight, 0);
  assert.equal(out.synthesis.auxiliaryCanModifyMessage, false);
  assert.equal(out.interpreter.facts, "עובדות מנוע אנונימיות בלבד");
  assert.equal(out.interpreter.birthLensDetailsIncluded, false);
  assert.equal(out.boundaries.no_els, true);
});

test("the pack emits no raw private identity, birth input, place or coordinates", () => {
  const out = buildLifeJourneySynthesisPack({
    research,
    birthReflections: {
      [PRIVATE_REF]: {
        ...birthResult,
        forbiddenInput: {
          name: "שם פרטי סודי",
          date: "2001-02-03",
          time: "04:05",
          place: "ירושלים",
          coordinates: [31.7683, 35.2137],
        },
      },
    },
    selectedRefs: [PRIVATE_REF],
  });
  const serialized = JSON.stringify(out);

  for (const privateValue of [PRIVATE_REF, "שם פרטי סודי", "2001-02-03", "04:05", "ירושלים", "31.7683", "35.2137"]) {
    assert.equal(serialized.includes(privateValue), false, `must not expose ${privateValue}`);
  }
  assert.equal(out.boundaries.no_person_ref, true);
  assert.equal(out.boundaries.no_birth_date_or_time, true);
  assert.equal(out.boundaries.no_place_or_coordinates, true);
  assert.equal(out.boundaries.no_url_or_telemetry, true);
});

test("unselected calculations never enter the active synthesis pack", () => {
  const out = buildLifeJourneySynthesisPack({
    research,
    birthReflections: new Map([[PRIVATE_REF, birthResult]]),
    selectedRefs: ["person:private-owner:self"],
  });

  assert.equal(out.auxiliary.birthLenses.length, 0);
  assert.equal(out.auxiliary.humanDesignCount, 0);
  assert.equal(out.auxiliary.skyCount, 0);
});
