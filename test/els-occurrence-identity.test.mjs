// Occurrence identity = the engine's occurrence_id (ZURIEL 18.11.2026, stage 1): corpora stay separate, and older links and
// saved records still open the exact occurrence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { elsOccurrenceId, parseElsOccurrenceId, elsOccurrenceFromHitId, elsStateAxisOccurrenceId, sameElsOccurrence } from "../src/lib/research/elsOccurrenceIdentity.js";
import { joinElsDiscovery } from "../src/lib/research/elsJointDiscovery.js";
import { buildElsMatrixShareUrl, readElsMatrixShare } from "../src/lib/elsMatrixShare.js";
import { savedMatrixToItem, savedMatrixMatchesAxis } from "../src/lib/elsSavedMatrix.js";
import { makeJourneySnapshot, buildJourneyRestore, buildJourneyPromotion, journeyAnchorMatches } from "../src/lib/elsJourney.js";
import { elsResearchReturnLoad } from "../src/lib/research/elsResearchReturnSnapshot.js";

const TORAH = "0b022e8eef6f9c16", TANAKH = "tanakh-corpus-1";
const encode = value => "#els-matrix=" + Buffer.from(JSON.stringify(value)).toString("base64url");
const state = (corpus = TORAH, extra = {}) => ({ status: "ok", term: "תורה", termRaw: "תורה", scope: corpus === TORAH ? "torah" : "tanakh",
  verification: { state: "MATCH", corpus_id: corpus }, axis: { hitId: "50_-1_205", start: 205, skip: 50, length: 4, ...extra },
  geometry: { cw: 40 }, ui: {}, findings: [{ t: "אמת", color: "#112233", shown: ["49_1_25"], hits: [{ hitId: "49_1_25", selected: true, verified: true }], sourceHits: [] }] });

test("the id is the canonical core's: 'els:'||corpus_id||':'||term||':'||skip||':'||dir||':'||start", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20260916151000_g3_els_core_compatibility_truth_hardening_v1.sql", import.meta.url), "utf8");
  assert.match(sql, /'occurrence_id','els:'\|\|v_corpus_id\|\|':'\|\|v_term\|\|':'\|\|p_skip::text\|\|':'\|\|p_dir::text\|\|':'\|\|p_start::text/);
  assert.equal(elsOccurrenceId({ corpusId: TORAH, term: "שלום", skip: 7, dir: -1, start: 1200 }), `els:${TORAH}:שלומ:7:-1:1200`, "final letters as the engine normalizes");
  assert.equal(elsOccurrenceId({ corpusId: TORAH, term: "שלום", skip: -7, dir: -1, start: 1200 }), `els:${TORAH}:שלומ:7:-1:1200`, "the skip is unsigned; the direction carries the sign");
  const parsed = parseElsOccurrenceId(`els:${TORAH}:שלומ:7:-1:1200`);
  assert.deepEqual(parsed, { corpusId: TORAH, term: "שלומ", skip: 7, dir: -1, start: 1200, occurrenceId: `els:${TORAH}:שלומ:7:-1:1200`, hitId: "7_-1_1200" });
  for (const bad of [null, "", "7_-1_1200", `els::שלומ:7:-1:1200`, `els:${TORAH}:שלום:7:-1:1200`, `els:${TORAH}:שלומ:7:0:1200`, `els:${TORAH}:שלומ:07:-1:1200`, `els:${TORAH}:ש:7:1:1`])
    assert.equal(parseElsOccurrenceId(bad), null, String(bad));
  assert.equal(elsOccurrenceId({ term: "שלום", skip: 7, dir: 1, start: 1 }), null, "no corpus, no identity");
  assert.equal(elsOccurrenceFromHitId("7_-1_1200", { corpusId: TANAKH, term: "שלום" }).occurrenceId, `els:${TANAKH}:שלומ:7:-1:1200`);
});

