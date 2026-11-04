import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveLifeJourneyBirthPlace,
  searchLifeJourneyBirthPlaces,
} from "./lifeJourneyBirthPlaces.js";

test("saved Hebrew and English city names resolve locally to coordinates and timezone", () => {
  const jerusalem = resolveLifeJourneyBirthPlace("ירושלים, ישראל");
  assert.equal(jerusalem.id, "jerusalem");
  assert.equal(jerusalem.timezone, "Asia/Jerusalem");
  assert.equal(jerusalem.latitude, 31.76904);
  assert.equal(resolveLifeJourneyBirthPlace("Tel Aviv")?.id, "tel-aviv");
  assert.equal(resolveLifeJourneyBirthPlace("עיר בדיקה"), null);
});

test("bounded local search handles prefixes, final letters and common aliases", () => {
  assert.equal(searchLifeJourneyBirthPlaces("פתח תקוה")[0]?.id, "petah-tikva");
  assert.equal(searchLifeJourneyBirthPlaces("ניו")[0]?.id, "new-york");
  assert.equal(searchLifeJourneyBirthPlaces("קריית").length, 8);
  assert.equal(searchLifeJourneyBirthPlaces("י").length, 0);
});

test("the catalog has no runtime or browser persistence dependency", () => {
  const result = searchLifeJourneyBirthPlaces("ירושלים")[0];
  assert.equal(result.source.label, "GeoNames");
  assert.equal(result.source.license, "CC BY 4.0");
  assert.equal("birthdate" in result, false);
  assert.equal("birthtime" in result, false);
});
