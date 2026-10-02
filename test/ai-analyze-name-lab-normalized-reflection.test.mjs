import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const edge = fs.readFileSync("supabase/functions/ai-analyze/index.ts", "utf8");
const client = fs.readFileSync("src/lib/supabase.js", "utf8");

test("name_lab normalized_reflection has one bounded structured response lane", () => {
  assert.match(edge, /structuredNameReflection\s*=\s*kind === "name_lab" && body\?\.operation === "normalized_reflection"/);
  assert.match(edge, /reflection_interpretation:\s*reflectionInterpretation/);
  assert.match(edge, /parseNameLabReflectionOutput\(finalOut\.text, facts\)/);
  assert.match(edge, /nameLabFindingIdsFromFacts/);
  assert.match(edge, /allowed\.has\(id\)/);
  assert.match(edge, /מותר 1-6 motifs/);
});

test("structured lane preserves the legacy analysis response for every other operation", () => {
  assert.match(edge, /analysis:\s*reflectionInterpretation\?\.message \|\| finalOut\.text/);
  assert.match(client, /operation === 'normalized_reflection' && data\?\.reflection_interpretation\?\.message/);
  assert.match(client, /return structuredReflection \|\| analysisText/);
});

test("reflection prompt keeps Tarot outside AI synthesis and requires bundle Finding IDs", () => {
  assert.match(edge, /כל motif חייב להישען על finding_ids שסופקו/);
  assert.match(edge, /קלף\/טארוט אינו חלק מהשלב הזה/);
  assert.match(edge, /אל תמציא מזהים/);
});

test("structured parse failure cannot fall back to raw model text as frozen analysis", () => {
  assert.match(
    edge,
    /analysis:\s*structuredNameReflection\s*\?\s*\(reflectionInterpretation\?\.message \|\| null\)\s*:\s*finalOut\.text/
  );
  assert.doesNotMatch(
    edge,
    /analysis:\s*reflectionInterpretation\?\.message\s*\|\|\s*finalOut\.text/
  );
});
