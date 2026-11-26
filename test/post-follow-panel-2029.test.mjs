import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openPostFollow, closePostFollow, postFollowOpen, subscribePostFollow } from "../src/lib/research/postFollowOpenStore2029.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the bell (top) and the invitation (bottom) open ONE shared panel state", () => {
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
  assert.match(bar, /onClick=\{openPostFollow\}/, "the top bell opens the same one panel (ZURIEL 26.11.2026)");
  assert.doesNotMatch(bar, /PostFollowBox|post-follow-panel/, "no second follow panel in the action row");
  assert.match(invite, /onClick=\{openPostFollow\}/);
  assert.match(invite, /if \(locked \|\| !ready\.length\) return null/, "no invitation where follows are closed or nothing can deliver updates");
  assert.match(shared, /item\.state === "ready"/, "only a verified updates route is offered");
  assert.match(shared, /targetReads\.has\(key\)/, "one read of the targets for all entrances");
  assert.match(dialog, /followIO=\{sharedFollowIO\}/, "the one shared I/O of the existing engine");
  assert.match(dialog, /<WatchButton[\s\S]*noPush/, "no push");
  const code = (text) => text.split("\n").filter(line => !/^\s*\/\//.test(line)).join("\n");
  assert.doesNotMatch(code(dialog + invite + bar), /email|whatsapp|mailto/i);
  assert.match(shared, /postFollowLocked\(isAdmin\)[\s\S]*locked \? \{ key: "locked", promise: null \}/, "no target requests while follows are closed");
  assert.match(page, /followOpen && commentPostId != null \? <React\.Suspense fallback=\{null\}><PostFollowDialog2029/, "the panel loads only when opened");
  assert.match(page, /<PostFollowInvite2029 post=\{projection\.sourcePost\} \/>[\s\S]*<PostComments2029/, "the invitation sits before the comments");
});

test("continue reading (ZURIEL 26.11.2026): one line, the series first, otherwise the first category, nothing when neither", async () => {
  const { postContinueTarget2029 } = await import("../src/lib/research/postContinueTarget2029.js");
  const series = postContinueTarget2029({ categories: ["מה קורה הבורא"], author: "אלון לוי", tags: [] });
  assert.match(series.label, /^עוד מהסדרה: /);
  assert.match(series.href, /^\/2029\/posts\?series=/);
  const category = postContinueTarget2029({ categories: ["תיעוד אירועים"], author: "מישהו", tags: [] });
  assert.deepEqual(category, { label: "עוד בקטגוריה: תיעוד אירועים", href: "/2029/posts?category=%D7%AA%D7%99%D7%A2%D7%95%D7%93%20%D7%90%D7%99%D7%A8%D7%95%D7%A2%D7%99%D7%9D" });
  assert.equal(postContinueTarget2029({ categories: [], tags: [] }), null);
  const page = read("../src/pages/Post2029Page.jsx");
  assert.match(page, /<PostContinue2029 post=\{projection\.sourcePost\}[\s\S]*<PostFollowInvite2029[\s\S]*<PostComments2029/, "before the comments, once");
});

test("public follows are a DORMANT switch: off by default, one line to flip, the lock and the engine untouched", async () => {
  const store = await import("../src/lib/research/postFollowOpenStore2029.js");
  assert.equal(store.POST_FOLLOW_PUBLIC_2029, false, "the activation package is not applied");
  assert.equal(store.postPanelFollowAllowed("post_follow_panel_2029", "cat:בחירות"), false, "WatchButton stays closed to the public while the switch is off");
  assert.equal(store.postPanelFollowAllowed("other_surface", "cat:בחירות"), false);
  const watch = read("../src/components/WatchButton.jsx");
  assert.match(watch, /publicReadingActionsLocked\(auth\.isAdmin\) && !communityThread && !publicFollow && !postPanelFollowAllowed\(props\.source, props\.topic\)/);
  for (const file of ["PostFollowDialog2029.jsx", "PostFollowInvite2029.jsx"]) assert.match(read(`../src/components/experience2029/${file}`), /postFollowLocked\(auth\.isAdmin\)/);
});
