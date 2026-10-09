import test from "node:test";
import assert from "node:assert/strict";
import { researchObjectToUniversalFinding } from "./researchObjectFinding.js";
import { buildSourceBundles, canonicalResearchSourceRef, researchSourceOccurrenceKey, sourceOccurrenceMethodMentions } from "./sourceBundleProjection.js";

const ZVI = "c66f0464-0928-490e-be9b-66d8a87e7fc8";
const REF = "channel_updates:0c2aaf88-5df4-45fc-a92e-f644610a4f1a";
const row = (id, kind, extra = {}) => ({
  id, kind, statement: `s-${id}`, value: 631, terms: ["בנט"], source: "channel_updates", source_ref: REF,
  status: "draft", privacy_scope: "public", created_at: `2026-10-01T00:00:0${id.length}Z`, ...extra,
});
const rows = [row("a1", "fact"), row("a2", "fact"), row("b", "relation"), row("c", "observation"), row("d", "hypothesis")];
const finds = (rs = rows) => rs.map((r) => researchObjectToUniversalFinding(r));

test("one source bundle, five unchanged ids, ordered research move", () => {
  const f = finds();
  const [bundle, ...rest] = buildSourceBundles(f);
  assert.equal(rest.length, 0);
  assert.deepEqual(new Set(bundle.findingIds), new Set(f.map((x) => x.id)));
  assert.equal(bundle.count, 5);
  assert.deepEqual(bundle.findings.map((x) => x.move), ["fact", "fact", "relation", "observation", "interpretation"]);
  assert.match(bundle.invariant, /not independent evidence/);
});

test("filtered-out private finding cannot be revealed or counted", () => {
  const withPrivate = [...rows, row("p", "fact", { privacy_scope: "private" })];
  const filtered = finds(withPrivate).filter((x) => x.access.tier !== "private");
  const [bundle] = buildSourceBundles(filtered);
  assert.equal(bundle.count, 5);
  assert.ok(!JSON.stringify(bundle).includes("private"));
});

test("source header from occurrence; child createdBy stays null without explicit attribution", () => {
  const f = finds();
  const [bundle] = buildSourceBundles(f, { occurrences: { [REF]: { contributorId: ZVI, contributorName: "צבי (OPOC)" } } });
  assert.deepEqual(bundle.header, { type: "source_author", contributorId: ZVI, label: "צבי (OPOC)", attributionState: "resolved" });
  assert.ok(f.every((x) => x.provenance.createdBy === null));
  assert.ok(bundle.findings.every((x) => x.createdBy === null));
});

test("explicit per-object attribution is structural only: createdBy stays null, identity unchanged", () => {
  const plain = researchObjectToUniversalFinding(row("a1", "fact"));
  const attributed = researchObjectToUniversalFinding(row("a1", "fact", { meta: { attribution_type: "source_authorship", contributor_id: ZVI } }));
  assert.equal(attributed.provenance.createdBy, null);
  assert.equal(attributed.id, plain.id);
  assert.deepEqual(attributed.identity, plain.identity);
  assert.deepEqual(attributed.projection.dimensions.attribution, { type: "source_authorship", contributorId: ZVI, resolved: true, explicit: true });
});

test("incomplete / inferred attribution stays unresolved", () => {
  const typeOnly = researchObjectToUniversalFinding(row("x", "fact", { meta: { attribution_type: "source_authorship" } }));
  const textOnly = researchObjectToUniversalFinding(row("y", "fact", { contributor: "צבי (OPOC)" }));
  const uploader = researchObjectToUniversalFinding(row("z", "fact", { contributor: "ZURIEL", meta: { attribution_type: "source_authorship", contributor_id: "not-a-uuid" } }));
  for (const f of [typeOnly, textOnly, uploader]) assert.equal(f.provenance.createdBy, null);
  assert.equal(typeOnly.projection.dimensions.attribution.resolved, false);
});

test("Sod Hashmal is source_work, never a contributor; uploader not shown", () => {
  const ref = "posts:5104";
  const f = finds([row("s1", "fact", { source_ref: ref, contributor: "ZURIEL" })]);
  const [bundle] = buildSourceBundles(f, { occurrences: { [ref]: { sourceWork: "סוד החשמל" } } });
  assert.deepEqual(bundle.header, { type: "source_work", contributorId: null, label: "סוד החשמל", attributionState: "not_applicable" });
  assert.ok(!JSON.stringify(bundle).includes("ZURIEL"));
});

test("singleton stays singleton; repeated finding does not inflate", () => {
  const f = finds([row("s", "fact", { source_ref: null })]);
  const [b] = buildSourceBundles(f);
  assert.equal(b.isSingleton, true);
  assert.equal(b.sourceRef, null);
  const [dup] = buildSourceBundles([...finds(), ...finds()]);
  assert.equal(dup.count, 5);
});


test("name-only occurrence attribution stays unresolved and never becomes a person", () => {
  const [bundle] = buildSourceBundles(finds(), { occurrences: { [REF]: { contributorName: "אור הגאולה" } } });
  assert.equal(bundle.header.type, "source_attribution_unresolved");
  assert.equal(bundle.header.attributionState, "unresolved");
  assert.equal(bundle.header.contributorId, null);
  assert.match(bundle.header.note, /לא הוכרעה/);
});

