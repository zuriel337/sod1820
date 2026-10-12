import test from "node:test";
import assert from "node:assert/strict";
import { buildWorldContextualProminence } from "../src/lib/research/worldContextualProminence.js";

const VERSES_836 = [
  ["במדבר 33:11", "ויסעו מיםסוף ויחנו במדברסין"],
  ["ירמיהו 29:30", "ויהי דבר יהוה אל ירמיהו לאמר"],
  ["ירמיהו 32:26", "ויהי דבר יהוה אל ירמיהו לאמר"],
  ["ירמיהו 33:23", "ויהי דבר יהוה אל ירמיהו לאמר"],
  ["ירמיהו 35:12", "ויהי דבר יהוה אל ירמיהו לאמר"],
];

function worldData(sources) {
  return {
    identity: { nodeId: "number-836", type: "number", label: "836" },
    graph: { relations: [] },
    research: { rows: [], findings: [] },
    topics: { rows: [], findings: [] },
    sources,
  };
}

test("World 2029 carries all five canonical 836 verse bodies into the visible prominence cards", () => {
  const sources = VERSES_836.map(([ref, text]) => ({
    type: "verse", ref, text, value: 836,
    label: `${ref} — ${text}`, matchKind: "verse_gematria",
  }));
  const projection = buildWorldContextualProminence(worldData(sources), {}, { limit: 7 });
  assert.equal(projection.items.length, 5);
  for (const [ref, text] of VERSES_836) {
    const item = projection.items.find((item) => item.sourceRef === ref);
    assert.ok(item, `missing verse ${ref}`);
    assert.equal(item.type, "verse");
    assert.equal(item.summary, text, `verse body disappeared for ${ref}`);
    assert.equal(item.kind, "source");
  }
});

test("World source projection does not invent missing verses or expose unrelated source text", () => {
  const projection = buildWorldContextualProminence(worldData([
    { type: "verse", ref: "במדבר 33:11", label: "במדבר 33:11", text: null },
    { type: "research-source", ref: "posts:example", label: "פוסט ציבורי", text: "private metadata should not become card text" },
  ]), {}, { limit: 7 });
  assert.equal(projection.items.find((item) => item.type === "verse")?.summary, null);
  assert.equal(projection.items.find((item) => item.type === "research-source")?.summary, null);
});
