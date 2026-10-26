import test from "node:test";
import assert from "node:assert/strict";
import { WORLD_CORPUS_TRIAGE_AUDIT } from "../api/world-corpus-triage-audit.js";

test("manager corpus audit keeps publication, verification and catalog completeness separate", () => {
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.scope, "read_only_recommendations");
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.workstreams.length, 7);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.length, 63);
  assert.deepEqual(["medium", "weak"].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [4164, 6362]);
  assert.match(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "duplicates").next, /בלי מחיקה/u);
  const zviReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_replay");
  assert.equal(zviReplay.total, 2299);
  assert.match(zviReplay.route, /verification=legacy_signal/u);
  assert.match(zviReplay.state, /2,468 הופעות/u);
  const deterministicReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_regular_replay_match");
  assert.equal(deterministicReplay.total, 227);
  assert.match(deterministicReplay.state, /232\/232/u);
  const arithmeticReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_arithmetic_replay");
  assert.equal(arithmeticReplay.total, 22);
  assert.match(arithmeticReplay.route, /replay=arithmetic_match/u);
  const compoundReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_compound_replay");
  assert.equal(compoundReplay.total, 33);
  assert.match(compoundReplay.route, /replay=compound_match/u);
  const unresolvedReplay = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_compound_unresolved");
  assert.equal(unresolvedReplay.total, 1);
  assert.match(unresolvedReplay.route, /replay=compound_method_unresolved/u);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_match").total, 136);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_numeric_match").total, 4);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_review").total, 20);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_explicit_conflict").total, 2);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_matrix_match").total, 2179);
  assert.deepEqual([
    "zvi_ready_source_repair",
    "zvi_ready_connected",
    "zvi_ready_single_target",
    "zvi_ready_multiple_targets",
    "zvi_ready_missing_target",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [10, 102, 153, 1856, 486]);
  assert.deepEqual([
    "zvi_ready_primary_number_context",
    "zvi_ready_additional_numbers",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [533, 1323]);
  assert.deepEqual([
    "zvi_ready_value_without_target",
    "zvi_ready_missing_value_target",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [481, 5]);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_matrix_claim_unmatched").total, 393);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_incomplete_method").total, 1);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_legacy_source_metadata").total, 3);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_missing_engine_unverified").total, 493);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_missing_engine_assessment").total, 2130);
  assert.deepEqual([
    "zvi_pending_engine_exact_single_target",
    "zvi_pending_engine_primary_context",
    "zvi_pending_engine_additional_numbers",
    "zvi_pending_engine_value_without_target",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [20, 82, 259, 31]);
  assert.deepEqual([
    "zvi_missing_engine_textual", "zvi_missing_engine_numeric", "zvi_missing_engine_formula",
    "zvi_missing_engine_spatial", "zvi_missing_engine_constants", "zvi_missing_engine_els", "zvi_missing_engine_language",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [1551, 622, 342, 73, 5, 27, 3]);
  assert.deepEqual([
    "zvi_spatial_calculation_verified", "zvi_spatial_quantity_verified",
    "zvi_spatial_ocr", "zvi_spatial_metadata_complete", "zvi_spatial_metadata_partial",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [10, 13, 15, 1, 18]);
  assert.deepEqual([
    "zvi_spatial_verified_already_represented", "zvi_spatial_verified_not_represented",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [5, 5]);
  assert.deepEqual([
    "zvi_spatial_represented_source_lane", "zvi_spatial_quantity_review_lane",
    "zvi_spatial_ocr_shape_review_lane", "zvi_spatial_source_shape_review_lane",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [13, 11, 5, 39]);
  assert.deepEqual([
    "zvi_els_tashpaz_633", "zvi_els_yaniv_hayun", "zvi_els_stars_delay_skip_2",
    "zvi_els_delay_contiguous", "zvi_els_rachel_verse_stride", "zvi_els_plumber_skip_6",
  ].map((key) => WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === key).total), [5, 5, 10, 2, 2, 3]);
  const languageBatch = WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_missing_engine_language");
  assert.match(languageBatch.state, /אשכול אחד/u);
  assert.match(languageBatch.next, /לא להציג כגשר שפה/u);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_candidate_matrix_match").total, 734);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_candidate_matrix_claim_unmatched").total, 112);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_candidate_missing_engine_unverified").total, 173);
  assert.equal(WORLD_CORPUS_TRIAGE_AUDIT.findingBatches.find((row) => row.key === "zvi_candidate_missing_engine_assessment").total, 686);

  const els = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "els");
  assert.equal(els.total, 135);
  assert.deepEqual(els.counts.slice(0, 4).map((item) => item.value), [112, 104, 8, 23]);
  assert.deepEqual(els.counts.slice(-5).map((item) => item.value), [14, 1, 2, 0, 0]);
  assert.match(els.next, /אינם אימות חי/u);
  assert.match(els.state, /els_search_v1/u);

  const gallery = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "gallery");
  assert.equal(gallery.counts.find((item) => item.label === "אשכולות טיפול מאוחדים").value, 415);
  assert.equal(gallery.counts.find((item) => item.label === "אשכולות בלי שם ותיאור").value, 228);
  assert.match(gallery.next, /חפיפה של 9/u);

  const languages = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "languages");
  assert.deepEqual(languages.counts.slice(-3).map((item) => item.value), [9, 3, 1]);

  const insights = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "insights");
  assert.equal(insights.counts.find((item) => item.label === "פעילות בלי source_ref").value, 214);
  assert.equal(insights.counts.find((item) => item.label === "מסומנות מאומתות בלי locator מדויק").value, 118);
  assert.match(insights.next, /2 השלמות מבנית/u);

  const posts = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "posts");
  assert.equal(posts.counts.find((item) => item.label === "מטא־דאטה קטלוגי שלם").value, 337);
  assert.equal(posts.counts.find((item) => item.label === "דורשים השלמת מטא־דאטה").value, 974);
  assert.equal(posts.counts.find((item) => item.label === "כפילויות slug").value, 0);
  assert.match(posts.next, /אין לאחד אנשים לפי שם/u);

  const gematria = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "gematria");
  assert.equal(gematria.counts.find((item) => item.label === "טרם אומתו").value, 2894);
  assert.deepEqual([
    "מכילים ספרות", "פיסוק או סימני מקור", "ביטויי הפרש Δ", "עברית מנוקדת", "ביטויים חישוביים", "שפה או תעתיק לטיני",
  ].map((label) => gematria.counts.find((item) => item.label === label).value), [1122, 121, 81, 29, 24, 3]);
  assert.match(gematria.state, /נפרדים/u);
});

