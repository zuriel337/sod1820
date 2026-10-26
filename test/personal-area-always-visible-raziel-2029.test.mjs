import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const mount = read("src/components/experience2029/RazielSessionMount2029.jsx");
const provider = read("src/lib/research/RazielSessionProvider2029.jsx");
const css = read("src/components/experience2029/myWorkspace2029.css");

test("My Workspace keeps a deterministic Raziel presence and explicit execution", () => {
  assert.match(frame, /data-workspace-raziel-presence="deterministic"/);
  assert.match(frame, /data-raziel-session-source="RazielSessionProvider2029"/);
  assert.match(frame, /data-raziel-explicit-action="open-existing-conversation"/);
  assert.match(frame, /שאל את רזיאל/);
  const start = frame.indexOf('data-workspace-raziel-presence="deterministic"');
  const end = frame.indexOf('aria-label="תמונת מצב אישית"', start);
  const presence = frame.slice(start, end);
  assert.match(presence, /onClick=\{onRaziel\}/);
  assert.doesNotMatch(presence, /\.submit|submitOneShot|askRaziel|research-run|ai-analyze|\bELS\b/i);
});

test("the canonical hints route and router-state exact return remain intact", () => {
  assert.match(frame, /onOpenPrivateHints\?\.\(\)/);
  assert.match(frame, /state: \{ sodReturnTo2029: currentHref \}/);
  assert.doesNotMatch(frame, /hint_id|person-ref|signed_url/i);
});

test("principal switches remount both Workspace and the existing Raziel session", () => {
  assert.match(frame, /key=\{authLoading \? "auth-loading" : user\?\.id \|\| "guest"\}/);
  assert.match(mount, /const principalKey = loading \? "auth-loading" : \(user\?\.id \|\| "anon"\)/);
  assert.match(mount, /<RazielSessionProvider2029 key=\{principalKey\}/);
  assert.match(provider, /if \(!mountedRef\.current\)/);
});

test("the presence is bounded at mobile widths and uses shared tokens", () => {
  assert.match(css, /\.sod29-workspace-raziel-presence/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /min-height:44px/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
});
