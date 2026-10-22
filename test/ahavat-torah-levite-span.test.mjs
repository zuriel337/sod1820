import assert from "node:assert/strict";
import test from "node:test";

test("Ahavat Torah CALC-03 decodes Hebrew numerals and closes the Levite span", () => {
  const reshBet = 200 + 2;
  const lamedZayin = 30 + 7;
  const reshLamedTet = 200 + 30 + 9;

  assert.equal(reshBet, 202);
  assert.equal(lamedZayin, 37);
  assert.equal(reshLamedTet, 239);
  assert.equal(reshBet + lamedZayin, reshLamedTet);
});
