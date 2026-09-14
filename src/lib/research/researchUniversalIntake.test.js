import assert from "node:assert/strict";
import test from "node:test";
import { composeResearchW2 } from "./researchComposerW2.js";
import {
  buildResearchIntakeTransport,
  projectResearchIntakeLineage,
} from "./researchIntakeTransport.js";
import { buildAccessDescriptor } from "./researchPlanV2.js";
import { CAPABILITY_STATUS } from "./researchResultBundle.js";

const PERSONAL_AUTH = Object.freeze({
  verified_authority: Object.freeze({
    source: "supabase_auth",
    subject_verified: true,
  }),
});

function executed() {
  return { status: CAPABILITY_STATUS.EXECUTED, findings: [] };
}

test("A — אליהו remains exact Expression + optional Name ambiguity; no silent Person creation", async () => {
  const intake = buildResearchIntakeTransport({
    rawInput: "אליהו",
    accessTier: "public",
    representations: [
      { ref: "repr:eliyahu:exact", kind: "exact_expression", value: "אליהו", access: { tier: "public" } },
    ],
    identityCandidates: [
      { type: "name", ref: "name:eliyahu", label: "אליהו", source: "text_match", confidence: "candidate" },
      { type: "phrase", ref: "expression:eliyahu", label: "אליהו", source: "text_match", confidence: "exact" },
    ],
  });

  const bundle = await composeResearchW2({
    question: "אליהו",
    intake,
    explicitTextComputation: true,
    executors: {
      gematria: async () => executed(),
      name: async () => executed(),
    },
  });

  const kinds = bundle.query.identities.map(x => x.type);
  assert.equal(kinds.includes("name"), true);
  assert.equal(kinds.includes("phrase"), true);
  assert.equal(kinds.includes("person"), false);
  assert.equal(bundle.query.raw_input, "אליהו");
});

test("B — full name + birth date stay typed representations of one authorized private Person context", async () => {
  const intake = buildResearchIntakeTransport({
    rawInput: "אליהו כהן 1980-03-02",
    accessTier: "personal",
    representations: [
      { ref: "repr:p1:name", kind: "full_name", value: "אליהו כהן", access: { tier: "personal" } },
      { ref: "repr:p1:birth-date", kind: "date", value: "1980-03-02", access: { tier: "personal" } },
    ],
    identityCandidates: [
      {
        type: "person",
        ref: "person:p1:self",
        label: "אליהו כהן",
        source: "personal_context",
        confidence: "exact",
        access: { tier: "personal" },
      },
    ],
  });

  const bundle = await composeResearchW2({
    question: "אליהו כהן 1980-03-02",
    intake,
    authorizationContext: PERSONAL_AUTH,
    contextType: "authenticated_user",
    executors: { person: async () => executed() },
  });

  assert.equal(bundle.query.identities.filter(x => x.type === "person").length, 1);
  assert.equal(intake.representations.length, 2);
  assert.equal(bundle.plan.intake_access.allowed_for_execution, true);
});

test("C — private PDF remains a private Source/Digital Object carrier with no public-admission semantics", () => {
  const intake = buildResearchIntakeTransport({
    accessTier: "personal",
    sourceArtifact: {
      ref: "upload:private-pdf:1",
      kind: "document",
      media_type: "application/pdf",
      access: { tier: "personal" },
      fingerprint: { algorithm: "sha256", value: "abc123", strength: "strong" },
    },
  });

  assert.equal(intake.source_artifact.kind, "document");
  assert.equal(intake.source_artifact.access.tier, "personal");
  assert.equal(intake.owns_truth, false);
  assert.equal(intake.owns_identity, false);
  assert.equal("canonical" in intake, false);
  assert.equal("published" in intake, false);
});

