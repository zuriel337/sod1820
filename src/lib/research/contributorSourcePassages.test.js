import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchContributorSourcePassages, fetchSignedSourcePassage, findSignedPostByline,
  parseSignedPassage, sourcePassageDigest, validateSignedPassage,
} from "./contributorSourcePassages.js";

const writer = "writer";
const publicWriter = { id: writer, active: true, public_visibility: "public" };
const updateId = "bf1c85a3-6e8e-429f-a67d-7cebcba06b17";
const refIds = ["a38cb665-9b58-4b19-b40c-000000000010", "a38cb665-9b58-4b19-b40c-000000000011"];
const update = {
  id: updateId, status: "live", page_only: false, expires_at: null,
  text: "כותרת\n──────────\nליאור שיטרית · 05.10.2026\nהודעה ראשונה.\n──────────\nציון דוד סיבוני · 05.10.2026\nתגובה.\n──────────\nליאור שיטרית · 05.10.2026\nהודעה שנייה.",
};
const updateDigest = await sourcePassageDigest(update.text);
const refs = refIds.map((id, i) => ({
  id, contributor_id: writer, kind: "link", ref_type: "signed_source_passage", is_public: true, is_personal: false,
  ref: `channel_updates:${updateId}#${i === 0 ? 2 : 4}@${updateDigest}`,
}));

function clientFixture(tables) {
  return { from(table) {
    let data = tables[table] || [];
    const query = {
      select: () => query,
      eq: (key, value) => { data = data.filter((row) => row[key] === value); return query; },
      in: (key, values) => { data = data.filter((row) => values.includes(String(row[key]))); return query; },
      order: () => query,
      limit: (count) => { data = data.slice(0, count); return query; },
      then: (resolve) => resolve({ data }),
    };
    return query;
  } };
}

test("public references group two distinct messages under one update and keep exact links", async () => {
  const client = clientFixture({ contributor_content: [...refs, { ...refs[0], id: "a38cb665-9b58-4b19-b40c-000000000012" }],
    channel_updates: [update], contributors: [publicWriter] });
  const result = await fetchContributorSourcePassages({ id: writer }, { client });
  assert.equal(result.complete, true);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].links.length, 2);
  assert.ok(result.rows[0].links[1].href.endsWith(`#signed-passage-${refIds[1]}`));
  const direct = await fetchSignedSourcePassage(client, refIds[1], "channel_updates");
  assert.equal(direct.credit, "ליאור שיטרית");
  assert.match(direct.blocks[Number(direct.ref.locator) - 1].text, /הודעה שנייה/);
  assert.equal(await fetchSignedSourcePassage(client, refIds[1], "posts"), null);
});

test("hidden, expired, changed and personal sources never resolve", async () => {
  const ref = parseSignedPassage(refs[0]);
  for (const changed of [
    { status: "draft" }, { page_only: true }, { expires_at: "2020-01-01" }, { text: update.text + " נוסף" },
  ]) assert.equal(await validateSignedPassage(ref, { ...update, ...changed }), null);
  const client = clientFixture({ contributor_content: [{ ...refs[0], is_personal: true }], channel_updates: [update] });
  assert.equal((await fetchContributorSourcePassages({ id: writer }, { client })).rows.length, 0);
  assert.equal(await fetchSignedSourcePassage(client, refs[0].id, "channel_updates"), null);
  const locked = clientFixture({ contributor_content: refs, channel_updates: [update], contributors: [{ ...publicWriter, locked: true }] });
  assert.equal(await fetchSignedSourcePassage(locked, refs[0].id, "channel_updates"), null);
});

test("post anchor requires a unique visible exact byline and preserves joint credit", async () => {
  const witness = "מאת ליאור שטרית ונרקיס שוורץ";
  const locator = await sourcePassageDigest(witness);
  const node = { textContent: witness, closest: () => null, querySelector: () => null };
  const hidden = { ...node, closest: () => true };
  const root = (...nodes) => ({ querySelectorAll: () => nodes });
  const exact = await findSignedPostByline(root(node, hidden), locator);
  assert.equal(exact.node, node);
  assert.equal(exact.credit, "ליאור שטרית ונרקיס שוורץ");
  assert.equal(await findSignedPostByline(root(node, node), locator), null);
  assert.equal(await findSignedPostByline(root(hidden), locator), null);
});
