import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(new URL("../SOD1820_DESIGN_CONTRACT_V2.md", import.meta.url), "utf8");

test("Design V2 makes desktop readability an infrastructure rule", () => {
  assert.match(contract, /Desktop readability is not desktop compression/);
  assert.match(contract, /1024px and wider/);
  assert.match(contract, /supporting copy[\s\S]*15px minimum/);
  assert.match(contract, /interactive labels[\s\S]*16px minimum/);
  assert.match(contract, /reading\/body copy remains \*\*18px minimum\*\*/);
  assert.match(contract, /--s29-type-micro/);
  assert.match(contract, /--s29-type-small/);
  assert.match(contract, /--s29-type-title/);
  assert.doesNotMatch(contract, /--s29-type-section/);
  assert.match(contract, /Page-local literal sizes must not create a smaller parallel scale/);
  assert.match(contract, /does not restyle, rewrite or inherit from Legacy/);
});

test("Design V2 keeps Hebrew labels out of the numeric typeface", () => {
  assert.match(contract, /Mixed Hebrew and numeric typography/);
  assert.match(contract, /parent containing Hebrew text must not receive `--s29-font-numeric`/);
  assert.match(contract, /`0 ציבוריים`/);
  assert.match(contract, /Hebrew letters, words and inflections never render in the numeric face/);
});

test("Design V2 requires computed-style acceptance on desktop and mobile", () => {
  assert.match(contract, /inspect computed styles, not only source declarations/);
  assert.match(contract, /1440px/);
  assert.match(contract, /320px and 390px/);
  assert.match(contract, /controls retain at least 44×44px targets/);
  assert.match(contract, /no horizontal page overflow/);
});