test("the engine template sends occurrence_id on the axis and on verified hits, and accepts it when loading", () => {
  const engine = readFileSync(new URL("../tools/els/els-code.template.html", import.meta.url), "utf8");
  assert.match(engine, /const id="els:"\+CORPUS_ID\[scope\]\+":"\+norm\(t\)\+":"\+Math\.abs\(h\.skip\)\+":"\+h\.dir\+":"\+h\.start;/);
  assert.match(engine, /hitId:hitKey\(h\),occurrence_id:occurrenceIdOf\(h,r\.t\),length:L\}/);
  assert.match(engine, /verified:isGov\(x\.h\),occurrence_id:occurrenceIdOf\(x\.h,w\.t\),/);
  assert.match(engine, /if\(o&&\(o\.corpusId!==CORPUS_ID\[st\.scope\]\|\|\(item\.corpusId&&item\.corpusId!==o\.corpusId\)\)\)refused="corpus-mismatch";/);
  assert.match(engine, /refused="occurrence-mismatch";/);
  assert.match(engine, /if\(refused\)\{if\(failResearch\(refused\)\)return;st\.res=null;loadError\(refused\);render\(\);return;\}/, "one existing refusal site (st.res census unchanged)");
  const built = readFileSync(new URL("../public/tzofen.html", import.meta.url), "utf8");
  assert.ok(built.includes("occurrence_id:occurrenceIdOf(h,r.t)"), "public/tzofen.html is rebuilt from the template");
});

test("state axis: the engine's own id first; an older state is read inside its verification corpus", () => {
  assert.equal(elsStateAxisOccurrenceId(state()), `els:${TORAH}:תורה:50:-1:205`);
  assert.equal(elsStateAxisOccurrenceId(state(TORAH, { occurrence_id: `els:${TORAH}:תורה:50:-1:205` })), `els:${TORAH}:תורה:50:-1:205`);
  assert.equal(elsStateAxisOccurrenceId(state(TORAH, { occurrence_id: "bad" })), null, "a malformed id is not repaired");
  assert.equal(elsStateAxisOccurrenceId({ ...state(), verification: { state: "CANDIDATE", corpus_id: TORAH } }), null);
  assert.notEqual(elsStateAxisOccurrenceId(state(TORAH)), elsStateAxisOccurrenceId(state(TANAKH)), "same coordinates, two corpora, two occurrences");
  assert.equal(sameElsOccurrence(null, null), false);
});

test("joint list: the same coordinates and letters from two corpora stay two rows; one corpus joins both sources", () => {
  const item = { term: "אמת", label: "אמת", start: 30000, skip: 49, dir: 1, hitId: "49_1_30000", positions: [30000, 30049, 30098] };
  const torahRun = { data: { ok: true, items: [item], origin: { corpusId: TORAH } } };
  const tanakhRun = { data: { ok: true, items: [item], origin: { corpusId: TANAKH } } };
  const finding = corpus => ({ key: `els:${corpus}:אמת:49:1:30000`, label: "אמת", positions: item.positions, visibility: "full",
    item: { text: "אמת", occurrence: { start: 30000, skip: 49, dir: 1, length: 3 } } });
  const axis = { term: "תורה", skip: 50, dir: -1, start: 205 };
  const rows = joinElsDiscovery({ runs: [torahRun, tanakhRun], projection: { findings: [finding(TORAH)] }, axis, width: 50, corpusId: TORAH });
  assert.deepEqual(rows.map(r => [r.key, r.source]).sort(), [[`els:${TANAKH}:אמת:49:1:30000`, "engine"], [`els:${TORAH}:אמת:49:1:30000`, "both"]].sort());
  // A run without its own corpus is read in the open matrix's corpus; without any corpus there is no row.
  assert.equal(joinElsDiscovery({ runs: [{ data: { ok: true, items: [item] } }], axis, width: 50, corpusId: TANAKH })[0].key, `els:${TANAKH}:אמת:49:1:30000`);
  assert.equal(joinElsDiscovery({ runs: [{ data: { ok: true, items: [item] } }], axis, width: 50 }).length, 0);
  // A Fable key that names other letters or another start than its occurrence is not attached to any row.
  const forged = { ...finding(TORAH), key: `els:${TORAH}:אמת:49:1:30001` };
  assert.equal(joinElsDiscovery({ projection: { findings: [forged] }, axis, width: 50, corpusId: TORAH }).length, 0);
});

