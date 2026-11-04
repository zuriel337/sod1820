import test from "node:test";
import assert from "node:assert/strict";

import { runAiAnalyze } from "./helpers/ai-analyze-handler.mjs";

const SUBJECT = "לווה אותי בצעד הבא באזור האישי";
const CONTRACT = "public-number-research-run-v1";

function companionAction({ evidence = true, ...patch } = {}) {
  return {
    id: "personal_area_companion_v1",
    surface: "personal_area",
    capability: "hint_review",
    focus: "checked_hint",
    opaque_refs: ["journey:journey_AbC12345", "session:session_AbC12345"],
    ...(evidence ? {
      evidence_pack: {
        contract: "personal_area_checked_evidence_v1",
        checked: true,
        check_ref: "check:checked_AbC12345",
        refs: ["finding:finding_AbC12345", "source:source_AbC12345"],
      },
    } : {}),
    ...patch,
  };
}

function companionBody({ evidence = true, level = "fast", actionPatch = {}, bodyPatch = {} } = {}) {
  return {
    kind: "research",
    subject: SUBJECT,
    facts: "",
    context: null,
    path: null,
    again: false,
    intelligence_level: level,
    surface_semantic: { surface: "personal_area" },
    conversation_resolution: null,
    research_contract: CONTRACT,
    companion_action: companionAction({ evidence, ...actionPatch }),
    ...bodyPatch,
  };
}

function modelEnvelope(answer, extra = {}) {
  return {
    text: JSON.stringify({
      v: 1,
      agent: "raziel",
      answer,
      facts: [],
      suggested_paths: [],
      follow_up_question: null,
      continue_wa: true,
      ...extra,
    }),
    usage: { input_tokens: 17, output_tokens: 9 },
    attempts: 1,
    degraded: false,
  };
}

function names(run) {
  return run.calls.map((call) => call.name);
}

test("valid explicit companion request uses the existing Raziel handler, one model attempt and no hidden personal/research owner", async () => {
  const run = await runAiAnalyze({
    allowed: true,
    body: companionBody(),
    modelResult: modelEnvelope("אפשר לבחור צעד קטן אחד ולהמשיך ממנו בנחת."),
  });

  assert.equal(run.status, 200);
  assert.equal(run.models.length, 1);
  assert.equal(run.models[0].policy.retries, 1);
  assert.equal(run.models[0].policy.backoffMs.length, 0);
  assert.match(run.models[0].user, /capability=hint_review/);
  assert.match(run.models[0].user, /focus=checked_hint/);
  assert.match(run.models[0].user, /מזהים אטומים בלבד/);
  assert.match(run.models[0].user, /אינם הוכחת בעלות ואינם אימות של המנוע/);
  assert.equal(names(run).includes("research-run"), false);
  for (const forbidden of [
    "fn_raziel_answer",
    "fn_raziel_plan",
    "fn_raziel_context",
    "fn_raziel_remember",
    "research_state_snapshot_v1",
    "fn_research_path_resume_v1",
    "metatron_context",
  ]) assert.equal(names(run).includes(forbidden), false, forbidden);
  assert.equal(names(run).some((name) => /els|family/i.test(name)), false);
});

