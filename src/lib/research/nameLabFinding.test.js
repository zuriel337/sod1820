import test from "node:test";
import assert from "node:assert/strict";
import { nameLabTrackListsToUniversalFindings, composeNameLabNormalizedEvidenceBundle } from "./nameLabFinding.js";
import { dedupeUniversalFindings } from "./researchResultBundle.js";

// Golden trackLists shape: same as what NameMultiSearch/getNameMulti already hands to
// aggregateFindings() — an array-of-track-arrays, each track {id,status,...}.
function goldenTracks() {
  return [
    {
      id: "milui", status: "ok",
      data: [
        { part: "דוד", milui: 490, ragil: 14, matches: [{ phrase: "אור גדול", source: "words" }, { phrase: "כתר עליון", source: "words" }] },
      ],
    },
    {
      id: "combo_gem", status: "ok", value: 14,
      words: ["יד", "דוד"],
    },
    {
      id: "anagrams", status: "ok",
      data: [{ part: "דוד", anagrams: [{ word: "דדו", type: "root" }] }],
    },
    {
      id: "variants", status: "ok",
      data: [{ form: "דויד", note: "כתיב מלא" }],
    },
    {
      id: "transforms", status: "ok",
      data: [
        { method: "atbash", word: "תיו", value: 22, in_tanach: 3, verses: ["בראשית א א"] },
        { method: "albam", word: "קקק", value: 300, in_tanach: 0, verses: [] }, // excluded: in_tanach===0
      ],
    },
    { id: "milui", status: "empty", data: [{ part: "x", matches: [{ phrase: "should not appear" }] }] },
  ];
}

test("emits one Universal Finding per source-native hit, never one merged row", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  // 2 milui matches + 2 combo_gem words + 1 anagram + 1 variant + 1 transform (in_tanach>0 only) = 7
  assert.equal(findings.length, 7);
  const families = findings.map(f => f.projection.dimensions.name_lab_family).sort();
  assert.deepEqual(families, ["anagrams", "combo_gem", "combo_gem", "milui", "milui", "transforms", "variants"]);
});

test("transforms with in_tanach===0 are excluded; skipped/empty tracks contribute nothing", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  const transformWords = findings.filter(f => f.projection.dimensions.name_lab_family === "transforms").map(f => f.identity.sourceIdentity.word);
  assert.deepEqual(transformWords, ["תיו"]);
  assert.ok(!findings.some(f => f.identity.sourceIdentity?.phrase === "should not appear"));
});

test("subject stays the researched name-as-word for every Finding; source-native word lives only in identity/evidence", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  for (const f of findings) {
    assert.equal(f.subject.type, "name");
    assert.equal(f.subject.label, "דוד");
    assert.equal(f.kind, "name");
    assert.equal(f.source.engine, "name_lab");
  }
});

test("no Person identity: identity.personRef is never populated", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  assert.ok(findings.every(f => !("personRef" in f.identity) || f.identity.personRef == null));
});

test("access stays public for this bounded name-as-word lane", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  assert.ok(findings.every(f => f.access.tier === "public"));
});

test("verification_state is explicit not_tested, never mapped from the NameLab evidence level", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  assert.ok(findings.every(f => f.verification.verification_state === "not_tested"));
  const milui = findings.find(f => f.projection.dimensions.name_lab_family === "milui");
  assert.equal(milui.projection.dimensions.quality, "value_match");
  assert.notEqual(milui.verification.verification_state, milui.projection.dimensions.quality);
});

test("source-native raw fields are preserved verbatim in identity.sourceIdentity and evidence.facts", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  const milui = findings.find(f => f.identity.sourceIdentity.phrase === "אור גדול");
  assert.equal(milui.identity.sourceIdentity.milui, 490);
  assert.equal(milui.identity.sourceIdentity.ragil, 14);
  assert.equal(milui.identity.sourceIdentity.source, "words");
  assert.equal(milui.evidence.facts[0].phrase, "אור גדול");

  const transform = findings.find(f => f.projection.dimensions.name_lab_family === "transforms");
  assert.equal(transform.identity.sourceIdentity.in_tanach, 3);
  assert.deepEqual(transform.identity.sourceIdentity.verses, ["בראשית א א"]);
});

test("normalization does not collapse identities: two distinct milui phrases stay two distinct Findings", () => {
  const findings = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()]);
  const miluiIds = findings.filter(f => f.projection.dimensions.name_lab_family === "milui").map(f => f.id);
  assert.equal(new Set(miluiIds).size, 2);
});

test("duplicate engine hit IDs are stable and dedup only by exact source identity", () => {
  const findingsA = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks()], { createdAt: "2026-01-01T00:00:00.000Z" });
  const findingsB = nameLabTrackListsToUniversalFindings("דוד", [goldenTracks(), goldenTracks()], { createdAt: "2026-01-01T00:00:00.000Z" });
  // Same exact hit repeated (goldenTracks() appears twice) produces the SAME finding id both times.
  assert.equal(findingsB.length, findingsA.length * 2);
  const deduped = dedupeUniversalFindings(findingsB);
  assert.equal(deduped.length, findingsA.length);
});

test("adapter ignores empty/missing input rather than throwing", () => {
  assert.deepEqual(nameLabTrackListsToUniversalFindings("", [goldenTracks()]), []);
  assert.deepEqual(nameLabTrackListsToUniversalFindings("דוד", null), []);
  assert.deepEqual(nameLabTrackListsToUniversalFindings("דוד", []), []);
});

test("composeNameLabNormalizedEvidenceBundle drops Findings into the existing Result Bundle, universal_finding_only", () => {
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: "דוד", trackLists: [goldenTracks()] });
  assert.equal(bundle.findings.length, 7);
  assert.equal(bundle.invariants.universal_finding_only, true);
  assert.equal(bundle.access.allowed_access_tiers.includes("public"), true);
  assert.ok(bundle.findings.every(f => f.access.tier === "public"));
  assert.equal(bundle.capability_trace[0].key, "name_lab");
  assert.equal(bundle.capability_trace[0].access_class, "public_source");
  assert.equal(bundle.capability_trace[0].semantic_class, "evidence");
});