test("bundle carries contextual Hebrew presentation without changing finding identity", () => {
  const [bundle] = buildSourceBundles(finds([row("eng", "hypothesis", {
    statement: 'Speaker of the phrase "אקים סכת דוד" is hypothesized to be GOD',
    value: 645,
    source: "ai:messianic_model_v1",
    source_ref: "book:amos-9-11",
  })]));
  assert.equal(bundle.findingIds.length, 1);
  assert.match(bundle.presentation.primaryTitle, /ייחוס הדובר|השערה/);
  assert.ok(!/[A-Za-z]{3}/.test(bundle.presentation.primaryTitle));
  assert.match(bundle.presentation.contextLine, /השערה|מודל מחקר משיחי/);
});


test("canonical source occurrence strips only ingestion fragments and preserves semantic fragments", () => {
  assert.equal(canonicalResearchSourceRef(`${REF}#batch12`), REF);
  assert.equal(canonicalResearchSourceRef(`${REF}#a3`), REF);
  assert.equal(canonicalResearchSourceRef(`${REF}#interpretation`), `${REF}#interpretation`);
  assert.equal(canonicalResearchSourceRef(`${REF}#valuation`), `${REF}#valuation`);
});

test("batch fragments from one channel update collapse into one source bundle", () => {
  const f = finds([
    row("batch-a", "fact", { source_ref: `${REF}#batch0` }),
    row("batch-b", "relation", { source_ref: `${REF}#batch1` }),
  ]);
  const [bundle, ...rest] = buildSourceBundles(f);
  assert.equal(rest.length, 0);
  assert.equal(bundle.sourceRef, REF);
  assert.deepEqual(new Set(bundle.sourceRefs), new Set([`${REF}#batch0`, `${REF}#batch1`]));
  assert.equal(bundle.count, 2);
});

test("semantic finding fragments keep identity but collapse into one source occurrence bundle", () => {
  assert.equal(canonicalResearchSourceRef(`${REF}#interpretation`), `${REF}#interpretation`);
  assert.equal(researchSourceOccurrenceKey(`${REF}#interpretation`), REF);
  assert.equal(researchSourceOccurrenceKey(`${REF}#valuation`), REF);
  const f = finds([
    row("sem-a", "fact", { source_ref: `${REF}#interpretation` }),
    row("sem-b", "relation", { source_ref: `${REF}#valuation` }),
  ]);
  const [bundle, ...rest] = buildSourceBundles(f);
  assert.equal(rest.length, 0);
  assert.equal(bundle.sourceRef, REF);
  assert.deepEqual(new Set(bundle.sourceIdentityRefs), new Set([`${REF}#interpretation`, `${REF}#valuation`]));
  assert.equal(bundle.count, 2);
});

test("source occurrence preserves exact wording and adds display-only normalization", () => {
  const originalText = "  מיכאל   ורות\r\n\r\nגימטריה   במילוי  ";
  const mentions = sourceOccurrenceMethodMentions(originalText, {
    registryRows: [{ method_key: "מילוי", display_label: "מילוי", active: true, in_engine: true }],
  });
  const [bundle] = buildSourceBundles(finds([row("source-text", "fact")]), {
    occurrences: {
      [REF]: {
        contributorId: ZVI,
        contributorName: "צבי (OPOC)",
        originalText,
        methodMentions: mentions,
      },
    },
  });
  assert.equal(bundle.occurrence.originalText, originalText, "source wording is untouched");
  assert.equal(bundle.occurrence.displayTextNormalized, "מיכאל ורות\n\nגימטריה במילוי");
  assert.deepEqual(bundle.occurrence.methodMentions.map((m) => [m.token, m.state]), [["מילוי", "registry_supported_unlinked"]]);
});

test("source-attested milui variants remain explicitly unregistered rather than becoming canonical calculations", () => {
  const mentions = sourceOccurrenceMethodMentions("גימטריא מילוי ב״ן של הויה = 52", {
    registryRows: [{ method_key: "מילוי", display_label: "מילוי", active: true, in_engine: true }],
  });
  assert.deepEqual(mentions.map((m) => [m.token, m.state, m.appliesToFinding]), [
    ["מילוי ב״ן", "source_attested_variant_unregistered", false],
  ]);
});


test("ordinary Hebrew 'מסתתר' is not promoted to the canonical מסתתר method", () => {
  assert.deepEqual(sourceOccurrenceMethodMentions("תראו מה מסתתר במספר 98"), []);
  assert.deepEqual(sourceOccurrenceMethodMentions("הקוד שמסתתר בפסוק"), []);
  const [method] = sourceOccurrenceMethodMentions("גימטריה מסתתר של מילה", {
    registryRows: [{ method_key: "מסתתר", display_label: "מסתתר", active: true, in_engine: true }],
  });
  assert.equal(method?.methodKey, "מסתתר");
  assert.equal(method?.state, "registry_supported_unlinked");
});
