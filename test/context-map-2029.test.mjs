// Small Context Map projection: real 1718 case (graph edges and engine values read from canonical
// Supabase 19.10.2026) through the display projection only. No network, no new owner.
import test from "node:test";
import assert from "node:assert/strict";
import { buildContextMap, BASIS, TIER, phraseKey, PENDING_LABEL } from "../src/lib/research/contextMapProjection2029.js";

const side = (id, type, label, href = null) => ({ id, type, label, href });
const N1718 = side("f8c03161", "number", "1718", "/number/1718");
const P5112 = side("f42e2a16", "post", "טיסה 1073 — 14,000 רגל, 363 והנחיתה בסעודיה | רמזים חזקים", "/post/flydubai-fz1073-363-14000-remzei-geula");
const PHRASE = side("e67caa39", "entity", "כב בתשרי תשפד");
const P233 = side("3fd27516", "post", "רמזי מלחמת \"חרבות ברזל\" שהתחילה בשעה 6:30 בשמחת תורה", "/post/233");
const edge = (id, from, to, relationType) => ({
  projection: { relations: [{ id, fromNodeId: from.id, toNodeId: to.id, relationType, from, to }] },
});
const GRAPH_1718 = [edge("e1", P5112, N1718, "documents"), edge("e2", N1718, PHRASE, "equals"), edge("e3", N1718, P233, "mentions")];
const CALC = [{ label: "כ״ב בתשרי תשפ״ד", value: 1718, methodLabel: "רגיל", verified: true, extra: [{ value: 1202, methodLabel: "מסתתר" }] }];
const focus = { id: N1718.id, label: "1718", type: "number" };

test("guest sees only documented and engine-verified neighbours; mention stays out", () => {
  const map = buildContextMap({ focus, findings: GRAPH_1718, calculations: CALC, audience: "public" });
  assert.deepEqual(map.neighbours.map((n) => n.basis), [BASIS.VERIFIED_CALCULATION, BASIS.DOCUMENTED_SOURCE]);
  assert.ok(map.neighbours.every((n) => n.tier === TIER.DIRECT && !n.pending));
  assert.ok(!map.neighbours.some((n) => n.id === P233.id));
});

test("admin also sees the unapproved mention, labelled as waiting, never as approved", () => {
  const map = buildContextMap({ focus, findings: GRAPH_1718, calculations: CALC, audience: "admin" });
  const mention = map.neighbours.find((n) => n.id === P233.id);
  assert.equal(mention.basis, BASIS.MENTION);
  assert.equal(mention.pending, true);
  assert.equal(mention.basisLabel, PENDING_LABEL);
});

test("calculation status is its own axis: verified values never upgrade a mention", () => {
  const withCalcOn233 = buildContextMap({ focus, findings: GRAPH_1718, calculations: [{ label: P233.label, value: 1718, methodLabel: "רגיל", verified: true }], audience: "admin" });
  assert.equal(withCalcOn233.neighbours.find((n) => n.id === P233.id).basis, BASIS.MENTION);
  const phrase = buildContextMap({ focus, findings: GRAPH_1718, calculations: CALC }).neighbours.find((n) => n.id === PHRASE.id);
  assert.equal(phrase.calculation.value, 1718);
  assert.deepEqual(phrase.calculation.extra, [{ value: 1202, methodLabel: "מסתתר" }]);
});

test("equals without an engine confirmation is only a suggestion (admin-only)", () => {
  assert.equal(buildContextMap({ focus, findings: GRAPH_1718, calculations: [] }).neighbours.some((n) => n.id === PHRASE.id), false);
  const admin = buildContextMap({ focus, findings: GRAPH_1718, calculations: [], audience: "admin" });
  assert.equal(admin.neighbours.find((n) => n.id === PHRASE.id).basis, BASIS.SUGGESTED);
});

test("no approved link: explicit empty state, not an invented link", () => {
  const map = buildContextMap({ focus, findings: [edge("e3", N1718, P233, "mentions")], audience: "public" });
  assert.equal(map.neighbours.length, 0);
  assert.equal(map.empty, "no_approved");
  assert.equal(buildContextMap({ focus, findings: [] }).empty, "no_links");
  assert.equal(buildContextMap({ focus: null }).empty, "no_focus");
});

test("tiers come from graph distance; the map never exceeds five neighbours", () => {
  const second = edge("e4", P233, side("x1", "number", "5112"), "documents");
  const map = buildContextMap({ focus, findings: [...GRAPH_1718, second], calculations: CALC, audience: "admin" });
  assert.equal(map.neighbours.find((n) => n.id === "x1").tier, TIER.SECONDARY);
  const many = Array.from({ length: 9 }, (_, i) => edge(`m${i}`, N1718, side(`p${i}`, "post", `פוסט ${i}`), "documents"));
  assert.equal(buildContextMap({ focus, findings: many }).neighbours.length, 5);
});

test("phrase keys ignore gershayim so engine and graph labels match", () => {
  assert.equal(phraseKey("כ״ב בתשרי תשפ״ד"), phraseKey("כב בתשרי תשפד"));
});