test("D — the same exact PDF uploaded twice shares strong artifact identity without collapsing occurrences", () => {
  const common = {
    kind: "document",
    media_type: "application/pdf",
    access: { tier: "personal" },
    fingerprint: { algorithm: "sha256", value: "same-binary-hash", strength: "strong" },
  };
  const one = buildResearchIntakeTransport({ accessTier: "personal", sourceArtifact: { ...common, ref: "upload:1" } });
  const two = buildResearchIntakeTransport({ accessTier: "personal", sourceArtifact: { ...common, ref: "upload:2" } });

  assert.equal(one.source_artifact.artifact_identity_ref, two.source_artifact.artifact_identity_ref);
  assert.notEqual(one.source_artifact.occurrence_ref, two.source_artifact.occurrence_ref);
});

test("E — screenshot containing 358 keeps artifact, OCR extraction and Number identity distinct", async () => {
  const intake = buildResearchIntakeTransport({
    accessTier: "public",
    sourceArtifact: { ref: "image:shot-1", kind: "screenshot", media_type: "image/png", access: { tier: "public" } },
    extractions: [
      { ref: "extract:ocr-1", kind: "ocr_text", content: "358", status: "complete", access: { tier: "public" } },
    ],
    representations: [
      {
        ref: "repr:shot-1:number-literal",
        kind: "number_literal",
        value: "358",
        extraction_ref: "extract:ocr-1",
        access: { tier: "public" },
      },
    ],
    identityCandidates: [
      { type: "number", ref: "358", value: 358, label: "358", source: "numeric_literal", confidence: "exact" },
    ],
  });

  const bundle = await composeResearchW2({
    question: "358",
    intake,
    requestedCapabilities: ["numeric"],
    executors: { numeric: async () => executed() },
  });

  assert.equal(intake.source_artifact.ref, "image:shot-1");
  assert.equal(intake.extractions[0].ref, "extract:ocr-1");
  assert.equal(intake.representations[0].ref, "repr:shot-1:number-literal");
  assert.equal(bundle.query.identities[0].type, "number");
  assert.notEqual(intake.source_artifact.ref, bundle.query.identities[0].ref);
});

test("F — original photo, extracted content and user annotation remain separate lineage objects", () => {
  const intake = buildResearchIntakeTransport({
    accessTier: "personal",
    sourceArtifact: { ref: "photo:1", kind: "photo", media_type: "image/jpeg", access: { tier: "personal" } },
    extractions: [
      { ref: "extract:photo:1", kind: "ocr_text", content: "358", access: { tier: "personal" } },
    ],
    userInterpretations: [
      { ref: "interpretation:photo:1", kind: "user_annotation", content: "זה קשור לאירוע", access: { tier: "personal" } },
    ],
  });

  assert.equal(intake.source_artifact.ref, "photo:1");
  assert.equal(intake.extractions[0].ref, "extract:photo:1");
  assert.equal(intake.user_interpretations[0].ref, "interpretation:photo:1");
  assert.notEqual(intake.extractions[0].content, intake.user_interpretations[0].content);
});

test("G — pasted verse preserves exact input and does not fabricate Source identity/locus", () => {
  const verse = "בראשית ברא אלהים";
  const intake = buildResearchIntakeTransport({
    rawInput: verse,
    accessTier: "public",
    representations: [
      { ref: "repr:pasted-verse", kind: "exact_expression", value: verse, access: { tier: "public" } },
    ],
  });

  assert.equal(intake.raw_input.value, verse);
  assert.equal(intake.source_artifact, null);
  assert.deepEqual(intake.identity_candidates, []);
});

test("H — uncertain date preserves uncertainty, source/input time and timezone without fabricating occurred_at", () => {
  const intake = buildResearchIntakeTransport({
    rawInput: "בערך 2017",
    accessTier: "personal",
    temporal: {
      occurred_at: null,
      source_time: "source says approximately 2017",
      input_time: "2026-09-15T00:40:00+03:00",
      timezone: "Asia/Jerusalem",
      uncertainty: { kind: "approximate_year", year: 2017 },
      provenance: { declared_by: "user" },
      access: { tier: "personal" },
    },
  });

  assert.equal(intake.temporal.occurred_at, null);
  assert.equal(intake.temporal.timezone, "Asia/Jerusalem");
  assert.deepEqual(intake.temporal.uncertainty, { kind: "approximate_year", year: 2017 });
});

