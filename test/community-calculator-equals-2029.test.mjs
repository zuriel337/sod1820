import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { communityEqualsSelection, communityEqualsShareText, COMMUNITY_EQUALS_LIMIT } from "../src/lib/research/communityCalculatorEquals2029.js";

test("the large phrases are the first of the calculator's own list; the name itself and repeats are left out; the rest is not repeated", () => {
  const rows = [{ phrase: "דוד" }, { phrase: "זהב" }, { phrase: " זהב " }, { phrase: "יד" }, { phrase: "" }, { phrase: "אחד בא" }, { phrase: "גיא" }, null];
  const { top, rest } = communityEqualsSelection(rows, "דוד");
  assert.deepEqual(top.map(row => row.phrase), ["זהב", "יד", "אחד בא"]);
  assert.deepEqual(rest.map(row => row.phrase), ["גיא"]);
  assert.equal(top.length, COMMUNITY_EQUALS_LIMIT);
  assert.deepEqual(communityEqualsSelection(null, "דוד"), { top: [], rest: [] });
});

test("the share text states the name, its value and one published phrase, and nothing when there is no result", () => {
  assert.equal(communityEqualsShareText({ name: " דוד ", value: 14, phrase: "זהב" }), "«דוד» = 14 בגימטריה, כמו «זהב». ומה השם שלכם שווה?");
  assert.equal(communityEqualsShareText({ name: "דוד", value: 14 }), "«דוד» = 14 בגימטריה. ומה השם שלכם שווה?");
  for (const bad of [{ name: "", value: 14 }, { name: "דוד", value: 0 }, { name: "דוד", value: "x" }, {}]) assert.equal(communityEqualsShareText(bad), "");
});

test("the page shows the equals card for one name only, from the existing phrase list, with what is sent stated; no new reader, event or AI", () => {
  const page = readFileSync(new URL("../src/pages/CommunityCalculator2029Page.jsx", import.meta.url), "utf8");
  const card = page.slice(page.indexOf("function EqualsCard"), page.indexOf("function BabyNames"));
  assert.match(page, /\{!r2 && <EqualsCard /, "one name only: a comparison keeps its own result");
  assert.match(card, /communityEqualsSelection\(phrases, name\)/);
  assert.match(card, /data-share-disclosure="community-equals"/);
  assert.match(card, /FINDING_NOT_SENT/);
  assert.doesNotMatch(card, /supabase|rpc\(|fetch\(|recordCommunity|recordSiteActivity|emit\(|runAi|askRaziel/);
  assert.match(page, /communityEqualsSelection\(model\.discoveries, state\.name1\)\.rest/, "the lower list does not repeat the large phrases");
});
