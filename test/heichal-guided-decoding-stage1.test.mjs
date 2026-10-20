import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HEICHAL_DECODING_DIRECTIONS,
  projectHeichalFirstDecoding,
} from "../src/lib/research/heichalFirstDecodingPlan.js";

test("numeric 363 offers the canonical numeric plan but no automatic run", () => {
  const output = projectHeichalFirstDecoding({
    subject: { type: "number", id: "363", label: "363" },
  });
  assert.equal(output.ready, true);
  assert.equal(output.strategy, "number_research");
  assert.equal(output.canRunBoundedNumber, true);
  assert.ok(output.steps.some((step) => step.key === "numeric"));
  assert.ok(output.steps.some((step) => step.key === "numeric_operators"));
  assert.equal(output.steps.some((step) => step.key === "els"), false);
  assert.ok(output.steps.every((step) => step.status === "proposed"));
});

test("phrase without numeric intent does not silently compute Gematria", () => {
  const raw = { type: "phrase", id: "פה אל פה", label: "פה אל פה" };
  const general = projectHeichalFirstDecoding({ subject: raw });
  assert.equal(general.ready, true);
  assert.equal(general.strategy, "discovery");
  assert.ok(!general.steps.some((step) => step.key === "gematria"));
  assert.equal(general.canRunBoundedNumber, false);
  const sources = projectHeichalFirstDecoding({ subject: raw, direction: "sources" });
  assert.ok(sources.steps.some((step) => step.key === "sources"));
  assert.ok(!sources.steps.some((step) => step.key === "gematria"));
  assert.match(sources.steps.find((step) => step.key === "sources").explanation, /רב־מילים/);
});

test("only an explicit direction requests Gematria or ELS", () => {
  const subject = { type: "phrase", id: "פה אל פה", label: "פה אל פה" };
  assert.ok(projectHeichalFirstDecoding({ subject, direction: "gematria" }).steps.some((step) => step.key === "gematria"));
  assert.ok(projectHeichalFirstDecoding({ subject, direction: "els" }).steps.some((step) => step.key === "els"));
  assert.equal(HEICHAL_DECODING_DIRECTIONS.phrase.length, 4);
});

test("no fabricated execution, verified status, source or sensitive context", () => {
  const out = projectHeichalFirstDecoding({
    subject: { type: "number", id: "363", label: "363", privateSource: "SECRET" },
    projection: {
      research: { findings: [{ id: "a" }, { id: "b" }] },
      graph: { relations: [{ id: "c" }] },
      sources: [{ ref: "d" }],
    },
  });
  assert.deepEqual(out.counts, { findings: 2, relations: 1, sources: 1 });
  assert.doesNotMatch(JSON.stringify(out), /SECRET|verified_result|completed|published/);
  assert.ok(out.steps.every((step) => step.status === "proposed"));
});

test("unknown identity fails closed; component belongs to the existing Heichal page", () => {
  const out = projectHeichalFirstDecoding({ subject: { type: "media", id: "unverified-picture" } });
  assert.equal(out.ready, false);
  assert.equal(out.steps.length, 0);
  const page = readFileSync(new URL("../src/pages/Heichal2029Page.jsx", import.meta.url), "utf8");
  const view = readFileSync(new URL("../src/components/heichal/HeichalGuidedFirstStep.jsx", import.meta.url), "utf8");
  assert.match(page, /<HeichalGuidedFirstStep/);
  assert.match(view, /onRunNumber/);
  assert.doesNotMatch(view, /useEffect|localStorage|supabase\.from|functions\.invoke/);
});
