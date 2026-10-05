import test from "node:test";
import assert from "node:assert/strict";
import { researchObjectsToUniversalFindings } from "../research/researchObjectFinding.js";
import {
  buildLivingNumberFindings,
  buildPostAnchorLivingContext,
  buildSourceFirstFinding,
  isInternalResearchLanguage,
  normalizeSourceStatement,
  numberFromAnchor,
} from "./sourceFirstFinding.js";

// Live-shaped Zvi/OPOC 1073 rows (research_objects shape read 2026-10-05; ids/values verbatim).
const pres = (title, summary) => ({ ext: { presentation: { v: 1, statement_lang: "he", variants: { he: { title, summary, source_label: null } } } } });
const ROWS = [
  {
    id: "ec19e004-837a-4f90-ad0e-52e623e41072", kind: "relation", value: 1073,
    statement: "סכום הגימטריה של הפסוק בתהילים ↔ מספר טיסת Flydubai FZ1073 (אותו ערך)",
    terms: ["למות לא נתנני", "FZ 1073"], relates: ["סכום גימטרי של הפסוק", "מספר טיסת Flydubai FZ1073"],
    source: "channel_updates", source_ref: "channel_updates:0625e279-33d6-4415-ba91-73bb8344ff80",
    contributor: "צבי (OPOC)", status: "approved", privacy_scope: "private", engine_detail: {},
    meta: pres("קשר בין הפסוק למספר הטיסה", "נטען שסכום הגימטריה ... FZ1073."),
  },
  {
    id: "188bd34e-6ef8-4afe-9dd4-93b94d7551c3", kind: "fact", value: 1073,
    statement: 'הביטוי "ואנכי העליתי אתכם" נטען כשווה בגימטריה 1073',
    terms: ["ואנכי העליתי אתכם"], relates: [],
    source: "channel_updates", source_ref: "channel_updates:169cc4a4-1722-41a6-8491-fce8783bfde1",
    contributor: "צבי (OPOC)", status: "approved", privacy_scope: "private", engine_detail: {},
    meta: pres("research_object_dossier_chain", "x"),
  },
  {
    id: "mismatch-fixture", kind: "fact", value: 1073,
    statement: "ערך אחר שנטען ל-1073", terms: [], relates: [],
    source: "channel_updates", source_ref: "channel_updates:x", contributor: "חוקר אחר", status: "approved",
    privacy_scope: "private", engine_detail: { verification_state: "mismatch" }, meta: {},
  },
];

const findings = researchObjectsToUniversalFindings(ROWS);
const byId = (id) => findings.find((f) => f.identity.sourceIdentity.researchObjectId === id);
const POST = [{ label: "טיסה FZ1073", href: "/post/flydubai-fz1073-363-14000-remzei-geula#source-region-x" }];

test("source statement is the first and primary body, with attribution", () => {
  const model = buildSourceFirstFinding(byId("ec19e004-837a-4f90-ad0e-52e623e41072"), { root: 1073, postLinks: POST });
  assert.equal(model.source.statement, ROWS[0].statement);
  assert.equal(model.source.contributor, "צבי (OPOC)");
  assert.deepEqual(Object.keys(model).slice(0, 5), ["id", "source", "derivations", "connections", "challenges"]);
  assert.ok(!model.source.statement.includes("קשר בין הפסוק למספר הטיסה"), "AI title must not replace source");
});

test("normalization is presentation-only and keeps every word", () => {
  const out = normalizeSourceStatement('  הביטוי  "ואנכי העליתי אתכם"  שווה ,  1073 \r\n\r\n\r\n צה"ל - כן ');
  assert.equal(out, "הביטוי “ואנכי העליתי אתכם” שווה, 1073\n\nצה\"ל – כן");
  const words = (t) => t.replace(/[“”"–,\s]+/g, " ").trim().split(" ");
  assert.deepEqual(words(out), words('הביטוי "ואנכי העליתי אתכם" שווה, 1073 צה"ל כן'));
  assert.equal(normalizeSourceStatement(out), out, "idempotent");
});

test("derivations follow source; verification honest when untested", () => {
  const model = buildSourceFirstFinding(byId("188bd34e-6ef8-4afe-9dd4-93b94d7551c3"), { root: 1073 });
  assert.equal(model.derivations[0].key, "value");
  assert.equal(model.derivations.at(-1).text, "טרם נבדק מול החישוב");
});

test("number node and FZ1073 post are navigable connections", () => {
  const model = buildSourceFirstFinding(byId("ec19e004-837a-4f90-ad0e-52e623e41072"), { root: 1073, postLinks: POST });
  const number = model.connections.find((c) => c.type === "number");
  const post = model.connections.find((c) => c.type === "post");
  assert.equal(number.href, "/number/1073");
  assert.match(post.href, /^\/post\/flydubai-fz1073/);
});

test("challenges come after source+derivations: caveat and contrasting mismatch", () => {
  const model = buildSourceFirstFinding(byId("188bd34e-6ef8-4afe-9dd4-93b94d7551c3"), { root: 1073, siblings: findings });
  assert.deepEqual(model.challenges.map((c) => c.kind), ["caveat", "contrast"]);
  assert.equal(model.challenges[1].text, "ערך אחר שנטען ל-1073");
  assert.equal(model.challenges[1].contributor, "חוקר אחר");
});

test("internal research/engine language is never primary; technical AI title is dropped", () => {
  const technical = buildSourceFirstFinding(byId("188bd34e-6ef8-4afe-9dd4-93b94d7551c3"));
  assert.equal(technical.secondary, null);
  assert.ok(isInternalResearchLanguage("research_object_dossier_chain"));
  const human = buildSourceFirstFinding(byId("ec19e004-837a-4f90-ad0e-52e623e41072"));
  assert.equal(human.secondary.title, "קשר בין הפסוק למספר הטיסה");
  for (const model of [technical, human]) {
    assert.ok(!/channel_updates|research_object|engine_detail/.test(model.source.statement + (model.source.sourceLabel || "")));
  }
});

test("post numeric anchor FZ1073 -> living 1073 context, post-direct first, no body duplication", () => {
  assert.equal(numberFromAnchor("FZ1073"), 1073);
  assert.equal(numberFromAnchor("FZ 1073"), 1073);
  assert.equal(numberFromAnchor("אבגד"), null);
  const ctx = buildPostAnchorLivingContext({ anchor: "FZ1073", postConnections: POST, findings });
  assert.equal(ctx.number, 1073);
  assert.equal(ctx.numberHref, "/number/1073");
  assert.deepEqual(Object.keys(ctx), ["number", "numberHref", "postDirect", "living"]);
  assert.equal(ctx.postDirect.length, 1);
  assert.equal(ctx.living.length, 3, "all eligible tree findings of 1073 project without manual attachment");
  assert.ok(!("body" in ctx) && !("content" in ctx));
});

test("living number projection dedupes and skips rows without source statement", () => {
  const dup = [...findings, findings[0], { id: "nostatement", view: { rendererHints: { presentation: {} } } }];
  assert.equal(buildLivingNumberFindings(dup, 1073).length, 3);
});
