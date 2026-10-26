import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");

test("the personal-area hints card opens the canonical private Life Journey branch", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  assert.match(frame, /title: "הרמזים שלי"[\s\S]*state: journeyLocked \? "building" : "live"[\s\S]*onClick: journeyLocked \? null : openPrivateHints/);
  assert.match(frame, /new URLSearchParams\(\{ focus: "hints" \}\)/);
  assert.match(frame, /go\(`\/2029\/journey\?\$\{params\.toString\(\)\}`[\s\S]*preserve: false/);
  assert.match(frame, /state: \{ sodReturnTo2029: currentHref \}/);
  assert.doesNotMatch(frame, /profile\?module=hints/);
});

test("the global hint gateway keeps private capture and public submission explicit", () => {
  const gateway = read("src/components/ContactGateway.jsx");
  const reportHint = read("src/components/ReportHint.jsx");
  assert.match(gateway, /שמור במסע הפרטי שלי/);
  assert.match(gateway, /שלח לבדיקה ולפרסום/);
  assert.match(gateway, /onOpenPrivateHints/);
  assert.match(reportHint, /storage\.from\("gallery"\)/);
  assert.match(reportHint, /submitCommunityHint/);
  assert.doesNotMatch(gateway, /saveLifeJourneyHintCapture|research\.saveItem|\.from\("research_items"\)/);
});

test("the fixed Life Journey entry focus carries no hint identity or content in navigation", () => {
  const frame = read("src/components/experience2029/SystemFrame2029.jsx");
  const journey = read("src/components/PersonJourney.jsx");
  const page = read("src/pages/LifeJourney2029Page.jsx");
  assert.match(journey, /lifeJourneyEntryFocus\(search\)/);
  assert.match(journey, /buildLifeJourneyEntryContext/);
  assert.match(page, /personalReturnHref/);
  assert.match(page, /location\.state\?\.sodReturnTo2029/);
  assert.doesNotMatch(frame, /returnTo: currentHref/);
  assert.doesNotMatch(frame, /hintId|hint_id|research_question|occurred_at/);
  assert.doesNotMatch(page, /hintId|hint_id|research_question|occurred_at/);
});