test("I — deleted source file can retain derived research lineage with unavailable/tombstone replay semantics", () => {
  const intake = buildResearchIntakeTransport({
    accessTier: "personal",
    sourceArtifact: {
      ref: "pdf:deleted:1",
      kind: "document",
      availability: "unavailable",
      replayable: false,
      access: { tier: "personal" },
    },
    extractions: [
      { ref: "extract:retained:1", kind: "text", content: "retained derived text", status: "complete", access: { tier: "personal" } },
    ],
  });

  assert.equal(intake.source_artifact.availability, "unavailable");
  assert.equal(intake.source_artifact.replayable, false);
  assert.equal(intake.extractions.length, 1);
});

test("J — private Life event and public Event remain separate candidates; relation may be researched without identity merge", async () => {
  const intake = buildResearchIntakeTransport({
    rawInput: "אירוע אישי",
    accessTier: "personal",
    identityCandidates: [
      {
        type: "event",
        ref: "event:personal:1",
        identity_key: "event:personal:1",
        label: "אירוע אישי",
        source: "personal_context",
        confidence: "exact",
        access: { tier: "personal" },
      },
      {
        type: "event",
        ref: "event:public:42",
        identity_key: "event:public:42",
        label: "אירוע ציבורי",
        source: "graph_identity",
        confidence: "candidate",
        access: { tier: "public" },
      },
    ],
  });

  const bundle = await composeResearchW2({
    question: "אירוע אישי",
    intake,
    authorizationContext: PERSONAL_AUTH,
    contextType: "authenticated_user",
    executors: {
      time: async () => executed(),
      sources: async () => executed(),
      graph: async () => executed(),
    },
  });

  const refs = bundle.query.identities.filter(x => x.type === "event").map(x => x.ref);
  assert.equal(refs.includes("event:personal:1"), true);
  assert.equal(refs.includes("event:public:42"), true);
  assert.equal(refs.length, 2);
});

test("K — one private name Representation ref feeds Gematria + ELS without duplicate input identity", async () => {
  const seen = {};
  const intake = buildResearchIntakeTransport({
    rawInput: "אליהו פרטי",
    accessTier: "personal",
    representations: [
      { ref: "repr:person:p1:full-name", kind: "full_name", value: "אליהו פרטי", access: { tier: "personal" } },
    ],
    identityCandidates: [
      {
        type: "name",
        ref: "name:person:p1",
        label: "אליהו פרטי",
        source: "personal_context",
        confidence: "exact",
        access: { tier: "personal" },
      },
    ],
  });

  await composeResearchW2({
    question: "אליהו פרטי",
    intake,
    explicitTextComputation: true,
    authorizationContext: PERSONAL_AUTH,
    contextType: "authenticated_user",
    requestedCapabilities: ["gematria", "els"],
    executors: {
      gematria: async ({ intake: incoming }) => {
        seen.gematria = incoming.representations.map(x => x.ref);
        return executed();
      },
      els: async ({ intake: incoming }) => {
        seen.els = incoming.representations.map(x => x.ref);
        return executed();
      },
      name: async () => executed(),
    },
  });

  assert.deepEqual(seen.gematria, ["repr:person:p1:full-name"]);
  assert.deepEqual(seen.els, ["repr:person:p1:full-name"]);
  assert.deepEqual(seen.gematria, seen.els);
});