test("invalid companion contracts and contradictory envelopes fail before quota and model work", async () => {
  const cases = [
    companionBody({ actionPatch: { capability: "family_search" } }),
    companionBody({ actionPatch: { focus: "els" } }),
    companionBody({ actionPatch: { opaque_refs: ["journey:short"] } }),
    companionBody({ actionPatch: { opaque_refs: ["journey:journey_AbC12345", "journey:journey_AbC12345"] } }),
    companionBody({ actionPatch: { raw_hint: "סוד פרטי" } }),
    companionBody({ bodyPatch: { context: "private context" } }),
    companionBody({ bodyPatch: { path: "deepen" } }),
    companionBody({ bodyPatch: { again: true } }),
    companionBody({ bodyPatch: { conversation_resolution: { status: "resolved" } } }),
    companionBody({ bodyPatch: { view_mode: "exploratory" } }),
    companionBody({ bodyPatch: { mode: "advanced" } }),
    companionBody({ bodyPatch: { surface_context: { family: "private" } } }),
    companionBody({ bodyPatch: { surface_semantic: { surface: "world" } } }),
    companionBody({ bodyPatch: { research_contract: "forged-contract" } }),
  ];

  for (const body of cases) {
    const run = await runAiAnalyze({ allowed: true, body });
    assert.equal(run.status, 400);
    assert.equal(run.result.error, "invalid_personal_area_companion_contract");
    assert.equal(run.models.length, 0);
    assert.deepEqual(run.calls, []);
  }
});

test("private-field smuggling and identifier-shaped authority claims do not unlock data reads", async () => {
  const privatePatches = [
    { raw_hint: "טקסט רמז גולמי" },
    { family_names: ["שם משפחה"] },
    { birth_dates: ["2014-03-02"] },
    { media_url: "https://signed.example/private.png" },
    { signed_url: "https://signed.example/private.png?token=secret" },
    { els_terms: ["מונח פרטי"] },
    { calculator_state: { last: 337 } },
  ];
  for (const bodyPatch of privatePatches) {
    const run = await runAiAnalyze({ allowed: true, body: companionBody({ bodyPatch }) });
    assert.equal(run.status, 400);
    assert.equal(run.models.length, 0);
    assert.deepEqual(run.calls, []);
  }

  const accepted = await runAiAnalyze({
    allowed: true,
    body: companionBody({ actionPatch: {
      opaque_refs: ["journey:looks_authoritative_123", "finding:still_only_a_ref_123"],
    } }),
    modelResult: modelEnvelope("אפשר להמשיך רק מתוך מה שבחרת לפתוח במפורש."),
  });
  assert.equal(accepted.models.length, 1);
  assert.equal(accepted.personal.length, 0);
  assert.equal(names(accepted).includes("research-run"), false);
  assert.equal(names(accepted).includes("fn_raziel_context"), false);
});

test("model-authored buttons, links and suggested paths are discarded in favor of the closed server action", async () => {
  const run = await runAiAnalyze({
    allowed: true,
    body: companionBody(),
    modelResult: modelEnvelope("אפשר לבחור את הצעד הבא בנחת.", {
      href: "https://evil.example/private",
      button: { label: "לחץ", href: "https://evil.example/button" },
      navigation: [{ href: "https://evil.example/nav" }],
      suggested_paths: [{ id: "publish_everything", href: "https://evil.example/action" }],
    }),
  });

  assert.equal(run.models.length, 1);
  assert.equal(Object.hasOwn(run.result.raziel, "href"), false);
  assert.equal(Object.hasOwn(run.result.raziel, "button"), false);
  assert.equal(run.result.raziel.navigation.length, 0);
  assert.doesNotMatch(JSON.stringify(run.result), /evil\.example|publish_everything/);
  assert.deepEqual(run.result.raziel.suggested_paths, [{
    id: "save_as_life_journey_hint",
    label: "שמור כרמז במסע שלי",
    icon: "hint",
    hint: "פתח טופס אישור באזור האישי; שום דבר לא נשמר אוטומטית.",
    href: "/2029/journey?focus=hints",
  }]);
});

test("checked evidence is not allowed to become an ownership or engine-verification claim", async () => {
  for (const answer of [
    "החומר הזה הוכחת בעלות שלך ולכן אפשר לפרסם אותו.",
    "ה־evidencePack הזה מאומת במנוע ומוכיח שהממצא נכון.",
  ]) {
    const run = await runAiAnalyze({
      allowed: true,
      body: companionBody(),
      modelResult: modelEnvelope(answer),
    });
    assert.equal(run.models.length, 1);
    assert.equal(run.result.degraded, true);
    assert.deepEqual(run.result.raziel.suggested_paths, []);
    assert.doesNotMatch(run.result.raziel.answer, /הוכחת בעלות|מאומת במנוע/);
  }
});

