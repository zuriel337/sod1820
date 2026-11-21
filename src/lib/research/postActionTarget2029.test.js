import test from "node:test";
import assert from "node:assert/strict";
import { entityIdentity } from "./researchSyncState.js";
import { entityFromPost } from "./entity.js";
import { postActionTarget2029, postActionUnits2029 } from "./postActionTarget2029.js";
import { communityShareDraft } from "../community/communityShareHandoff.js";
import { loadCommunityDraft } from "../community/communityDraft.js";

const elections = { id: 5107, slug: "sharshar-elections-redemption-hints-draft", title: "בחירות", source: "ai" };
const bennett = { id: 5113, slug: "bennett-melach-631-78", title: "בנט", source: "ai" };
const electionId = "yamin-smol-2026-5787-1237-1158";
const bennettId = "bennett-salt-covenant-unity-20261119";
const root = (...nodes) => ({ querySelectorAll: () => nodes });
const node = (id, unit = null, preview = false) => ({
  id,
  closest: () => preview,
  getAttribute: name => name === "data-sod-unit" ? unit : null,
  querySelector: () => ({ textContent: " כותרת  יחידה " }),
});

test("the post keeps its library identity and a unit uses its own stable reference and URL", () => {
  const post = postActionTarget2029({ post: elections });
  assert.equal(entityIdentity(post.entity), entityIdentity(entityFromPost(elections)));
  assert.equal(post.href, `/post/${elections.slug}`);
  const units = postActionUnits2029(elections, root(node(electionId), node("ordinary-heading")));
  const target = postActionTarget2029({ post: elections }, units, electionId);
  assert.equal(target.ref, `posts:5107#${electionId}`);
  assert.equal(target.href, `${post.href}?unit=${electionId}#${electionId}`);
  assert.equal(target.url, `https://sod1820.co.il${target.href}`);
  assert.equal(target.entity.link, target.href);
  assert.notEqual(entityIdentity(target.entity), entityIdentity(post.entity));
  const renamed = postActionTarget2029({ post: elections }, [{ ...units[0], title: "כותרת אחרת" }], electionId);
  assert.equal(entityIdentity(renamed.entity), entityIdentity(target.entity));
});

test("only unique authored or registered public anchors are action units, across series", () => {
  assert.deepEqual(postActionUnits2029(bennett, root(node(electionId), node(bennettId, bennettId))), [
    { postId: "5113", id: bennettId, title: "כותרת יחידה" },
  ]);
  const normal = { id: 9001, slug: "ordinary", title: "פוסט רגיל", source: "wordpress" };
  const units = postActionUnits2029(normal, root(node("bad.id", "bad.id"), node("duplicate", "duplicate"), node("duplicate"),
    node("preview", "preview", true), node("heading"), node("normal-unit", "normal-unit")));
  assert.deepEqual(units.map(unit => unit.id), ["normal-unit"]);
  assert.equal(postActionTarget2029({ post: normal }, units, "normal-unit").href, "/ordinary?unit=normal-unit#normal-unit");
  assert.equal(postActionTarget2029({ post: normal }, units, electionId), null);
  assert.equal(postActionTarget2029({ post: bennett }, units, "normal-unit"), null);
  for (const flag of ["draft", "privateStage", "previewSnapshot"]) {
    assert.equal(postActionTarget2029({ post: normal, [flag]: true }, units, "normal-unit"), null);
  }
});

test("a community draft retains the exact captured unit and distinguishes the post URL", () => {
  const rows = new Map();
  const storage = { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value) };
  const auth = { verified: true, user: { id: "reader" } };
  const units = postActionUnits2029(bennett, root(node(bennettId, bennettId), node("other", "other")));
  const captured = postActionTarget2029({ post: bennett }, units, bennettId);
  const nextSelection = postActionTarget2029({ post: bennett }, units, "other");
  const post = postActionTarget2029({ post: bennett });
  assert.notEqual(nextSelection.url, captured.url);
  assert.equal(communityShareDraft({ auth, storage, href: captured.url }).ok, true);
  assert.equal(communityShareDraft({ auth, storage, href: post.url }).ok, true);
  assert.equal(communityShareDraft({ auth, storage, href: captured.url }).kept, true);
  assert.equal(loadCommunityDraft(storage, "user:reader").value.body, `${captured.url}\n${post.url}`);
});
