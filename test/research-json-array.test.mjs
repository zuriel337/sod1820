import test from "node:test";
import assert from "node:assert/strict";
import { parseResearchJsonArray } from "../supabase/functions/_shared/researchJsonArray.js";

test("parses a complete JSON array surrounded by model formatting", () => {
  assert.deepEqual(parseResearchJsonArray('```json\n[{"kind":"fact","statement":"א"}]\n```'), [
    { kind: "fact", statement: "א" },
  ]);
});

test("recovers only complete objects from a token-truncated array", () => {
  const truncated = '[{"kind":"fact","statement":"א"},{"kind":"observation","statement":"ב","meta":{"note":"סוגר } בתוך מחרוזת"}},{"kind":"question","statement":"';
  assert.deepEqual(parseResearchJsonArray(truncated), [
    { kind: "fact", statement: "א" },
    { kind: "observation", statement: "ב", meta: { note: "סוגר } בתוך מחרוזת" } },
  ]);
});

test("does not invent a completion when no valid object finished", () => {
  assert.equal(parseResearchJsonArray('[{"kind":"fact","statement":"א'), null);
  assert.equal(parseResearchJsonArray("not json"), null);
});