test("L — future voice is artifact → transcript extraction → representation in the same transport, with partial extraction first-class", () => {
  const intake = buildResearchIntakeTransport({
    accessTier: "personal",
    sourceArtifact: { ref: "audio:1", kind: "audio", media_type: "audio/mpeg", access: { tier: "personal" } },
    extractions: [
      {
        ref: "transcript:1",
        kind: "transcript",
        content: "טקסט חלקי",
        status: "partial",
        access: { tier: "personal" },
      },
    ],
    representations: [
      {
        ref: "repr:transcript:1",
        kind: "exact_expression",
        value: "טקסט חלקי",
        extraction_ref: "transcript:1",
        access: { tier: "personal" },
      },
    ],
  });

  assert.equal(intake.transport, "research_intake");
  assert.equal(intake.source_artifact.kind, "audio");
  assert.equal(intake.extractions[0].kind, "transcript");
  assert.equal(intake.extractions[0].status, "partial");
  assert.equal(intake.representations[0].extraction_ref, "transcript:1");
});

test("privacy boundary — unauthorized personal input is denied before capability execution and redacted from Bundle output", async () => {
  let calls = 0;
  const privateName = "שם פרטי סודי";
  const intake = buildResearchIntakeTransport({
    rawInput: privateName,
    accessTier: "personal",
    representations: [
      { ref: "repr:private-name", kind: "full_name", value: privateName, access: { tier: "personal" } },
    ],
    identityCandidates: [
      {
        type: "name",
        ref: "name:private",
        label: privateName,
        source: "personal_context",
        confidence: "exact",
        access: { tier: "personal" },
      },
    ],
  });

  const bundle = await composeResearchW2({
    question: privateName,
    intake,
    explicitTextComputation: true,
    requestedCapabilities: ["gematria"],
    executors: {
      gematria: async () => { calls += 1; return executed(); },
      name: async () => { calls += 1; return executed(); },
    },
  });

  assert.equal(calls, 0, "private input reached a capability before authorization");
  assert.equal(bundle.query.raw_input, null);
  assert.equal(bundle.query.raw_input_redacted, true);
  assert.equal(bundle.query.question, null);
  assert.equal(bundle.plan.question, null);
  assert.equal(bundle.plan.intake_access.allowed_for_execution, false);
  assert.equal(JSON.stringify(bundle).includes(privateName), false);
});

test("anonymous/local input differs from authorized persisted research without inventing a persistence store", () => {
  const local = buildResearchIntakeTransport({
    rawInput: "358",
    accessTier: "public",
    persistence: { mode: "local_session" },
  });
  const persisted = buildResearchIntakeTransport({
    rawInput: "358",
    accessTier: "personal",
    persistence: { mode: "authorized_persisted", persisted_ref: "research:item:1" },
  });

  assert.equal(local.persistence.mode, "local_session");
  assert.equal(local.persistence.persisted_ref, null);
  assert.equal(persisted.persistence.mode, "authorized_persisted");
  assert.equal(persisted.persistence.persisted_ref, "research:item:1");
  assert.equal(local.owns_persistence, false);
  assert.equal(persisted.owns_persistence, false);
});

test("output lineage carries refs/status/dedup but never extraction or interpretation content", () => {
  const intake = buildResearchIntakeTransport({
    rawInput: "secret",
    accessTier: "personal",
    sourceArtifact: {
      ref: "source:secret",
      kind: "document",
      access: { tier: "personal" },
      fingerprint: { algorithm: "sha256", value: "secret-hash", strength: "strong" },
    },
    extractions: [
      { ref: "extract:secret", kind: "text", content: "very private extracted text", status: "partial", access: { tier: "personal" } },
    ],
    userInterpretations: [
      { ref: "interpret:secret", content: "very private interpretation", access: { tier: "personal" } },
    ],
  });

  const publicLineage = projectResearchIntakeLineage(intake, buildAccessDescriptor(null, "public_user"));
  const serialized = JSON.stringify(publicLineage);
  assert.equal(serialized.includes("very private extracted text"), false);
  assert.equal(serialized.includes("very private interpretation"), false);
  assert.equal(serialized.includes("secret-hash"), false);
  assert.equal(publicLineage.source_artifact.dedupe_strength, "strong");
  assert.equal(publicLineage.extractions[0].status, "partial");
});
