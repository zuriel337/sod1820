// Review finding CR-X2 (Codex, #1335 head 1b99fa12d): ONE display policy for the list, the exact finding and the share card.
// Reproduced with the REAL share handler (api/og.js) and the REAL exact reader / list admission, synthetic database answers, no network.
//   * a candidate (public, research role, live source) whose STATEMENT holds a contact detail: the page refused it, the card printed it;
//   * a clean statement with the contact detail only in the stored Hebrew presentation SUMMARY: the exact reader and the card returned it;
//   * a clean candidate still opens and is labelled «טרם אומת» (the allowed case must keep passing).
// The same cases are run for the three surfaces and for verified rows (the policy is not specific to candidates).
import test from "node:test";
import assert from "node:assert/strict";
import ogHandler from "../api/og.js";
import { fetchWorldPublicFindingById, admitPublicCandidateRows } from "../src/lib/research/worldPublicFindingReader.js";
import { researchRowDisplayPolicyOk } from "../src/lib/research/worldZviApprovedFindings2029.js";

const ID = "da13e802-aaaa-4a41-82d1-123456789abc";
const SOURCE = "11111111-2222-4333-8444-555555555555";
const ROLE = { statement_role: "research_statement" };
const EMAIL = "person@example.test";
const row = (changes = {}, presentation = {}) => ({
  id: ID, created_at: "2026-11-10T10:00:00Z", kind: "observation", statement: "ממצא ציבורי נקי לבדיקה", source: "whatsapp",
  source_ref: `channel_updates:${SOURCE}`, contributor: "חוקר", status: "candidate", privacy_scope: "public",
  meta: { ext: { presentation: { ...ROLE, ...presentation } } }, ...changes,
});
const withVariant = (he) => ({ variants: { he } });

// ---- the real share handler -------------------------------------------------------------------------------------------
async function card(r) {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const json = url.includes("/rest/v1/research_objects?") ? (r ? [r] : [])
      : url.includes("/rest/v1/channel_updates?") ? [{ id: SOURCE, channel: "public", status: "live" }] : [];
    return { ok: true, status: 200, json: async () => json };
  };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status() { return this; }, send(html) { this.html = html; return this; } };
  try { await ogHandler({ query: { path: "/world", finding: ID } }, res); } finally { globalThis.fetch = oldFetch; }
  return res.html;
}
const NEUTRAL = /הממצא המבוקש אינו זמין לציבור/;

// ---- the real exact reader --------------------------------------------------------------------------------------------
function readerClient(r) {
  const live = { id: SOURCE, channel: "public", status: "live" };
  // maybeSingle() answers one row (the exact reader); awaiting the builder answers a list (the list admission reads the sources in one query)
  const tables = { research_objects: { one: r, many: r ? [r] : [] }, channel_updates: { one: live, many: [live] }, topic_cards_public: { one: null, many: [] } };
  return { from(table) {
    const result = tables[table] ?? { one: null, many: [] };
    const builder = { select() { return builder; }, eq() { return builder; }, in() { return builder; }, or() { return builder; }, limit() { return builder; },
      maybeSingle() { return Promise.resolve({ data: result.one, error: null }); },
      then(resolve, reject) { return Promise.resolve({ data: result.many, error: null }).then(resolve, reject); } };
    return builder;
  } };
}
const open = (r) => fetchWorldPublicFindingById(ID, { publicClient: () => readerClient(r), cache: false });

const CASES = [
  ["contact detail in the statement", { statement: `פנו אל ${EMAIL} לפרטים` }, {}],
  ["contact detail only in the Hebrew presentation summary (the statement is clean)", {}, withVariant({ title: "כותרת נקייה", summary: `פנו אל ${EMAIL}` })],
  ["contact detail in the Hebrew presentation title", {}, withVariant({ title: `צרו קשר ${EMAIL}`, summary: "משפט נקי" })],
  ["a phone number in the Hebrew presentation summary", {}, withVariant({ title: "כותרת נקייה", summary: "התקשרו 050-123-4567 בבקשה" })],
  ["an owner mention in the Hebrew presentation summary", {}, withVariant({ title: "כותרת נקייה", summary: "כך אמר צוריאל לגבי הממצא" })],
  ["a contact detail in the source label of the Hebrew presentation", {}, withVariant({ title: "כותרת נקייה", summary: "משפט נקי", source_label: `מקור ${EMAIL}` })],
];

