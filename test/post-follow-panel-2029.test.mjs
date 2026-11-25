import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openPostFollow, closePostFollow, postFollowOpen, subscribePostFollow } from "../src/lib/research/postFollowOpenStore2029.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the invitation (bottom) opens the shared panel state", () => {
  let calls = 0;
  const off = subscribePostFollow(() => { calls += 1; });
  assert.equal(postFollowOpen(), false);
  openPostFollow(); openPostFollow();
  assert.equal(postFollowOpen(), true);
  assert.equal(calls, 1, "opening twice notifies once");
  closePostFollow();
  assert.equal(postFollowOpen(), false);
  off();
});

test("follow panel (ZURIEL 25.11.2026): one panel, one read of the targets, only verified routes, the existing engine, no mail or push", () => {
  const bar = read("../src/components/experience2029/PostActionBar2029.jsx");
  const invite = read("../src/components/experience2029/PostFollowInvite2029.jsx");
  const dialog = read("../src/components/experience2029/PostFollowDialog2029.jsx");
  const shared = read("../src/components/experience2029/postFollowShared2029.js");
  const page = read("../src/pages/Post2029Page.jsx");
  assert.doesNotMatch(bar, /openPostFollow|postFollowShared2029/, "the approved top row is untouched (ZURIEL 25.11.2026)");
  assert.match(invite, /onClick=\{openPostFollow\}/);
  assert.match(invite, /if \(locked \|\| !ready\.length\) return null/, "no invitation where follows are closed or nothing can deliver updates");
  assert.match(shared, /item\.state === "ready"/, "only a verified updates route is offered");
  assert.match(shared, /targetReads\.has\(key\)/, "one read of the targets for all entrances");
  assert.match(dialog, /followIO=\{sharedFollowIO\}/, "the one shared I/O of the existing engine");
  assert.match(dialog, /<WatchButton[\s\S]*noPush/, "no push");
  const code = (text) => text.split("\n").filter(line => !/^\s*\/\//.test(line)).join("\n");
  assert.doesNotMatch(code(dialog + invite + bar), /email|whatsapp|mailto/i);
  assert.match(shared, /publicReadingActionsLocked\(isAdmin\)[\s\S]*locked \? \{ key: "locked", promise: null \}/, "no target requests while follows are closed");
  assert.match(page, /followOpen && commentPostId != null \? <React\.Suspense fallback=\{null\}><PostFollowDialog2029/, "the panel loads only when opened");
  assert.match(page, /<PostFollowInvite2029 post=\{projection\.sourcePost\} \/>[\s\S]*<PostComments2029/, "the invitation sits before the comments");
});
