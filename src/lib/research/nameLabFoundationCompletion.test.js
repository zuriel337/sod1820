import test from "node:test";
import assert from "node:assert/strict";

import { composeNameLabNormalizedEvidenceBundle } from "./nameLabFinding.js";
import {
  NAME_LAB_TRACK_CLASSIFICATION,
  collectNameLabTrackCoverage,
} from "./nameLabTrackClassification.js";
import {
  normalizeNameLabDependencies,
  dependencyGroupsForFindingIds,
} from "./nameLabDependency.js";
import {
  createSupabasePersonalDateCrossProvider,
  gregorianToHebrewDateRepresentation,
  runPersonalDateResearch,
} from "./personalDateResearch.js";
import { buildAccessDescriptor } from "./researchPlanV2.js";

const PRIVATE_AUTH = Object.freeze({
  user_ref: "11111111-1111-4111-8111-111111111111",
  authenticated: true,
  verified_authority: Object.freeze({ source: "supabase_auth", subject_verified: true }),
});

function allTracks() {
  return [
    { id: "name_verse", status: "ok", count: 1 },
    { id: "literal", status: "empty", count: 0 },
    { id: "words", status: "ok", count: 2 },
    { id: "graded_prox", status: "skipped", count: 0 },
    { id: "chapter", status: "empty", count: 0 },
    { id: "proximity", status: "ok", count: 1 },
    { id: "in_verse", status: "ok", count: 1 },
    { id: "anagrams", status: "ok", data: [{ part: "דוד", anagrams: [{ word: "דדו", type: "root" }] }] },
    { id: "combo_gem", status: "ok", value: 14, words: ["יד", "דוד"] },
    { id: "split_gem", status: "ok", data: { sum_words: ["x"] } },
    { id: "milui", status: "ok", data: [{ part: "דוד", milui: 490, ragil: 14, matches: [{ phrase: "אור גדול", source: "words" }, { phrase: "כתר עליון", source: "words" }] }] },
    { id: "shared_num", status: "ok", data: { internal: [{ value: 14 }] } },
    { id: "transforms", status: "ok", data: [{ method: "atbash", word: "תיו", value: 22, in_tanach: 3, verses: ["בראשית א א"] }] },
    { id: "initials", status: "ok", initials: "ד", finals: "ד" },
    { id: "roots", status: "ok", first: "דוד", last: "דוד" },
    { id: "variants", status: "ok", data: [{ form: "דויד", note: "כתיב מלא" }] },
    { id: "els", status: "ok", count: 2, min_skip: 7 },
  ];
}

test("every live NameLab track is explicitly classified; none silently disappears", () => {
  const expected = [
    "name_verse","literal","words","graded_prox","chapter","proximity","in_verse",
    "anagrams","combo_gem","split_gem","milui","shared_num","transforms",
    "initials","roots","variants","els",
  ];
  assert.deepEqual(Object.keys(NAME_LAB_TRACK_CLASSIFICATION).sort(), expected.sort());

  const coverage = collectNameLabTrackCoverage([allTracks()]);
  assert.equal(coverage.length, expected.length);
  assert.ok(coverage.every((row) => row.classification !== "unclassified"));

  const byId = Object.fromEntries(coverage.map((x) => [x.id, x]));
  assert.equal(byId.name_verse.status, "missing_adapter");
  assert.equal(byId.literal.status, "negative_result");
  assert.equal(byId.split_gem.semantic_class, "derivation");
  assert.equal(byId.shared_num.semantic_class, "derivation");
  assert.equal(byId.els.status, "unverified");
  assert.equal(byId.els.owner, "els_research_layer_law");
});

test("Result Bundle exposes missing adapters and derivations in coverage instead of false completeness", () => {
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: "דוד", trackLists: [allTracks()] });
  assert.ok(bundle.findings.length > 0);
  assert.ok(bundle.coverage.missing_adapter > 0);
  assert.ok(bundle.coverage.unverified > 0);
  assert.equal(bundle.coverage.complete, false);
  assert.ok(bundle.capability_trace.some((x) => x.key === "name_lab:name_verse" && x.status === "missing_adapter"));
  assert.ok(bundle.capability_trace.some((x) => x.key === "name_lab:shared_num" && x.semantic_class === "derivation"));
});

test("dependency normalization prevents same-family hits from becoming fake independent confirmations", () => {
  const bundle = composeNameLabNormalizedEvidenceBundle({ name: "דוד", trackLists: [allTracks()] });
  const dependency = normalizeNameLabDependencies(bundle.findings);
  assert.equal(dependency.independent_support_count, null);
  assert.match(dependency.boundary, /do not prove statistical independence/);
  assert.ok(dependency.dependency_group_count < dependency.finding_count);

  const milui = bundle.findings.filter((f) => f.projection?.dimensions?.name_lab_family === "milui");
  assert.equal(milui.length, 2);
  const groups = dependencyGroupsForFindingIds(bundle.findings, milui.map((f) => f.id));
  assert.equal(groups.length, 1);
});

test("Gregorian birthdate gets one deterministic Hebrew representation without using fn_cross_name_date", () => {
  const representation = gregorianToHebrewDateRepresentation("2008-08-28");
  assert.ok(representation);
  assert.equal(representation.input_iso, "2008-08-28");
  assert.equal(representation.transform.engine, "@hebcal/core");
  assert.equal(representation.transform.operation, "gregorian_date_to_hebrew_date");
  assert.match(representation.hebrew.pretty, /[א-ת]/);
  assert.match(representation.hebrew.clean, /^[א-ת]+$/);
});

test("personal date findings fail closed for public access and pass only with attested personal scope", async () => {
  const calls = [];
  const crossProvider = createSupabasePersonalDateCrossProvider({
    rpc: async (name, args) => {
      calls.push([name, args]);
      return {
        data: {
          meeting_points: [{
            value: 14,
            hits: 2,
            across_items: 2,
            from: ["דוד·רגיל", "תאריך·סידורי"],
          }],
        },
        error: null,
      };
    },
  });

  const publicBundle = await runPersonalDateResearch({
    name: "דוד",
    birthdateIso: "2008-08-28",
    crossProvider,
  });
  assert.equal(publicBundle.findings.length, 0);
  assert.ok(publicBundle.coverage.access_filtered > 0);

  const personalAccess = buildAccessDescriptor(PRIVATE_AUTH, "authenticated_user");
  const privateBundle = await runPersonalDateResearch({
    name: "דוד",
    birthdateIso: "2008-08-28",
    crossProvider,
    accessDescriptor: personalAccess,
  });
  assert.ok(privateBundle.findings.length >= 2);
  assert.ok(privateBundle.findings.every((f) => f.access.tier === "personal"));
  assert.ok(privateBundle.finding_outcomes.every((x) => x.evidence_relation === "derivation"));

  assert.equal(calls[0][0], "fn_cross_research");
  assert.ok(calls[0][1].p_items.some((x) => /[א-ת]/.test(x)));
  assert.ok(calls.every((x) => x[0] !== "fn_cross_name_date"));
});
