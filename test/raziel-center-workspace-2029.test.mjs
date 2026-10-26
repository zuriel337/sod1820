import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const center = read("src/components/experience2029/RazielCenter2029.jsx");
const css = read("src/components/experience2029/razielCenter2029.css");
const provider = read("src/lib/research/RazielSessionProvider2029.jsx");

test("My Workspace opens the Raziel conversation center before the existing chat", () => {
  assert.match(frame, /import RazielCenter2029 from "\.\/RazielCenter2029\.jsx"/);
  assert.match(frame, /id: "raziel"[\s\S]*state: "live", onClick: \(\) => setWorkspaceSection\("raziel"\)/);
  assert.match(frame, /razielLocked \? "השיחות השמורות זמינות; המשך עם רזיאל עדיין נעול"/);
  assert.doesNotMatch(frame, /onClick: razielLocked \? null : \(\) => setWorkspaceSection\("raziel"\)/);
  assert.match(frame, /workspaceSection === "raziel"/);
  assert.match(frame, /<RazielCenter2029[\s\S]*onOpenConversation=\{onRaziel\}/);
  assert.doesNotMatch(center, /RazielSessionProvider2029|createContext|useReducer|askRaziel|transport|fetch\(|supabase|\.rpc\(/);
});

test("the center delegates every operation to the existing session", () => {
  for (const action of ["restoreSavedSession", "resetTemporarySession", "removeSavedSession", "renameSavedSession"]) {
    assert.match(center, new RegExp(`session\\?\\.${action}\\?\\.`));
  }
  assert.match(center, /onOpenConversation\?\.\(\)/);
  assert.doesNotMatch(center, /\.submit\??\.|submitOneShot|ai-analyze|model/i);
  assert.match(center, /data-raziel-center-sync=\{syncStatus\}/);
  assert.match(center, /אין עדיין שיחות שמורות/);
  assert.match(center, /טוען את השיחות שלך/);
  assert.match(center, /הסנכרון אינו זמין כרגע/);
  assert.match(center, /!loading && !error && !savedSessions\.length/);
  assert.match(center, /כן, למחוק/);
});

test("rename is a bounded existing-library upsert and keeps identity fields", () => {
  assert.match(provider, /normalizeRazielSavedSessionTitle/);
  assert.match(provider, /id: normalized\.id/);
  assert.match(provider, /ref: normalized\.ref/);
  assert.match(provider, /type: normalized\.type/);
  assert.match(provider, /research\.saveItem\?\.\(entity\)/);
  assert.doesNotMatch(provider, /rename.*fetch|rename.*rpc|rename.*localStorage/is);
});

test("the compact list remains inside the existing chat as a secondary entry", () => {
  const start = frame.indexOf("function RazielNativeChat");
  const end = frame.indexOf("function RazielProjection", start);
  const chat = frame.slice(start, end);
  assert.match(chat, /data-raziel-saved-sessions="true"/);
  assert.match(chat, /session\.savedSessions\.map/);
  assert.match(chat, /restoreSavedSession/);
  assert.match(chat, /removeSavedSession/);
});

test("the 320px layout is bounded and uses the shared 2029 tokens", () => {
  assert.match(css, /@media\(max-width:420px\)/);
  assert.match(css, /min-inline-size:0/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
});

test("slice 3 remains outside the center", () => {
  const slice = `${center}\n${provider}`;
  assert.doesNotMatch(slice, /credit_ledger|spendCredits|quotaEnded|completedAiAnswers|answerCount|registration-nudge|onSignup/i);
});
