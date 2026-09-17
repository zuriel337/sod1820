import assert from "node:assert/strict";
import { researchObjectToUniversalFinding } from "../src/lib/research/researchObjectFinding.js";

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  created_at: "2026-09-01T00:00:00.000Z",
  kind: "fact",
  statement: "אהרן = 256",
  terms: ["אהרן"],
  value: 256,
  source: "post-extraction",
  source_ref: "posts:136",
  confidence: 91,
  engine_verified: true,
  engine_detail: {
    claimed_expression: "אהרן",
    claimed_method: "ragil",
    claimed_value: 256,
    engine_method_tested: "ragil",
    engine_result: 256,
    verification_state: "match",
  },
  status: "approved",
  privacy_scope: "shared",
  promoted_node_id: "22222222-2222-2222-2222-222222222222",
};

const finding = researchObjectToUniversalFinding(base);
assert.ok(finding);
assert.equal(finding.kind, "research-object");
assert.equal(finding.stage, null, "research_objects.kind must never be globally mapped to UF stage");
assert.equal(finding.status, "approved");
assert.equal(finding.verification.verification_state, "match");
assert.equal(finding.access.tier, "shared");
assert.equal(finding.identity.entityRef, "node:22222222-2222-2222-2222-222222222222");
assert.equal(finding.projection.dimensions.researchObjectKind, "fact");
assert.deepEqual(finding.evidence.refs, ["posts:136"]);
assert.equal(finding.subject.label, "אהרן = 256");
assert.equal(finding.subject.lang, "he", "Hebrew-only legacy statement may be safely inferred as Hebrew");
assert.equal(finding.projection.dimensions.presentation.fallbackMode, "raw_statement");
assert.equal(finding.projection.dimensions.presentation.rawStatementRef, `research_objects:${base.id}#statement`);

const multilingual = {
  ...base,
  statement: "DOSSIER RAW — exact historical research statement stays untouched",
  source: "Da'at Tevunot — fixed source witness",
  source_ref: "book:daat-tevunot#section-28",
  privacy_scope: "public_candidate",
  status: "candidate",
  meta: {
    ext: {
      presentation: {
        v: 1,
        statement_lang: "en",
        statement_role: "research_statement",
        source_witness_lang: "he",
        variants: {
          he: {
            title: "דעת תבונות — מידה, זמן וייצוג",
            summary: "מפת מחקר אנושית בעברית שמסבירה את הממצא בלי להחליף את המקור.",
            source_label: "דעת תבונות · סעיף כח",
          },
          en: {
            title: "Da'at Tevunot — Measure, Time, and Representation",
            summary: "A normalized English presentation of the same research object, not the source witness.",
            source_label: "Da'at Tevunot · section 28",
          },
        },
        compiled: { mode: "backfill", generated_by: "test" },
      },
    },
  },
};

const he = researchObjectToUniversalFinding(multilingual, { locale: "he-IL" });
assert.equal(he.subject.label, "דעת תבונות — מידה, זמן וייצוג");
assert.equal(he.subject.lang, "he");
assert.equal(he.source.lang, "he", "source witness language remains source-owned, not display locale");
assert.equal(he.view.rendererHints.presentation.summary, "מפת מחקר אנושית בעברית שמסבירה את הממצא בלי להחליף את המקור.");
assert.equal(he.view.rendererHints.presentation.sourceLabel, "דעת תבונות · סעיף כח");
assert.equal(he.projection.dimensions.presentation.fallbackMode, null);
assert.equal(he.projection.dimensions.presentation.statementLang, "en");
assert.equal(he.status, "candidate");
assert.equal(he.access.tier, "public_candidate");
assert.equal(he.verification.verification_state, "match", "presentation must not alter verification");

const en = researchObjectToUniversalFinding(multilingual, { locale: "en-US" });
assert.equal(en.subject.label, "Da'at Tevunot — Measure, Time, and Representation");
assert.equal(en.subject.lang, "en");
assert.equal(en.source.lang, "he", "English display must never relabel the Hebrew witness as English");
assert.equal(en.view.rendererHints.presentation.sourceLabel, "Da'at Tevunot · section 28");
assert.equal(en.identity.sourceIdentity.researchObjectId, base.id, "locale never forks semantic identity");

const missingEnglish = researchObjectToUniversalFinding({
  ...base,
  statement: "TECHNICAL_RAW_STATEMENT",
  meta: { ext: { presentation: { statement_lang: null, variants: { he: { title: "כותרת אנושית" } } } } },
}, { locale: "en" });
assert.equal(missingEnglish.subject.label, "TECHNICAL_RAW_STATEMENT");
assert.equal(missingEnglish.subject.lang, null, "Latin script alone must not be silently labeled English");
assert.equal(missingEnglish.projection.dimensions.presentation.fallbackMode, "raw_statement");
assert.equal(missingEnglish.projection.dimensions.presentation.resolvedLocale, null,
  "missing English presentation stays explicitly missing so a future compiler/backfill can handle it");

const noDetail = researchObjectToUniversalFinding({ ...base, engine_detail: {}, engine_verified: true });
assert.equal(noDetail.verification.verification_state, null,
  "derived engine_verified=true must not manufacture verification_state=match");

const unknownKind = researchObjectToUniversalFinding({ ...base, kind: "hypothesis" });
assert.equal(unknownKind.stage, null);
assert.equal(unknownKind.projection.dimensions.researchObjectKind, "hypothesis");

const noNode = researchObjectToUniversalFinding({ ...base, promoted_node_id: null });
assert.equal(noNode.identity.entityRef, null);
assert.deepEqual(noNode.projection.anchors, []);

assert.equal(researchObjectToUniversalFinding(null), null);
console.log("research-object-universal-finding: ok");
