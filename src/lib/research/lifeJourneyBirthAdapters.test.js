import assert from "node:assert/strict";
import test from "node:test";
import {
  LIFE_JOURNEY_BIRTH_ADAPTER_VERSION,
  calculateLifeJourneyBirthMap,
  resolveHistoricalUtcOffset,
  validateLifeJourneyBirthInput,
} from "./lifeJourneyBirthAdapters.js";

const fixture = Object.freeze({
  birthdate: "1972-08-02",
  birthtime: "14:30",
  timezone: "Asia/Bangkok",
  latitude: "13.75",
  longitude: "100.51",
});

test("validates an IANA timezone and explicit coordinates", () => {
  assert.deepEqual(validateLifeJourneyBirthInput(fixture), {
    birthdate: "1972-08-02",
    birthtime: "14:30",
    timezone: "Asia/Bangkok",
    location: { lat: 13.75, lng: 100.51 },
  });
  assert.throws(() => validateLifeJourneyBirthInput({ ...fixture, timezone: "Jerusalem" }), /timezone_invalid/);
  assert.throws(() => validateLifeJourneyBirthInput({ ...fixture, birthdate: "2026-02-30" }), /birthdate_invalid/);
  assert.throws(() => validateLifeJourneyBirthInput({ ...fixture, longitude: "" }), /coordinates_incomplete/);
  assert.throws(() => validateLifeJourneyBirthInput({ ...fixture, latitude: "91" }), /latitude_out_of_range/);
});

test("computes the published golden Human Design and sky fixture locally", async () => {
  const result = await calculateLifeJourneyBirthMap(fixture);
  assert.equal(result.version, LIFE_JOURNEY_BIRTH_ADAPTER_VERSION);
  assert.equal(result.humanDesign.type, "Manifesting Generator");
  assert.equal(result.humanDesign.authority, "Sacral Authority");
  assert.equal(result.humanDesign.profile, "3/5");
  assert.equal(result.humanDesign.typeLabel, "מחולל יוזם (Manifesting Generator)");
  assert.equal(result.humanDesign.profileLabel, "3/5 · מתנסה / פותר בעיות");
  assert.equal(result.humanDesign.definition, "Single Definition");
  assert.equal(result.humanDesign.strategyLabel, "להמתין לתגובה ואז ליידע");
  assert.equal(result.humanDesign.definitionLabel, "הגדרה אחידה");
  assert.ok(result.humanDesign.activatedGates.includes(33));
  assert.equal(result.sky.angles.ascendant.sign, "Sagittarius");
  assert.equal(result.sky.angles.midheaven.sign, "Virgo");
  assert.equal(result.sky.coordinateSource, "explicit_session_coordinates");
  assert.equal(result.trace.execution, "local_browser_only");
  assert.equal(result.trace.inputEchoed, false);
  assert.equal("input" in result, false);
  assert.equal(JSON.stringify(result).includes(fixture.birthdate), false);
  assert.equal(JSON.stringify(result).includes(fixture.birthtime), false);
  assert.equal(JSON.stringify(result).includes(fixture.timezone), false);
});

test("returns Human Design without claiming a sky map when coordinates are absent", async () => {
  const result = await calculateLifeJourneyBirthMap({
    birthdate: fixture.birthdate,
    birthtime: fixture.birthtime,
    timezone: fixture.timezone,
  });
  assert.equal(result.humanDesign.type, "Manifesting Generator");
  assert.equal(result.sky, null);
  assert.equal(result.trace.explicitCoordinates, false);
});

test("matches five independent Human Design reference summaries across historical timezones", async () => {
  const references = [
    ["1992-12-09", "00:35", "Europe/Brussels", "Manifestor", "1/3", 26, 47],
    ["1969-03-11", "03:00", "America/Chicago", "Projector", "4/6", 22, 26],
    ["1960-09-12", "07:35", "America/Los_Angeles", "Manifesting Generator", "3/6", 47, 45],
    ["1974-08-02", "12:00", "America/Boise", "Generator", "3/5", 33, 24],
    ["1970-06-04", "04:00", "Europe/Warsaw", "Manifesting Generator", "2/4", 35, 63],
  ];
  for (const [birthdate, birthtime, timezone, type, profile, personalitySun, designSun] of references) {
    const result = await calculateLifeJourneyBirthMap({ birthdate, birthtime, timezone });
    assert.equal(result.humanDesign.type, type, `${birthdate} type`);
    assert.equal(result.humanDesign.profile, profile, `${birthdate} profile`);
    assert.equal(result.humanDesign.activatedGates.includes(personalitySun), true, `${birthdate} personality sun gate`);
    assert.equal(result.humanDesign.activatedGates.includes(designSun), true, `${birthdate} design sun gate`);
  }
  assert.equal(resolveHistoricalUtcOffset("1974-08-02", "12:00", "America/Boise"), -6);
});

test("keeps the engine behind an injectable narrow adapter", async () => {
  let received = null;
  const result = await calculateLifeJourneyBirthMap(fixture, {
    loadEngine: async () => ({
      calculateHumanDesign(date, hour, offset, options) {
        received = { date, hour, offset, options };
        return {
          type: { name: "Reflector", strategy: "Wait" },
          authority: { name: "Lunar Authority" },
          profile: { numbers: "1/3" },
          definition: "No Definition",
          gates: { all: [] },
          channels: [],
          centers: { defined: [], allUndefinedNames: ["head"] },
        };
      },
      calculateAstrology(date, hour, offset, latitude, longitude) {
        received = { ...received, latitude, longitude };
        return {
          hasLocation: true,
          rising: { accurate: true, longitude: 0, sign: { name: "Aries" } },
          midheaven: { longitude: 90, sign: { name: "Cancer" } },
          sun: { longitude: 0, sign: { name: "Aries" } },
          planets: {},
          nodes: {},
          aspects: [],
        };
      },
    }),
  });
  assert.equal(received.latitude, 13.75);
  assert.equal(received.longitude, 100.51);
  assert.equal(received.date, fixture.birthdate);
  assert.equal("name" in received, false);
  assert.equal("memberRef" in received, false);
  assert.equal("birthPlace" in received, false);
  assert.equal(result.humanDesign.typeLabel, "משקף (Reflector)");
  assert.equal(result.humanDesign.profileLabel, "1/3 · חוקר / מתנסה");
  assert.equal(result.humanDesign.strategyLabel, "להמתין");
  assert.equal(result.humanDesign.definitionLabel, "ללא הגדרה קבועה");
});