test("audit routes only to existing canonical World views", () => {
  for (const stream of [...WORLD_CORPUS_TRIAGE_AUDIT.workstreams, ...WORLD_CORPUS_TRIAGE_AUDIT.findingBatches]) {
    assert.match(stream.route, /^\/world(?:\?|$)/u);
  }
  const zvi = WORLD_CORPUS_TRIAGE_AUDIT.workstreams.find((row) => row.key === "zvi_findings");
  assert.equal(zvi.total, 7354);
  assert.equal(zvi.counts.find((item) => item.label === "ציבוריים מאושרים בעדשת העולם").value, 5649);
  assert.equal(zvi.counts.find((item) => item.label === "מועמדים בתור נפרד").value, 1705);
  assert.equal(zvi.counts.find((item) => item.label === "בשלים טכנית לביקורת מקור ויעד").value, 2597);
  assert.equal(zvi.counts.find((item) => item.label === "בשלים עם מקור מדויק").value, 2587);
  assert.equal(zvi.counts.find((item) => item.label === "locator ראשי מסוג channel UUID").value, 2585);
  assert.equal(zvi.counts.find((item) => item.label === "מקור channel מדויק ב־source_refs").value, 2);
  assert.equal(zvi.counts.find((item) => item.label === "בשלים הדורשים איתור מקור").value, 10);
  assert.deepEqual([
    "בשלים שכבר מחוברים לעץ",
    "בשלים עם יעד מובנה יחיד",
    "בשלים עם כמה יעדים להכרעה",
    "בשלים ללא יעד מובנה",
  ].map((label) => zvi.counts.find((item) => item.label === label).value), [102, 153, 1856, 486]);
  assert.deepEqual([
    "nodes פעילים בחיבורים הבשלים",
    "nodes נפרדים בחיבורים הבשלים",
    "חיבורים שתואמים בדיוק ל־value",
    "חיבורים יתומים או לא פעילים",
    "חיבורים עם מקור מדויק",
    "חיבורים עם channel UUID ב־source_refs",
    "חיבורים הדורשים איתור מקור",
  ].map((label) => zvi.counts.find((item) => item.label === label).value), [102, 74, 102, 0, 102, 2, 0]);
  assert.deepEqual([
    "חסרי יעד עם value להצעה",
    "חסרי יעד וללא value",
    "חסרי יעד עם מקור מדויק",
    "חסרי יעד הדורשים תיקון locator",
    "חסרי יעד עם תמונה",
  ].map((label) => zvi.counts.find((item) => item.label === label).value), [481, 5, 476, 10, 46]);
  assert.deepEqual([
    "יעד יחיד מסוג מספר",
    "ריבוי יעדים צר · 2–3",
    "ריבוי יעדים בינוני · 4–7",
    "ריבוי יעדים רחב · 8–19",
    "ריבוי יעדים בתקרת 20",
  ].map((label) => zvi.counts.find((item) => item.label === label).value), [153, 313, 389, 560, 594]);
  assert.deepEqual([
    "ללא מעטפת · כוללות תמונה",
    "ללא מעטפת · מקורות channel מדויקים",
    "ללא מעטפת · locators לא פתורים",
    "ללא מעטפת · יעד יחיד שמור",
    "ללא מעטפת · כמה יעדים שמורים",
    "ללא מעטפת · בלי יעד שמור",
    "ללא מעטפת · עם value",
    "ללא מעטפת · בלי value",
  ].map((label) => zvi.counts.find((item) => item.label === label).value), [514, 2623, 0, 132, 2120, 371, 392, 2231]);
  assert.deepEqual([
    "ללא מעטפת · יעד יחיד תואם ל־value",
    "ללא מעטפת · יעד יחיד לא תואם או לא מספרי",
    "ללא מעטפת · מרובי יעדים עם מספר תואם",
    "ללא מעטפת · מספר ראשי ועוד הקשרים",
    "ללא מעטפת · מספר תואם לצד מספרים נוספים",
    "ללא מעטפת · מרובי יעדים בלי מספר תואם",
    "ללא מעטפת · בלי יעד ועם value",
    "ללא מעטפת · בלי יעד ובלי value",
  ].map((label) => zvi.counts.find((item) => item.label === label).value), [20, 112, 341, 82, 259, 1779, 31, 340]);
  assert.equal(zvi.counts.find((item) => item.label === "יעד יחיד תואם במדויק ל־value").value, 153);
  assert.equal(zvi.counts.find((item) => item.label === "סתירות בין יעד יחיד ל־value").value, 0);
  assert.equal(zvi.counts.find((item) => item.label === "מרובי יעדים עם מספר תואם ל־value").value, 1856);
  assert.deepEqual([
    "מספר תואם יחיד ועוד הקשרים",
    "מספר תואם לצד מספרים נוספים",
    "בשלים עם יעד מספר מדויק",
  ].map((label) => zvi.counts.find((item) => item.label === label).value), [533, 1323, 2009]);
  assert.match(zvi.route, /contributorId=c66f0464-0928-490e-be9b-66d8a87e7fc8/u);
});