test("share links: a new link names the occurrence; an older link without it opens the same exact occurrence", () => {
  const url = buildElsMatrixShareUrl(state(), "https://example.test");
  const payload = JSON.parse(Buffer.from(new URL(url).hash.split("=")[1], "base64url").toString());
  assert.deepEqual(payload.axis, { hitId: "50_-1_205", occurrenceId: `els:${TORAH}:תורה:50:-1:205` });
  const fresh = readElsMatrixShare(new URL(url).hash).loadItem;
  assert.equal(fresh.occurrenceId, `els:${TORAH}:תורה:50:-1:205`);
  // The link format before this change: no occurrenceId. Same exact anchor and corpus.
  const older = readElsMatrixShare(encode({ ...payload, axis: { hitId: "50_-1_205" } })).loadItem;
  assert.equal(older.occurrenceId, undefined);
  for (const key of ["term", "scope", "corpusId", "start", "skip", "dir", "hitId"]) assert.equal(older[key], fresh[key], key);
  // An id that disagrees with the link's own corpus, letters or anchor fails closed.
  for (const occurrenceId of [`els:${TANAKH}:תורה:50:-1:205`, `els:${TORAH}:אמת:50:-1:205`, `els:${TORAH}:תורה:50:-1:206`, "50_-1_205"])
    assert.equal(readElsMatrixShare(encode({ ...payload, axis: { hitId: "50_-1_205", occurrenceId } })).loadItem, null, occurrenceId);
  const tanakh = readElsMatrixShare(new URL(buildElsMatrixShareUrl(state(TANAKH), "https://example.test")).hash).loadItem;
  assert.equal(tanakh.occurrenceId, `els:${TANAKH}:תורה:50:-1:205`);
  assert.notEqual(tanakh.occurrenceId, fresh.occurrenceId, "the same link coordinates in Tanakh are another occurrence");
});

test("saved records: the record's corpus is part of the occurrence; older records without exact coordinates open as before", () => {
  const row = { id: "r1", search_term: "תורה", scope: "torah", skip_distance: 50, direction: "back", start_index: 205, corpus_id: TORAH, positions: { findings: [{ t: "אמת", sh: ["49_1_25"] }] } };
  assert.equal(savedMatrixToItem(row).occurrenceId, `els:${TORAH}:תורה:50:-1:205`);
  assert.deepEqual(savedMatrixToItem(row).words, row.positions.findings, "saved findings keep their hitIds inside the record's corpus");
  assert.equal(savedMatrixMatchesAxis(row, state(TORAH)), true);
  assert.equal(savedMatrixMatchesAxis(row, { ...state(TANAKH), scope: "torah" }), false, "another corpus is never the saved matrix");
  const historical = { ...row, start_index: null, direction: "down" };
  assert.equal(savedMatrixToItem(historical).occurrenceId, undefined);
  assert.equal(savedMatrixToItem(historical).skip, 50, "an older record still opens by its skip");
});

test("journey and return: the engine's occurrence travels with the snapshot; a different corpus is not the same anchor", () => {
  const engine = state(TORAH, { occurrence_id: `els:${TORAH}:תורה:50:-1:205` });
  const snapshot = makeJourneySnapshot(engine);
  assert.equal(snapshot.axis.occurrenceId, `els:${TORAH}:תורה:50:-1:205`);
  assert.equal(makeJourneySnapshot(state(TORAH)).axis.occurrenceId, undefined, "an older engine state without the id: hitId only (compatibility)");
  const restored = buildJourneyRestore(snapshot);
  assert.equal(restored.loadItem.occurrenceId, `els:${TORAH}:תורה:50:-1:205`);
  assert.equal(buildJourneyRestore({ ...snapshot, axis: { ...snapshot.axis, occurrenceId: undefined } }).loadItem.occurrenceId, undefined, "an older snapshot opens by hitId");
  assert.equal(journeyAnchorMatches(engine, restored.target), true);
  assert.equal(journeyAnchorMatches(state(TANAKH, { occurrence_id: `els:${TANAKH}:תורה:50:-1:205` }), { ...restored.target, occurrenceId: snapshot.axis.occurrenceId }), false);
  assert.equal(journeyAnchorMatches(state(TANAKH), { hitId: "50_-1_205" }), true, "an older target without an id is compared by hitId as before");
  const withHit = { t: "אמת", shown: ["49_1_25"], hits: [{ hitId: "49_1_25", occurrence_id: `els:${TORAH}:אמת:49:1:25` }] };
  assert.equal(buildJourneyPromotion(engine, withHit).loadItem.occurrenceId, `els:${TORAH}:אמת:49:1:25`, "the promoted word carries the engine's id of that hit");
  assert.equal(buildJourneyPromotion(engine, withHit, { scope: "tanakh" }).loadItem.occurrenceId, undefined, "switching scope switches corpus: no id is carried across");
  const back = elsResearchReturnLoad({ origin: { term: "תורה", corpus: "torah", corpusId: TORAH, start: 205, skip: 50, dir: -1 } });
  assert.equal(back.corpusId, TORAH, "the return without a snapshot still names the corpus, which the engine checks");
});
