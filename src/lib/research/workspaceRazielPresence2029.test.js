import test from "node:test";
import assert from "node:assert/strict";
import { projectWorkspaceRazielPresence2029 } from "./workspaceRazielPresence2029.js";

test("workspace Raziel presence is deterministic over existing projections", () => {
  const result = projectWorkspaceRazielPresence2029({
    subjectLabel: "מספר 337",
    savedResearchCount: 4,
    activeResearchCount: 1,
    savedConversationCount: 2,
    activeQuestionCount: 0,
    followCount: 3,
    hintsAvailable: true,
  });
  assert.equal(result.location, "האזור האישי · מספר 337");
  assert.match(result.existingCopy, /2 שיחות שמורות/);
  assert.match(result.existingCopy, /4 פריטי מחקר שמורים/);
  assert.match(result.existingCopy, /הרמזים מחוברים למסע החיים/);
  assert.equal(result.nextStep, "אפשר לחזור לשיחה שמורה או לשאול שאלה חדשה.");
  assert.equal(result.canAsk, true);
});

test("unknown counts stay absent and never become zero", () => {
  const result = projectWorkspaceRazielPresence2029({
    savedResearchCount: undefined,
    savedConversationCount: "unknown",
    followCount: -1,
  });
  assert.equal(result.existingCopy, "המחקר, השיחות והרמזים שלך נגישים מכאן.");
  assert.doesNotMatch(result.existingCopy, /0/);
});

test("an active conversation becomes the next deterministic step without execution", () => {
  const result = projectWorkspaceRazielPresence2029({ activeQuestionCount: 2 });
  assert.equal(result.nextStep, "אפשר להמשיך את השיחה הפעילה מאותה נקודה.");
});

test("a lock keeps saved state readable and disables the explicit ask action", () => {
  const result = projectWorkspaceRazielPresence2029({ savedConversationCount: 1, razielLocked: true });
  assert.equal(result.canAsk, false);
  assert.match(result.nextStep, /נעולה זמנית/);
});