for (const status of ["candidate", "approved"]) {
  for (const [name, changes, presentation] of CASES) {
    test(`${status}: ${name} - refused by the list admission, the exact finding and the share card`, async () => {
      const r = row({ ...changes, status }, presentation);
      assert.equal(researchRowDisplayPolicyOk(r), false, "the shared policy refuses it");
      // the share card (real handler): the neutral card, nothing reflected
      const html = await card(r);
      assert.match(html, NEUTRAL);
      assert.doesNotMatch(html, new RegExp(`${EMAIL}|050-123-4567|צוריאל|ממצא ציבורי נקי לבדיקה`));
      // the exact finding (real reader)
      assert.equal(await open(r), null);
      // the list admission (candidates are the only rows it admits)
      if (status === "candidate") assert.deepEqual(await admitPublicCandidateRows(readerClient(r), [r]), []);
    });
  }
}

test("a clean candidate still opens, is listed and is shared with «טרם אומת» (the allowed case)", async () => {
  const r = row({}, withVariant({ title: "כותרת נקייה", summary: "משפט קצר ונקי" }));
  assert.equal(researchRowDisplayPolicyOk(r), true);
  const found = await open(r);
  assert.equal(found?.sourceId, ID);
  assert.equal(found?.status, "candidate", "the stored status is kept, never promoted");
  assert.equal(found?.statusLabel, "טרם אומת");
  const html = await card(r);
  assert.match(html, /טרם אומת/);
  assert.match(html, /noindex, nofollow/);
  assert.doesNotMatch(html, NEUTRAL);
  assert.equal((await admitPublicCandidateRows(readerClient(r), [r])).length, 1);
});

test("a clean verified finding still opens and is shared and indexable (the policy changes nothing for clean rows)", async () => {
  const r = row({ status: "approved" }, withVariant({ title: "כותרת נקייה", summary: "משפט קצר ונקי" }));
  assert.equal(researchRowDisplayPolicyOk(r), true);
  assert.equal((await open(r))?.sourceId, ID);
  const html = await card(r);
  assert.match(html, /index, follow/);
  assert.doesNotMatch(html, NEUTRAL);
});

test("fields that are not displayed are not part of the policy: a contact detail only in another locale's variant does not hide a Hebrew-clean row", () => {
  const r = row({}, { variants: { he: { title: "כותרת נקייה", summary: "משפט נקי" }, en: { title: "Clean", summary: `write to ${EMAIL}` } } });
  assert.equal(researchRowDisplayPolicyOk(r), true, "the surfaces show the Hebrew presentation only");
});

test("the presenter's own Hebrew fallback title for a «Zuriel research thread» statement is not read as an owner mention (existing behaviour)", () => {
  const r = row({ statement: "Zuriel research thread: binary(1820)" });
  assert.equal(researchRowDisplayPolicyOk(r), true);
});

test("nothing is written and no other table is read by the share card", async () => {
  const seen = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => { seen.push([String(input), (init && init.method) || "GET"]); return { ok: true, status: 200, json: async () => (String(input).includes("research_objects") ? [row()] : [{ id: SOURCE, channel: "public", status: "live" }]) }; };
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status() { return this; }, send(html) { this.html = html; return this; } };
  try { await ogHandler({ query: { path: "/world", finding: ID } }, res); } finally { globalThis.fetch = oldFetch; }
  assert.ok(seen.every(([, method]) => method === "GET"), "only reads");
});
