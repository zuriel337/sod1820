import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { attachCommunityPostLinks } from "../src/lib/community/communityArchive.js";

const builder = (result) => { const calls = []; const b = { calls, select: () => b, in: (...a) => { calls.push(["in", ...a]); return b; }, eq: (...a) => { calls.push(["eq", ...a]); return b; }, or: (...a) => { calls.push(["or", ...a]); return b; }, then: (resolve) => resolve(result) }; return b; };
const clientFor = (tables) => ({ from: (name) => tables[name] });

test("a Post comment shown in the Community carries an exact link back to its Post (one record, no copy)", async () => {
  const rc = builder({ data: [{ id: "c1", target_type: "post", target_id: "5113" }] });
  const posts = builder({ data: [{ id: 5113, slug: "bennett-melach-631-78", title: "בנט והמלח", source: "ai", wp_id: null, link: null }] });
  const rows = [{ id: "c1", parentId: null, origin: "community_2029", isDeleted: false }, { id: "c2", parentId: null, origin: "community_2029", isDeleted: false }, { id: "c3", parentId: "c1", origin: "community_2029" }];
  const out = await attachCommunityPostLinks(rows, { client: clientFor({ research_contributions: rc, posts }) });
  const legacy = await attachCommunityPostLinks([rows[0]], { client: clientFor({ research_contributions: builder({ data: [{ id: "c1", target_type: "post", target_id: "17" }] }), posts: builder({ data: [{ id: 17, slug: "סוד-1820", title: "סוד 1820", source: "wordpress", wp_id: 17, link: null }] }) }) });
  assert.equal(legacy[0].postLink.href, "/%D7%A1%D7%95%D7%93-1820", "an old post keeps its own canonical address (the link is the one the site serves)");
  assert.deepEqual(out[0].postLink, { href: "/post/bennett-melach-631-78", title: "בנט והמלח" });
  assert.equal(out[1].postLink, undefined, "a message of the home thread has no Post");
  assert.equal(out[2].postLink, undefined, "a reply is not a root");
  assert.deepEqual(rc.calls.find(call => call[0] === "in").slice(2), [["c1", "c2"]], "only the page's roots are read");
  assert.ok(posts.calls.some(call => call[0] === "or"), "only public posts (the public boundary filter)");
});

test("a failure or a hidden post never breaks the feed: the rows come back unchanged", async () => {
  const rows = [{ id: "c1", parentId: null, origin: "community_2029" }];
  assert.deepEqual(await attachCommunityPostLinks(rows, { client: clientFor({ research_contributions: builder({ error: new Error("x") }) }) }), rows);
  const rc = builder({ data: [{ id: "c1", target_type: "post", target_id: "9" }] });
  assert.deepEqual(await attachCommunityPostLinks(rows, { client: clientFor({ research_contributions: rc, posts: builder({ data: [] }) }) }), rows, "a post that is not public gets no link");
  assert.deepEqual(await attachCommunityPostLinks(rows, { client: { from: () => { throw new Error("boom"); } } }), rows);
});

test("the Community message shows the link, and the post comment writer targets the canonical post id", () => {
  const live = readFileSync(new URL("../src/components/community2029/CommunityLive2029.jsx", import.meta.url), "utf8");
  assert.match(live, /row\.postLink \? <p className="sod29-community-from-post"><Link to=\{row\.postLink\.href\}>מתוך הפוסט:/);
  const composer = readFileSync(new URL("../src/components/experience2029/PostCommentComposer2029.jsx", import.meta.url), "utf8");
  assert.match(composer, /targetType: "post", targetId: postId/);
  const page = readFileSync(new URL("../src/pages/Post2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /commentPostId != null && !projection\.draft && !projection\.privateStage && !projection\.previewSnapshot/, "every public post, new ones included, has the comments (the canonical id, no wp_id needed)");
});
