import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Home follows and dead ends (ZURIEL 18.11.2026): "פתוח לכולם, גם לאורחים" for the follow buttons on Home, and
// "מפת הזמינות בלי קישורים סגורים, ארכיון ליעד פעיל, מסע החיים פעם אחת".
const watch = readFileSync(new URL("../src/components/WatchButton.jsx", import.meta.url), "utf8");
const stream = readFileSync(new URL("../src/components/research/RealityStreamFollow2029.jsx", import.meta.url), "utf8");
const bell = readFileSync(new URL("../src/components/experience2029/SeriesBell2029.jsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");

test("the reality-stream follow opens in the public reading release; nothing else does", () => {
  assert.match(watch, /const publicFollow = props\.publicFollow === true && \(props\.topic === "stream:reality" \|\| \/\^series:\[\^\\s:\]\{1,80\}\$\/\.test\(props\.topic \|\| ""\)\);/);
  assert.match(watch, /const actionsLocked = publicReadingActionsLocked\(auth\.isAdmin\) && !communityThread && !publicFollow;/);
  assert.match(stream, /<WatchButton topic="stream:reality" source=\{source\} variant="2029" compact noPush publicFollow/);
  // The series bells stay closed until the server can name a series as a follow subject (canonical_follow_subject has no
  // series case on 18.11.2026; adding it is a database change for ZURIEL to approve).
  assert.match(bell, /const locked = publicReadingActionsLocked\(isAdmin\);/);
  // No other follow callsite opts in.
  for (const file of ["../src/components/PostFollowBox.jsx", "../src/pages/World2029Page.jsx", "../src/components/contributor2029/ContributorActionsController2029.jsx"])
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), "utf8"), /publicFollow/);
});

test("the archive tile leads to the open posts page and closed areas are named, not linked", () => {
  assert.doesNotMatch(home, /href="\/archive"/);
  assert.match(home, /<Link className="h29-portion k29-rv" to="\/2029\/posts" data-home-archive="posts">/);
  assert.match(home, /\{open \? <Link to=\{href\}>\{label\}<\/Link> : <span className="h29-availability-name">\{label\}<\/span>\}/);
});