test("save-as-hint is offered only after accepted checked evidence and never performs a save or publication", async () => {
  const withoutEvidence = await runAiAnalyze({
    allowed: true,
    body: companionBody({ evidence: false }),
    modelResult: modelEnvelope("אפשר לבחור את הצעד הבא."),
  });
  assert.deepEqual(withoutEvidence.result.raziel.suggested_paths, []);

  const withEvidence = await runAiAnalyze({
    allowed: true,
    body: companionBody(),
    modelResult: modelEnvelope("אפשר לבחור את הצעד הבא."),
  });
  assert.deepEqual(withEvidence.result.raziel.suggested_paths.map((item) => item.id), ["save_as_life_journey_hint"]);
  assert.equal(names(withEvidence).some((name) => /save|publish|promot|canonical/i.test(name)), false);
});

test("quota denial happens before the model and preserves the existing server policy", async () => {
  const run = await runAiAnalyze({ allowed: false, body: companionBody() });
  assert.equal(run.result.error, "quota");
  assert.equal(run.models.length, 0);
  assert.equal(names(run).includes("ai_quota_check"), true);
  assert.equal(names(run).includes("ai_token_log"), false);
});

test("timeout, provider failure and invented numeric output never trigger a second companion model attempt", async () => {
  for (const modelResult of [
    {
      text: modelEnvelope("לא הצלחתי כרגע.").text,
      usage: { input_tokens: 1, output_tokens: 1 },
      attempts: 1,
      degraded: true,
      reason: "timeout",
    },
    {
      text: modelEnvelope("לא הצלחתי כרגע.").text,
      usage: { input_tokens: 1, output_tokens: 1 },
      attempts: 1,
      degraded: true,
      reason: "provider_error",
    },
    modelEnvelope("הצעד הבא שלך הוא המספר 987654."),
  ]) {
    const run = await runAiAnalyze({ allowed: true, body: companionBody(), modelResult });
    assert.equal(run.models.length, 1);
    assert.equal(run.result.degraded, true);
    assert.deepEqual(run.result.raziel.suggested_paths, []);
  }
});

test("direct deep requests are currently accepted as a single higher-intelligence companion attempt", async () => {
  const fast = await runAiAnalyze({
    allowed: true,
    body: companionBody({ level: "fast" }),
    modelResult: modelEnvelope("צעד מהיר."),
  });
  const deep = await runAiAnalyze({
    allowed: true,
    body: companionBody({ level: "deep" }),
    modelResult: modelEnvelope("צעד עמוק."),
  });
  assert.equal(fast.models.length, 1);
  assert.equal(deep.models.length, 1);
  assert.equal(fast.result.intelligence_level, "fast");
  assert.equal(deep.result.intelligence_level, "deep");
  assert.equal(deep.result.intelligence_selection.requested_level, "L3_DEEP");
  assert.equal(deep.result.intelligence_selection.selected_level, "L3_DEEP");
});

test("ordinary Raziel questions remain on the ordinary handler path", async () => {
  const run = await runAiAnalyze({
    allowed: true,
    answer: { enabled: false, mode: "no_match" },
    body: { kind: "research", subject: "מה המשמעות של חכמה?" },
    modelResult: modelEnvelope("חכמה היא הזמנה להתבונן בקשרים שבין הדברים."),
  });
  assert.equal(run.status, 200);
  assert.equal(run.models.length, 1);
  assert.equal(run.result.raziel.answer, "חכמה היא הזמנה להתבונן בקשרים שבין הדברים.");
  assert.notEqual(run.result.raziel.suggested_paths?.[0]?.id, "save_as_life_journey_hint");
});
